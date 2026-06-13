// scripts/check-design-rules.mjs
// Gate: canonical sq-* class literals may appear ONLY in src/components/ui/
// and src/lib/ui/ (the mapping module derives classes there). Screens consume
// the typed component layer.
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

const ALLOWED = [path.normalize("src/components/ui"), path.normalize("src/lib/ui")];
const ROOT = "src";
const offenders = [];

function walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = path.join(dir, name);
    if (statSync(p).isDirectory()) {
      if (p.startsWith(path.normalize("src/styles/squad"))) continue;
      walk(p);
    } else if (/\.(ts|tsx)$/.test(name)) {
      if (ALLOWED.some((a) => p.startsWith(a))) continue;
      const lines = readFileSync(p, "utf8").split("\n");
      lines.forEach((line, i) => {
        if (/["'`][^"'`]*\bsq-[a-z]/.test(line)) offenders.push(`${p}:${i + 1}  ${line.trim()}`);
      });
    }
  }
}

walk(ROOT);
if (offenders.length) {
  console.error(
    "Design-rule violation: sq-* class literals outside src/components/ui/:\n" +
      offenders.join("\n"),
  );
  process.exit(1);
}
console.log("design rules OK");
