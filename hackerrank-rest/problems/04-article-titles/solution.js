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
 * Complete the 'getArticleTitles' function below.
 *
 * The function is expected to return an STRING_ARRAY.
 * The function accepts following parameters:
 *  1. STRING author
 */

async function getArticleTitles(author) {

}

async function main() {
    const ws = fs.createWriteStream(process.env.OUTPUT_PATH);

    const author = readLine().trim();

    const result = await getArticleTitles(author);

    ws.write(result.join('\n') + '\n');

    ws.end();
}
