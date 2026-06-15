import { describe, it, expect } from "vitest";
import { SESSION_COOKIE_OPTIONS, REMEMBER_MAX_AGE } from "./cookie-options";

describe("SESSION_COOKIE_OPTIONS", () => {
  it("forces the security flags (overriding @supabase/ssr's insecure defaults)", () => {
    expect(SESSION_COOKIE_OPTIONS.httpOnly).toBe(true);
    expect(SESSION_COOKIE_OPTIONS.sameSite).toBe("lax");
    expect(SESSION_COOKIE_OPTIONS.path).toBe("/");
  });

  it("is not secure outside production (test env) and host-only by default", () => {
    // vitest env sets no NODE_ENV=production and no AUTH_COOKIE_DOMAIN.
    expect(SESSION_COOKIE_OPTIONS.secure).toBe(false);
    expect(SESSION_COOKIE_OPTIONS.domain).toBeUndefined();
  });

  it("carries no maxAge — that is decided per-call by the remember toggle", () => {
    expect("maxAge" in SESSION_COOKIE_OPTIONS).toBe(false);
  });

  it("pins the persistent (remember) window to 30 days in seconds", () => {
    expect(REMEMBER_MAX_AGE).toBe(60 * 60 * 24 * 30);
  });
});
