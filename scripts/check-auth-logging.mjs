// scripts/check-auth-logging.mjs
// Gate: under src/app/api/v1/auth, log only via logAuthError(code, requestId).
// Forbid console.* of a caught error (err/error/e) or of req/request/body — those
// hold passwords + tokens (spec §3 logging policy). Recursive walk, no glob dep.
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import path from "node:path";

const ROOT = path.normalize("src/app/api/v1/auth");
const offenders = [];

// console.<method>( ... ) where the args mention a caught error or req/request/body.
const BAD = /console\.\w+\([^)]*\b(?:err|error|e|req|request|body)\b/;

function walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = path.join(dir, name);
    if (statSync(p).isDirectory()) {
      walk(p);
    } else if (/\.ts$/.test(name)) {
      const lines = readFileSync(p, "utf8").split("\n");
      lines.forEach((line, i) => {
        if (BAD.test(line)) offenders.push(`${p}:${i + 1}  ${line.trim()}`);
      });
    }
  }
}

if (existsSync(ROOT)) walk(ROOT);
if (offenders.length) {
  console.error(
    "Auth-logging violation: log only via logAuthError(code, requestId) — never the\n" +
      "raw error/req/body (spec §3). Offending lines:\n" +
      offenders.join("\n"),
  );
  process.exit(1);
}
console.log("auth logging OK");
