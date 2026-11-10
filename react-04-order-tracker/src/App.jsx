// See README.md for the spec. Run `bun run test:watch` while you work.
// Markup and data-testids are given. Add polling, timers, state and conditions.

const STEPS = ["placed", "accepted", "preparing", "picked_up", "delivered"];

export default function App({
  orderId = "demo",
  fetchStatus = async () => ({ status: "preparing", etaSeconds: 600 }),
}) {
  return (
    <div className="tracker">
      {/* Before the first response, render ONLY this */}
      <p data-testid="loading">Loading…</p>

      {/* Show after 3+ consecutive failures */}
      <p data-testid="connection-lost">Reconnecting…</p>

      {/* Show instead of the timeline when cancelled */}
      <p data-testid="cancelled-banner">Order cancelled</p>

      <ol className="timeline">
        {STEPS.map((s) => (
          <li key={s} data-testid={`step-${s}`} data-state="todo">
            {s.replace("_", " ")}
          </li>
        ))}
      </ol>

      {/* mm:ss countdown, or "Any minute now" at 0 */}
      <p data-testid="eta">00:00</p>

      <button data-testid="refresh">Refresh</button>
    </div>
  );
}
