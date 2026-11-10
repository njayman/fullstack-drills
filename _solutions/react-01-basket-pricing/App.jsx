import { useEffect, useState } from "react";
import { MENU } from "./data.js";

const fmt = (p) => `£${(p / 100).toFixed(2)}`;
const price = Object.fromEntries(MENU.map((m) => [m.id, m.price]));
const CODES = ["SAVE10", "FRIES", "FREEDEL"];

function load() {
  try {
    const s = JSON.parse(localStorage.getItem("basket"));
    if (s && Array.isArray(s.lines)) return { lines: s.lines, promo: s.promo ?? null };
  } catch {}
  return { lines: [], promo: null };
}

function price_(state) {
  const { lines, promo } = state;
  const qty = (id) => lines.find((l) => l.id === id)?.qty ?? 0;
  const subtotal = lines.reduce((s, l) => s + price[l.id] * l.qty, 0);
  let discount = 0;
  if (promo === "SAVE10" && subtotal >= 2000) discount = Math.round(subtotal * 0.1);
  if (promo === "FRIES") discount = Math.min(qty("burger"), qty("fries")) * price.fries;
  const net = subtotal - discount;
  const empty = lines.length === 0;
  const delivery = empty || promo === "FREEDEL" || net >= 2500 ? 0 : 299;
  const service = empty ? 0 : Math.min(399, Math.max(50, Math.round(net * 0.1)));
  return { subtotal, discount, net, delivery, service, total: net + delivery + service };
}

export default function App() {
  const [state, setState] = useState(load);
  const [history, setHistory] = useState([]);
  const [input, setInput] = useState("");
  const [msg, setMsg] = useState("");

  useEffect(() => localStorage.setItem("basket", JSON.stringify(state)), [state]);

  const commit = (next) => {
    setHistory((h) => [...h, state]);
    setState(next);
  };
  const setQty = (id, q) => {
    const exists = state.lines.some((l) => l.id === id);
    const lines = q <= 0
      ? state.lines.filter((l) => l.id !== id)
      : exists
        ? state.lines.map((l) => (l.id === id ? { ...l, qty: q } : l))
        : [...state.lines, { id, qty: q }];
    commit({ ...state, lines });
  };
  const qty = (id) => state.lines.find((l) => l.id === id)?.qty ?? 0;
  const p = price_(state);

  const apply = () => {
    const code = input.trim().toUpperCase();
    if (!CODES.includes(code)) return setMsg("Invalid code");
    if (code === "SAVE10" && p.subtotal < 2000) return setMsg("Minimum spend £20.00");
    setMsg("");
    commit({ ...state, promo: code });
  };

  let promoMsg = msg;
  if (!msg && state.promo) {
    promoMsg = state.promo === "SAVE10" && p.subtotal < 2000
      ? `Add ${fmt(2000 - p.subtotal)} more to use SAVE10`
      : `${state.promo} applied`;
  }

  return (
    <div>
      <ul>
        {MENU.map((m) => (
          <li key={m.id} data-testid={`menu-item-${m.id}`}>
            {m.name} {fmt(m.price)}
            <button data-testid={`add-${m.id}`} onClick={() => qty(m.id) < 10 && setQty(m.id, qty(m.id) + 1)}>Add</button>
          </li>
        ))}
      </ul>
      {state.lines.length === 0 ? (
        <p data-testid="empty-basket">Your basket is empty</p>
      ) : (
        <ul>
          {state.lines.map((l) => (
            <li key={l.id} data-testid={`line-${l.id}`}>
              {l.id} <span data-testid={`qty-${l.id}`}>{l.qty}</span>
              <button data-testid={`dec-${l.id}`} onClick={() => setQty(l.id, l.qty - 1)}>-</button>
              <button data-testid={`inc-${l.id}`} disabled={l.qty >= 10} onClick={() => setQty(l.id, l.qty + 1)}>+</button>
              <button data-testid={`remove-${l.id}`} onClick={() => setQty(l.id, 0)}>x</button>
            </li>
          ))}
        </ul>
      )}
      <input data-testid="promo-input" value={input} onChange={(e) => setInput(e.target.value)} />
      <button data-testid="promo-apply" onClick={apply}>Apply</button>
      {state.promo && (
        <button data-testid="promo-remove" onClick={() => { setMsg(""); commit({ ...state, promo: null }); }}>Remove</button>
      )}
      <p data-testid="promo-message">{promoMsg}</p>
      <p data-testid="subtotal">{fmt(p.subtotal)}</p>
      <p data-testid="discount">-{fmt(p.discount)}</p>
      <p data-testid="delivery-fee">{fmt(p.delivery)}</p>
      <p data-testid="service-fee">{fmt(p.service)}</p>
      <p data-testid="total">{fmt(p.total)}</p>
      {state.lines.length > 0 && p.net < 1000 && <p data-testid="min-order-msg">Minimum order £10.00</p>}
      <button data-testid="checkout" disabled={state.lines.length === 0 || p.net < 1000}>Checkout</button>
      <button
        data-testid="undo"
        disabled={history.length === 0}
        onClick={() => { setMsg(""); setState(history.at(-1)); setHistory((h) => h.slice(0, -1)); }}
      >Undo</button>
    </div>
  );
}
