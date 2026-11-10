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

async function openAndClosePrices(firstDate, lastDate, weekDay) {
  const all = await getAll(`${API}/stocks?`);
  const t = (s) => Date.parse(s.replace(/-/g, " ") + " UTC");
  const lo = t(firstDate), hi = t(lastDate);
  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  return all
    .filter((r) => { const x = t(r.date); return x >= lo && x <= hi && days[new Date(x).getUTCDay()] === weekDay; })
    .sort((a, b) => t(a.date) - t(b.date))
    .map((r) => `${r.date} ${r.open} ${r.close}`);
}

async function main() {
    const ws = fs.createWriteStream(process.env.OUTPUT_PATH);

    const firstDate = readLine().trim();

    const lastDate = readLine().trim();

    const weekDay = readLine().trim();

    const result = await openAndClosePrices(firstDate, lastDate, weekDay);

    ws.write(result.join('\n') + '\n');

    ws.end();
}
