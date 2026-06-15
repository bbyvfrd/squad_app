import { describe, it, expect, vi, beforeEach } from "vitest";

// `import "server-only"` (the build-time guard at the top of update-session.ts) throws
// when loaded outside React's `react-server` export condition, which the vitest node
// env does not set. Stub it to a no-op; the real guard stays in the source.
vi.mock("server-only", () => ({}));

// Capture every cookie write the response receives, plus the rebuilt response from
// NextResponse.next. We don't exercise real NextResponse — we only need to observe
// what setAll forwards to response.cookies.set / response.headers.set.
const cookieSetMock = vi.fn();
const headerSetMock = vi.fn();
vi.mock("next/server", () => ({
  NextResponse: {
    next: vi.fn(() => ({
      cookies: { set: cookieSetMock },
      headers: { set: headerSetMock },
    })),
  },
}));

type CapturedOptions = {
  cookieOptions?: Record<string, unknown>;
  cookies: {
    getAll: () => unknown[];
    setAll: (
      toSet: { name: string; value: string; options: Record<string, unknown> }[],
      headers: Record<string, string>,
    ) => void;
  };
};
let captured: CapturedOptions | undefined;
let claimsSub: string | undefined;
vi.mock("@supabase/ssr", () => ({
  createServerClient: vi.fn((_url: string, _key: string, opts: CapturedOptions) => {
    captured = opts;
    return {
      auth: { getClaims: vi.fn(async () => ({ data: { claims: { sub: claimsSub } } })) },
    };
  }),
}));

import { updateSession } from "./update-session";
import { SESSION_COOKIE_OPTIONS, REMEMBER_MAX_AGE } from "./cookie-options";

// @supabase/ssr's DEFAULT_COOKIE_OPTIONS.maxAge — what the SDK puts on every SET
// entry it hands to our setAll (it clobbers cookieOptions.maxAge with this LAST).
const SDK_DEFAULT_MAX_AGE = 400 * 24 * 60 * 60;

// The per-cookie options shape the SDK emits for a SET (chunk write): security flags
// from cookieOptions survive, but maxAge is the 400d default.
const sdkSetOptions = () => ({
  httpOnly: false,
  sameSite: "lax" as const,
  path: "/",
  maxAge: SDK_DEFAULT_MAX_AGE,
});

// A minimal NextRequest stand-in: only the cookie surface updateSession touches.
const fakeRequest = () =>
  ({
    cookies: { getAll: () => [], set: vi.fn() },
  }) as never;

describe("updateSession", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    captured = undefined;
    claimsSub = undefined;
  });

  it("passes the shared SESSION_COOKIE_OPTIONS as cookieOptions", async () => {
    await updateSession(fakeRequest());
    expect(captured?.cookieOptions).toEqual(SESSION_COOKIE_OPTIONS);
  });

  it("SET → bounds the lifetime to REMEMBER_MAX_AGE, forces httpOnly, drops expires", async () => {
    await updateSession(fakeRequest());
    captured?.cookies.setAll([{ name: "sb-access", value: "tok", options: sdkSetOptions() }], {});
    expect(cookieSetMock).toHaveBeenCalledTimes(1);
    const [name, value, opts] = cookieSetMock.mock.calls[0];
    expect(name).toBe("sb-access");
    expect(value).toBe("tok");
    expect(opts.maxAge).toBe(REMEMBER_MAX_AGE); // overrides the SDK's 400d default
    expect(opts.httpOnly).toBe(true); // forced — never the supabase-js false
    expect("expires" in opts).toBe(false); // dropped so a stale expiry can't win
  });

  it("DELETE entry (maxAge:0) → preserved untouched, httpOnly forced", async () => {
    await updateSession(fakeRequest());
    captured?.cookies.setAll([{ name: "sb-stale", value: "", options: { maxAge: 0 } }], {});
    expect(cookieSetMock).toHaveBeenCalledTimes(1);
    const [, , opts] = cookieSetMock.mock.calls[0];
    expect(opts.maxAge).toBe(0); // deletion preserved — never bumped to REMEMBER_MAX_AGE
    expect(opts.httpOnly).toBe(true);
  });

  it("does not re-add domain when the entry omits it (host-only deletion fallback)", async () => {
    await updateSession(fakeRequest());
    captured?.cookies.setAll(
      [{ name: "sb-stale", value: "", options: { maxAge: 0, path: "/" } }],
      {},
    );
    const [, , opts] = cookieSetMock.mock.calls[0];
    expect("domain" in opts).toBe(false);
  });

  it("sets an explicit no-store Cache-Control on the response when cookies are written", async () => {
    // @supabase/ssr@0.12.0 always passes an empty headers arg, so the mitigation is
    // ours: any cookie write must carry a no-store policy so a shared cache can't
    // store the Set-Cookie and leak a session to another user.
    await updateSession(fakeRequest());
    captured?.cookies.setAll([{ name: "sb-access", value: "tok", options: sdkSetOptions() }], {});
    expect(headerSetMock).toHaveBeenCalledWith(
      "Cache-Control",
      "private, no-cache, no-store, max-age=0, must-revalidate",
    );
  });

  it("returns the claims sub as userId, or null when absent", async () => {
    claimsSub = "user-42";
    const { userId } = await updateSession(fakeRequest());
    expect(userId).toBe("user-42");

    claimsSub = undefined;
    const { userId: anon } = await updateSession(fakeRequest());
    expect(anon).toBeNull();
  });
});
