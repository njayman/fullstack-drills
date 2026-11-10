import request from "supertest";
import { createApp } from "../src/app.js";

const NOW = new Date("2026-11-09T12:00:00.000Z");
const ORDER = { customerId: "c1", items: [{ sku: "burger", qty: 2, unitPrice: 899 }, { sku: "cola", qty: 1, unitPrice: 199 }] };

let app, n;
beforeEach(() => { app = createApp({ now: () => NOW }); n = 0; });
const post = (body = ORDER, key = `k${++n}`) => {
  const r = request(app).post("/orders").set("Content-Type", "application/json");
  if (key) r.set("Idempotency-Key", key);
  return r.send(body);
};

describe("POST /orders", () => {
  it("creates an order", async () => {
    const res = await post();
    expect(res.status).toBe(201);
    expect(res.body).toEqual({ id: "ord_1", ...ORDER, status: "placed", total: 1997, version: 1, createdAt: NOW.toISOString() });
    expect(res.headers.location).toBe("/orders/ord_1");
    expect(res.headers.etag).toBe('"1"');
    expect((await post()).body.id).toBe("ord_2");
  });

  it("rejects malformed JSON", async () => {
    const res = await request(app).post("/orders").set("Content-Type", "application/json").set("Idempotency-Key", "x").send("{bad");
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("invalid_json");
  });

  it("requires an idempotency key before validating", async () => {
    const res = await post({}, null);
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("missing_idempotency_key");
  });

  it("reports every validation problem", async () => {
    const res = await post({ customerId: "", items: [{ sku: "a", qty: 0, unitPrice: 100 }, { sku: "", qty: 2.5, unitPrice: -1 }, { sku: "ok", qty: 21, unitPrice: "1" }] });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("validation");
    expect(res.body.details.map((d) => d.field).sort()).toEqual([
      "customerId", "items[0].qty", "items[1].qty", "items[1].sku", "items[1].unitPrice", "items[2].qty", "items[2].unitPrice",
    ].sort());
    res.body.details.forEach((d) => expect(typeof d.message).toBe("string"));
  });

  it.each([[{ customerId: "c" }], [{ customerId: "c", items: [] }], [{ customerId: "c", items: Array(51).fill({ sku: "a", qty: 1, unitPrice: 1 }) }]])(
    "rejects bad items array %#", async (body) => {
      const res = await post(body);
      expect(res.status).toBe(400);
      expect(res.body.details.map((d) => d.field)).toEqual(["items"]);
    });

  it("replays identical requests with the same key", async () => {
    const a = await post(ORDER, "same");
    const b = await post({ items: ORDER.items, customerId: "c1" }, "same"); // key order differs, still equal
    expect(b.status).toBe(201);
    expect(b.body).toEqual(a.body);
    expect(b.headers["idempotent-replayed"]).toBe("true");
    expect(a.headers["idempotent-replayed"]).toBeUndefined();
    expect((await request(app).get("/orders")).body.data).toHaveLength(1);
  });

  it("rejects key reuse with a different body", async () => {
    await post(ORDER, "same");
    const res = await post({ ...ORDER, customerId: "c2" }, "same");
    expect(res.status).toBe(422);
    expect(res.body.error).toBe("idempotency_key_reuse");
  });

  it("does not remember failed validation", async () => {
    expect((await post({}, "k")).status).toBe(400);
    expect((await post(ORDER, "k")).status).toBe(201);
  });
});

describe("GET /orders/:id", () => {
  it("404s", async () => {
    const res = await request(app).get("/orders/ord_9");
    expect(res.status).toBe(404);
    expect(res.body.error).toBe("not_found");
  });

  it("supports conditional GET", async () => {
    await post();
    const res = await request(app).get("/orders/ord_1");
    expect(res.status).toBe(200);
    expect(res.headers.etag).toBe('"1"');
    const cached = await request(app).get("/orders/ord_1").set("If-None-Match", '"1"');
    expect(cached.status).toBe(304);
    expect(cached.text).toBe("");
    expect((await request(app).get("/orders/ord_1").set("If-None-Match", '"0"')).status).toBe(200);
  });
});

describe("transitions", () => {
  const move = (id, to, etag) => {
    const r = request(app).post(`/orders/${id}/transitions`);
    if (etag) r.set("If-Match", etag);
    return r.send({ to });
  };

  it("walks the happy path with versions", async () => {
    await post();
    let etag = '"1"';
    for (const to of ["accepted", "preparing", "out_for_delivery", "delivered"]) {
      const res = await move("ord_1", to, etag);
      expect(res.status).toBe(200);
      expect(res.body.status).toBe(to);
      etag = res.headers.etag;
    }
    expect(etag).toBe('"5"');
    expect((await request(app).get("/orders/ord_1")).body.version).toBe(5);
  });

  it("checks existence, then If-Match", async () => {
    expect((await move("nope", "accepted", '"1"')).status).toBe(404);
    await post();
    const a = await move("ord_1", "accepted");
    expect(a.status).toBe(428);
    expect(a.body.error).toBe("precondition_required");
    const b = await move("ord_1", "accepted", '"7"');
    expect(b.status).toBe(412);
    expect(b.body.error).toBe("precondition_failed");
  });

  it("lost update: second writer with stale etag gets 412", async () => {
    await post();
    expect((await move("ord_1", "accepted", '"1"')).status).toBe(200);
    expect((await move("ord_1", "cancelled", '"1"')).status).toBe(412);
  });

  it.each([["placed", "delivered"], ["placed", "preparing"], ["placed", "teleported"]])("rejects %s -> %s", async (from, to) => {
    await post();
    const res = await move("ord_1", to, '"1"');
    expect(res.status).toBe(409);
    expect(res.body).toEqual({ error: "invalid_transition", from, to });
  });

  it("cannot leave a terminal state", async () => {
    await post();
    await move("ord_1", "cancelled", '"1"');
    const res = await move("ord_1", "accepted", '"2"');
    expect(res.status).toBe(409);
  });
});

describe("GET /orders", () => {
  async function seed() {
    for (let i = 0; i < 7; i++) await post({ ...ORDER, customerId: i % 2 ? "odd" : "even" });
  }
  const list = (q) => request(app).get("/orders").query(q);

  it("paginates in creation order", async () => {
    await seed();
    const ids = [];
    let cursor;
    let pages = 0;
    do {
      const res = await list({ limit: 3, ...(cursor && { cursor }) });
      expect(res.status).toBe(200);
      ids.push(...res.body.data.map((o) => o.id));
      cursor = res.body.nextCursor;
      pages++;
    } while (cursor);
    expect(ids).toEqual(["ord_1", "ord_2", "ord_3", "ord_4", "ord_5", "ord_6", "ord_7"]);
    expect(pages).toBe(3);
  });

  it("default limit 10, exact last page has null cursor", async () => {
    await seed();
    const res = await list({ limit: 7 });
    expect(res.body.data).toHaveLength(7);
    expect(res.body.nextCursor).toBeNull();
    expect((await list({})).body.data).toHaveLength(7);
  });

  it("filters by customer and status", async () => {
    await seed();
    await request(app).post("/orders/ord_3/transitions").set("If-Match", '"1"').send({ to: "accepted" });
    const res = await list({ customerId: "even", status: "placed" });
    expect(res.body.data.map((o) => o.id)).toEqual(["ord_1", "ord_5", "ord_7"]);
  });

  it("stays stable when earlier items drop out of the filter", async () => {
    await seed();
    const p1 = await list({ status: "placed", limit: 2 });
    expect(p1.body.data.map((o) => o.id)).toEqual(["ord_1", "ord_2"]);
    await request(app).post("/orders/ord_1/transitions").set("If-Match", '"1"').send({ to: "cancelled" });
    const p2 = await list({ status: "placed", limit: 2, cursor: p1.body.nextCursor });
    expect(p2.body.data.map((o) => o.id)).toEqual(["ord_3", "ord_4"]);
  });

  it.each([{ limit: 0 }, { limit: 51 }, { limit: "abc" }, { limit: 2.5 }, { status: "lost" }])("rejects %j", async (q) => {
    const res = await list(q);
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("validation");
  });

  it("rejects garbage cursors", async () => {
    await seed();
    for (const cursor of ["!!!", "bm9wZQ", Buffer.from('{"after":"x"}').toString("base64url")]) {
      const res = await list({ cursor });
      expect(res.status).toBe(400);
      expect(res.body.error).toBe("invalid_cursor");
    }
  });
});
