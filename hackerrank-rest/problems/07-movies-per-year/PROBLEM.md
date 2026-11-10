# 07. REST API: Movies per Year (large scan)

For all movies whose title contains `substr`, return one line per year: `"<year> <count>"`, sorted by year ascending.

`GET https://jsonmock.hackerrank.com/api/movies/search/?Title=<substr>&page=<page>`

**`the` matches ~80 pages.** Each page must be fetched exactly once, and the whole thing must finish in 6 s.

Every response is `{ page, per_page, total, total_pages, data }`. Pages start at 1.

## Function Description
Complete `moviesPerYear` in `solution.js`.

moviesPerYear has the following parameter(s):
- string `substr`

Returns: STRING_ARRAY (printed one per line)

## Constraints
- **Request budget:** exactly one request per page.
- **Time limit: 6 s.** One request at a time is too slow.

## Input Format For Custom Testing
- The first line contains a string, `substr`.

## Sample Case 0
Sample Input
```
the
```
Sample Output
```
1897 1
1900 1
1901 4
1903 5
1904 2
1905 1
1907 1
1908 3
1909 3
1910 3
1911 1
1912 4
1913 5
1914 6
1915 11
1916 8
1917 7
1918 3
1919 4
1920 3
1921 1
1922 3
1924 1
1925 1
1926 1
1927 1
1929 4
1930 2
1931 3
1932 3
1933 3
1935 1
1938 1
1940 1
1941 1
1943 2
1945 2
1946 1
1947 1
1948 3
1949 1
1952 2
1953 3
1954 1
1955 4
1956 4
1957 1
1958 2
1960 2
1961 2
1962 5
1963 1
1964 4
1965 3
1966 3
1967 4
1968 3
1969 1
1970 5
1972 3
1973 1
1974 1
1975 2
1976 3
1977 2
1978 2
1979 2
1980 1
1981 2
1982 4
1983 3
1984 2
1985 2
1987 5
1988 7
1989 2
1990 4
1991 4
1992 3
1993 6
1994 7
1995 8
1996 5
1997 8
1998 6
1999 10
2000 11
2001 23
2002 16
2003 12
2004 13
2005 24
2006 12
2007 32
2008 25
2009 23
2010 45
2011 34
2012 43
2013 41
2014 51
2015 61
2016 47
2017 5
2018 1
```

Hidden cases: 2 more in `cases.json` (don't peek). Run: `node run.mjs 07`
