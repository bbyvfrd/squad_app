import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/auth/update-session";

export async function proxy(request: NextRequest) {
  const { userId, response } = await updateSession(request);

  if (!userId) {
    const { pathname, search } = request.nextUrl;
    // API routes are programmatic — answer with our error envelope, never an HTML redirect.
    if (pathname.startsWith("/api")) {
      return NextResponse.json({ error: { code: "UNAUTHORIZED" } }, { status: 401 });
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
  // /venue is intentionally not yet guarded (no venue auth this plan).
  // `missing` prefetch headers stop the proxy firing on router hover-prefetch.
  matcher: [
    {
      source:
        "/((?!$|_next/static|_next/image|favicon.ico|boot|welcome|signup|verify|intent|signin|forgot|api/v1/auth/signup|api/v1/auth/signin|api/v1/auth/signout|api/v1/auth/session|api/health|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js)$).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
