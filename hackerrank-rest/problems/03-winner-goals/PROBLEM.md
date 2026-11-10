# 03. REST API: Competition Winner's Goals

For a competition and year, return the total goals scored by the team that **won** that competition, in that competition only.

Competition (has `winner`): `GET https://jsonmock.hackerrank.com/api/football_competitions?name=<name>&year=<year>`
Matches: `GET https://jsonmock.hackerrank.com/api/football_matches?competition=<name>&year=<year>&team1=<team>&page=<page>` (and `team2=`)

Every response is `{ page, per_page, total, total_pages, data }`. Pages start at 1.

## Function Description
Complete `getWinnerTotalGoals` in `solution.js`.

getWinnerTotalGoals has the following parameter(s):
- string `competition`
- int `year`

Returns: INTEGER

## Constraints
- The competition always exists.

## Input Format For Custom Testing
- The first line contains a string, `competition`.
- The second line contains an integer, `year`.

## Sample Case 0
Sample Input
```
UEFA Champions League
2011
```
Sample Output
```
28
```

Hidden cases: 2 more in `cases.json` (don't peek). Run: `node run.mjs 03`
