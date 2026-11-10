import { useEffect, useRef, useState } from "react";

function Highlight({ name, q }) {
  const i = name.toLowerCase().indexOf(q.toLowerCase());
  if (i < 0) return name;
  return <>{name.slice(0, i)}<mark>{name.slice(i, i + q.length)}</mark>{name.slice(i + q.length)}</>;
}

export default function App() {
  const [value, setValue] = useState("");
  const [status, setStatus] = useState("idle"); // idle | loading | error | done
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [selected, setSelected] = useState(null);
  const cache = useRef(new Map());
  const ctrl = useRef(null);
  const skip = useRef(false);
  const q = value.trim();

  const search = async (query) => {
    ctrl.current?.abort();
    const key = query.toLowerCase();
    setActive(-1);
    setOpen(true);
    if (cache.current.has(key)) {
      setResults(cache.current.get(key));
      return setStatus("done");
    }
    const c = (ctrl.current = new AbortController());
    setStatus("loading");
    try {
      const res = await fetch(`/api/restaurants?q=${encodeURIComponent(query)}`, { signal: c.signal });
      if (!res.ok) throw new Error(res.status);
      const { results } = await res.json();
      if (c.signal.aborted) return;
      cache.current.set(key, results);
      setResults(results);
      setStatus("done");
    } catch (e) {
      if (c.signal.aborted) return;
      setStatus("error");
    }
  };

  useEffect(() => {
    if (skip.current) { skip.current = false; return; }
    if (q.length < 2) {
      ctrl.current?.abort();
      setOpen(false);
      setStatus("idle");
      return;
    }
    const t = setTimeout(() => search(q), 300);
    return () => clearTimeout(t);
  }, [q]);

  const shown = results.slice(0, 8);
  const choose = (r) => {
    skip.current = r.name.trim() !== q;
    setValue(r.name);
    setSelected(r.name);
    setOpen(false);
    setActive(-1);
  };
  const onKeyDown = (e) => {
    if (!open || status !== "done" || !shown.length) return e.key === "Escape" && setOpen(false);
    const n = shown.length;
    if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => (a + 1) % n); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => (a <= 0 ? n - 1 : a - 1)); }
    else if (e.key === "Enter" && active >= 0) choose(shown[active]);
    else if (e.key === "Escape") { setOpen(false); setActive(-1); }
  };
  const listShown = open && status === "done" && shown.length > 0;

  return (
    <div>
      <input
        data-testid="search-input"
        role="combobox"
        aria-expanded={listShown ? "true" : "false"}
        aria-controls="results"
        aria-activedescendant={listShown && active >= 0 ? `option-${shown[active].id}` : undefined}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={onKeyDown}
      />
      {open && status === "loading" && <p data-testid="loading">Loading…</p>}
      {open && status === "error" && (
        <p data-testid="error">Something went wrong <button data-testid="retry" onClick={() => search(q)}>Retry</button></p>
      )}
      {open && status === "done" && !shown.length && <p data-testid="no-results">No restaurants match "{q}"</p>}
      {listShown && (
        <ul data-testid="results" id="results" role="listbox">
          {shown.map((r, i) => (
            <li key={r.id} id={`option-${r.id}`} data-testid={`result-${r.id}`} role="option"
              aria-selected={i === active ? "true" : "false"} onClick={() => choose(r)}>
              <Highlight name={r.name} q={q} /> · {r.cuisine}
            </li>
          ))}
        </ul>
      )}
      {selected && <p data-testid="selected">Selected: {selected}</p>}
    </div>
  );
}
