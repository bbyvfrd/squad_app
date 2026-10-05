import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/auth/update-session";

// Same transport facts the CSRF gate's mutationContext reads: a non-empty Bearer, and a
// Supabase SSR session cookie (`sb-<ref>-auth-token`, incl. its `.0`/`.1` chunks).
function hasBearer(request: NextRequest): boolean {
  return /^Bearer\s+\S+/i.test(request.headers.get("authorization") ?? "");
}

function hasAuthCookie(request: NextRequest): boolean {
  return request.cookies.getAll().some(({ name }) => /^sb-[^=;]*-auth-token/.test(name));
}

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  // Native transport: a Bearer with no auth cookie is not the proxy's to judge — it only
  // knows cookies. Let it through UNVERIFIED: every guarded /api handler calls
  // requireUser(req) first (gated by check:require-user), which verifies the Bearer
  // locally and never falls back to a cookie — so verifying here too would be redundant.
  // API paths only: page routes stay cookie-only (a browser navigation has no Bearer).
  if (pathname.startsWith("/api/") && hasBearer(request) && !hasAuthCookie(request)) {
    return NextResponse.next();
  }

  const { userId, response } = await updateSession(request);

  if (!userId) {
    // API routes are programmatic — answer with our error envelope, never an HTML redirect.
    if (pathname.startsWith("/api")) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Sign in to continue." } },
        { status: 401 },
      );
    }
    // Page routes — bounce to sign-in, preserving where the user was headed.
    const signin = new URL("/signin", request.url);
    signin.searchParams.set("next", `${pathname}${search}`);
    return NextResponse.redirect(signin);
  }

  // Authenticated — return the refreshed response verbatim so cookies stay in sync.
  return response;
}

export const config = {
  // Guard /app/* and future /api/v1/* resource routes only. Excludes static assets,
  // the public auth screens (/boot /welcome /signup /verify /intent /signin /forgot),
  // the root / (the leading `$` alternative rejects an empty post-slash remainder so
  // a cold-start visit to / reaches src/app/page.tsx's /boot redirect), and the public
  // auth/health ENDPOINTS — listed INDIVIDUALLY (not the whole /api/v1/auth prefix) so
  // a future authed endpoint isn't accidentally exempt.
  // /venue is excluded — it's a separate surface and venue auth is deferred this plan
  // (the `venue` alternative below makes that real; without it /venue would be guarded).
  // `missing` prefetch headers stop the proxy firing on router hover-prefetch.
  matcher: [
    {
      source:
        "/((?!$|_next/static|_next/image|favicon.ico|boot|welcome|signup|verify|intent|signin|forgot|venue|api/v1/auth/signup|api/v1/auth/signin|api/v1/auth/signout|api/v1/auth/session|api/health|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js)$).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
