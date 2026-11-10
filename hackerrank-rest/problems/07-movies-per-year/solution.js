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
 * Complete the 'moviesPerYear' function below.
 *
 * The function is expected to return an STRING_ARRAY.
 * The function accepts following parameters:
 *  1. STRING substr
 */

async function moviesPerYear(substr) {

}

async function main() {
    const ws = fs.createWriteStream(process.env.OUTPUT_PATH);

    const substr = readLine().trim();

    const result = await moviesPerYear(substr);

    ws.write(result.join('\n') + '\n');

    ws.end();
}
