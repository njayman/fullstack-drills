# 13. REST API: Countries by Population

Return how many countries whose name contains `s` have a `population` **strictly greater** than `p`.

`GET https://jsonmock.hackerrank.com/api/countries/search?name=<s>&page=<page>`

Every response is `{ page, per_page, total, total_pages, data }`. Pages start at 1.

## Function Description
Complete `getCountries` in `solution.js`.

getCountries has the following parameter(s):
- string `s`
- int `p`

Returns: INTEGER

## Constraints
- The search is case-insensitive.

## Input Format For Custom Testing
- The first line contains a string, `s`.
- The second line contains an integer, `p`.

## Sample Case 0
Sample Input
```
un
100090
```
Sample Output
```
8
```

Hidden cases: 3 more in `cases.json` (don't peek). Run: `node run.mjs 13`
