import { describe, it, expect, vi } from "vitest";
import { unstable_doesMiddlewareMatch } from "next/experimental/testing/server";

// Importing ./proxy pulls in update-session.ts → `import "server-only"`, which throws
// outside React's `react-server` export condition (the vitest node env). Stub it so the
// config object can be imported; the real guard stays in the source.
vi.mock("server-only", () => ({}));

import { config } from "./proxy";
import { PUBLIC_API_ROUTES } from "../scripts/check-require-user.mjs";

// Classify a path against the real proxy matcher using Next's own tester — this is the
// same check that surfaced the root-/ guard bug. A "match" means the proxy runs (route
// is GUARDED); a non-match means the request passes straight through (PUBLIC).
function matches(pathname: string, headers?: Record<string, string>): boolean {
  return unstable_doesMiddlewareMatch({ config, url: `https://squad.test${pathname}`, headers });
}

describe("proxy matcher", () => {
  it.each([
    "/", // cold-start entry — must reach src/app/page.tsx's /boot redirect
    "/boot",
    "/welcome",
    "/signup",
    "/signin",
    "/verify",
    "/intent",
    "/forgot",
    "/api/v1/auth/signin",
    "/api/v1/auth/session",
    "/api/health",
    "/logo.svg", // static asset
    "/venue", // separate surface — venue auth deferred, so it passes through
    "/venue/listings", // nested venue route stays unguarded too
  ])("does NOT guard the public path %s", (path) => {
    expect(matches(path)).toBe(false);
  });

  it.each([
    "/app",
    "/app/games",
    "/api/v1/games",
    "/api/v1/auth/refresh", // future authed endpoint — correctly guarded (not exempt)
  ])("guards the protected path %s", (path) => {
    expect(matches(path)).toBe(true);
  });

  // check:require-user skips exactly these handlers. Each must really be proxy-exempt —
  // otherwise a Bearer-only request could reach a handler the gate never inspected.
  it.each(PUBLIC_API_ROUTES)("the require-user gate's public route %s is proxy-exempt", (path) => {
    expect(matches(path)).toBe(false);
  });

  // The Bearer pass-through is decided INSIDE the proxy (API paths only, no auth
  // cookie). A header-based matcher exemption (e.g. `missing: authorization`) would
  // skip the proxy for pages too, so an Authorization header must never un-guard a path.
  it.each(["/app", "/app/games", "/api/v1/games", "/api/v1/participations/p-1"])(
    "still runs the proxy for %s when it carries a Bearer",
    (path) => {
      expect(matches(path, { authorization: "Bearer native-access-token" })).toBe(true);
    },
  );
});
