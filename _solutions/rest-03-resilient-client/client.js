export class HttpError extends Error {
  constructor(status, message = `HTTP ${status}`) {
    super(message);
    this.name = "HttpError";
    this.status = status;
  }
}

const abortError = () => new DOMException("Aborted", "AbortError");

function sleep(ms, signal) {
  return new Promise((resolve, reject) => {
    if (signal.aborted) return reject(abortError());
    const t = setTimeout(() => { signal.removeEventListener("abort", onAbort); resolve(); }, ms);
    const onAbort = () => { clearTimeout(t); reject(abortError()); };
    signal.addEventListener("abort", onAbort, { once: true });
  });
}

async function getPage(url, page, { retries, baseDelayMs, timeoutMs }, signal) {
  const u = new URL(url);
  u.searchParams.set("page", page);
  for (let attempt = 0; ; attempt++) {
    if (signal.aborted) throw abortError();
    let wait, lastErr;
    try {
      const res = await fetch(u, { signal: AbortSignal.any([signal, AbortSignal.timeout(timeoutMs)]) });
      if (res.ok) return await res.json();
      if (res.status !== 429 && res.status < 500) throw Object.assign(new HttpError(res.status), { fatal: true });
      lastErr = new HttpError(res.status);
      const ra = res.headers.get("retry-after");
      if (res.status === 429 && ra !== null && !Number.isNaN(Number(ra))) wait = Number(ra) * 1000;
    } catch (e) {
      if (signal.aborted) throw abortError();
      if (e.fatal) throw e;
      lastErr ??= e;
    }
    if (attempt >= retries) throw lastErr;
    await sleep(wait ?? baseDelayMs * 2 ** attempt, signal);
  }
}

export async function fetchAllPages(url, { concurrency = 3, retries = 3, baseDelayMs = 100, timeoutMs = 2000, signal } = {}) {
  const ctrl = new AbortController();
  const outer = signal ?? new AbortController().signal;
  if (outer.aborted) throw abortError();
  const onOuter = () => ctrl.abort();
  outer.addEventListener("abort", onOuter, { once: true });
  const opts = { retries, baseDelayMs, timeoutMs };
  try {
    const first = await getPage(url, 1, opts, ctrl.signal);
    const results = [first.data];
    let next = 2;
    const worker = async () => {
      while (next <= first.total_pages && !ctrl.signal.aborted) {
        const p = next++;
        results[p - 1] = (await getPage(url, p, opts, ctrl.signal)).data;
      }
    };
    try {
      await Promise.all(Array.from({ length: Math.min(concurrency, Math.max(0, first.total_pages - 1)) }, worker));
    } catch (e) {
      ctrl.abort();
      throw outer.aborted ? abortError() : e;
    }
    return first.total_pages === 0 ? [] : results.flat();
  } finally {
    outer.removeEventListener("abort", onOuter);
  }
}

export async function topRestaurants(baseUrl, { city, n, ...opts }) {
  const all = await fetchAllPages(`${baseUrl}/restaurants?city=${encodeURIComponent(city)}`, opts);
  return all
    .filter((r) => r.city.toLowerCase() === city.toLowerCase())
    .sort((a, b) => b.rating - a.rating || b.votes - a.votes || a.name.localeCompare(b.name))
    .slice(0, n)
    .map((r) => r.name);
}
