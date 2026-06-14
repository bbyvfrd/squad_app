import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest, NextResponse } from "next/server";

vi.mock("@/lib/auth/update-session", () => ({ updateSession: vi.fn() }));
import { updateSession } from "@/lib/auth/update-session";
import { proxy } from "./proxy";

function req(path: string): NextRequest {
  return new NextRequest(new URL(`https://squad.test${path}`));
}

describe("proxy", () => {
  beforeEach(() => vi.resetAllMocks());

  it("returns a 401 envelope for an anonymous API request", async () => {
    vi.mocked(updateSession).mockResolvedValue({
      userId: null,
      response: NextResponse.next(),
    });
    const res = await proxy(req("/api/v1/games"));
    expect(res.status).toBe(401);
    await expect(res.json()).resolves.toEqual({ error: { code: "UNAUTHORIZED" } });
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
