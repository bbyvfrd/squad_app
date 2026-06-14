import { NextResponse } from "next/server";
import { assertBrowserMutation } from "@/lib/auth/csrf";
import { AuthError } from "@/lib/auth/errors";
import { toErrorResponse } from "@/lib/auth/http";
import { signupSchema } from "@/lib/auth/schemas";
import { signUpWeb } from "@/lib/auth/web-session";

// Mutation endpoint: writes the session into httpOnly cookies (inside
// signUpWeb). Never prerender/cache; never a token in the body.
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    assertBrowserMutation(req);
    const parsed = signupSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) throw new AuthError("INVALID_INPUT", 400);
    const user = await signUpWeb(parsed.data);
    return NextResponse.json({ user }, { status: 201 });
  } catch (err) {
    // Logs only { code, requestId } via toErrorResponse → logAuthError (§3); the
    // raw error/req/body is never logged.
    return toErrorResponse(err, req);
  }
}
