import { describe, it, expect, vi, beforeEach } from "vitest";
import { AuthError } from "@/lib/auth/errors";

vi.mock("@/lib/auth/web-session", () => ({ signInWeb: vi.fn() }));
vi.mock("@/lib/auth/csrf", () => ({ assertBrowserMutation: vi.fn() }));

import { signInWeb } from "@/lib/auth/web-session";
import { assertBrowserMutation } from "@/lib/auth/csrf";
import { POST } from "./route";

function req(body: unknown): Request {
  return new Request("http://localhost/api/v1/auth/signin", {
    method: "POST",
    headers: { "content-type": "application/json", "x-squad-csrf": "1" },
    body: JSON.stringify(body),
  });
}

const VALID = { email: "a@example.com", password: "password1", remember: true };

describe("POST /api/v1/auth/signin", () => {
  beforeEach(() => vi.resetAllMocks());

  it("returns 200 and { user } on success and passes remember through", async () => {
    vi.mocked(signInWeb).mockResolvedValue({ id: "u1", email: "a@example.com" });
    const res = await POST(req(VALID));
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ user: { id: "u1", email: "a@example.com" } });
    expect(signInWeb).toHaveBeenCalledWith({
      email: "a@example.com",
      password: "password1",
      remember: true,
    });
  });

  it("never includes a token in the response body", async () => {
    vi.mocked(signInWeb).mockResolvedValue({ id: "u1", email: "a@example.com" });
    const res = await POST(req(VALID));
    const body = await res.json();
    expect(body).not.toHaveProperty("token");
    expect(JSON.stringify(body)).not.toContain("token");
  });

  it("rejects with 403 and no Set-Cookie when the CSRF gate throws", async () => {
    vi.mocked(assertBrowserMutation).mockImplementation(() => {
      throw new AuthError("CSRF", 403);
    });
    const res = await POST(req(VALID));
    expect(res.status).toBe(403);
    await expect(res.json()).resolves.toEqual({
      error: { code: "CSRF", message: "Request blocked." },
    });
    expect(res.headers.get("set-cookie")).toBeNull();
    expect(signInWeb).not.toHaveBeenCalled();
  });

  it("maps invalid credentials (the undefined-code token-endpoint case) to 401", async () => {
    // errors.ts maps a 400 token-endpoint AuthApiError with code===undefined to
    // INVALID_CREDENTIALS(401); the handler just relays whatever AuthError it gets.
    vi.mocked(signInWeb).mockRejectedValue(new AuthError("INVALID_CREDENTIALS", 401));
    const res = await POST(req(VALID));
    expect(res.status).toBe(401);
    await expect(res.json()).resolves.toEqual({
      error: { code: "INVALID_CREDENTIALS", message: "Email or password is incorrect." },
    });
  });

  it("returns 400 INVALID_INPUT on a malformed body", async () => {
    const res = await POST(req({ email: "x", password: "" }));
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toMatchObject({ error: { code: "INVALID_INPUT" } });
    expect(signInWeb).not.toHaveBeenCalled();
  });

  it("maps an unexpected failure to 500 UNEXPECTED", async () => {
    vi.mocked(signInWeb).mockRejectedValue(new Error("boom"));
    const res = await POST(req(VALID));
    expect(res.status).toBe(500);
    await expect(res.json()).resolves.toMatchObject({ error: { code: "UNEXPECTED" } });
  });
});
