# REST 04: Rider dispatch

Time box: 50 min. `bun install && bun run test`. Edit `src/app.js` only. `src/store.js` is given: an async fake DB with random latency that returns copies. Do not edit it, and keep all state in it.

Export `createApp({ store } = {})` (default `createStore()`).

The hard part: tests fire many requests in parallel. Naive read-then-write code will double-assign riders.

Distances: haversine, Earth radius 6371 km.

## PUT /riders/:id
Body `{ lat, lng, available }`.
- 400 `{ error: "validation", details: [field, ...] }`: `lat` number -90..90, `lng` number -180..180, `available` boolean.
- Rider is on an order and `available: true`: 409 `{ error: "rider_busy" }` (nothing changes).
- 200 `{ id, lat, lng, available, orderId }`. `orderId` is `null` for new riders and is kept on updates.

## GET /riders/nearby?lat&lng&radiusKm&limit
- `radiusKm` default 5 (number > 0), `limit` default 10 (integer 1..50). Bad or missing values: 400 `validation`.
- 200 `[{ id, distanceKm }]`: available riders with distance <= radius, nearest first, ties by `id` asc. `distanceKm` rounded to 3 decimals.

## POST /orders
Body `{ id, pickup: { lat, lng } }`.
- 400 `validation` (`id` non-empty string, pickup coords as above). 409 `{ error: "order_exists" }`.
- 201 `{ id, pickup, status: "pending", riderId: null }`.

## POST /orders/:id/assign
- 404 `{ error: "not_found" }`.
- Already assigned: 200 with the existing assignment (idempotent, even under parallel calls).
- Otherwise pick the nearest available rider within 5 km (ties by id). Rider becomes `available: false`, `orderId` set. Order becomes `status: "assigned"`, `riderId` set. 200 order.
- None: 409 `{ error: "no_rider_available" }`.
- Under any amount of parallel calls, a rider is never on two orders.

## POST /orders/:id/complete
- 404, or 409 `{ error: "not_assigned" }` unless status is `assigned`.
- Order `status: "delivered"`. Rider `available: true`, `orderId: null`. 200 order.
