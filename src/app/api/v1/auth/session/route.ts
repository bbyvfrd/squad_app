import { NextResponse } from "next/server";
import { toErrorResponse } from "@/lib/auth/http";
import { getCurrentUser } from "@/lib/auth/session";

// Whoami status probe — a PURE READ (no cookie writes, no DB write). Always
// 200; `{ user: null }` signals anonymous (never 401 — this is a probe).
// `req` is forwarded so the native Bearer transport resolves here too.
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const user = await getCurrentUser(req);
    return NextResponse.json({ user }, { status: 200 });
  } catch (err) {
    // Logs only { code, requestId } via toErrorResponse → logAuthError (§3); the
    // raw error/req/body is never logged.
    return toErrorResponse(err, req);
  }
}
