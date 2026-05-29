import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { ENV_KEYS } from "./index";

function exampleKeys(): string[] {
  const text = readFileSync(resolve(process.cwd(), ".env.example"), "utf8");
  return text
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith("#"))
    .map((l) => l.split("=")[0]);
}

describe(".env.example parity", () => {
  it("documents exactly the keys the config schema declares", () => {
    expect(exampleKeys().sort()).toEqual([...ENV_KEYS].sort());
  });
});
