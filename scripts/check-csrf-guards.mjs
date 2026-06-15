// scripts/check-csrf-guards.mjs
// Gate: every POST route handler under src/app/api/v1 must run the fail-closed CSRF
// guard (assertBrowserMutation). A cookie-auth mutation without it is an open door
// (spec §7). Mirrors check-design-rules.mjs: recursive walk, no glob dependency.
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import path from "node:path";

const ROOT = path.normalize("src/app/api/v1");
const offenders = [];

function isPostRoute(src) {
  return /export\s+(?:async\s+function|const)\s+POST\b/.test(src);
}

function walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = path.join(dir, name);
    if (statSync(p).isDirectory()) {
      walk(p);
    } else if (name === "route.ts") {
      const src = readFileSync(p, "utf8");
      if (isPostRoute(src) && !src.includes("assertBrowserMutation")) {
        offenders.push(p);
      }
    }
  }
}

if (existsSync(ROOT)) walk(ROOT);
if (offenders.length) {
  console.error(
    "CSRF-guard violation: POST route handler(s) missing assertBrowserMutation:\n" +
      offenders.map((p) => `  ${p}`).join("\n"),
  );
  process.exit(1);
}
console.log("csrf guards OK");
