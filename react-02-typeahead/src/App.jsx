// See README.md for the spec. Run `bun run test:watch` while you work.
// Markup and data-testids are given. Add state, effects, handlers and conditions.

export default function App() {
  return (
    <div className="typeahead">
      <label htmlFor="search">Find a restaurant</label>
      <input
        id="search"
        data-testid="search-input"
        role="combobox"
        aria-expanded="false"
        aria-controls="results"
        // aria-activedescendant={...} when an option is active
        placeholder="Search restaurants"
        autoComplete="off"
      />

      {/* Show while a request is pending */}
      <p data-testid="loading">Loading…</p>

      {/* Show when the request failed */}
      <div data-testid="error">
        Something went wrong
        <button data-testid="retry">Retry</button>
      </div>

      {/* Show when the request returned no results */}
      <p data-testid="no-results">No restaurants match "query"</p>

      {/* Show when there are results and the list is open */}
      <ul data-testid="results" id="results" role="listbox">
        {[].map((r) => (
          <li key={r.id} id={`option-${r.id}`} data-testid={`result-${r.id}`} role="option" aria-selected="false">
            {/* Wrap the matched part of the name in <mark> */}
            <span className="name">{r.name}</span>
            <span className="cuisine">{r.cuisine}</span>
          </li>
        ))}
      </ul>

      {/* Show after a selection */}
      <p data-testid="selected">Selected: name</p>
    </div>
  );
}
