# REST 01: Orders API

Time box: 50 min. `bun install && bun run test`. Edit `src/app.js` only (`src/server.js` runs it).

Export `createApp({ now } = {})` returning an Express app. `now()` returns a `Date` (default `() => new Date()`). Store everything in memory, per app instance.

All error bodies are `{ error: "<code>", ... }`.

## POST /orders
Body `{ customerId, items: [{ sku, qty, unitPrice }] }`.
- Malformed JSON: 400 `invalid_json`.
- `Idempotency-Key` header missing: 400 `missing_idempotency_key` (checked before validation).
- Validation: 400 `{ error: "validation", details: [{ field, message }] }` listing every problem:
  - `customerId`: non-empty string.
  - `items`: array with 1 to 50 entries.
  - `items[i].sku`: non-empty string. `items[i].qty`: integer 1 to 20. `items[i].unitPrice`: positive integer (pence).
- 201: `{ id, customerId, items, status: "placed", total, version: 1, createdAt }`.
  - `id` is `ord_1`, `ord_2`, ... per app. `total` = sum of qty * unitPrice. `createdAt` = `now().toISOString()`.
  - Headers: `Location: /orders/<id>`, `ETag: "1"` (the version, quoted).
- Idempotency:
  - Same key and deep-equal body: replay the original status and body, with header `Idempotent-Replayed: true`. No new order.
  - Same key, different body: 422 `idempotency_key_reuse`.
  - Requests that fail validation are not remembered.

## GET /orders/:id
- 404 `not_found`. 200 with `ETag`. `If-None-Match` equal to the current ETag: 304, empty body.

## GET /orders
Query: `customerId`, `status`, `limit` (default 10, integer 1 to 50), `cursor`.
- 200 `{ data, nextCursor }` in creation order. `nextCursor` is `null` on the last page.
- Bad `limit` or unknown `status`: 400 `validation`.
- Cursor is opaque to clients. Garbage cursor: 400 `invalid_cursor`.
- Pagination must be stable: if an order on an earlier page changes so it no longer matches the filter, the next page must not skip anything (keyset, not offset).

## POST /orders/:id/transitions
Body `{ to }`. Requires `If-Match`.
- 404 `not_found` first. No `If-Match`: 428 `precondition_required`. Not the current ETag: 412 `precondition_failed`.
- Allowed: `placed -> accepted | cancelled`, `accepted -> preparing | cancelled`, `preparing -> out_for_delivery`, `out_for_delivery -> delivered`.
- Anything else: 409 `{ error: "invalid_transition", from, to }`.
- 200: updated order, `version + 1`, new `ETag`.
