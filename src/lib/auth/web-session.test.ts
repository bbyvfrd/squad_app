import { describe, it, expect, vi, beforeEach } from "vitest";

// `import "server-only"` (the build-time guard at the top of web-session.ts) throws
// when loaded outside React's `react-server` export condition, which the vitest node
// env does not set. Stub it to a no-op so the module under test imports; the real
// guard stays in the source and still blocks client bundles.
vi.mock("server-only", () => ({}));

// Fake cookie-bound supabase client whose auth methods are spies, plus a
// controllable Next cookie store. These are wrapped in `vi.hoisted` so the spies
// exist before the hoisted `vi.mock` factories below reference them (a bare
// top-level const would be read "before initialization" by the hoisted mock).
const { auth, createSupabaseServerClient, deleteCookie, cookieState } = vi.hoisted(() => {
  const auth = {
    signUp: vi.fn(),
    signInWithPassword: vi.fn(),
    signOut: vi.fn(),
  };
  const createSupabaseServerClient = vi.fn(async () => ({ auth }));
  // getAll() returns whatever `cookieState.jar` holds; delete() records names.
  const cookieState = { jar: [] as { name: string; value: string }[] };
  const deleteCookie = vi.fn((name: string) => {
    cookieState.jar = cookieState.jar.filter((c) => c.name !== name);
  });
  return { auth, createSupabaseServerClient, deleteCookie, cookieState };
});

vi.mock("./server-client", () => ({ createSupabaseServerClient }));

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({
    getAll: () => cookieState.jar,
    delete: deleteCookie,
    set: vi.fn(),
  })),
}));

import { AuthApiError } from "@supabase/supabase-js";
import { signUpWeb, signInWeb, signOutWeb } from "./web-session";
import { AuthError } from "./errors";

// A REAL supabase-js AuthApiError so mapSupabaseError's instanceof guard
// (isAuthApiError) recognizes it — a hand-rolled Error would fall through to
// UNEXPECTED(500) and these translation assertions would silently pass for the
// wrong reason. Verified signature: new AuthApiError(message, status, code).
function authApiError(opts: { status: number; code?: string }) {
  return new AuthApiError("vendor boom", opts.status, opts.code);
}

describe("web-session", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    createSupabaseServerClient.mockResolvedValue({ auth });
    cookieState.jar = [];
  });

  describe("signUpWeb", () => {
    it("signs up with metadata and returns our AuthUser (no token)", async () => {
      auth.signUp.mockResolvedValue({
        data: { user: { id: "u1", email: "a@example.com" }, session: { access_token: "tok" } },
        error: null,
      });

      const result = await signUpWeb({
        email: "a@example.com",
        password: "longenough",
        fullName: "Ada Lovelace",
        displayName: null,
      });

      expect(result).toEqual({ id: "u1", email: "a@example.com" });
      expect(result).not.toHaveProperty("token");
      expect(auth.signUp).toHaveBeenCalledWith({
        email: "a@example.com",
        password: "longenough",
        options: { data: { full_name: "Ada Lovelace", display_name: null } },
      });
    });

    it("translates a vendor email_exists error into AuthError(EMAIL_TAKEN, 409)", async () => {
      auth.signUp.mockResolvedValue({
        data: { user: null, session: null },
        error: authApiError({ status: 422, code: "email_exists" }),
      });

      await expect(
        signUpWeb({ email: "a@example.com", password: "longenough", fullName: "Ada" }),
      ).rejects.toMatchObject({ code: "EMAIL_TAKEN", status: 409 });
    });

    it("throws AuthError when no user comes back despite no error", async () => {
      auth.signUp.mockResolvedValue({ data: { user: null, session: null }, error: null });
      await expect(
        signUpWeb({ email: "a@example.com", password: "longenough", fullName: "Ada" }),
      ).rejects.toBeInstanceOf(AuthError);
    });
  });

  describe("signInWeb", () => {
    it("signs in and returns our AuthUser (no token)", async () => {
      auth.signInWithPassword.mockResolvedValue({
        data: { user: { id: "u1", email: "a@example.com" }, session: { access_token: "tok" } },
        error: null,
      });

      const result = await signInWeb({ email: "a@example.com", password: "longenough" });

      expect(result).toEqual({ id: "u1", email: "a@example.com" });
      expect(result).not.toHaveProperty("token");
      expect(auth.signInWithPassword).toHaveBeenCalledWith({
        email: "a@example.com",
        password: "longenough",
      });
    });

    it("threads remember=true into the cookie-bound client (persistent cookie)", async () => {
      auth.signInWithPassword.mockResolvedValue({
        data: { user: { id: "u1", email: "a@example.com" }, session: { access_token: "tok" } },
        error: null,
      });

      await signInWeb({ email: "a@example.com", password: "longenough", remember: true });
      expect(createSupabaseServerClient).toHaveBeenCalledWith(true);
    });

    it("threads remember=false into the cookie-bound client (session cookie)", async () => {
      auth.signInWithPassword.mockResolvedValue({
        data: { user: { id: "u1", email: "a@example.com" }, session: { access_token: "tok" } },
        error: null,
      });

      await signInWeb({ email: "a@example.com", password: "longenough", remember: false });
      expect(createSupabaseServerClient).toHaveBeenCalledWith(false);
    });

    it("clears stale sb-* cookie chunks before writing (anti session-fixation, §3)", async () => {
      auth.signInWithPassword.mockResolvedValue({
        data: { user: { id: "u1", email: "a@example.com" }, session: { access_token: "tok" } },
        error: null,
      });
      cookieState.jar = [
        { name: "sb-access-token", value: "stale1" },
        { name: "sb-refresh-token", value: "stale2" },
        { name: "other", value: "keep" },
      ];

      await signInWeb({ email: "a@example.com", password: "longenough" });

      // Both sb-* chunks deleted; the unrelated cookie is left untouched.
      expect(deleteCookie).toHaveBeenCalledWith("sb-access-token");
      expect(deleteCookie).toHaveBeenCalledWith("sb-refresh-token");
      expect(deleteCookie).not.toHaveBeenCalledWith("other");
    });

    it("translates the token-endpoint 400/undefined-code bug into INVALID_CREDENTIALS (401)", async () => {
      auth.signInWithPassword.mockResolvedValue({
        data: { user: null, session: null },
        error: authApiError({ status: 400, code: undefined }),
      });

      await expect(
        signInWeb({ email: "a@example.com", password: "wrongpass" }),
      ).rejects.toMatchObject({ code: "INVALID_CREDENTIALS", status: 401 });
    });
  });

  describe("signOutWeb", () => {
    it("signs out single-device (scope local) and resolves", async () => {
      auth.signOut.mockResolvedValue({ error: null });
      await expect(signOutWeb()).resolves.toBeUndefined();
      expect(auth.signOut).toHaveBeenCalledWith({ scope: "local" });
    });

    it("translates a vendor signOut error into an AuthError", async () => {
      auth.signOut.mockResolvedValue({ error: authApiError({ status: 500, code: "unexpected" }) });
      await expect(signOutWeb()).rejects.toBeInstanceOf(AuthError);
    });
  });
});
