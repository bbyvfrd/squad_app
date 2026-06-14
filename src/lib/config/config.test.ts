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

  it("prefers the publishable key but falls back to the anon key", () => {
    const withPublishable = parseEnv({
      ...valid,
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "publishable-key",
    });
    expect(withPublishable.supabasePublishableKey).toBe("publishable-key");

    const anonOnly = parseEnv(valid); // no publishable key present
    expect(anonOnly.supabasePublishableKey).toBe(valid.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  });

  it("exposes optional cookie domain and allowed origins", () => {
    const cfg = parseEnv({
      ...valid,
      AUTH_COOKIE_DOMAIN: ".squad.example",
      AUTH_ALLOWED_ORIGINS: "https://squad.example,https://app.squad.example",
    });
    expect(cfg.authCookieDomain).toBe(".squad.example");
    expect(cfg.authAllowedOrigins).toBe("https://squad.example,https://app.squad.example");
  });

  it("requires at least one of publishable or anon key", () => {
    const { NEXT_PUBLIC_SUPABASE_ANON_KEY, ...noKeys } = valid;
    expect(() => parseEnv(noKeys)).toThrow();
  });
});
