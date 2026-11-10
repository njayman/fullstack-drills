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
 * Complete the 'getCountries' function below.
 *
 * The function is expected to return an INTEGER.
 * The function accepts following parameters:
 *  1. STRING s
 *  2. INTEGER p
 */

async function getCountries(s, p) {

}

async function main() {
    const ws = fs.createWriteStream(process.env.OUTPUT_PATH);

    const s = readLine().trim();

    const p = parseInt(readLine().trim(), 10);

    const result = await getCountries(s, p);

    ws.write(result + '\n');

    ws.end();
}
