import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/auth/session", () => ({ getCurrentUser: vi.fn() }));

import { getCurrentUser } from "@/lib/auth/session";
import { GET } from "./route";

function req(): Request {
  return new Request("http://localhost/api/v1/auth/session", { method: "GET" });
}

describe("GET /api/v1/auth/session", () => {
  beforeEach(() => vi.resetAllMocks());

  it("returns 200 and { user } when a session resolves", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({ id: "u1", email: "a@example.com" });
    const res = await GET(req());
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ user: { id: "u1", email: "a@example.com" } });
  });

  it("returns 200 and { user: null } when anonymous (a status probe, not a 401)", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(null);
    const res = await GET(req());
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ user: null });
  });

  it("forwards the request to getCurrentUser (so the Bearer transport works)", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(null);
    const r = req();
    await GET(r);
    expect(getCurrentUser).toHaveBeenCalledWith(r);
  });

  it("never includes a token in the body", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({ id: "u1", email: "a@example.com" });
    const res = await GET(req());
    const body = await res.json();
    expect(JSON.stringify(body)).not.toContain("token");
  });

  it("maps an unexpected failure to 500 UNEXPECTED", async () => {
    vi.mocked(getCurrentUser).mockRejectedValue(new Error("boom"));
    const res = await GET(req());
    expect(res.status).toBe(500);
    await expect(res.json()).resolves.toMatchObject({ error: { code: "UNEXPECTED" } });
  });
});
