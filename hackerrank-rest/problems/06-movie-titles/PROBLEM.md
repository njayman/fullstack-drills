# 06. REST API: Movie Titles

Return every movie title containing `substr`, sorted ascending (plain `<` comparison).

`GET https://jsonmock.hackerrank.com/api/movies/search/?Title=<substr>&page=<page>`

Each record: `{ Title, Year, imdbID }`.

Every response is `{ page, per_page, total, total_pages, data }`. Pages start at 1.

## Function Description
Complete `getMovieTitles` in `solution.js`.

getMovieTitles has the following parameter(s):
- string `substr`

Returns: STRING_ARRAY (printed one per line)

## Constraints
- No matches returns an empty array.

## Input Format For Custom Testing
- The first line contains a string, `substr`.

## Sample Case 0
Sample Input
```
spiderman
```
Sample Output
```
Amazing Spiderman Syndrome
Fighting, Flying and Driving: The Stunts of Spiderman 3
Hollywood's Master Storytellers: Spiderman Live
Italian Spiderman
Spiderman
Spiderman
Spiderman 5
Spiderman and Grandma
Spiderman in Cannes
Superman, Spiderman or Batman
The Amazing Spiderman T4 Premiere Special
The Death of Spiderman
They Call Me Spiderman
```

Hidden cases: 3 more in `cases.json` (don't peek). Run: `node run.mjs 06`
