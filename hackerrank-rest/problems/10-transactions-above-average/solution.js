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
 * Complete the 'getUserTransaction' function below.
 *
 * The function is expected to return an INTEGER_ARRAY.
 * The function accepts following parameters:
 *  1. INTEGER uid
 *  2. STRING txnType
 *  3. STRING monthDebit
 */

async function getUserTransaction(uid, txnType, monthDebit) {

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
