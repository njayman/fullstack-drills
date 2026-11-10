// See README.md for the spec. Run `bun run test:watch` while you work.
export class HttpError extends Error {
  constructor(status) {
    super(`HTTP ${status}`);
    this.status = status;
  }
}

export async function fetchAllPages(url, { concurrency = 3, retries = 3, baseDelayMs = 100, timeoutMs = 2000, signal } = {}) {
  throw new Error("TODO");
}

export async function topRestaurants(baseUrl, { city, n, ...opts }) {
  throw new Error("TODO");
}
