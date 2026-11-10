# REST 02: Per-plan rate limiter

Time box: 45 min. `bun install && bun run test`. Edit `src/app.js` only.

Export `createApp({ now, keys })`:
- `now()` returns milliseconds (default `Date.now`). Never read the real clock elsewhere.
- `keys`: `{ [apiKey]: "free" | "pro" }`.

## Routes
- `GET /health`: 200 `{ ok: true }`. No auth, no limit, no rate headers.
- `GET /search`: 200 `{ ok: true }`. Cost 1.
- `POST /orders`: 201 `{ ok: true }`. Cost 5.

## Auth
- No `X-API-Key`: 401 `{ error: "missing_api_key" }`. Unknown key: 403 `{ error: "invalid_api_key" }`. No rate headers on these.

## Plans (state is per key)
- `free`: sliding log, 10 units per rolling 60 000 ms. A request made at time `t` counts while `now - t < 60000`. Allowed if `used + cost <= 10`.
- `pro`: token bucket, capacity 20, refills continuously at 5 tokens per second, starts full. Allowed if `tokens >= cost`.
- Rejected requests consume nothing.

## Headers (on allowed and rejected responses)
- `X-RateLimit-Limit`: 10 or 20.
- `X-RateLimit-Remaining`: free: `10 - used` after this request. Pro: `floor(tokens)` after this request.

## 429
- Body `{ error: "rate_limited" }`.
- `Retry-After`: whole seconds (round up, minimum 1) until this exact request would be allowed.
  - free: the earliest time enough old entries have expired to fit `cost`.
  - pro: time until the bucket holds `cost` tokens.
