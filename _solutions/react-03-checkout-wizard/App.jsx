import { useRef, useState } from "react";

const STEPS = ["Address", "Payment", "Review"];
const STEP_OF = { name: 0, line1: 0, postcode: 0, card: 1, expiry: 1, cvc: 1 };
const fmt = (p) => `£${(p / 100).toFixed(2)}`;
const normPc = (s) => { const c = s.replace(/\s/g, "").toUpperCase(); return `${c.slice(0, -3)} ${c.slice(-3)}`; };
const isAmex = (d) => /^3[47]/.test(d);
const luhn = (d) => [...d].reverse().reduce((s, ch, i) => {
  let n = +ch; if (i % 2) { n *= 2; if (n > 9) n -= 9; } return s + n;
}, 0) % 10 === 0;
const formatCard = (raw) => {
  const d = raw.replace(/\D/g, "").slice(0, isAmex(raw.replace(/\D/g, "")) ? 15 : 16);
  const groups = isAmex(d) ? [4, 6, 5] : [4, 4, 4, 4];
  const out = []; let i = 0;
  for (const g of groups) { if (i >= d.length) break; out.push(d.slice(i, i + g)); i += g; }
  return out.join(" ");
};

function validate(step, v, now) {
  const e = {};
  if (step === 0) {
    if (!v.name.trim()) e.name = "Name is required";
    if (!v.line1.trim()) e.line1 = "Address is required";
    if (!/^[A-Z]{1,2}\d[A-Z\d]?\d[A-Z]{2}$/i.test(v.postcode.replace(/\s/g, "")) || /\s{2,}/.test(v.postcode.trim()))
      e.postcode = "Enter a valid UK postcode";
  }
  if (step === 1) {
    const d = v.card.replace(/\D/g, "");
    if (d.length !== (isAmex(d) ? 15 : 16) || !luhn(d)) e.card = "Invalid card number";
    const m = /^(\d{2})\/(\d{2})$/.exec(v.expiry);
    if (!m || +m[1] < 1 || +m[1] > 12) e.expiry = "Invalid expiry";
    else if (new Date(2000 + +m[2], +m[1], 0, 23, 59, 59) < now) e.expiry = "Card expired";
    const len = isAmex(d) ? 4 : 3;
    if (!new RegExp(`^\\d{${len}}$`).test(v.cvc)) e.cvc = `CVC must be ${len} digits`;
  }
  return e;
}

export default function App({
  total: initialTotal = 2350,
  now = new Date(),
  generateKey = () => crypto.randomUUID(),
  submitOrder = async () => ({ orderId: "DEMO-1" }),
}) {
  const [step, setStep] = useState(0);
  const [v, setV] = useState({ name: "", line1: "", postcode: "", card: "", expiry: "", cvc: "" });
  const [tried, setTried] = useState([false, false]);
  const [serverErr, setServerErr] = useState({});
  const [total, setTotal] = useState(initialTotal);
  const [state, setState] = useState("idle"); // idle | pending | error | conflict | done
  const [orderId, setOrderId] = useState(null);
  const keyRef = useRef(null);
  const inFlight = useRef(false);

  const errors = { ...(tried[step] ? validate(step, v, now) : {}), ...Object.fromEntries(Object.entries(serverErr).filter(([f]) => STEP_OF[f] === step)) };

  const set = (field, value) => {
    setV((x) => ({ ...x, [field]: field === "card" ? formatCard(value) : value }));
    setServerErr(({ [field]: _, ...rest }) => rest);
  };
  const next = () => {
    setTried((t) => t.map((x, i) => (i === step ? true : x)));
    const errs = { ...validate(step, v, now), ...Object.fromEntries(Object.entries(serverErr).filter(([f]) => STEP_OF[f] === step)) };
    if (!Object.keys(errs).length) setStep(step + 1);
  };

  const submit = async (expectedTotal) => {
    if (inFlight.current) return;
    inFlight.current = true;
    const payload = {
      name: v.name.trim(), line1: v.line1.trim(), postcode: normPc(v.postcode),
      cardLast4: v.card.replace(/\D/g, "").slice(-4), expectedTotal,
    };
    const json = JSON.stringify(payload);
    if (keyRef.current?.json !== json) keyRef.current = { json, key: generateKey() };
    setState("pending");
    try {
      const res = await submitOrder(payload, { idempotencyKey: keyRef.current.key });
      setOrderId(res.orderId);
      setState("done");
    } catch (err) {
      if (err?.status === 409) { setTotal(err.total); setState("conflict"); }
      else if (err?.status === 422) {
        setServerErr(err.fields);
        setStep(Math.min(...Object.keys(err.fields).map((f) => STEP_OF[f])));
        setState("idle");
      } else setState("error");
    } finally {
      inFlight.current = false;
    }
  };

  if (state === "done") return <p data-testid="success">Order {orderId} placed</p>;

  const field = (id, key, label) => (
    <label>
      {label}
      <input data-testid={id} value={v[key]} onChange={(e) => set(key, e.target.value)} />
      {errors[key] && <span data-testid={`error-${key}`}>{errors[key]}</span>}
    </label>
  );

  return (
    <div>
      <h2 data-testid="step-title">{STEPS[step]}</h2>
      {step === 0 && <>{field("name", "name", "Name")}{field("line1", "line1", "Address")}{field("postcode", "postcode", "Postcode")}</>}
      {step === 1 && <>{field("card-number", "card", "Card")}{field("expiry", "expiry", "Expiry")}{field("cvc", "cvc", "CVC")}</>}
      {step === 2 && (
        <>
          <p data-testid="review-address">{v.name.trim()}, {v.line1.trim()}, {normPc(v.postcode)}</p>
          <p data-testid="review-card">•••• {v.card.replace(/\D/g, "").slice(-4)}</p>
          <p data-testid="total">{fmt(total)}</p>
          {state === "conflict" ? (
            <>
              <p data-testid="price-changed">Price changed to {fmt(total)}</p>
              <button data-testid="confirm-price" onClick={() => submit(total)}>Confirm</button>
            </>
          ) : (
            <button data-testid="place-order" disabled={state === "pending"} onClick={() => submit(total)}>
              {state === "pending" ? "Placing order…" : "Place order"}
            </button>
          )}
          {state === "error" && <p data-testid="submit-error">Could not place order. Try again.</p>}
        </>
      )}
      {step > 0 && <button data-testid="back" onClick={() => setStep(step - 1)}>Back</button>}
      {step < 2 && <button data-testid="next" onClick={next}>Next</button>}
    </div>
  );
}
