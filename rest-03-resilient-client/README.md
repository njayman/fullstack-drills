# REST 03: Resilient paginated client

Time box: 50 min. `bun install && bun run test`. Edit `src/client.js` only. Use the global `fetch`; no extra packages.

The tests start a real local server that misbehaves on purpose (slow pages, 5xx, 429, hangs).

The API is jsonmock-style: `GET <url>&page=N` (or `?page=N`) returns `{ page, per_page, total, total_pages, data }`.

## `export class HttpError extends Error`
Has a `status` property (the HTTP status).

## `export async function fetchAllPages(url, opts)`
Returns every page's `data` concatenated in page order.

Options and defaults: `concurrency = 3`, `retries = 3`, `baseDelayMs = 100`, `timeoutMs = 2000`, `signal`.

- Fetch page 1 first to learn `total_pages`. Then fetch pages 2..total_pages with at most `concurrency` requests in flight at once. Page 1 is never re-requested.
- `total_pages` of 0: return `[]` after the single request.
- Retry on 5xx, 429, network errors and timeouts, up to `retries` extra attempts per page.
  - 429 with a `Retry-After` header (seconds): wait exactly that long.
  - Otherwise wait `baseDelayMs * 2 ** (attempt - 1)` before retry number `attempt` (1, 2, 3, ...).
- `timeoutMs` is per attempt. A timed-out attempt is aborted.
- Other 4xx: throw `HttpError` straight away, no retry.
- Retries used up: throw `HttpError` with the last status (or the last error, for network failures and timeouts).
- One page fails for good: reject, abort requests in flight, start no new ones.
- `signal` aborts: reject with an error whose `name` is `"AbortError"` straight away (also during a backoff wait), abort in-flight requests, start no new ones.

## `export async function topRestaurants(baseUrl, { city, n, ...opts })`
- Fetches every page of `${baseUrl}/restaurants?city=<city>` (encode it), passing `opts` through to `fetchAllPages`.
- The server's `city` filter is a case-insensitive substring match (`york` also returns `New York`). Keep only exact matches, ignoring case.
- Sort by `rating` desc, then `votes` desc, then `name` asc. Return the first `n` names.
