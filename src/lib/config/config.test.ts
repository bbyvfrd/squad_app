import { describe, it, expect } from "vitest";
import { parseEnv } from "./index";

const valid = {
  NODE_ENV: "test",
  DATABASE_URL: "postgresql://postgres:postgres@127.0.0.1:54322/postgres",
  NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
  NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-key",
};

describe("parseEnv", () => {
  it("parses a valid environment into typed config", () => {
    const cfg = parseEnv(valid);
    expect(cfg.databaseUrl).toBe(valid.DATABASE_URL);
    expect(cfg.supabaseUrl).toBe(valid.NEXT_PUBLIC_SUPABASE_URL);
  });

  it("throws a descriptive error when a required var is missing", () => {
    const { DATABASE_URL, ...missing } = valid;
    expect(() => parseEnv(missing)).toThrow(/DATABASE_URL/);
  });

  it("throws when a URL var is malformed", () => {
    expect(() => parseEnv({ ...valid, DATABASE_URL: "not-a-url" })).toThrow();
  });
});
