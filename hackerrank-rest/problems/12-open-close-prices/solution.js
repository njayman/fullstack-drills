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

/*
 * Complete the 'openAndClosePrices' function below.
 *
 * The function is expected to return an STRING_ARRAY.
 * The function accepts following parameters:
 *  1. STRING firstDate
 *  2. STRING lastDate
 *  3. STRING weekDay
 */

async function openAndClosePrices(firstDate, lastDate, weekDay) {

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
