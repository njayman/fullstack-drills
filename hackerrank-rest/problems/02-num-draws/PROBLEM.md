# 02. REST API: Number of Drawn Matches (scale)

Return the number of matches in `year` that ended in a draw (both teams scored the same).

`GET https://jsonmock.hackerrank.com/api/football_matches?year=<year>&page=<page>`

**A year has ~200 pages.** You may add an exact value of any match field to the query string (e.g. `&team1goals=1`). The response's `total` field is the number of matches across all pages.

Every response is `{ page, per_page, total, total_pages, data }`. Pages start at 1.

## Function Description
Complete `getNumDraws` in `solution.js`.

getNumDraws has the following parameter(s):
- int `year`

Returns: INTEGER

## Constraints
- No team ever scored more than 10 goals.
- **Request budget: 30.** Fetching every page fails this problem.

## Input Format For Custom Testing
- The first line contains an integer, `year`.

## Sample Case 0
Sample Input
```
2011
```
Sample Output
```
516
```

Hidden cases: 3 more in `cases.json` (don't peek). Run: `node run.mjs 02`
