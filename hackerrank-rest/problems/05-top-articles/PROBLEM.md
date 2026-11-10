# 05. REST API: Most Commented Articles

Fetch **every** article and return the names of the `limit` articles with the most comments.

`GET https://jsonmock.hackerrank.com/api/articles?page=<page>`

- Name = `title`, or `story_title` if `title` is null. Skip articles where both are null.
- `num_comments` can be null: treat it as 0.
- Sort by `num_comments` descending, ties by name ascending (plain `<` string comparison).

Every response is `{ page, per_page, total, total_pages, data }`. Pages start at 1.

## Function Description
Complete `topArticles` in `solution.js`.

topArticles has the following parameter(s):
- int `limit`

Returns: STRING_ARRAY (printed one per line)

## Constraints
- `limit` may exceed the number of named articles: return them all.

## Input Format For Custom Testing
- The first line contains an integer, `limit`.

## Sample Case 0
Sample Input
```
3
```
Sample Output
```
UK votes to leave EU
F.C.C. Repeals Net Neutrality Rules
EU approves internet copyright law, including ‘link tax’ and ‘upload filter’
```

Hidden cases: 2 more in `cases.json` (don't peek). Run: `node run.mjs 05`
