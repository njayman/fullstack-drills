# React 05: Reviews feed with optimistic likes

Time box: 50 min. `bun install && bun run test`. Only edit `src/App.jsx`.

`App` prop `api`:
- `api.fetchPage(cursor)`: `cursor` is `null` for the first page. Returns `Promise<{ items: [{ id, author, text, likes, liked }], nextCursor }>`.
- `api.setLike(id, liked)`: returns `Promise<{ likes }>`, the server count after the change.

## Feed
- Fetch the first page on mount. While the first page loads: `loading`.
- Each review: `review-{id}` (contains author and text), `likes-{id}` (just the number), `like-{id}` button with `aria-pressed` `"true"`/`"false"`.
- `load-more` shown only when `nextCursor` is not null. Disabled while a page is loading. Never two page requests in flight.
- Pages may repeat items. Dedupe by id, keeping the first occurrence.
- Page request fails: `feed-error` with `Couldn't load reviews` and a `retry` button that retries the same cursor. Items already loaded stay.

## Optimistic likes
- Click: flip `aria-pressed` and change the count by 1 immediately, then call `setLike(id, newLiked)`.
- Per review, only the response to the most recent click may change what is displayed.
- Track the last server-confirmed `{ liked, likes }` per review. A success response confirms `{ liked: <what that request sent>, likes }`, but only if it belongs to a newer click than the current confirmed one.
- The latest request succeeds: display its confirmed state.
- The latest request fails: roll back to the last confirmed state and show `toast` with `Couldn't update like`. The toast hides after 3000 ms. Failures of superseded requests are ignored.

## Sorting
- `sort` select with options `newest` (default, server order) and `top` (displayed likes desc, ties in server order). Applies to the current displayed counts.
