import request from "supertest";
import { createHmac } from "node:crypto";
import { createApp } from "../src/app.js";

const SECRET = "whsec_test";
const T = 1_800_000_000; // seconds
let app, nowMs, n;
beforeEach(() => { nowMs = T * 1000; n = 0; app = createApp({ secret: SECRET, now: () => nowMs }); });

const hmac = (secret, t, raw) => createHmac("sha256", secret).update(`${t}.${raw}`).digest("hex");
function send(raw, { t = T, secret = SECRET, header } = {}) {
  const r = request(app).post("/webhooks/payments").set("Content-Type", "application/json");
  const h = header === undefined ? `t=${t},v1=${hmac(secret, t, raw)}` : header;
  if (h !== null) r.set("X-Signature", h);
  return r.send(raw);
}
const ev = (type, version, extra = {}) => ({ id: `evt_${++n}`, type: `payment.${type}`, orderId: "o1", version, amount: 1000, ...extra });
const post = (e, opts) => send(JSON.stringify(e), opts);
const payment = async (id = "o1") => (await request(app).get(`/orders/${id}/payment`)).body;

describe("signature", () => {
  it("accepts a valid event", async () => {
    const res = await post(ev("authorized", 1));
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: "applied" });
    expect(await payment()).toEqual({
      orderId: "o1", state: "authorized", version: 1, authorized: 1000, captured: 0, refunded: 0, pending: [], rejected: [],
    });
  });

  it.each([[null], ["garbage"], ["v1=abc"], [`t=abc,v1=${"0".repeat(64)}`], [`t=${T}`]])("400 for header %j", async (header) => {
    const res = await post(ev("authorized", 1), { header });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("bad_signature_header");
  });

  it("401 for wrong secret, tampered body, non-hex or short signature", async () => {
    expect((await post(ev("authorized", 1), { secret: "nope" })).body.error).toBe("invalid_signature");
    const raw = JSON.stringify(ev("authorized", 1));
    const sig = hmac(SECRET, T, raw);
    const tampered = await send(raw.replace("1000", "9000"), { header: `t=${T},v1=${sig}` });
    expect(tampered.status).toBe(401);
    expect((await send(raw, { header: `t=${T},v1=zz` })).status).toBe(401);
    expect((await send(raw, { header: `t=${T},v1=${sig.slice(0, 10)}` })).status).toBe(401);
    expect((await send(raw, { header: `t=${T + 1},v1=${sig}` })).status).toBe(401);
  });

  it("verifies the raw bytes, not re-serialised JSON", async () => {
    const raw = `{ "id": "evt_x", "type": "payment.authorized",\n  "orderId": "o1", "version": 1, "amount": 1000 }`;
    expect((await send(raw)).status).toBe(200);
  });

  it("accepts any matching v1 during rotation", async () => {
    const raw = JSON.stringify(ev("authorized", 1));
    const res = await send(raw, { header: `t=${T},v1=${hmac("old", T, raw)},v1=${hmac(SECRET, T, raw)}` });
    expect(res.status).toBe(200);
  });

  it("enforces 5 minute tolerance after the signature", async () => {
    expect((await post(ev("authorized", 1), { t: T - 300 })).status).toBe(200);
    const old = await post(ev("captured", 2), { t: T - 301 });
    expect(old.status).toBe(401);
    expect(old.body.error).toBe("timestamp_out_of_range");
    expect((await post(ev("captured", 2), { t: T + 301 })).status).toBe(401);
    const badSigOld = await post(ev("captured", 2), { t: T - 9999, secret: "x" });
    expect(badSigOld.body.error).toBe("invalid_signature");
  });

  it("400 for signed non-JSON", async () => {
    const res = await send("{nope");
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("invalid_json");
  });
});

describe("validation", () => {
  it.each([
    [{ type: "payment.exploded" }], [{ version: 0 }], [{ version: 1.5 }], [{ amount: 0 }], [{ amount: "10" }],
    [{ id: "" }], [{ orderId: 5 }], [{ amount: undefined }],
  ])("rejects %j", async (patch) => {
    const res = await post({ ...ev("authorized", 1), ...patch });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("validation");
  });

  it("failed needs no amount; invalid events do not create the order", async () => {
    await post({ ...ev("authorized", 1), version: 0 });
    expect((await request(app).get("/orders/o1/payment")).status).toBe(404);
    const { amount, ...failed } = ev("failed", 1);
    expect((await post(failed)).status).toBe(200);
    expect((await payment()).state).toBe("failed");
  });
});

describe("stream ordering", () => {
  it("dedupes by event id", async () => {
    const e = ev("authorized", 1);
    await post(e);
    const again = await post(e);
    expect(again.status).toBe(200);
    expect(again.body).toEqual({ status: "duplicate" });
    expect((await payment()).version).toBe(1);
  });

  it("ignores stale versions", async () => {
    await post(ev("authorized", 1));
    await post(ev("captured", 2));
    const res = await post(ev("failed", 2, { amount: undefined }));
    expect(res.body).toEqual({ status: "stale" });
    expect((await payment()).state).toBe("captured");
  });

  it("holds future events and drains them in order", async () => {
    const e3 = ev("refunded", 3, { amount: 400 });
    const e4 = ev("refunded", 4, { amount: 600 });
    const r4 = await post(e4);
    expect(r4.status).toBe(202);
    expect(r4.body).toEqual({ status: "queued" });
    expect((await post(e3)).status).toBe(202);
    expect((await post(e4)).body).toEqual({ status: "duplicate" });
    expect((await post(ev("refunded", 4, { amount: 1 }))).body).toEqual({ status: "duplicate" });
    expect(await payment()).toMatchObject({ state: "none", version: 0, pending: [3, 4] });
    await post(ev("authorized", 1));
    expect(await payment()).toMatchObject({ state: "authorized", version: 1, pending: [3, 4] });
    const r2 = await post(ev("captured", 2));
    expect(r2.body).toEqual({ status: "applied" });
    expect(await payment()).toEqual({
      orderId: "o1", state: "refunded", version: 4, authorized: 1000, captured: 1000, refunded: 1000, pending: [], rejected: [],
    });
  });

  it("orders are independent", async () => {
    await post(ev("authorized", 1));
    await post(ev("authorized", 1, { orderId: "o2", amount: 50 }));
    expect((await payment("o2")).authorized).toBe(50);
    expect((await payment("o1")).authorized).toBe(1000);
  });
});

describe("state machine", () => {
  it("partial refunds then full", async () => {
    await post(ev("authorized", 1));
    await post(ev("captured", 2, { amount: 800 }));
    await post(ev("refunded", 3, { amount: 300 }));
    expect(await payment()).toMatchObject({ state: "partially_refunded", refunded: 300 });
    await post(ev("refunded", 4, { amount: 500 }));
    expect(await payment()).toMatchObject({ state: "refunded", refunded: 800 });
  });

  it("rejects invalid moves but keeps the stream moving", async () => {
    await post(ev("authorized", 1));
    const over = ev("captured", 2, { amount: 1001 });
    const res = await post(over);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: "rejected" });
    expect(await payment()).toMatchObject({ state: "authorized", version: 2, captured: 0, rejected: [over.id] });
    expect((await post(ev("captured", 3))).body).toEqual({ status: "applied" });
    const overRefund = ev("refunded", 4, { amount: 2000 });
    const lateFail = ev("failed", 5, { amount: undefined });
    await post(lateFail); // queued
    await post(overRefund); // rejected, then drains 5 (also rejected)
    expect(await payment()).toMatchObject({ state: "captured", version: 5, refunded: 0, rejected: [over.id, overRefund.id, lateFail.id] });
  });

  it("rejected events are still duplicates on redelivery", async () => {
    const bad = ev("captured", 1);
    expect((await post(bad)).body).toEqual({ status: "rejected" });
    expect((await post(bad)).body).toEqual({ status: "duplicate" });
  });

  it("404 for unknown orders", async () => {
    const res = await request(app).get("/orders/zzz/payment");
    expect(res.status).toBe(404);
    expect(res.body.error).toBe("not_found");
  });
});
