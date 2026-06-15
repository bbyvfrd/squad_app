import { describe, it, expect, vi, beforeEach } from "vitest";
import { AuthError } from "@/lib/auth/errors";

vi.mock("@/lib/auth/web-session", () => ({ signUpWeb: vi.fn() }));
vi.mock("@/lib/auth/csrf", () => ({ assertBrowserMutation: vi.fn() }));

import { signUpWeb } from "@/lib/auth/web-session";
import { assertBrowserMutation } from "@/lib/auth/csrf";
import { POST } from "./route";

function req(body: unknown): Request {
  return new Request("http://localhost/api/v1/auth/signup", {
    method: "POST",
    headers: { "content-type": "application/json", "x-squad-csrf": "1" },
    body: JSON.stringify(body),
  });
}

const VALID = {
  email: "a@example.com",
  password: "password1",
  fullName: "Ada Lovelace",
  displayName: null,
};

describe("POST /api/v1/auth/signup", () => {
  beforeEach(() => vi.resetAllMocks());

  it("returns 201 and { user } on success", async () => {
    vi.mocked(signUpWeb).mockResolvedValue({ id: "u1", email: "a@example.com" });
    const res = await POST(req(VALID));
    expect(res.status).toBe(201);
    await expect(res.json()).resolves.toEqual({ user: { id: "u1", email: "a@example.com" } });
    expect(signUpWeb).toHaveBeenCalledWith({
      email: "a@example.com",
      password: "password1",
      fullName: "Ada Lovelace",
      displayName: null,
    });
  });

  it("never includes a token in the response body", async () => {
    vi.mocked(signUpWeb).mockResolvedValue({ id: "u1", email: "a@example.com" });
    const res = await POST(req(VALID));
    const body = await res.json();
    expect(body).not.toHaveProperty("token");
    expect(JSON.stringify(body)).not.toContain("token");
  });

  it("runs the CSRF gate before touching the vendor", async () => {
    vi.mocked(assertBrowserMutation).mockImplementation(() => {
      throw new AuthError("CSRF", 403);
    });
    const res = await POST(req(VALID));
    expect(res.status).toBe(403);
    await expect(res.json()).resolves.toEqual({
      error: { code: "CSRF", message: "Request blocked." },
    });
    expect(res.headers.get("set-cookie")).toBeNull();
    expect(signUpWeb).not.toHaveBeenCalled();
  });

  it("returns 400 INVALID_INPUT on a malformed body without calling the vendor", async () => {
    const res = await POST(req({ email: "not-an-email", password: "short" }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe("INVALID_INPUT");
    expect(signUpWeb).not.toHaveBeenCalled();
  });

  it("maps a mapped AuthError from the vendor (EMAIL_TAKEN → 409)", async () => {
    vi.mocked(signUpWeb).mockRejectedValue(new AuthError("EMAIL_TAKEN", 409));
    const res = await POST(req(VALID));
    expect(res.status).toBe(409);
    await expect(res.json()).resolves.toEqual({
      error: { code: "EMAIL_TAKEN", message: "An account with this email already exists." },
    });
  });

  it("maps an unexpected (non-AuthError) failure to 500 UNEXPECTED", async () => {
    vi.mocked(signUpWeb).mockRejectedValue(new Error("boom"));
    const res = await POST(req(VALID));
    expect(res.status).toBe(500);
    await expect(res.json()).resolves.toMatchObject({ error: { code: "UNEXPECTED" } });
  });
});
