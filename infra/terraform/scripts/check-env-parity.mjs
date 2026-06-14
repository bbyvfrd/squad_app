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
// Three buckets, all "declared" for parity: tf_managed (TF provisions a value per env —
// every key here MUST have an env_values entry or the plan fails), platform_managed (set
// by the platform, e.g. NODE_ENV), and app_optional (app-declared with a safe default/
// fallback, NOT yet TF-provisioned — promote to tf_managed + add env_values when a
// non-default value is actually needed, e.g. AUTH_ALLOWED_ORIGINS in prod).
const declared = [
  ...contract.tf_managed,
  ...contract.platform_managed,
  ...(contract.app_optional ?? []),
].sort();
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
