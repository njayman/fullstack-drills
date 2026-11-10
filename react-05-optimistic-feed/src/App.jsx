// See README.md for the spec. Run `bun run test:watch` while you work.
// Markup and data-testids are given. Add fetching, optimistic state and conditions.

const demoApi = {
  fetchPage: async () => ({ items: [{ id: "1", author: "Ada", text: "Great", likes: 3, liked: false }], nextCursor: null }),
  setLike: async (id, liked) => ({ likes: liked ? 4 : 3 }),
};

export default function App({ api = demoApi }) {
  return (
    <div className="feed">
      <label>
        Sort by
        <select data-testid="sort" defaultValue="newest">
          <option value="newest">Newest</option>
          <option value="top">Top</option>
        </select>
      </label>

      {/* Show while the first page loads */}
      <p data-testid="loading">Loading…</p>

      <ul>
        {[].map((review) => (
          <li key={review.id} data-testid={`review-${review.id}`}>
            <strong>{review.author}</strong>
            <p>{review.text}</p>
            <button data-testid={`like-${review.id}`} aria-pressed="false">Like</button>
            <span data-testid={`likes-${review.id}`}>0</span>
          </li>
        ))}
      </ul>

      {/* Show when a page request failed */}
      <div data-testid="feed-error">
        Couldn't load reviews
        <button data-testid="retry">Retry</button>
      </div>

      {/* Show only when there is a next page */}
      <button data-testid="load-more">Load more</button>

      {/* Show for 3s after a like fails */}
      <div data-testid="toast" role="status">Couldn't update like</div>
    </div>
  );
}
