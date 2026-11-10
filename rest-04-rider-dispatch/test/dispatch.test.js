import request from "supertest";
import { createApp } from "../src/app.js";
import { createStore } from "../src/store.js";

const P = { lat: 51.5074, lng: -0.1278 }; // pickup
const SPOTS = {
  a: { lat: 51.5155, lng: -0.0922 }, // 2.623 km
  b: { lat: 51.5033, lng: -0.1196 }, // 0.728 km
  c: { lat: 51.47, lng: -0.4543 }, // 22.985 km
  e: { lat: 51.54, lng: -0.14 }, // 3.722 km
};

let app, store;
beforeEach(() => { store = createStore(); app = createApp({ store }); });
const putRider = (id, body) => request(app).put(`/riders/${id}`).send(body);
const rider = (id, spot, available = true) => putRider(id, { ...SPOTS[spot], available });
const order = (id, pickup = P) => request(app).post("/orders").send({ id, pickup });
const assign = (id) => request(app).post(`/orders/${id}/assign`);

describe("riders", () => {
  it("creates and updates", async () => {
    const res = await rider("r1", "a");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ id: "r1", ...SPOTS.a, available: true, orderId: null });
    const upd = await rider("r1", "b", false);
    expect(upd.body).toEqual({ id: "r1", ...SPOTS.b, available: false, orderId: null });
  });

  it("validates every field", async () => {
    const res = await putRider("r1", { lat: 91, lng: "0", available: "yes" });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("validation");
    expect(res.body.details.sort()).toEqual(["available", "lat", "lng"]);
    expect((await putRider("r1", { lat: -90, lng: 180, available: false })).status).toBe(200);
  });

  it("nearby: radius, order, ties, rounding, limit", async () => {
    await Promise.all([rider("a", "a"), rider("b", "b"), rider("b0", "b"), rider("c", "c"), rider("e", "e"), rider("x", "b", false)]);
    const near = (q) => request(app).get("/riders/nearby").query({ ...P, ...q });
    const res = await near({});
    expect(res.status).toBe(200);
    expect(res.body).toEqual([
      { id: "b", distanceKm: 0.728 }, { id: "b0", distanceKm: 0.728 },
      { id: "a", distanceKm: 2.623 }, { id: "e", distanceKm: 3.722 },
    ]);
    expect((await near({ radiusKm: 3 })).body.map((r) => r.id)).toEqual(["b", "b0", "a"]);
    expect((await near({ radiusKm: 30, limit: 5 })).body.map((r) => r.id)).toEqual(["b", "b0", "a", "e", "c"]);
    expect((await near({ limit: 1 })).body).toHaveLength(1);
  });

  it.each([{ lat: "abc" }, { lat: 100 }, { radiusKm: 0 }, { radiusKm: -1 }, { limit: 0 }, { limit: 51 }, { limit: 1.5 }])(
    "nearby rejects %j", async (q) => {
      const res = await request(app).get("/riders/nearby").query({ ...P, ...q });
      expect(res.status).toBe(400);
    });

  it("nearby requires lat and lng", async () => {
    expect((await request(app).get("/riders/nearby").query({ lat: 1 })).status).toBe(400);
  });
});

describe("orders and assignment", () => {
  it("creates orders, rejects duplicates and bad input", async () => {
    const res = await order("o1");
    expect(res.status).toBe(201);
    expect(res.body).toEqual({ id: "o1", pickup: P, status: "pending", riderId: null });
    expect((await order("o1")).status).toBe(409);
    expect((await order("o1")).body.error).toBe("order_exists");
    expect((await request(app).post("/orders").send({ id: "", pickup: { lat: 0, lng: 999 } })).status).toBe(400);
  });

  it("assigns the nearest available rider within 5km", async () => {
    await Promise.all([rider("a", "a"), rider("b", "b", false), rider("c", "c")]);
    await order("o1");
    const res = await assign("o1");
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ id: "o1", status: "assigned", riderId: "a" });
    expect(await store.getRider("a")).toMatchObject({ available: false, orderId: "o1" });
    await order("o2");
    const none = await assign("o2"); // b unavailable, c too far
    expect(none.status).toBe(409);
    expect(none.body.error).toBe("no_rider_available");
    expect((await assign("nope")).status).toBe(404);
  });

  it("is idempotent", async () => {
    await Promise.all([rider("a", "a"), rider("b", "b")]);
    await order("o1");
    const first = await assign("o1");
    const again = await assign("o1");
    expect(again.status).toBe(200);
    expect(again.body.riderId).toBe(first.body.riderId);
    expect((await store.getRider("a")).available).toBe(true);
  });

  it("busy rider cannot be marked available, but can move", async () => {
    await rider("b", "b");
    await order("o1");
    await assign("o1");
    const res = await rider("b", "a", true);
    expect(res.status).toBe(409);
    expect(res.body.error).toBe("rider_busy");
    const moved = await rider("b", "a", false);
    expect(moved.status).toBe(200);
    expect(moved.body).toMatchObject({ ...SPOTS.a, orderId: "o1" });
  });

  it("complete frees the rider", async () => {
    await rider("b", "b");
    await order("o1"); await order("o2");
    expect((await request(app).post("/orders/o1/complete")).status).toBe(409);
    await assign("o1");
    const done = await request(app).post("/orders/o1/complete");
    expect(done.status).toBe(200);
    expect(done.body.status).toBe("delivered");
    expect(await store.getRider("b")).toMatchObject({ available: true, orderId: null });
    expect((await assign("o2")).body.riderId).toBe("b");
    expect((await request(app).post("/orders/o1/complete")).status).toBe(409);
  });
});

describe("concurrency", () => {
  it("parallel assigns for different orders never share a rider", async () => {
    for (let round = 0; round < 5; round++) {
      store = createStore(); app = createApp({ store });
      await Promise.all(["a", "b", "e"].map((s, i) => rider(`r${i}`, s)));
      const ids = Array.from({ length: 10 }, (_, i) => `o${i}`);
      await Promise.all(ids.map((id) => order(id)));
      const results = await Promise.all(ids.map(assign));
      const ok = results.filter((r) => r.status === 200);
      expect(ok).toHaveLength(3);
      expect(new Set(ok.map((r) => r.body.riderId)).size).toBe(3);
      expect(results.filter((r) => r.status === 409)).toHaveLength(7);
      for (const r of ok) expect((await store.getRider(r.body.riderId)).orderId).toBe(r.body.id);
    }
  });

  it("parallel assigns for the same order use one rider", async () => {
    await Promise.all(["a", "b", "e"].map((s, i) => rider(`r${i}`, s)));
    await order("o1");
    const results = await Promise.all(Array.from({ length: 8 }, () => assign("o1")));
    expect(results.every((r) => r.status === 200)).toBe(true);
    expect(new Set(results.map((r) => r.body.riderId))).toEqual(new Set(["r1"]));
    const busy = (await store.listRiders()).filter((r) => !r.available);
    expect(busy.map((r) => r.id)).toEqual(["r1"]);
  });

  it("parallel complete + assign keeps state consistent", async () => {
    await rider("r1", "b");
    await order("o1"); await order("o2");
    await assign("o1");
    const [done, next] = await Promise.all([request(app).post("/orders/o1/complete"), assign("o2")]);
    expect(done.status).toBe(200);
    const r = await store.getRider("r1");
    if (next.status === 200) expect(r).toMatchObject({ available: false, orderId: "o2" });
    else expect(r).toMatchObject({ available: true, orderId: null });
  });
});
