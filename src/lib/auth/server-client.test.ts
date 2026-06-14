import { describe, it, expect, vi, beforeEach } from "vitest";

// `import "server-only"` (the build-time guard at the top of server-client.ts)
// throws when loaded outside React's `react-server` export condition, which the
// vitest node env does not set. Stub it to a no-op so the module under test can be
// imported; the real guard stays in the source and still blocks client bundles.
vi.mock("server-only", () => ({}));

const setMock = vi.fn();
vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({ getAll: () => [], set: setMock })),
}));

type CapturedOptions = {
  cookieOptions?: Record<string, unknown>;
  cookies: { getAll: () => unknown[]; setAll: (toSet: unknown[]) => void };
};
let captured: CapturedOptions | undefined;
vi.mock("@supabase/ssr", () => ({
  createServerClient: vi.fn((_url: string, _key: string, opts: CapturedOptions) => {
    captured = opts;
    return { __client: true };
  }),
}));

import { createServerClient } from "@supabase/ssr";
import { createSupabaseServerClient } from "./server-client";
import { SESSION_COOKIE_OPTIONS, REMEMBER_MAX_AGE } from "./cookie-options";

describe("createSupabaseServerClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    captured = undefined;
  });

  it("passes the shared cookieOptions with maxAge when remember=true", async () => {
    await createSupabaseServerClient(true);
    expect(captured?.cookieOptions).toMatchObject({
      ...SESSION_COOKIE_OPTIONS,
      maxAge: REMEMBER_MAX_AGE,
    });
  });

  it("omits maxAge for a session cookie when remember=false", async () => {
    await createSupabaseServerClient(false);
    expect(captured?.cookieOptions).toEqual(SESSION_COOKIE_OPTIONS);
    expect("maxAge" in (captured?.cookieOptions ?? {})).toBe(false);
  });

  it("defaults remember to true", async () => {
    await createSupabaseServerClient();
    expect(captured?.cookieOptions).toMatchObject({ maxAge: REMEMBER_MAX_AGE });
  });

  it("setAll forces the security flags but preserves supabase-js maxAge/expires", async () => {
    await createSupabaseServerClient(false);
    const expires = new Date("2030-01-01T00:00:00Z");
    // supabase-js hands us a per-cookie array; simulate it trying to set
    // httpOnly:false and a delete (maxAge:0) plus an expires we must keep.
    captured?.cookies.setAll([
      { name: "sb-access", value: "v1", options: { httpOnly: false, maxAge: 0 } },
      { name: "sb-refresh", value: "v2", options: { httpOnly: false, expires } },
    ]);
    expect(setMock).toHaveBeenCalledTimes(2);
    const [name1, value1, opts1] = setMock.mock.calls[0];
    expect(name1).toBe("sb-access");
    expect(value1).toBe("v1");
    expect(opts1.httpOnly).toBe(true); // forced — never the supabase-js false
    expect(opts1.sameSite).toBe("lax");
    expect(opts1.path).toBe("/");
    expect(opts1.maxAge).toBe(0); // preserved (delete of a stale chunk)
    const [, , opts2] = setMock.mock.calls[1];
    expect(opts2.httpOnly).toBe(true);
    expect(opts2.expires).toBe(expires); // preserved
  });

  it("setAll swallows the Server-Component write error (cannot set cookies there)", async () => {
    setMock.mockImplementationOnce(() => {
      throw new Error("Cookies can only be modified in a Server Action or Route Handler");
    });
    await createSupabaseServerClient(true);
    expect(() =>
      captured?.cookies.setAll([{ name: "sb-access", value: "v", options: {} }]),
    ).not.toThrow();
  });

  it("calls supabase-js createServerClient with the resolved url + publishable key", async () => {
    await createSupabaseServerClient();
    expect(vi.mocked(createServerClient)).toHaveBeenCalledTimes(1);
  });
});
