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
 * Complete the 'finestFoodOutlet' function below.
 *
 * The function is expected to return a STRING.
 * The function accepts following parameters:
 *  1. STRING city
 */

async function finestFoodOutlet(city) {

}

async function main() {
    const ws = fs.createWriteStream(process.env.OUTPUT_PATH);

    const city = readLine().trim();

    const result = await finestFoodOutlet(city);

    ws.write(result + '\n');

    ws.end();
}
