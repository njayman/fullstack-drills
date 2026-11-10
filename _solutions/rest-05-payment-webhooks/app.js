import express from "express";
import { createHmac, timingSafeEqual } from "node:crypto";

const TYPES = ["payment.authorized", "payment.captured", "payment.refunded", "payment.failed"];
const posInt = (v, min = 1) => Number.isInteger(v) && v >= min;
const str = (v) => typeof v === "string" && v !== "";

function parseHeader(h) {
  if (!h) return null;
  let t = null;
  const v1 = [];
  for (const part of h.split(",")) {
    const [k, v] = part.split("=", 2).map((s) => s?.trim());
    if (k === "t" && /^\d+$/.test(v ?? "")) t = Number(v);
    if (k === "v1" && v) v1.push(v);
  }
  return t === null || !v1.length ? null : { t, v1 };
}

function apply(o, e) {
  const type = e.type.slice(8);
  if (type === "authorized" && o.state === "none") { o.state = "authorized"; o.authorized = e.amount; return true; }
  if (type === "captured" && o.state === "authorized" && e.amount <= o.authorized) { o.state = "captured"; o.captured = e.amount; return true; }
  if (type === "refunded" && ["captured", "partially_refunded"].includes(o.state) && o.refunded + e.amount <= o.captured) {
    o.refunded += e.amount;
    o.state = o.refunded === o.captured ? "refunded" : "partially_refunded";
    return true;
  }
  if (type === "failed" && ["none", "authorized"].includes(o.state)) { o.state = "failed"; return true; }
  return false;
}

export function createApp({ secret, now = Date.now } = {}) {
  const app = express();
  const seen = new Set();
  const orders = new Map(); // orderId -> { state, version, authorized, captured, refunded, held: Map<version, event>, rejected: [] }

  const getOrder = (id) => {
    if (!orders.has(id)) orders.set(id, { state: "none", version: 0, authorized: 0, captured: 0, refunded: 0, held: new Map(), rejected: [] });
    return orders.get(id);
  };
  const process = (o, e) => {
    o.version = e.version;
    if (apply(o, e)) return "applied";
    o.rejected.push(e.id);
    return "rejected";
  };

  app.post("/webhooks/payments", express.raw({ type: () => true }), (req, res) => {
    const raw = Buffer.isBuffer(req.body) ? req.body : Buffer.alloc(0);
    const sig = parseHeader(req.get("X-Signature"));
    if (!sig) return res.status(400).json({ error: "bad_signature_header" });
    const expected = createHmac("sha256", secret).update(`${sig.t}.`).update(raw).digest();
    const ok = sig.v1.some((v) => {
      if (!/^[0-9a-f]+$/i.test(v)) return false;
      const got = Buffer.from(v, "hex");
      return got.length === expected.length && timingSafeEqual(got, expected);
    });
    if (!ok) return res.status(401).json({ error: "invalid_signature" });
    if (Math.abs(now() / 1000 - sig.t) > 300) return res.status(401).json({ error: "timestamp_out_of_range" });
    let e;
    try { e = JSON.parse(raw.toString("utf8")); } catch { return res.status(400).json({ error: "invalid_json" }); }
    if (!e || !str(e.id) || !str(e.orderId) || !posInt(e.version) || !TYPES.includes(e.type)
      || (e.type !== "payment.failed" && !posInt(e.amount)))
      return res.status(400).json({ error: "validation" });

    if (seen.has(e.id)) return res.json({ status: "duplicate" });
    const o = getOrder(e.orderId);
    if (e.version <= o.version) { seen.add(e.id); return res.json({ status: "stale" }); }
    if (e.version > o.version + 1) {
      if (o.held.has(e.version)) return res.json({ status: "duplicate" });
      seen.add(e.id);
      o.held.set(e.version, e);
      return res.status(202).json({ status: "queued" });
    }
    seen.add(e.id);
    const status = process(o, e);
    while (o.held.has(o.version + 1)) {
      const next = o.held.get(o.version + 1);
      o.held.delete(next.version);
      process(o, next);
    }
    res.json({ status });
  });

  app.get("/orders/:orderId/payment", (req, res) => {
    const o = orders.get(req.params.orderId);
    if (!o) return res.status(404).json({ error: "not_found" });
    const { held, ...rest } = o;
    res.json({ orderId: req.params.orderId, ...rest, pending: [...held.keys()].sort((a, b) => a - b), rejected: [...o.rejected] });
  });

  return app;
}
