import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest, NextResponse } from "next/server";

vi.mock("@/lib/auth/update-session", () => ({ updateSession: vi.fn() }));
import { updateSession } from "@/lib/auth/update-session";
import { proxy } from "./proxy";

function req(path: string, headers?: Record<string, string>): NextRequest {
  return new NextRequest(new URL(`https://squad.test${path}`), { headers });
}

const BEARER = { authorization: "Bearer native-access-token" };
const AUTH_COOKIE = { cookie: "sb-ref-auth-token.0=chunk" };

// What updateSession really yields for a request with no session cookie: no claims.
function anonymousSession() {
  vi.mocked(updateSession).mockResolvedValue({ userId: null, response: NextResponse.next() });
}

// NextResponse.next() — the proxy let the request continue to the route handler.
function passedThrough(res: Response): boolean {
  return res.headers.get("x-middleware-next") === "1";
}

describe("proxy", () => {
  beforeEach(() => vi.resetAllMocks());

  it("returns a 401 envelope for an anonymous API request", async () => {
    anonymousSession();
    const res = await proxy(req("/api/v1/games"));
    expect(res.status).toBe(401);
    await expect(res.json()).resolves.toEqual({
      error: { code: "UNAUTHORIZED", message: "Sign in to continue." },
    });
  });

  describe("native Bearer transport", () => {
    it.each(["/api/v1/games", "/api/v1/participations/p-1", "/api/v1/me/games"])(
      "lets a Bearer-only request to %s reach the route handler",
      async (path) => {
        anonymousSession(); // the cookie path would reject it: no cookie, no claims
        const res = await proxy(req(path, BEARER));
        expect(passedThrough(res)).toBe(true);
        // The handler's requireUser(req) verifies the Bearer — the proxy must not
        // verify it a second time (or touch the cookie session at all).
        expect(updateSession).not.toHaveBeenCalled();
      },
    );

    it("keeps a Bearer that arrives alongside an auth cookie on the cookie path", async () => {
      anonymousSession();
      const res = await proxy(req("/api/v1/games", { ...BEARER, ...AUTH_COOKIE }));
      expect(updateSession).toHaveBeenCalledOnce();
      expect(res.status).toBe(401);
    });

    it.each([
      ["a non-Bearer scheme", { authorization: "Basic dXNlcjpwYXNz" }],
      ["an empty Bearer", { authorization: "Bearer " }],
    ])("does not pass through %s", async (_label, headers) => {
      anonymousSession();
      const res = await proxy(req("/api/v1/games", headers));
      expect(updateSession).toHaveBeenCalledOnce();
      expect(res.status).toBe(401);
    });

    it("only applies under /api/, not to a path that merely starts with /api", async () => {
      anonymousSession();
      const res = await proxy(req("/apiary", BEARER));
      expect(passedThrough(res)).toBe(false);
      expect(updateSession).toHaveBeenCalledOnce();
    });

    it("still redirects a page request that carries only a Bearer to /signin", async () => {
      anonymousSession();
      const res = await proxy(req("/app/games", BEARER));
      expect(res.status).toBe(307);
      const url = new URL(res.headers.get("location")!);
      expect(url.pathname).toBe("/signin");
      expect(url.searchParams.get("next")).toBe("/app/games");
    });
  });

  it("redirects an anonymous page request to /signin with a next param", async () => {
    vi.mocked(updateSession).mockResolvedValue({
      userId: null,
      response: NextResponse.next(),
    });
    const res = await proxy(req("/app"));
    expect(res.status).toBe(307);
    const location = res.headers.get("location")!;
    const url = new URL(location);
    expect(url.pathname).toBe("/signin");
    expect(url.searchParams.get("next")).toBe("/app");
  });

  it("preserves the original path (with query) in the next param", async () => {
    vi.mocked(updateSession).mockResolvedValue({
      userId: null,
      response: NextResponse.next(),
    });
    const res = await proxy(req("/app/games?sport=football"));
    const url = new URL(res.headers.get("location")!);
    expect(url.searchParams.get("next")).toBe("/app/games?sport=football");
  });

  it("returns the refreshed response untouched for an authenticated request", async () => {
    const refreshed = NextResponse.next();
    refreshed.headers.set("x-test-marker", "refreshed");
    vi.mocked(updateSession).mockResolvedValue({ userId: "user-1", response: refreshed });
    const res = await proxy(req("/app"));
    expect(res).toBe(refreshed);
    expect(res.headers.get("x-test-marker")).toBe("refreshed");
  });
});
