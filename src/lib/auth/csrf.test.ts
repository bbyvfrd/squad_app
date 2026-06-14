import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/config", () => ({
  config: {
    nodeEnv: "test",
    authCookieDomain: undefined,
    authAllowedOrigins: undefined as string | undefined,
  },
}));

import { config } from "@/lib/config";
import { assertBrowserMutation } from "./csrf";
import { AuthError } from "./errors";

const HOST = "squad.example.com";

function req(headers: Record<string, string>): Request {
  return new Request(`https://${HOST}/api/v1/auth/signin`, {
    method: "POST",
    headers: { host: HOST, ...headers },
  });
}

// The mutable mock lets a single case widen the allowlist.
const mockedConfig = config as { authAllowedOrigins: string | undefined };

describe("assertBrowserMutation", () => {
  beforeEach(() => {
    mockedConfig.authAllowedOrigins = undefined;
  });

  it("passes a same-origin POST that carries both Origin and the csrf header", () => {
    const r = req({ origin: `https://${HOST}`, "x-squad-csrf": "1", cookie: "sb-x=y" });
    expect(() => assertBrowserMutation(r)).not.toThrow();
  });

  it("passes when Origin is absent but a same-origin Referer is present", () => {
    const r = req({ referer: `https://${HOST}/signin`, "x-squad-csrf": "1", cookie: "sb-x=y" });
    expect(() => assertBrowserMutation(r)).not.toThrow();
  });

  it("rejects with CSRF (403) when Origin is absent and the Referer is cross-site", () => {
    const r = req({ referer: "https://evil.com/signin", "x-squad-csrf": "1", cookie: "sb-x=y" });
    expect(() => assertBrowserMutation(r)).toThrow(
      expect.objectContaining({ code: "CSRF", status: 403 }),
    );
  });

  it("rejects with CSRF (403) when both Origin and Referer are missing", () => {
    const r = req({ "x-squad-csrf": "1", cookie: "sb-x=y" });
    expect(() => assertBrowserMutation(r)).toThrow(
      expect.objectContaining({ code: "CSRF", status: 403 }),
    );
  });

  it("rejects with CSRF (403) on a cross-site Origin (evil.com)", () => {
    const r = req({ origin: "https://evil.com", "x-squad-csrf": "1", cookie: "sb-x=y" });
    expect(() => assertBrowserMutation(r)).toThrow(
      expect.objectContaining({ code: "CSRF", status: 403 }),
    );
  });

  it("rejects an Origin that substring-matches the host but is a different origin", () => {
    // host-suffix attacks: "squad.example.com.evil.com" must NOT pass.
    const r = req({
      origin: `https://${HOST}.evil.com`,
      "x-squad-csrf": "1",
      cookie: "sb-x=y",
    });
    expect(() => assertBrowserMutation(r)).toThrow(AuthError);
  });

  it("rejects with CSRF (403) when the x-squad-csrf header is missing", () => {
    const r = req({ origin: `https://${HOST}`, cookie: "sb-x=y" });
    expect(() => assertBrowserMutation(r)).toThrow(
      expect.objectContaining({ code: "CSRF", status: 403 }),
    );
  });

  it("accepts an Origin listed in config.authAllowedOrigins (parsed origin compare)", () => {
    mockedConfig.authAllowedOrigins = "https://app.squad.dev, https://other.dev";
    const r = req({ origin: "https://app.squad.dev", "x-squad-csrf": "1", cookie: "sb-x=y" });
    expect(() => assertBrowserMutation(r)).not.toThrow();
  });

  it("skips all checks when a verified Bearer is present AND no auth cookie", () => {
    // Native transport: cross-origin, no csrf header, no cookie — still allowed
    // because the caller already verified the Bearer (CSRF is cookie-only).
    const r = req({ authorization: "Bearer abc.def.ghi", origin: "https://evil.com" });
    expect(() =>
      assertBrowserMutation(r, { bearerVerified: true, hasAuthCookie: false }),
    ).not.toThrow();
  });

  it("does NOT skip when a Bearer is present but an auth cookie is also present", () => {
    // Both transports → treat as the cookie path and enforce CSRF.
    const r = req({ authorization: "Bearer abc.def.ghi", origin: "https://evil.com" });
    expect(() => assertBrowserMutation(r, { bearerVerified: true, hasAuthCookie: true })).toThrow(
      expect.objectContaining({ code: "CSRF", status: 403 }),
    );
  });
});
