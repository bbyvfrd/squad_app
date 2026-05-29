import { describe, it, expect } from "vitest";
import { newId } from "./id";

// 8-4-4-4-12 hex, with the version nibble pinned to 7 and the variant nibble to 8–b.
const UUID_V7_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

describe("newId", () => {
  it("returns a valid UUIDv7 (version nibble = 7)", () => {
    expect(newId()).toMatch(UUID_V7_RE);
  });

  it("is time-ordered: a batch of ids is already in sorted order", () => {
    const ids = Array.from({ length: 50 }, () => newId());
    expect(ids).toEqual([...ids].sort());
  });

  it("does not collide across many calls", () => {
    const n = 10_000;
    const ids = new Set(Array.from({ length: n }, () => newId()));
    expect(ids.size).toBe(n);
  });
});
