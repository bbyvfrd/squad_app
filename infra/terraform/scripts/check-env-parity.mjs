import { readFileSync } from "node:fs";

function exampleKeys() {
  return readFileSync(".env.example", "utf8")
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith("#"))
    .map((l) => l.split("=")[0])
    .sort();
}

const contract = JSON.parse(readFileSync("infra/terraform/env-contract.json", "utf8"));
const declared = [...contract.tf_managed, ...contract.platform_managed].sort();
const example = exampleKeys();

const missing = example.filter((k) => !declared.includes(k));
const extra = declared.filter((k) => !example.includes(k));

if (missing.length || extra.length) {
  console.error("Env-var parity FAILED: infra contract and app .env.example diverge.");
  if (missing.length) console.error("  In .env.example but not the TF contract:", missing);
  if (extra.length) console.error("  In the TF contract but not .env.example:", extra);
  process.exit(1);
}
console.log(`Env-var parity OK — ${declared.length} keys aligned (app schema == TF contract).`);
