# 11. REST API: Top Spenders (full scan)

Scan **all** transactions. For each `userName`, sum the `debit` amounts. Return the top `n` as `"<userName> <total>"` with the total to 2 decimals, highest first, ties by name ascending.

`GET https://jsonmock.hackerrank.com/api/transactions?page=<page>` (30 pages)

`amount` is a string like `"$1,670.57"`. Avoid floating point drift: sum in cents.

Every response is `{ page, per_page, total, total_pages, data }`. Pages start at 1.

## Function Description
Complete `topSpenders` in `solution.js`.

topSpenders has the following parameter(s):
- int `n`

Returns: STRING_ARRAY (printed one per line)

## Constraints
- **Request budget: 30** (one per page).
- **Time limit: 6 s.**

## Input Format For Custom Testing
- The first line contains an integer, `n`.

## Sample Case 0
Sample Input
```
3
```
Sample Output
```
John Oliver 97285.55
Bob Martin 85250.00
Helena Fernandez 65445.13
```

Hidden cases: 2 more in `cases.json` (don't peek). Run: `node run.mjs 11`
