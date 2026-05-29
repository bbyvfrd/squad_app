import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function exampleKeys(): string[] {
  const text = readFileSync(resolve(process.cwd(), ".env.example"), "utf8");
  return text
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith("#"))
    .map((l) => l.split("=")[0]);
}

// Keys the Zod schema knows about — keep in sync with src/lib/config/index.ts.
const SCHEMA_KEYS = [
  "NODE_ENV",
  "DATABASE_URL",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
];

describe(".env.example parity", () => {
  it("documents exactly the keys the config schema declares", () => {
    expect(exampleKeys().sort()).toEqual([...SCHEMA_KEYS].sort());
  });
});
