import { describe, it, expect, vi, beforeEach } from "vitest";
import { AuthError } from "@/lib/auth/errors";

vi.mock("@/lib/auth/web-session", () => ({ signOutWeb: vi.fn() }));
vi.mock("@/lib/auth/csrf", () => ({ assertBrowserMutation: vi.fn() }));

import { signOutWeb } from "@/lib/auth/web-session";
import { assertBrowserMutation } from "@/lib/auth/csrf";
import { POST } from "./route";

function req(): Request {
  return new Request("http://localhost/api/v1/auth/signout", {
    method: "POST",
    headers: { "x-squad-csrf": "1" },
  });
}

describe("POST /api/v1/auth/signout", () => {
  beforeEach(() => vi.resetAllMocks());

  it("returns 200 { ok: true } and clears the session", async () => {
    vi.mocked(signOutWeb).mockResolvedValue(undefined);
    const res = await POST(req());
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ ok: true });
    expect(signOutWeb).toHaveBeenCalledTimes(1);
  });

  it("rejects with 403 and no Set-Cookie when the CSRF gate throws", async () => {
    vi.mocked(assertBrowserMutation).mockImplementation(() => {
      throw new AuthError("CSRF", 403);
    });
    const res = await POST(req());
    expect(res.status).toBe(403);
    await expect(res.json()).resolves.toEqual({
      error: { code: "CSRF", message: "Request blocked." },
    });
    expect(res.headers.get("set-cookie")).toBeNull();
    expect(signOutWeb).not.toHaveBeenCalled();
  });

  it("maps an unexpected failure to 500 UNEXPECTED", async () => {
    vi.mocked(signOutWeb).mockRejectedValue(new Error("boom"));
    const res = await POST(req());
    expect(res.status).toBe(500);
    await expect(res.json()).resolves.toMatchObject({ error: { code: "UNEXPECTED" } });
  });
});
