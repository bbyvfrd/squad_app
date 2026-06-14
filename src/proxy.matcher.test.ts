import { describe, it, expect, vi } from "vitest";
import { unstable_doesMiddlewareMatch } from "next/experimental/testing/server";

// Importing ./proxy pulls in update-session.ts → `import "server-only"`, which throws
// outside React's `react-server` export condition (the vitest node env). Stub it so the
// config object can be imported; the real guard stays in the source.
vi.mock("server-only", () => ({}));

import { config } from "./proxy";

// Classify a path against the real proxy matcher using Next's own tester — this is the
// same check that surfaced the root-/ guard bug. A "match" means the proxy runs (route
// is GUARDED); a non-match means the request passes straight through (PUBLIC).
function matches(pathname: string): boolean {
  return unstable_doesMiddlewareMatch({ config, url: `https://squad.test${pathname}` });
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
});
