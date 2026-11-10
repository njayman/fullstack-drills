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

async function finestFoodOutlet(city) {
  const all = await getAll(`${API}/food_outlets?city=${encodeURIComponent(city)}`);
  return all.reduce((best, o) => {
    const a = o.user_rating, b = best.user_rating;
    return a.average_rating > b.average_rating || (a.average_rating === b.average_rating && a.votes > b.votes) ? o : best;
  }).name;
}

async function main() {
    const ws = fs.createWriteStream(process.env.OUTPUT_PATH);

    const city = readLine().trim();

    const result = await finestFoodOutlet(city);

    ws.write(result + '\n');

    ws.end();
}
