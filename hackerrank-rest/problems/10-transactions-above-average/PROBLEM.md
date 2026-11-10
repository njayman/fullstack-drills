# 10. REST API: Transactions Above Average

For user `uid`, take their transactions of type `txnType` in month `monthDebit` (`MM-YYYY`, UTC, from `timestamp` in ms). Return the ids of those whose amount is **greater than** the average of that set, ascending. If none, return `[-1]`.

`GET https://jsonmock.hackerrank.com/api/transactions/search?userId=<uid>&txnType=<type>&page=<page>`

`amount` is a string like `"$1,670.57"`.

Every response is `{ page, per_page, total, total_pages, data }`. Pages start at 1.

## Function Description
Complete `getUserTransaction` in `solution.js`.

getUserTransaction has the following parameter(s):
- int `uid`
- string `txnType`
- string `monthDebit`

Returns: INTEGER_ARRAY (printed one per line)

## Constraints
- Compare money exactly: parse to cents.

## Input Format For Custom Testing
- The first line contains an integer, `uid`.
- The second line contains a string, `txnType`.
- The third line contains a string, `monthDebit`.

## Sample Case 0
Sample Input
```
4
debit
02-2019
```
Sample Output
```
76
88
98
```

Hidden cases: 3 more in `cases.json` (don't peek). Run: `node run.mjs 10`
