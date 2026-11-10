# Prep kit: HackerRank full stack screen

70 min, 2 problems: one React project, one REST API coding problem (Node template, stdin in, `OUTPUT_PATH` out). No going back after a section. Proctored.

## Tonight (about 2 h)
1. **Helper from memory** (3 times, under 2 min each): the `https.get` JSON helper below.
2. **REST drills** (`hackerrank-rest/`, `node run.mjs NN`): 02, 07, 08, 11 first (scale), then 01, 03, 10.
3. **React warm-up**: article sorting format (App.js + components, testids from the README), then one of `react-0x` for 30 min.
4. **Environment**: webcam test, lighting, charger, close apps, do-not-disturb.

## REST: the helper
```js
const https = require("https");
function getJSON(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      res.setEncoding("utf8");
      let body = "";
      res.on("data", (c) => (body += c));
      res.on("end", () => { try { resolve(JSON.parse(body)); } catch (e) { reject(e); } });
    }).on("error", reject);
  });
}
async function getAll(url) {
  const first = await getJSON(`${url}&page=1`);
  const rest = await Promise.all(
    Array.from({ length: Math.max(0, first.total_pages - 1) }, (_, i) => getJSON(`${url}&page=${i + 2}`)));
  return [first, ...rest].flatMap((p) => p.data);
}
```

## REST: decision order
1. A count? Filters + `total`, no paging (draws: 11 requests, not 196).
2. Add every filter the question allows. `per_page` is ignored by jsonmock.
3. Need records? Page 1, then `Promise.all` the rest. Handle `total_pages: 0`.
4. 100+ pages? Pool of 10 to 20. Need only the first match? Sequential + early exit.

## REST: traps
- `encodeURIComponent` (or `URLSearchParams`) for names with spaces.
- Numbers arrive as strings: `Number(m.team1goals)`. Money: `Number(s.replace(/[$,]/g, ""))`, sum in cents.
- Team totals need both `team1=` and `team2=` queries.
- Nulls: `title ?? story_title`, `num_comments ?? 0`.
- Sorting: `b.x - a.x || ...` tie-break; `<` vs `localeCompare` differ on case, match the sample.
- Dates: UTC getters on ms timestamps.
- `.on('error')` goes on the request; `throw` inside `res.on('end')` does not reject.
- Return the value; `main()` prints it (arrays joined by `\n`).

## React: checklist
- Read the README testid list first. Keep every `data-testid` exactly.
- Never mutate props: `[...arr].sort(...)`.
- Derive sorted/filtered lists in render from state; avoid syncing in `useEffect`.
- Stable keys (ids, not index) on reordered lists.
- Controlled inputs: `value` + `onChange`. Buttons: `type="button"` inside forms.
- Run `npm test` early, fix one failing test at a time.

## Time plan (70 min)
| Min | React | REST |
|---|---|---|
| 0 to 3 | read README + tests | read twice, `console.log(typeof fetch)`, log one record |
| 3 to 28 | pass main tests | helper + sample case |
| 28 to 33 | polish, edge cases | edge cases (empty, ties, strings) |
| submit | 2 to 3 min spare | 2 to 3 min spare |

## Proctoring
- Photo check and webcam permission at the start; snapshots during the test.
- Tab switches and pastes can be logged: inspect data with `console.log(JSON.stringify(first.data[0]))`, not a new tab. Type the helper, don't paste it.
- One screen, no phone, nobody else in the room, no notes or AI.

## Exercises in this repo
| Folder | Run | Focus |
|---|---|---|
| `hackerrank-rest/` | `node run.mjs 01` | 13 REST problems in the real template, request budgets, time limits |
| `react-01-basket-pricing` | `bun run test:watch` | derived totals, undo, localStorage |
| `react-02-typeahead` | same | debounce, abort, combobox keyboard |
| `react-03-checkout-wizard` | same | validation, multi-step, idempotency |
| `react-04-order-tracker` | same | polling, backoff, timers |
| `react-05-optimistic-feed` | same | optimistic UI, rollback, pagination |

Solutions: `_solutions/` (after you pass).
