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

async function getUserTransaction(uid, txnType, monthDebit) {
  const all = await getAll(`${API}/transactions/search?userId=${uid}&txnType=${txnType}`);
  const cents = (s) => Math.round(Number(s.replace(/[$,]/g, "")) * 100);
  const inMonth = all.filter((t) => {
    const d = new Date(t.timestamp);
    return t.userId === uid && `${String(d.getUTCMonth() + 1).padStart(2, "0")}-${d.getUTCFullYear()}` === monthDebit;
  });
  if (!inMonth.length) return [-1];
  const avg = inMonth.reduce((s, t) => s + cents(t.amount), 0) / inMonth.length;
  const ids = inMonth.filter((t) => cents(t.amount) > avg).map((t) => t.id).sort((a, b) => a - b);
  return ids.length ? ids : [-1];
}

async function main() {
    const ws = fs.createWriteStream(process.env.OUTPUT_PATH);

    const uid = parseInt(readLine().trim(), 10);

    const txnType = readLine().trim();

    const monthDebit = readLine().trim();

    const result = await getUserTransaction(uid, txnType, monthDebit);

    ws.write(result.join('\n') + '\n');

    ws.end();
}
