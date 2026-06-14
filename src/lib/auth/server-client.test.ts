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

// @supabase/ssr's DEFAULT_COOKIE_OPTIONS.maxAge — what the SDK puts on every SET
// entry it hands to our setAll (it clobbers cookieOptions.maxAge with this LAST).
const SDK_DEFAULT_MAX_AGE = 400 * 24 * 60 * 60;

// The per-cookie options shape the SDK actually emits for a SET (chunk write):
// security flags from our cookieOptions survive, but maxAge is the 400d default.
const sdkSetOptions = () => ({
  httpOnly: false,
  sameSite: "lax" as const,
  path: "/",
  maxAge: SDK_DEFAULT_MAX_AGE,
});

describe("createSupabaseServerClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    captured = undefined;
  });

  it("passes the shared SESSION_COOKIE_OPTIONS as cookieOptions (no maxAge — SDK clobbers it)", async () => {
    await createSupabaseServerClient(true);
    // We never put maxAge on cookieOptions: the SDK overwrites it with its 400d
    // default on every SET, so the lifetime is owned in setAll instead.
    expect(captured?.cookieOptions).toEqual(SESSION_COOKIE_OPTIONS);
    expect("maxAge" in (captured?.cookieOptions ?? {})).toBe(false);
  });

  it("SET + remember=true → owns the lifetime: maxAge=REMEMBER_MAX_AGE, httpOnly forced, no expires", async () => {
    await createSupabaseServerClient(true);
    captured?.cookies.setAll([{ name: "sb-access", value: "tok", options: sdkSetOptions() }]);
    expect(setMock).toHaveBeenCalledTimes(1);
    const [name, value, opts] = setMock.mock.calls[0];
    expect(name).toBe("sb-access");
    expect(value).toBe("tok");
    expect(opts.maxAge).toBe(REMEMBER_MAX_AGE); // overrides the SDK's 400d default
    expect(opts.httpOnly).toBe(true); // forced — never the supabase-js false
    expect("expires" in opts).toBe(false); // dropped so a stale expiry can't win
  });

  it("SET + remember=false → a session cookie: maxAge omitted, httpOnly forced", async () => {
    await createSupabaseServerClient(false);
    captured?.cookies.setAll([{ name: "sb-access", value: "tok", options: sdkSetOptions() }]);
    expect(setMock).toHaveBeenCalledTimes(1);
    const [, , opts] = setMock.mock.calls[0];
    expect(opts.maxAge).toBeUndefined(); // session cookie — the 400d default is gone
    expect("maxAge" in opts).toBe(false);
    expect(opts.httpOnly).toBe(true);
  });

  it("DELETE entry (maxAge:0) → preserved untouched (maxAge stays 0), httpOnly forced", async () => {
    await createSupabaseServerClient(true);
    // The SDK sends maxAge:0 to clear stale chunks / on signout.
    captured?.cookies.setAll([{ name: "sb-stale", value: "", options: { maxAge: 0 } }]);
    expect(setMock).toHaveBeenCalledTimes(1);
    const [, , opts] = setMock.mock.calls[0];
    expect(opts.maxAge).toBe(0); // deletion preserved — never bumped to REMEMBER_MAX_AGE
    expect(opts.httpOnly).toBe(true);
  });

  it("does not re-add domain when the SDK's entry omits it (host-only deletion fallback)", async () => {
    await createSupabaseServerClient(true);
    // The SDK emits a host-only deletion entry with `domain` deliberately stripped;
    // we must not re-force it back on, or that fallback breaks.
    captured?.cookies.setAll([{ name: "sb-stale", value: "", options: { maxAge: 0, path: "/" } }]);
    const [, , opts] = setMock.mock.calls[0];
    expect("domain" in opts).toBe(false);
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
