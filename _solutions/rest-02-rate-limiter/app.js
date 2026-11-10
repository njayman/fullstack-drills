import express from "express";

const WINDOW = 60_000, FREE_LIMIT = 10, CAP = 20, RATE = 5 / 1000; // tokens per ms

export function createApp({ now = Date.now, keys = {} } = {}) {
  const app = express();
  const logs = new Map(); // key -> [{ t, cost }]
  const buckets = new Map(); // key -> { tokens, at }

  function free(key, cost) {
    const t = now();
    const log = (logs.get(key) ?? []).filter((e) => t - e.t < WINDOW);
    logs.set(key, log);
    const used = log.reduce((s, e) => s + e.cost, 0);
    if (used + cost <= FREE_LIMIT) {
      log.push({ t, cost });
      return { ok: true, limit: FREE_LIMIT, remaining: FREE_LIMIT - used - cost };
    }
    let freed = 0, wait = 0;
    for (const e of log) {
      freed += e.cost;
      if (used - freed + cost <= FREE_LIMIT) { wait = e.t + WINDOW - t; break; }
    }
    return { ok: false, limit: FREE_LIMIT, remaining: FREE_LIMIT - used, wait };
  }

  function pro(key, cost) {
    const t = now();
    const b = buckets.get(key) ?? { tokens: CAP, at: t };
    b.tokens = Math.min(CAP, b.tokens + (t - b.at) * RATE);
    b.at = t;
    buckets.set(key, b);
    if (b.tokens >= cost) {
      b.tokens -= cost;
      return { ok: true, limit: CAP, remaining: Math.floor(b.tokens) };
    }
    return { ok: false, limit: CAP, remaining: Math.floor(b.tokens), wait: (cost - b.tokens) / RATE };
  }

  const limit = (cost) => (req, res, next) => {
    const key = req.get("X-API-Key");
    if (!key) return res.status(401).json({ error: "missing_api_key" });
    const plan = keys[key];
    if (!plan) return res.status(403).json({ error: "invalid_api_key" });
    const r = plan === "pro" ? pro(key, cost) : free(key, cost);
    res.set({ "X-RateLimit-Limit": String(r.limit), "X-RateLimit-Remaining": String(r.remaining) });
    if (r.ok) return next();
    res.set("Retry-After", String(Math.max(1, Math.ceil(r.wait / 1000))));
    res.status(429).json({ error: "rate_limited" });
  };

  app.get("/health", (req, res) => res.json({ ok: true }));
  app.get("/search", limit(1), (req, res) => res.json({ ok: true }));
  app.post("/orders", limit(5), (req, res) => res.status(201).json({ ok: true }));
  return app;
}
