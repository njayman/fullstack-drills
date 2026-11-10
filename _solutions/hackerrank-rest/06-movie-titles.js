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

async function getMovieTitles(substr) {
  const all = await getAll(`${API}/movies/search/?Title=${encodeURIComponent(substr)}`);
  return all.map((m) => m.Title).sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
}

async function main() {
    const ws = fs.createWriteStream(process.env.OUTPUT_PATH);

    const substr = readLine().trim();

    const result = await getMovieTitles(substr);

    ws.write(result.join('\n') + '\n');

    ws.end();
}
