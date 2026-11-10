# 01. REST API: Total Goals by a Team

The REST API holds football matches. Return the total number of goals scored by `team` in `year`, counting both home and away matches.

Home matches: `GET https://jsonmock.hackerrank.com/api/football_matches?year=<year>&team1=<team>&page=<page>`
Away matches: `GET https://jsonmock.hackerrank.com/api/football_matches?year=<year>&team2=<team>&page=<page>`

Each match has `team1`, `team2`, `team1goals` and `team2goals` (goals are **strings**). Results are paged.

Every response is `{ page, per_page, total, total_pages, data }`. Pages start at 1.

## Function Description
Complete `getTotalGoals` in `solution.js`.

getTotalGoals has the following parameter(s):
- string `team`
- int `year`

Returns: INTEGER

## Constraints
- Team names can contain spaces.
- A team that played no matches scored 0.

## Input Format For Custom Testing
- The first line contains a string, `team`.
- The second line contains an integer, `year`.

## Sample Case 0
Sample Input
```
Barcelona
2011
```
Sample Output
```
35
```

Hidden cases: 3 more in `cases.json` (don't peek). Run: `node run.mjs 01`
