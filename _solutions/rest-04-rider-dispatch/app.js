import express from "express";
import { createStore } from "./store.js";

const toRad = (x) => (x * Math.PI) / 180;
function km(a, b) {
  const dLat = toRad(b.lat - a.lat), dLng = toRad(b.lng - a.lng);
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(s));
}
const coordErrors = (o, prefix = "") => {
  const d = [];
  if (typeof o?.lat !== "number" || !(o.lat >= -90 && o.lat <= 90)) d.push(`${prefix}lat`);
  if (typeof o?.lng !== "number" || !(o.lng >= -180 && o.lng <= 180)) d.push(`${prefix}lng`);
  return d;
};
const num = (v) => (v === undefined || v === "" ? NaN : Number(v));

export function createApp({ store = createStore() } = {}) {
  const app = express();
  app.use(express.json());

  // ponytail: one global lock for all writes, per-rider/order locks if throughput matters
  let chain = Promise.resolve();
  const locked = (fn) => (req, res) => {
    const run = chain.then(() => fn(req, res));
    chain = run.catch(() => {});
    return run.catch((e) => res.status(500).json({ error: "internal", message: e.message }));
  };
  const bad = (res, details) => res.status(400).json({ error: "validation", details });

  app.put("/riders/:id", locked(async (req, res) => {
    const b = req.body ?? {};
    const details = coordErrors(b);
    if (typeof b.available !== "boolean") details.push("available");
    if (details.length) return bad(res, details);
    const prev = await store.getRider(req.params.id);
    if (prev?.orderId && b.available) return res.status(409).json({ error: "rider_busy" });
    const r = { id: req.params.id, lat: b.lat, lng: b.lng, available: b.available, orderId: prev?.orderId ?? null };
    await store.putRider(r);
    res.json(r);
  }));

  app.get("/riders/nearby", async (req, res) => {
    const p = { lat: num(req.query.lat), lng: num(req.query.lng) };
    const radius = req.query.radiusKm === undefined ? 5 : num(req.query.radiusKm);
    const limit = req.query.limit === undefined ? 10 : num(req.query.limit);
    const details = coordErrors(p);
    if (!(radius > 0)) details.push("radiusKm");
    if (!Number.isInteger(limit) || limit < 1 || limit > 50) details.push("limit");
    if (details.length) return bad(res, details);
    const out = (await store.listRiders())
      .filter((r) => r.available)
      .map((r) => ({ id: r.id, d: km(p, r) }))
      .filter((r) => r.d <= radius)
      .sort((a, b) => a.d - b.d || (a.id < b.id ? -1 : 1))
      .slice(0, limit)
      .map((r) => ({ id: r.id, distanceKm: Math.round(r.d * 1000) / 1000 }));
    res.json(out);
  });

  app.post("/orders", locked(async (req, res) => {
    const { id, pickup } = req.body ?? {};
    const details = coordErrors(pickup, "pickup.");
    if (typeof id !== "string" || !id.trim()) details.unshift("id");
    if (details.length) return bad(res, details);
    if (await store.getOrder(id)) return res.status(409).json({ error: "order_exists" });
    const o = { id, pickup: { lat: pickup.lat, lng: pickup.lng }, status: "pending", riderId: null };
    await store.putOrder(o);
    res.status(201).json(o);
  }));

  app.post("/orders/:id/assign", locked(async (req, res) => {
    const o = await store.getOrder(req.params.id);
    if (!o) return res.status(404).json({ error: "not_found" });
    if (o.riderId) return res.json(o);
    const best = (await store.listRiders())
      .filter((r) => r.available)
      .map((r) => ({ r, d: km(o.pickup, r) }))
      .filter((x) => x.d <= 5)
      .sort((a, b) => a.d - b.d || (a.r.id < b.r.id ? -1 : 1))[0];
    if (!best) return res.status(409).json({ error: "no_rider_available" });
    await store.putRider({ ...best.r, available: false, orderId: o.id });
    const updated = { ...o, status: "assigned", riderId: best.r.id };
    await store.putOrder(updated);
    res.json(updated);
  }));

  app.post("/orders/:id/complete", locked(async (req, res) => {
    const o = await store.getOrder(req.params.id);
    if (!o) return res.status(404).json({ error: "not_found" });
    if (o.status !== "assigned") return res.status(409).json({ error: "not_assigned" });
    const r = await store.getRider(o.riderId);
    await store.putRider({ ...r, available: true, orderId: null });
    const updated = { ...o, status: "delivered" };
    await store.putOrder(updated);
    res.json(updated);
  }));

  return app;
}
