// scripts/sync-design-system.mjs
// Vendors the SQUAD design system into the app. Source of truth: docs/context/design/.
// Usage: node scripts/sync-design-system.mjs [--icons]
//   (no flag)  copy colors_and_type.css (with @font-face stripped) + write VERSION
//   --icons    additionally download the subsetted Material Symbols font (network)
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const SRC = "docs/context/design";
const OUT = "src/styles/squad";

export function stripFontFaces(css) {
  // @font-face blocks contain no nested braces — a non-greedy block match is exact.
  return css.replace(/@font-face\s*\{[^}]*\}\s*/g, "");
}

export function designVersion(changelog) {
  const m = changelog.match(/^## \[(\d+\.\d+\.\d+)\]/m);
  if (!m) throw new Error("No semver heading found in design CHANGELOG");
  return m[1];
}

async function fetchIconSubset(names) {
  const family =
    "Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200";
  const url = `https://fonts.googleapis.com/css2?family=${family}&icon_names=${names.join(",")}&display=block`;
  // A modern UA is required or the API serves TTF instead of woff2.
  const css = await (await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 Chrome/120" } })).text();
  const woff2 = css.match(/url\((https:[^)]+\.woff2)\)/)?.[1];
  if (!woff2) throw new Error(`No woff2 URL in css2 response:\n${css.slice(0, 300)}`);
  const buf = Buffer.from(await (await fetch(woff2)).arrayBuffer());
  writeFileSync(path.join(OUT, "fonts/material-symbols-subset.woff2"), buf);
  console.log(`icon subset: ${names.length} icons, ${(buf.length / 1024).toFixed(1)} KB`);
}

async function main() {
  mkdirSync(path.join(OUT, "fonts"), { recursive: true });
  const css = readFileSync(path.join(SRC, "colors_and_type.css"), "utf8");
  const header = `/* VENDORED from ${SRC}/colors_and_type.css — DO NOT EDIT.\n   Regenerate: node scripts/sync-design-system.mjs (fonts load via next/font; @font-face stripped). */\n`;
  writeFileSync(path.join(OUT, "colors_and_type.css"), header + stripFontFaces(css));
  const version = designVersion(readFileSync(path.join(SRC, "CHANGELOG.md"), "utf8"));
  writeFileSync(path.join(OUT, "VERSION"), version + "\n");
  console.log(`vendored design system v${version}`);
  if (process.argv.includes("--icons")) {
    const names = readFileSync(path.join(OUT, "icon-inventory.txt"), "utf8")
      .split("\n").map((s) => s.trim()).filter(Boolean).sort();
    await fetchIconSubset(names);
  }
}

if (process.argv[1] && import.meta.url.endsWith(path.basename(process.argv[1]))) {
  await main();
}
