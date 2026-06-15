import { NextResponse } from "next/server";
import { assertBrowserMutation } from "@/lib/auth/csrf";
import { toErrorResponse } from "@/lib/auth/http";
import { signOutWeb } from "@/lib/auth/web-session";

// Mutation endpoint: signOutWeb clears the cookie chunks (scope: "local").
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    assertBrowserMutation(req);
    await signOutWeb();
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err) {
    // Logs only { code, requestId } via toErrorResponse → logAuthError (§3); the
    // raw error/req/body is never logged.
    return toErrorResponse(err, req);
  }
}
