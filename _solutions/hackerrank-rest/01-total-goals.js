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

async function getTotalGoals(team, year) {
  const t = encodeURIComponent(team);
  const [home, away] = await Promise.all([
    getAll(`${API}/football_matches?year=${year}&team1=${t}`),
    getAll(`${API}/football_matches?year=${year}&team2=${t}`),
  ]);
  return home.reduce((s, m) => s + Number(m.team1goals), 0) + away.reduce((s, m) => s + Number(m.team2goals), 0);
}

async function main() {
    const ws = fs.createWriteStream(process.env.OUTPUT_PATH);

    const team = readLine().trim();

    const year = parseInt(readLine().trim(), 10);

    const result = await getTotalGoals(team, year);

    ws.write(result + '\n');

    ws.end();
}
