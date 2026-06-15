import { describe, it, expect, vi, beforeEach } from "vitest";

// `import "server-only"` (the build-time guard at the top of session.ts) throws when
// loaded outside React's `react-server` export condition, which the vitest node env
// does not set. Stub it to a no-op so the module under test imports; the real guard
// stays in the source and still blocks client bundles.
vi.mock("server-only", () => ({}));

const getClaims = vi.fn();
const verify = vi.fn();

vi.mock("@supabase/ssr", () => ({
  createServerClient: vi.fn(() => ({ auth: { getClaims } })),
}));
vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({ getAll: () => [], set: () => {} })),
}));
vi.mock("./index", () => ({ getAuthProvider: () => ({ verify }) }));

import { getCurrentUser, requireUser } from "./session";
import { AuthError } from "./errors";

function bearerReq(token: string): Request {
  return new Request("http://localhost/api/v1/x", {
    headers: { authorization: `Bearer ${token}` },
  });
}

describe("getCurrentUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("resolves a valid Bearer via the provider (the native seam works)", async () => {
    verify.mockResolvedValue({ id: "u_native", email: "n@example.com" });
    const user = await getCurrentUser(bearerReq("good.jwt.token"));
    expect(user).toEqual({ id: "u_native", email: "n@example.com" });
    expect(verify).toHaveBeenCalledWith("good.jwt.token");
    // No fall-through to the cookie transport when a Bearer is present.
    expect(getClaims).not.toHaveBeenCalled();
  });

  it("returns null for an invalid Bearer and does NOT fall through to the cookie", async () => {
    verify.mockResolvedValue(null);
    const user = await getCurrentUser(bearerReq("bad.jwt.token"));
    expect(user).toBeNull();
    expect(getClaims).not.toHaveBeenCalled(); // critical: invalid Bearer is final
  });

  it("resolves a valid cookie session when no Bearer is present", async () => {
    getClaims.mockResolvedValue({
      data: { claims: { sub: "u_web", email: "w@example.com" } },
      error: null,
    });
    const user = await getCurrentUser(); // no req → cookie-only
    expect(user).toEqual({ id: "u_web", email: "w@example.com" });
    expect(verify).not.toHaveBeenCalled();
  });

  it("returns null for the no-session-no-error cookie state (the common branch)", async () => {
    getClaims.mockResolvedValue({ data: null, error: null });
    expect(await getCurrentUser()).toBeNull();
  });

  it("returns null for the invalid cookie state (data null, error present)", async () => {
    getClaims.mockResolvedValue({ data: null, error: new Error("invalid") });
    expect(await getCurrentUser()).toBeNull();
  });
});

describe("requireUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns the user when a session resolves", async () => {
    verify.mockResolvedValue({ id: "u_native", email: "n@example.com" });
    await expect(requireUser(bearerReq("good.jwt.token"))).resolves.toEqual({
      id: "u_native",
      email: "n@example.com",
    });
  });

  it("throws AuthError UNAUTHORIZED (401) when there is no session", async () => {
    getClaims.mockResolvedValue({ data: null, error: null });
    await expect(requireUser()).rejects.toMatchObject({
      constructor: AuthError,
      code: "UNAUTHORIZED",
      status: 401,
    });
  });
});
