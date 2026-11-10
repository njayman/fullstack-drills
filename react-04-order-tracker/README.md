# React 04: Live order tracker

Time box: 50 min. `bun install && bun run test`. Only edit `src/App.jsx`.

`App` props: `orderId`, `fetchStatus(orderId)` returning `Promise<{ status, etaSeconds? }>`.
Statuses in order: `placed`, `accepted`, `preparing`, `picked_up`, `delivered`. Also `cancelled`.
Tests use fake timers; use `setTimeout`/`setInterval`/`Date.now`, nothing exotic.

## Polling
- Poll once on mount. After each successful response, schedule the next poll 5000 ms later. Never two requests in flight.
- Failure (rejected promise): retry after 1000, 2000, 4000, 8000, 8000, ... ms (doubling, capped at 8000).
- After 3 or more consecutive failures show `connection-lost` with `Reconnecting…`. Any success hides it and resets the backoff.
- `delivered` or `cancelled`: stop polling for good.
- Never go backwards: a response with an earlier status than the one shown is ignored (but still counts as a success for scheduling).
- Page hidden (`document.visibilityState === "hidden"` on `visibilitychange`): cancel the scheduled poll. Visible again: poll immediately (unless one is in flight or the order is finished).
- `refresh` button: poll now and replace any scheduled poll. Disabled while a request is in flight or the order is finished.
- Unmount: no more calls, no state updates.

## Rendering
- Before the first response: `loading`.
- Timeline: `step-{status}` for the 5 normal statuses, each with `data-state` of `done`, `current` or `todo`. `delivered` is `current` when delivered.
- `cancelled`: hide the timeline, show `cancelled-banner` with `Order cancelled`.
- ETA: when the response has `etaSeconds` and status is not finished, `eta` shows `mm:ss` and counts down every second. Each response resyncs it. At 0 show `Any minute now`. Hidden when finished or when no ETA was ever given.
