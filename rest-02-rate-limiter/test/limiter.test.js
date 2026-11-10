import request from "supertest";
import { createApp } from "../src/app.js";

let t, app;
beforeEach(() => {
  t = 0;
  app = createApp({ now: () => t, keys: { f1: "free", f2: "free", p1: "pro" } });
});
const search = (key) => request(app).get("/search").set("X-API-Key", key);
const order = (key) => request(app).post("/orders").set("X-API-Key", key);
const remaining = (res) => Number(res.headers["x-ratelimit-remaining"]);
async function burst(fn, n) { const out = []; for (let i = 0; i < n; i++) out.push(await fn()); return out; }

describe("auth and exemptions", () => {
  it("health is exempt", async () => {
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
    expect(res.headers["x-ratelimit-limit"]).toBeUndefined();
  });

  it("401 without key, 403 unknown key, no headers", async () => {
    const a = await request(app).get("/search");
    expect(a.status).toBe(401);
    expect(a.body.error).toBe("missing_api_key");
    const b = await search("zzz");
    expect(b.status).toBe(403);
    expect(b.body.error).toBe("invalid_api_key");
    expect(b.headers["x-ratelimit-limit"]).toBeUndefined();
  });
});

describe("free plan: sliding log", () => {
  it("allows 10 then blocks until the window rolls", async () => {
    const ok = await burst(() => search("f1"), 10);
    expect(ok.map((r) => r.status)).toEqual(Array(10).fill(200));
    expect(ok.map(remaining)).toEqual([9, 8, 7, 6, 5, 4, 3, 2, 1, 0]);
    expect(ok[0].headers["x-ratelimit-limit"]).toBe("10");
    const blocked = await search("f1");
    expect(blocked.status).toBe(429);
    expect(blocked.body).toEqual({ error: "rate_limited" });
    expect(blocked.headers["retry-after"]).toBe("60");
    expect(remaining(blocked)).toBe(0);
    t = 59999;
    const still = await search("f1");
    expect(still.status).toBe(429);
    expect(still.headers["retry-after"]).toBe("1");
    t = 60000;
    expect((await search("f1")).status).toBe(200);
  });

  it("is a sliding window, not a fixed one", async () => {
    await burst(() => search("f1"), 5);
    t = 30000;
    await burst(() => search("f1"), 5);
    t = 60000;
    const r = await burst(() => search("f1"), 6);
    expect(r.map((x) => x.status)).toEqual([200, 200, 200, 200, 200, 429]);
    expect(r[5].headers["retry-after"]).toBe("30");
  });

  it("weights by cost and rejected requests consume nothing", async () => {
    expect((await order("f1")).status).toBe(201);
    const second = await order("f1");
    expect(second.status).toBe(201);
    expect(remaining(second)).toBe(0);
    await burst(() => search("f1"), 20);
    t = 60000;
    const r = await burst(() => search("f1"), 10);
    expect(r.every((x) => x.status === 200)).toBe(true);
  });

  it("retry-after accounts for the cost of the blocked request", async () => {
    for (let i = 0; i < 8; i++) { t = i * 1000; await search("f1"); }
    t = 10000;
    const res = await order("f1"); // needs 3 more units: entry at t=2000 expires at 62000
    expect(res.status).toBe(429);
    expect(res.headers["retry-after"]).toBe("52");
    expect(remaining(res)).toBe(2);
    t = 62000;
    expect((await order("f1")).status).toBe(201);
  });

  it("keys are isolated", async () => {
    await burst(() => search("f1"), 10);
    expect((await search("f2")).status).toBe(200);
    expect((await search("p1")).status).toBe(200);
  });

  it("separate apps do not share state", async () => {
    await burst(() => search("f1"), 10);
    const other = createApp({ now: () => t, keys: { f1: "free" } });
    expect((await request(other).get("/search").set("X-API-Key", "f1")).status).toBe(200);
  });
});

describe("pro plan: token bucket", () => {
  it("bursts 20, then refills at 5/s", async () => {
    const r = await burst(() => search("p1"), 20);
    expect(r.every((x) => x.status === 200)).toBe(true);
    expect(r[0].headers["x-ratelimit-limit"]).toBe("20");
    expect(remaining(r[19])).toBe(0);
    const blocked = await search("p1");
    expect(blocked.status).toBe(429);
    expect(blocked.headers["retry-after"]).toBe("1");
    t = 200;
    expect((await search("p1")).status).toBe(200);
    expect((await search("p1")).status).toBe(429);
  });

  it("cost 5 needs 5 tokens", async () => {
    await burst(() => search("p1"), 20);
    t = 800; // 4 tokens
    const res = await order("p1");
    expect(res.status).toBe(429);
    expect(res.headers["retry-after"]).toBe("1");
    expect(remaining(res)).toBe(4);
    t = 1000;
    const ok = await order("p1");
    expect(ok.status).toBe(201);
    expect(remaining(ok)).toBe(0);
  });

  it("floors fractional remaining", async () => {
    await search("p1"); // 19
    t = 100; // 19.5
    expect(remaining(await search("p1"))).toBe(18);
  });

  it("caps at capacity after idling", async () => {
    await burst(() => search("p1"), 20);
    t = 3_600_000;
    const r = await burst(() => search("p1"), 21);
    expect(r.filter((x) => x.status === 200)).toHaveLength(20);
    expect(r[20].status).toBe(429);
  });

  it("drained bucket: order allowed exactly 1s later", async () => {
    await burst(() => order("p1"), 4); // 0 tokens
    expect((await order("p1")).headers["retry-after"]).toBe("1");
    t = 999;
    expect((await order("p1")).status).toBe(429);
    t = 1000;
    expect((await order("p1")).status).toBe(201);
  });
});
