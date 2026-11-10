# React 02: Restaurant typeahead

Time box: 45 min. `bun install && bun run test`. Only edit `src/App.jsx`.

Build an accessible async search box. Tests use fake timers and a mocked `fetch`.

## Fetching
- `GET /api/restaurants?q=<encodeURIComponent(query)>` returns `{ results: [{ id, name, cuisine }] }`.
- Call `fetch(url, { signal })` with an `AbortController` signal.
- Debounce 300 ms after the last keystroke. Query is the trimmed input.
- Trimmed query shorter than 2 chars: no request, abort any in-flight one, hide results.
- New request aborts the previous one. Only the latest query's results may ever be shown. An aborted request must not show an error.
- Cache by lowercased trimmed query. Cached queries show results after the debounce without a request.
- Non-2xx response: `error` with text `Something went wrong` and a `retry` button. Retry re-requests the same query immediately (no debounce).
- While waiting for a response: `loading`.

## Rendering
- Input: `search-input`, `role="combobox"`, `aria-expanded` (`"true"` when the list is shown), `aria-controls="results"`, `aria-activedescendant` (active option's element id, or absent).
- List: `data-testid="results"`, `id="results"`, `role="listbox"`. At most 8 options.
- Option: `data-testid="result-{id}"`, `id="option-{id}"`, `role="option"`, `aria-selected`. Text contains the name and cuisine.
- Wrap the first case-insensitive match of the query inside the name in `<mark>`, keeping the name's original casing.
- Empty results: `no-results` with text `No restaurants match "<query>"`.

## Keyboard
- ArrowDown / ArrowUp move the active option, wrapping at both ends. ArrowDown with none active goes to the first; ArrowUp with none active goes to the last.
- Enter on an active option selects it: input value becomes the name, `selected` shows `Selected: <name>`, list closes. Selecting must not trigger a search.
- Escape closes the list. The input value is unchanged. Typing again reopens it.
- Mouse click on an option also selects it.
