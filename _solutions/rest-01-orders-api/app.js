import express from "express";
import { isDeepStrictEqual } from "node:util";

const NEXT = { placed: ["accepted", "cancelled"], accepted: ["preparing", "cancelled"], preparing: ["out_for_delivery"], out_for_delivery: ["delivered"] };
const STATUSES = ["placed", "accepted", "preparing", "out_for_delivery", "delivered", "cancelled"];
const isInt = (v, lo, hi = Infinity) => Number.isInteger(v) && v >= lo && v <= hi;
const nonEmpty = (v) => typeof v === "string" && v.trim() !== "";

function validate(b) {
  const d = [];
  const err = (field, message) => d.push({ field, message });
  if (!nonEmpty(b?.customerId)) err("customerId", "must be a non-empty string");
  if (!Array.isArray(b?.items) || b.items.length < 1 || b.items.length > 50) err("items", "must have 1 to 50 items");
  else b.items.forEach((it, i) => {
    if (!nonEmpty(it?.sku)) err(`items[${i}].sku`, "must be a non-empty string");
    if (!isInt(it?.qty, 1, 20)) err(`items[${i}].qty`, "must be an integer 1 to 20");
    if (!isInt(it?.unitPrice, 1)) err(`items[${i}].unitPrice`, "must be a positive integer");
  });
  return d;
}

export function createApp({ now = () => new Date() } = {}) {
  const app = express();
  const orders = new Map(); // id -> order (Map keeps insertion order)
  const seqOf = new Map();
  const idem = new Map(); // key -> { body, status, response }
  let seq = 0;

  app.use(express.json());
  const etag = (o) => `"${o.version}"`;
  const send = (res, status, o) => res.status(status).set("ETag", etag(o)).json(o);

  app.post("/orders", (req, res) => {
    const key = req.get("Idempotency-Key");
    if (!key) return res.status(400).json({ error: "missing_idempotency_key" });
    const prev = idem.get(key);
    if (prev) {
      if (!isDeepStrictEqual(prev.body, req.body)) return res.status(422).json({ error: "idempotency_key_reuse" });
      return res.status(prev.status).set({ Location: `/orders/${prev.response.id}`, ETag: '"1"', "Idempotent-Replayed": "true" }).json(prev.response);
    }
    const details = validate(req.body);
    if (details.length) return res.status(400).json({ error: "validation", details });
    const { customerId, items } = req.body;
    const id = `ord_${++seq}`;
    const order = {
      id, customerId,
      items: items.map(({ sku, qty, unitPrice }) => ({ sku, qty, unitPrice })),
      status: "placed",
      total: items.reduce((s, i) => s + i.qty * i.unitPrice, 0),
      version: 1,
      createdAt: now().toISOString(),
    };
    orders.set(id, order);
    seqOf.set(id, seq);
    idem.set(key, { body: req.body, status: 201, response: structuredClone(order) });
    res.set("Location", `/orders/${id}`);
    send(res, 201, order);
  });

  app.get("/orders", (req, res) => {
    const { customerId, status, cursor } = req.query;
    const limit = req.query.limit === undefined ? 10 : Number(req.query.limit);
    if (!isInt(limit, 1, 50) || (status !== undefined && !STATUSES.includes(status)))
      return res.status(400).json({ error: "validation", details: [] });
    let after = 0;
    if (cursor !== undefined) {
      try { after = JSON.parse(Buffer.from(cursor, "base64url").toString()).after; } catch { after = null; }
      if (!isInt(after, 0)) return res.status(400).json({ error: "invalid_cursor" });
    }
    const matches = [...orders.values()].filter((o) =>
      seqOf.get(o.id) > after && (!customerId || o.customerId === customerId) && (!status || o.status === status));
    const data = matches.slice(0, limit);
    const nextCursor = matches.length > limit
      ? Buffer.from(JSON.stringify({ after: seqOf.get(data.at(-1).id) })).toString("base64url")
      : null;
    res.json({ data, nextCursor });
  });

  app.get("/orders/:id", (req, res) => {
    const o = orders.get(req.params.id);
    if (!o) return res.status(404).json({ error: "not_found" });
    if (req.get("If-None-Match") === etag(o)) return res.status(304).set("ETag", etag(o)).end();
    send(res, 200, o);
  });

  app.post("/orders/:id/transitions", (req, res) => {
    const o = orders.get(req.params.id);
    if (!o) return res.status(404).json({ error: "not_found" });
    const ifMatch = req.get("If-Match");
    if (!ifMatch) return res.status(428).json({ error: "precondition_required" });
    if (ifMatch !== etag(o)) return res.status(412).json({ error: "precondition_failed" });
    const to = req.body?.to;
    if (!NEXT[o.status]?.includes(to)) return res.status(409).json({ error: "invalid_transition", from: o.status, to });
    o.status = to;
    o.version++;
    send(res, 200, o);
  });

  app.use((err, req, res, next) => {
    if (err.type === "entity.parse.failed") return res.status(400).json({ error: "invalid_json" });
    res.status(500).json({ error: "internal" });
  });

  return app;
}
