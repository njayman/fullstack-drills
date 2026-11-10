// Preloaded by run.mjs: counts every HTTP request the solution makes.
const fs = require("fs");
let n = 0;
for (const name of ["http", "https"]) {
  const mod = require(name);
  for (const fn of ["get", "request"]) {
    const orig = mod[fn];
    mod[fn] = function (...args) { n++; return orig.apply(this, args); };
  }
}
if (typeof globalThis.fetch === "function") {
  const orig = globalThis.fetch;
  globalThis.fetch = (...args) => { n++; return orig(...args); };
}
process.on("exit", () => { if (process.env.COUNT_FILE) fs.writeFileSync(process.env.COUNT_FILE, String(n)); });
