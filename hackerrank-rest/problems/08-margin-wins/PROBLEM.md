# 08. REST API: Home Wins by a Margin (query math)

Return the number of matches in `year` where the home team (`team1`) won by **at least** `margin` goals, i.e. `team1goals - team2goals >= margin`.

`GET https://jsonmock.hackerrank.com/api/football_matches?year=<year>&page=<page>` (~200 pages)

You may add exact values of any field to the query string. `total` counts all matches across pages.

Every response is `{ page, per_page, total, total_pages, data }`. Pages start at 1.

## Function Description
Complete `getHomeWinsByMargin` in `solution.js`.

getHomeWinsByMargin has the following parameter(s):
- int `year`
- int `margin`

Returns: INTEGER

## Constraints
- 0 <= goals <= 10.
- 1 <= margin <= 11.
- **Request budget: 70.**

## Input Format For Custom Testing
- The first line contains an integer, `year`.
- The second line contains an integer, `margin`.

## Sample Case 0
Sample Input
```
2011
3
```
Sample Output
```
229
```

Hidden cases: 3 more in `cases.json` (don't peek). Run: `node run.mjs 08`
