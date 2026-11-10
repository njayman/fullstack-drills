'use strict';

const fs = require('fs');

process.stdin.resume();
process.stdin.setEncoding('utf-8');

let inputString = '';
let currentLine = 0;

process.stdin.on('data', function(inputStdin) {
    inputString += inputStdin;
});

process.stdin.on('end', function() {
    inputString = inputString.split('\n');

    main();
});

function readLine() {
    return inputString[currentLine++];
}

const API = "https://jsonmock.hackerrank.com/api";
const getJSON = (url) => fetch(url).then((r) => r.json());
async function getAll(url) {
  const sep = url.endsWith("?") ? "" : "&";
  const first = await getJSON(`${url}${sep}page=1`);
  const rest = await Promise.all(Array.from({ length: Math.max(0, first.total_pages - 1) }, (_, i) => getJSON(`${url}${sep}page=${i + 2}`)));
  return [first, ...rest].flatMap((p) => p.data);
}

async function topArticles(limit) {
  const all = await getAll(`${API}/articles?`);
  return all
    .map((a) => ({ name: a.title ?? a.story_title, c: a.num_comments ?? 0 }))
    .filter((a) => a.name != null)
    .sort((a, b) => b.c - a.c || (a.name < b.name ? -1 : a.name > b.name ? 1 : 0))
    .slice(0, limit)
    .map((a) => a.name);
}

async function main() {
    const ws = fs.createWriteStream(process.env.OUTPUT_PATH);

    const limit = parseInt(readLine().trim(), 10);

    const result = await topArticles(limit);

    ws.write(result.join('\n') + '\n');

    ws.end();
}
