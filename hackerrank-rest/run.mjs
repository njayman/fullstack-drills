// Usage: node run.mjs            run every problem
//        node run.mjs 02         run one problem
//        node run.mjs 02 --show  also print expected output for failed hidden cases
//        node run.mjs 02 --file path/to/other.js   test a different file
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";

const here = path.dirname(new URL(import.meta.url).pathname);
const args = process.argv.slice(2);
const show = args.includes("--show");
const fileArg = args.includes("--file") ? path.resolve(args[args.indexOf("--file") + 1]) : null;
const filter = args.find((a) => /^\d+$/.test(a));
const dirs = fs.readdirSync(path.join(here, "problems")).filter((d) => !filter || d.startsWith(filter.padStart(2, "0"))).sort();
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "hr-"));

function runCase(file, input, timeMs) {
  const out = path.join(tmp, "out"), count = path.join(tmp, "count");
  fs.rmSync(out, { force: true }); fs.rmSync(count, { force: true });
  return new Promise((resolve) => {
    const start = Date.now();
    const child = spawn("node", ["--require", path.join(here, "lib/count.cjs"), file], {
      env: { ...process.env, OUTPUT_PATH: out, COUNT_FILE: count },
      stdio: ["pipe", "pipe", "pipe"],
    });
    let stderr = "", stdout = "", timedOut = false;
    const timer = setTimeout(() => { timedOut = true; child.kill("SIGKILL"); }, timeMs);
    child.stdout.on("data", (d) => (stdout += d));
    child.stderr.on("data", (d) => (stderr += d));
    child.on("close", () => {
      clearTimeout(timer);
      resolve({
        ms: Date.now() - start, timedOut, stderr, stdout,
        output: fs.existsSync(out) ? fs.readFileSync(out, "utf8").replace(/\s+$/, "") : null,
        requests: fs.existsSync(count) ? Number(fs.readFileSync(count, "utf8")) : NaN,
      });
    });
    child.stdin.end(input.join("\n") + "\n");
  });
}

let passed = 0, total = 0;
for (const d of dirs) {
  const spec = JSON.parse(fs.readFileSync(path.join(here, "problems", d, "cases.json"), "utf8"));
  const file = fileArg ?? path.join(here, "problems", d, "solution.js");
  console.log(`\n${d}  (budget ${spec.budget} requests, ${spec.timeMs / 1000}s per case)`);
  for (const [i, c] of spec.cases.entries()) {
    total++;
    const r = await runCase(file, c.input, spec.timeMs);
    const label = c.sample ? "Sample 0" : `Hidden ${i}`;
    let why = "";
    if (r.timedOut) why = "Terminated due to timeout";
    else if (r.output === null) why = "No output (crashed?)";
    else if (r.output !== c.expected) why = "Wrong Answer";
    else if (r.requests > spec.budget) why = `Too many requests (${r.requests} > ${spec.budget})`;
    if (!why) passed++;
    console.log(`  ${why ? "✗" : "✓"} ${label.padEnd(9)} ${String(r.ms).padStart(5)}ms  ${String(r.requests).padStart(3)} req  ${why}`);
    if (why && (c.sample || show)) {
      console.log(`      input:    ${JSON.stringify(c.input)}`);
      console.log(`      expected: ${JSON.stringify(c.expected).slice(0, 300)}`);
      console.log(`      got:      ${JSON.stringify(r.output).slice(0, 300)}`);
    } else if (why) console.log(`      input:    ${JSON.stringify(c.input)}  (--show for expected)`);
    if (why && r.stderr.trim()) console.log(`      stderr: ${r.stderr.trim().split("\n").slice(0, 6).join("\n              ")}`);
    if (r.stdout.trim()) console.log(`      console.log: ${r.stdout.trim().split("\n").slice(0, 5).join(" | ").slice(0, 300)}`);
  }
}
fs.rmSync(tmp, { recursive: true, force: true });
console.log(`\n${passed}/${total} cases passed`);
process.exitCode = passed === total ? 0 : 1;
