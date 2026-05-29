import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/db/ping", () => ({ pingDb: vi.fn() }));
import { pingDb } from "@/lib/db/ping";
import { GET } from "./route";

describe("GET /api/health", () => {
  beforeEach(() => vi.resetAllMocks());

  it("returns 200 and ok when the database is reachable", async () => {
    vi.mocked(pingDb).mockResolvedValue(true);
    const res = await GET();
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ status: "ok", db: "up" });
  });

  it("returns 503 when the database is unreachable", async () => {
    vi.mocked(pingDb).mockResolvedValue(false);
    const res = await GET();
    expect(res.status).toBe(503);
    await expect(res.json()).resolves.toEqual({ status: "degraded", db: "down" });
  });
});
