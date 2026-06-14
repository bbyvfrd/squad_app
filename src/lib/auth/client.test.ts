import { afterEach, describe, expect, it, vi } from "vitest";
import { AuthClientError, authClient } from "./client";

const fetchMock = vi.fn();
vi.stubGlobal("fetch", fetchMock);

function ok(body: unknown) {
  return { ok: true, status: 200, json: async () => body } as Response;
}
function fail(status: number, body: unknown) {
  return { ok: false, status, json: async () => body } as Response;
}

afterEach(() => {
  fetchMock.mockReset();
});

describe("authClient", () => {
  it("POSTs signup with the CSRF header and returns the user", async () => {
    fetchMock.mockResolvedValueOnce(ok({ user: { id: "u1", email: "a@b.co" } }));

    const user = await authClient.signUp({
      email: "a@b.co",
      password: "password1",
      fullName: "Aysel M",
      displayName: null,
    });

    expect(user).toEqual({ id: "u1", email: "a@b.co" });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/v1/auth/signup");
    expect(init.method).toBe("POST");
    expect(init.credentials).toBe("same-origin");
    expect(init.headers["content-type"]).toBe("application/json");
    expect(init.headers["x-squad-csrf"]).toBe("1");
    expect(JSON.parse(init.body)).toEqual({
      email: "a@b.co",
      password: "password1",
      fullName: "Aysel M",
      displayName: null,
    });
  });

  it("POSTs signin with the remember flag and returns the user", async () => {
    fetchMock.mockResolvedValueOnce(ok({ user: { id: "u2", email: "c@d.co" } }));

    const user = await authClient.signIn({
      email: "c@d.co",
      password: "password1",
      remember: false,
    });

    expect(user).toEqual({ id: "u2", email: "c@d.co" });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/v1/auth/signin");
    expect(JSON.parse(init.body)).toEqual({
      email: "c@d.co",
      password: "password1",
      remember: false,
    });
  });

  it("POSTs signout and resolves", async () => {
    fetchMock.mockResolvedValueOnce(ok({ ok: true }));
    await expect(authClient.signOut()).resolves.toBeUndefined();
    expect(fetchMock.mock.calls[0][0]).toBe("/api/v1/auth/signout");
    expect(fetchMock.mock.calls[0][1].method).toBe("POST");
  });

  it("GETs the session (no CSRF header on the read) and returns user|null", async () => {
    fetchMock.mockResolvedValueOnce(ok({ user: { id: "u3", email: "e@f.co" } }));
    const a = await authClient.session();
    expect(a).toEqual({ id: "u3", email: "e@f.co" });

    fetchMock.mockResolvedValueOnce(ok({ user: null }));
    const b = await authClient.session();
    expect(b).toBeNull();

    const [url, init] = fetchMock.mock.calls[1];
    expect(url).toBe("/api/v1/auth/session");
    expect(init.method).toBe("GET");
  });

  it("throws AuthClientError(code,status) on a non-ok response", async () => {
    fetchMock.mockResolvedValueOnce(
      fail(409, { error: { code: "EMAIL_TAKEN", message: "That email is already registered." } }),
    );
    await expect(
      authClient.signUp({
        email: "a@b.co",
        password: "password1",
        fullName: "X",
        displayName: null,
      }),
    ).rejects.toMatchObject({ code: "EMAIL_TAKEN", status: 409 });
  });

  it("falls back to UNEXPECTED/status when the error envelope is missing", async () => {
    fetchMock.mockResolvedValueOnce({ ok: false, status: 502, json: async () => ({}) } as Response);
    await expect(authClient.signOut()).rejects.toMatchObject({ code: "UNEXPECTED", status: 502 });
  });
});
