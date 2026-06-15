import { describe, it, expect } from "vitest";
import { AuthApiError, isAuthApiError } from "@supabase/supabase-js";
import { AuthError, mapSupabaseError } from "./errors";

// A REAL supabase-js AuthApiError — `isAuthApiError` is an `instanceof` check
// (verified against the installed @supabase/supabase-js), so a hand-rolled Error
// with `name = "AuthApiError"` would fail the guard and every mapper case would
// fall through to UNEXPECTED(500). The verified constructor is
// `new AuthApiError(message, status, code)`.
function authApiError(opts: { status: number; code?: string; message?: string }) {
  return new AuthApiError(opts.message ?? "boom", opts.status, opts.code);
}

describe("AuthError", () => {
  it("carries a code and an HTTP status", () => {
    const err = new AuthError("WEAK_PASSWORD", 422);
    expect(err).toBeInstanceOf(Error);
    expect(err.code).toBe("WEAK_PASSWORD");
    expect(err.status).toBe(422);
    expect(err.message).toBe("WEAK_PASSWORD");
  });
});

describe("mapSupabaseError — keyed on error.code when present", () => {
  it("the test fixture is a REAL AuthApiError (guards the instanceof check)", () => {
    // Fails fast if the fixture ever regresses to a fake error: a wrong fixture
    // would make isAuthApiError return false and silently route every case to
    // UNEXPECTED(500), turning the rest of this suite into false greens.
    expect(isAuthApiError(authApiError({ status: 400, code: "invalid_credentials" }))).toBe(true);
  });

  it("maps invalid_credentials → INVALID_CREDENTIALS (401)", () => {
    const out = mapSupabaseError(authApiError({ status: 400, code: "invalid_credentials" }));
    expect(out.code).toBe("INVALID_CREDENTIALS");
    expect(out.status).toBe(401);
  });

  it("maps email_exists → EMAIL_TAKEN (409)", () => {
    const out = mapSupabaseError(authApiError({ status: 422, code: "email_exists" }));
    expect(out.code).toBe("EMAIL_TAKEN");
    expect(out.status).toBe(409);
  });

  it("maps user_already_exists → EMAIL_TAKEN (409)", () => {
    const out = mapSupabaseError(authApiError({ status: 422, code: "user_already_exists" }));
    expect(out.code).toBe("EMAIL_TAKEN");
    expect(out.status).toBe(409);
  });

  it("maps weak_password → WEAK_PASSWORD (422)", () => {
    const out = mapSupabaseError(authApiError({ status: 422, code: "weak_password" }));
    expect(out.code).toBe("WEAK_PASSWORD");
    expect(out.status).toBe(422);
  });

  it("maps validation_failed → INVALID_INPUT (400)", () => {
    const out = mapSupabaseError(authApiError({ status: 400, code: "validation_failed" }));
    expect(out.code).toBe("INVALID_INPUT");
    expect(out.status).toBe(400);
  });

  it("maps email_address_invalid → INVALID_INPUT (400)", () => {
    const out = mapSupabaseError(authApiError({ status: 400, code: "email_address_invalid" }));
    expect(out.code).toBe("INVALID_INPUT");
    expect(out.status).toBe(400);
  });

  it("maps an over_*_rate_limit code → RATE_LIMITED (429)", () => {
    const out = mapSupabaseError(authApiError({ status: 429, code: "over_request_rate_limit" }));
    expect(out.code).toBe("RATE_LIMITED");
    expect(out.status).toBe(429);
  });
});

describe("mapSupabaseError — status fallback when code is absent", () => {
  it("maps the token-endpoint 400 with undefined code → INVALID_CREDENTIALS (401)", () => {
    // The known supabase-js bug: bad password at the token endpoint returns
    // status 400 with code === undefined. Must not become a generic 400.
    const out = mapSupabaseError(authApiError({ status: 400, code: undefined }));
    expect(out.code).toBe("INVALID_CREDENTIALS");
    expect(out.status).toBe(401);
  });

  it("maps a 429 with no code → RATE_LIMITED (429)", () => {
    const out = mapSupabaseError(authApiError({ status: 429, code: undefined }));
    expect(out.code).toBe("RATE_LIMITED");
    expect(out.status).toBe(429);
  });

  it("maps an unrecognized AuthApiError → AUTH_ERROR with its status", () => {
    const out = mapSupabaseError(authApiError({ status: 418, code: "some_new_code" }));
    expect(out.code).toBe("AUTH_ERROR");
    expect(out.status).toBe(418);
  });

  it("falls back to status 400 for an AuthApiError reporting no status", () => {
    const e = authApiError({ status: 0, code: "some_new_code" });
    // simulate a missing status defensively
    (e as { status?: number }).status = undefined;
    const out = mapSupabaseError(e);
    expect(out.code).toBe("AUTH_ERROR");
    expect(out.status).toBe(400);
  });
});

describe("mapSupabaseError — non-AuthApiError", () => {
  it("passes through an existing AuthError unchanged", () => {
    const existing = new AuthError("CSRF", 403);
    expect(mapSupabaseError(existing)).toBe(existing);
  });

  it("maps a plain Error → UNEXPECTED (500)", () => {
    const out = mapSupabaseError(new Error("network down"));
    expect(out.code).toBe("UNEXPECTED");
    expect(out.status).toBe(500);
  });

  it("maps a non-error value → UNEXPECTED (500)", () => {
    const out = mapSupabaseError("nope");
    expect(out.code).toBe("UNEXPECTED");
    expect(out.status).toBe(500);
  });
});
