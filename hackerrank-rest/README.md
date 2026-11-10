# HackerRank REST API drills

The same format as the real test: `solution.js` is HackerRank's Node template (stdin in, `OUTPUT_PATH` out). Fill in the function only.

```
node run.mjs 01            # one problem: sample + hidden cases
node run.mjs 01 --show     # also show expected output for failed hidden cases
node run.mjs               # everything
```

The runner judges like HackerRank and adds two checks the real hidden tests effectively apply:
- **Request budget:** counts every `https.get` / `fetch` call. Fetching 200 pages when a query filter would do = fail.
- **Time limit per case:** sequential page loops on big scans = "Terminated due to timeout".

`console.log` output is shown, like HackerRank's debug output.

| # | Problem | What it trains |
|---|---|---|
| 01 | Total goals by a team | two queries (team1 + team2), paging, string goals |
| 02 | Number of drawn matches | **query-filter trick + `total`**, budget 30 for ~200 pages |
| 03 | Competition winner's goals | chained requests, encoding names with spaces |
| 04 | Article titles | null fallbacks (`title` then `story_title`) |
| 05 | Most commented articles | full scan, null counts, sort with tie-break |
| 06 | Movie titles | paging + sorting, empty results |
| 07 | Movies per year | **~80 pages in 6 s**: parallel fetch, group by |
| 08 | Home wins by a margin | **query combinatorics**: sum `total` over score pairs |
| 09 | Finest food outlet | nested fields, max with tie-break |
| 10 | Transactions above average | money strings, UTC month from ms timestamp, `[-1]` |
| 11 | Top spenders | full scan, sum in cents, format to 2 dp |
| 12 | Open and close prices | date parsing, weekday, exact number printing |
| 13 | Countries by population | search endpoint, strict comparison |

Time box: 15 to 20 min each. Do them one by one, in order. Reference solutions: `../_solutions/hackerrank-rest/` (after you pass).

## Test-day checklist
- First line in the editor: `console.log(typeof fetch)`. If `undefined`, use `https.get`.
- Type the helper yourself. Pasting big blocks can be flagged.
- Don't open the API in a new tab (tab switches are logged). `console.log(JSON.stringify(first.data[0]))` instead.
- Read `main()`: return the value, don't print it. Arrays are printed with `join('\n')`.
- Before scanning pages, ask: can a query filter + `total` answer this?
