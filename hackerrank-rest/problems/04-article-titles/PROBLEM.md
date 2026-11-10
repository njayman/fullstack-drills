# 04. REST API: Article Titles by Author

Return the titles of all articles written by `author`, in API order.

`GET https://jsonmock.hackerrank.com/api/articles?author=<author>&page=<page>`

For each article: use `title` if it is not null; otherwise use `story_title` if it is not null; otherwise skip the article.

Every response is `{ page, per_page, total, total_pages, data }`. Pages start at 1.

## Function Description
Complete `getArticleTitles` in `solution.js`.

getArticleTitles has the following parameter(s):
- string `author`

Returns: STRING_ARRAY (printed one per line)

## Constraints
- An author with no articles returns an empty array.

## Input Format For Custom Testing
- The first line contains a string, `author`.

## Sample Case 0
Sample Input
```
epaga
```
Sample Output
```
A Message to Our Customers
“Was isolated from 1999 to 2006 with a 486. Built my own late 80s OS”
Apple’s declining software quality
```

Hidden cases: 3 more in `cases.json` (don't peek). Run: `node run.mjs 04`
