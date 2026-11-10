# 09. REST API: Finest Food Outlet

Return the name of the outlet in `city` with the highest `user_rating.average_rating`. Ties: the one with more `user_rating.votes`.

`GET https://jsonmock.hackerrank.com/api/food_outlets?city=<city>&page=<page>`

Every response is `{ page, per_page, total, total_pages, data }`. Pages start at 1.

## Function Description
Complete `finestFoodOutlet` in `solution.js`.

finestFoodOutlet has the following parameter(s):
- string `city`

Returns: STRING

## Constraints
- The city always has at least one outlet.

## Input Format For Custom Testing
- The first line contains a string, `city`.

## Sample Case 0
Sample Input
```
Seattle
```
Sample Output
```
Cafe Juanita
```

Hidden cases: 3 more in `cases.json` (don't peek). Run: `node run.mjs 09`
