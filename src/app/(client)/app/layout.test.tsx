import { describe, it, expect, vi, beforeEach } from "vitest";

// vi.mock is hoisted above top-level consts, so the spies must be created in a
// hoisted block to be referenceable inside the factories. redirect() throws in Next
// to halt rendering; the mock mimics that so we can assert the guard short-circuits
// before bootstrap when there is no session.
const { redirect, getCurrentUser, ensureClientProfile } = vi.hoisted(() => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`);
  }),
  getCurrentUser: vi.fn(),
  ensureClientProfile: vi.fn(),
}));

vi.mock("next/navigation", () => ({ redirect }));
vi.mock("@/lib/auth/session", () => ({ getCurrentUser }));
vi.mock("@/lib/auth/bootstrap", () => ({ ensureClientProfile }));

import AppGuardLayout from "./layout";

const children = "child" as unknown as React.ReactNode;

describe("AppGuardLayout (/app guard)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("resolves the session via the cookie path (no Request argument)", async () => {
    getCurrentUser.mockResolvedValue({ id: "u_web", email: "w@example.com" });
    await AppGuardLayout({ children });
    expect(getCurrentUser).toHaveBeenCalledWith(); // no arg → cookie transport
  });

  it("redirects anonymous visitors to /signin and never bootstraps", async () => {
    getCurrentUser.mockResolvedValue(null);

    await expect(AppGuardLayout({ children })).rejects.toThrow("NEXT_REDIRECT:/signin");

    expect(redirect).toHaveBeenCalledWith("/signin");
    expect(ensureClientProfile).not.toHaveBeenCalled();
  });

  it("bootstraps the client-surface marker for an authed user, then renders children", async () => {
    getCurrentUser.mockResolvedValue({ id: "u_web", email: "w@example.com" });

    const result = await AppGuardLayout({ children });

    expect(ensureClientProfile).toHaveBeenCalledWith("u_web");
    expect(redirect).not.toHaveBeenCalled();
    // The guard is transparent: it returns a fragment wrapping children unchanged.
    expect(result).toEqual(<>{children}</>);
  });
});
