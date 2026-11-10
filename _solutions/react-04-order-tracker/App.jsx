import { useEffect, useRef, useState } from "react";

const STEPS = ["placed", "accepted", "preparing", "picked_up", "delivered"];
const FINAL = ["delivered", "cancelled"];
const rank = (s) => (s === "cancelled" ? 99 : STEPS.indexOf(s));
const mmss = (s) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

export default function App({ orderId = "demo", fetchStatus = async () => ({ status: "preparing", etaSeconds: 600 }) }) {
  const [status, setStatus] = useState(null);
  const [failures, setFailures] = useState(0);
  const [inFlight, setInFlight] = useState(false);
  const [deadline, setDeadline] = useState(null);
  const [now, setNow] = useState(Date.now());
  const r = useRef({ timer: null, inFlight: false, status: null, failures: 0, alive: true });

  const poll = useRef(null);
  poll.current = async () => {
    const s = r.current;
    clearTimeout(s.timer);
    if (s.inFlight || FINAL.includes(s.status)) return;
    s.inFlight = true; setInFlight(true);
    let delay;
    try {
      const res = await fetchStatus(orderId);
      if (!s.alive) return;
      s.failures = 0; setFailures(0);
      if (s.status == null || rank(res.status) >= rank(s.status)) {
        s.status = res.status; setStatus(res.status);
        if (res.etaSeconds != null) { setDeadline(Date.now() + res.etaSeconds * 1000); setNow(Date.now()); }
      }
      delay = 5000;
    } catch {
      if (!s.alive) return;
      s.failures++; setFailures(s.failures);
      delay = Math.min(8000, 1000 * 2 ** (s.failures - 1));
    }
    s.inFlight = false; setInFlight(false);
    if (!FINAL.includes(s.status) && document.visibilityState !== "hidden")
      s.timer = setTimeout(() => poll.current(), delay);
  };

  useEffect(() => {
    const s = r.current;
    s.alive = true;
    poll.current();
    const onVis = () => {
      if (document.visibilityState === "hidden") clearTimeout(s.timer);
      else poll.current();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => { s.alive = false; clearTimeout(s.timer); document.removeEventListener("visibilitychange", onVis); };
  }, []);

  const finished = FINAL.includes(status);
  const remaining = deadline == null ? null : Math.max(0, Math.ceil((deadline - now) / 1000));
  useEffect(() => {
    if (remaining == null || remaining === 0 || finished) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [deadline, remaining === 0, finished]);

  if (status == null) return <p data-testid="loading">Loading…</p>;
  const cur = rank(status);
  return (
    <div>
      {failures >= 3 && <p data-testid="connection-lost">Reconnecting…</p>}
      {status === "cancelled" ? (
        <p data-testid="cancelled-banner">Order cancelled</p>
      ) : (
        <ol>
          {STEPS.map((s, i) => (
            <li key={s} data-testid={`step-${s}`} data-state={i < cur ? "done" : i === cur ? "current" : "todo"}>{s}</li>
          ))}
        </ol>
      )}
      {!finished && remaining != null && <p data-testid="eta">{remaining === 0 ? "Any minute now" : mmss(remaining)}</p>}
      <button data-testid="refresh" disabled={inFlight || finished} onClick={() => poll.current()}>Refresh</button>
    </div>
  );
}
