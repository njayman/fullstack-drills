# 12. REST API: Open and Close Prices

Return `"<date> <open> <close>"` for every record whose date is between `firstDate` and `lastDate` (inclusive) and falls on `weekDay`, in date order.

`GET https://jsonmock.hackerrank.com/api/stocks?page=<page>` (500 records per page)

Dates look like `5-January-2000`. Print numbers exactly as the API returns them (`5357`, not `5357.00`).

Every response is `{ page, per_page, total, total_pages, data }`. Pages start at 1.

## Function Description
Complete `openAndClosePrices` in `solution.js`.

openAndClosePrices has the following parameter(s):
- string `firstDate`
- string `lastDate`
- string `weekDay`

Returns: STRING_ARRAY (printed one per line)

## Constraints
- Dates are valid and firstDate <= lastDate.
- Parse dates as UTC.

## Input Format For Custom Testing
- Line 1: `firstDate`.
- Line 2: `lastDate`.
- Line 3: `weekDay` (e.g. `Monday`).

## Sample Case 0
Sample Input
```
1-January-2000
22-February-2000
Monday
```
Sample Output
```
17-January-2000 5617.7 5404.07
31-January-2000 5338.67 5205.29
7-February-2000 5431.55 5474
14-February-2000 6130.23 5924.31
21-February-2000 5874.25 5876.89
```

Hidden cases: 2 more in `cases.json` (don't peek). Run: `node run.mjs 12`
