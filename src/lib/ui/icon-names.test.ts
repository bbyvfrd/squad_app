import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { ICON_NAMES } from "./icon-names";

describe("icon names", () => {
  it("exactly mirror the subset inventory file", () => {
    const inventory = readFileSync("src/styles/squad/icon-inventory.txt", "utf8")
      .split("\n").map((s) => s.trim()).filter(Boolean).sort();
    expect([...ICON_NAMES].sort()).toEqual(inventory);
  });
});
