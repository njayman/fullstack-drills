import { useEffect, useRef, useState } from "react";

const demoApi = {
  fetchPage: async () => ({ items: [{ id: "1", author: "Ada", text: "Great", likes: 3, liked: false }], nextCursor: null }),
  setLike: async (id, liked) => ({ likes: liked ? 4 : 3 }),
};

export default function App({ api = demoApi }) {
  const [items, setItems] = useState([]); // server order
  const [view, setView] = useState({}); // id -> { liked, likes } displayed
  const [cursor, setCursor] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [first, setFirst] = useState(true);
  const [error, setError] = useState(false);
  const [toast, setToast] = useState(false);
  const [sort, setSort] = useState("newest");
  const busy = useRef(false);
  const meta = useRef({}); // id -> { seq, confirmed, confirmedSeq }
  const toastTimer = useRef();

  const load = async (c) => {
    if (busy.current) return;
    busy.current = true; setLoading(true); setError(false);
    try {
      const page = await api.fetchPage(c);
      setItems((prev) => {
        const seen = new Set(prev.map((i) => i.id));
        const fresh = page.items.filter((i) => !seen.has(i.id) && seen.add(i.id));
        fresh.forEach((i) => { meta.current[i.id] = { seq: 0, confirmedSeq: 0, confirmed: { liked: i.liked, likes: i.likes } }; });
        setView((v) => ({ ...v, ...Object.fromEntries(fresh.map((i) => [i.id, { liked: i.liked, likes: i.likes }])) }));
        return [...prev, ...fresh];
      });
      setCursor(page.nextCursor);
      setHasMore(page.nextCursor != null);
      setFirst(false);
    } catch {
      setError(true);
    } finally {
      busy.current = false; setLoading(false);
    }
  };

  useEffect(() => { load(null); return () => clearTimeout(toastTimer.current); }, []);

  const toggle = async (id) => {
    const m = meta.current[id];
    const cur = view[id];
    const liked = !cur.liked;
    const seq = ++m.seq;
    setView((v) => ({ ...v, [id]: { liked, likes: cur.likes + (liked ? 1 : -1) } }));
    try {
      const res = await api.setLike(id, liked);
      if (seq > m.confirmedSeq) { m.confirmedSeq = seq; m.confirmed = { liked, likes: res.likes }; }
      if (seq === m.seq) setView((v) => ({ ...v, [id]: m.confirmed }));
    } catch {
      if (seq !== m.seq) return;
      setView((v) => ({ ...v, [id]: m.confirmed }));
      setToast(true);
      clearTimeout(toastTimer.current);
      toastTimer.current = setTimeout(() => setToast(false), 3000);
    }
  };

  const shown = sort === "top"
    ? items.map((it, i) => [it, i]).sort((a, b) => view[b[0].id].likes - view[a[0].id].likes || a[1] - b[1]).map(([it]) => it)
    : items;

  return (
    <div>
      <select data-testid="sort" value={sort} onChange={(e) => setSort(e.target.value)}>
        <option value="newest">Newest</option>
        <option value="top">Top</option>
      </select>
      {first && loading && <p data-testid="loading">Loading…</p>}
      <ul>
        {shown.map((it) => (
          <li key={it.id} data-testid={`review-${it.id}`}>
            <b>{it.author}</b> {it.text}
            <span data-testid={`likes-${it.id}`}>{view[it.id].likes}</span>
            <button data-testid={`like-${it.id}`} aria-pressed={view[it.id].liked ? "true" : "false"} onClick={() => toggle(it.id)}>Like</button>
          </li>
        ))}
      </ul>
      {error && <p data-testid="feed-error">Couldn't load reviews <button data-testid="retry" onClick={() => load(cursor)}>Retry</button></p>}
      {hasMore && <button data-testid="load-more" disabled={loading} onClick={() => load(cursor)}>Load more</button>}
      {toast && <p data-testid="toast">Couldn't update like</p>}
    </div>
  );
}
