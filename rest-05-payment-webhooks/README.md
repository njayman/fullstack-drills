# REST 05: Payment webhooks receiver

Time box: 55 min. `bun install && bun run test`. Edit `src/app.js` only.

Export `createApp({ secret, now })`. `now()` returns milliseconds (default `Date.now`). State in memory.

A payment provider sends events to `POST /webhooks/payments`. Deliveries can be duplicated, delayed and out of order.

## 1. Verify (in this order)
- Header `X-Signature: t=<unix seconds>,v1=<hex>[,v1=<hex>...]`. Several `v1` entries can appear during key rotation; one match is enough.
- Missing or unparseable header (no `t`, non-numeric `t`, no `v1`): 400 `{ error: "bad_signature_header" }`.
- Expected `v1` = hex HMAC-SHA256 with `secret` over `` `${t}.${rawBody}` ``, where `rawBody` is the exact bytes received. No match: 401 `{ error: "invalid_signature" }`. Compare in constant time (`crypto.timingSafeEqual`).
- `|now()/1000 - t| > 300`: 401 `{ error: "timestamp_out_of_range" }`.
- Body not JSON: 400 `{ error: "invalid_json" }`.

## 2. Validate
Event `{ id, type, orderId, version, amount }`:
- `id`, `orderId`: non-empty strings. `version`: integer >= 1.
- `type`: `payment.authorized`, `payment.captured`, `payment.refunded`, `payment.failed`.
- `amount`: positive integer, required except for `payment.failed`.
- Otherwise 400 `{ error: "validation" }`.

## 3. Order the stream (per `orderId`)
Each order starts at `{ state: "none", version: 0, authorized: 0, captured: 0, refunded: 0 }`.
- Event `id` seen before (applied, queued, stale or rejected): 200 `{ status: "duplicate" }`.
- `version <= current`: 200 `{ status: "stale" }`.
- `version > current + 1`: hold it, 202 `{ status: "queued" }`. A second held event with the same version is `duplicate`.
- `version === current + 1`: process it, then process any held events that are now next in line. 200 `{ status: "applied" }` (or `"rejected"`, see below, for this event).

## 4. Apply
- `authorized`: from `none`. Sets `authorized = amount`.
- `captured`: from `authorized`, `amount <= authorized`. Sets `captured = amount`.
- `refunded`: from `captured` or `partially_refunded`, total refunded `<= captured`. Adds to `refunded`. State becomes `refunded` when fully refunded, else `partially_refunded`.
- `failed`: from `none` or `authorized`.
- Anything else is rejected: the version still advances (so the stream never stalls), state and amounts unchanged, event id added to `rejected`. Response 200 `{ status: "rejected" }`.

## GET /orders/:orderId/payment
- 404 `{ error: "not_found" }` if no valid event for the order was ever received.
- 200 `{ orderId, state, version, authorized, captured, refunded, pending, rejected }`. `pending` = held versions ascending. `rejected` = rejected event ids in processing order.
