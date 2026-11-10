import express from "express";
import { fetchAllPages, topRestaurants, HttpError } from "../src/client.js";

// ---- misbehaving test server ----
let server, base, plan, hits, inFlight, maxInFlight, defaultDelay;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const RESTAURANTS = [
  { name: "Alpha", city: "York", rating: 4.5, votes: 100 },
  { name: "Bravo", city: "New York", rating: 4.9, votes: 500 },
  { name: "Charlie", city: "york", rating: 4.5, votes: 200 },
  { name: "Delta", city: "YORK", rating: 4.7, votes: 10 },
  { name: "Echo", city: "York", rating: 4.5, votes: 200 },
  { name: "Foxtrot", city: "Yorkshire", rating: 5, votes: 1 },
  { name: "Aardvark", city: "York", rating: 4.5, votes: 100 },
  ...Array.from({ length: 14 }, (_, i) => ({ name: `Filler ${i}`, city: "York", rating: 3 + i / 100, votes: i })),
];

function paged(all, page, perPage = 5) {
  const total_pages = Math.ceil(all.length / perPage);
  return { page, per_page: perPage, total: all.length, total_pages, data: all.slice((page - 1) * perPage, page * perPage) };
}

beforeAll(async () => {
  const app = express();
  app.use(async (req, res, next) => {
    const page = Number(req.query.page);
    hits.push({ path: req.path, page });
    inFlight++; maxInFlight = Math.max(maxInFlight, inFlight);
    res.on("close", () => inFlight--);
    const step = plan[page]?.shift() ?? { delay: defaultDelay(page) };
    if (step.delay) await sleep(step.delay);
    if (step.hang) return; // never respond
    if (step.status) {
      if (step.retryAfter !== undefined) res.set("Retry-After", String(step.retryAfter));
      return res.status(step.status).json({ error: "nope" });
    }
    if (step.destroy) return req.socket.destroy();
    next();
  });
  app.get("/items", (req, res) => {
    const page = Number(req.query.page);
    const total = Number(req.query.total ?? 10);
    res.json({ page, per_page: 2, total: total * 2, total_pages: total, data: total ? [`${page}a`, `${page}b`] : [] });
  });
  app.get("/restaurants", (req, res) => {
    const city = String(req.query.city ?? "").toLowerCase();
    res.json(paged(RESTAURANTS.filter((r) => r.city.toLowerCase().includes(city)), Number(req.query.page)));
  });
  await new Promise((r) => { server = app.listen(0, r); });
  base = `http://127.0.0.1:${server.address().port}`;
});
afterAll(() => { server.closeAllConnections(); server.close(); });
beforeEach(() => { plan = {}; hits = []; inFlight = 0; maxInFlight = 0; defaultDelay = () => 0; });

const pagesHit = () => hits.map((h) => h.page);
const expected = (n) => Array.from({ length: n }, (_, i) => [`${i + 1}a`, `${i + 1}b`]).flat();
const fast = { baseDelayMs: 1 };

// ---- tests ----
describe("fetchAllPages", () => {
  it("returns all pages in order even when later pages finish first", async () => {
    defaultDelay = (p) => (p === 1 ? 0 : 60 - p * 5);
    expect(await fetchAllPages(`${base}/items?total=10`, fast)).toEqual(expected(10));
    expect(pagesHit().filter((p) => p === 1)).toHaveLength(1);
  });

  it("works when the url has no query string", async () => {
    expect(await fetchAllPages(`${base}/items`, fast)).toEqual(expected(10));
  });

  it("total_pages 0 means one request and []", async () => {
    expect(await fetchAllPages(`${base}/items?total=0`, fast)).toEqual([]);
    expect(hits).toHaveLength(1);
  });

  it.each([1, 3, 5])("never exceeds concurrency %i", async (concurrency) => {
    defaultDelay = (p) => (p === 1 ? 0 : 30);
    await fetchAllPages(`${base}/items?total=12`, { ...fast, concurrency });
    expect(maxInFlight).toBe(concurrency);
  });

  it("retries 5xx then succeeds", async () => {
    plan[3] = [{ status: 503 }, { status: 500 }];
    expect(await fetchAllPages(`${base}/items?total=4`, fast)).toEqual(expected(4));
    expect(pagesHit().filter((p) => p === 3)).toHaveLength(3);
  });

  it("retries network errors", async () => {
    plan[2] = [{ destroy: true }];
    expect(await fetchAllPages(`${base}/items?total=3`, fast)).toEqual(expected(3));
  });

  it("uses exponential backoff", async () => {
    plan[2] = [{ status: 500 }, { status: 500 }, { status: 500 }];
    const start = Date.now();
    await fetchAllPages(`${base}/items?total=2`, { baseDelayMs: 60 });
    const took = Date.now() - start;
    expect(took).toBeGreaterThanOrEqual(60 + 120 + 240 - 15);
    expect(took).toBeLessThan(900);
  });

  it("honours Retry-After on 429", async () => {
    plan[2] = [{ status: 429, retryAfter: 1 }];
    const start = Date.now();
    await fetchAllPages(`${base}/items?total=2`, { baseDelayMs: 1 });
    expect(Date.now() - start).toBeGreaterThanOrEqual(980);
  });

  it("gives up after retries with the last status", async () => {
    plan[2] = [{ status: 500 }, { status: 502 }, { status: 503 }, { status: 504 }];
    const err = await fetchAllPages(`${base}/items?total=2`, { ...fast, retries: 2 }).catch((e) => e);
    expect(err).toBeInstanceOf(HttpError);
    expect(err.status).toBe(503);
    expect(pagesHit().filter((p) => p === 2)).toHaveLength(3);
  });

  it("does not retry other 4xx", async () => {
    plan[1] = [{ status: 404 }];
    const err = await fetchAllPages(`${base}/items?total=2`, fast).catch((e) => e);
    expect(err).toBeInstanceOf(HttpError);
    expect(err.status).toBe(404);
    expect(hits).toHaveLength(1);
  });

  it("times out slow attempts and retries", async () => {
    plan[2] = [{ hang: true }];
    const start = Date.now();
    expect(await fetchAllPages(`${base}/items?total=2`, { ...fast, timeoutMs: 150 })).toEqual(expected(2));
    expect(Date.now() - start).toBeLessThan(1000);
    expect(pagesHit().filter((p) => p === 2)).toHaveLength(2);
  });

  it("stops starting new pages after a fatal failure", async () => {
    plan[3] = [{ status: 400 }];
    defaultDelay = () => 5;
    await expect(fetchAllPages(`${base}/items?total=20`, { ...fast, concurrency: 1 })).rejects.toMatchObject({ status: 400 });
    await sleep(100);
    expect(Math.max(...pagesHit())).toBe(3);
  });

  it("external abort rejects fast, also during backoff", async () => {
    defaultDelay = (p) => (p === 1 ? 0 : 2000);
    const ctrl = new AbortController();
    setTimeout(() => ctrl.abort(), 50);
    const start = Date.now();
    const err = await fetchAllPages(`${base}/items?total=10`, { ...fast, signal: ctrl.signal }).catch((e) => e);
    expect(err.name).toBe("AbortError");
    expect(Date.now() - start).toBeLessThan(500);
    await sleep(50);
    expect(inFlight).toBe(0);
    const count = hits.length;
    await sleep(100);
    expect(hits.length).toBe(count);

    plan[2] = [{ status: 500 }];
    const ctrl2 = new AbortController();
    setTimeout(() => ctrl2.abort(), 100);
    const s2 = Date.now();
    const err2 = await fetchAllPages(`${base}/items?total=2`, { baseDelayMs: 5000, signal: ctrl2.signal }).catch((e) => e);
    expect(err2.name).toBe("AbortError");
    expect(Date.now() - s2).toBeLessThan(500);
  });

  it("already-aborted signal makes no requests", async () => {
    const err = await fetchAllPages(`${base}/items`, { signal: AbortSignal.abort() }).catch((e) => e);
    expect(err.name).toBe("AbortError");
    expect(hits).toHaveLength(0);
  });
});

describe("topRestaurants", () => {
  it("filters exact city, sorts by rating, votes, name", async () => {
    expect(await topRestaurants(base, { city: "York", n: 4, ...fast })).toEqual(["Delta", "Charlie", "Echo", "Aardvark"]);
    expect(hits[0].path).toBe("/restaurants");
  });

  it("survives a flaky page and encodes the city", async () => {
    plan[2] = [{ status: 503 }];
    expect(await topRestaurants(base, { city: "new york", n: 5, ...fast })).toEqual(["Bravo"]);
    expect(await topRestaurants(base, { city: "York", n: 1, ...fast })).toEqual(["Delta"]);
  });
});
