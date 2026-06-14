import { NextResponse } from "next/server";
import { AuthError, isAuthError, logAuthError } from "./errors";

// The locked error envelope: { error: { code, message } }. `message` is a
// safe, user-facing string — never the raw vendor/error text (it can carry
// connection strings, addresses, or PII). Per-code copy is centralized here
// so every auth handler returns identical wording.
const MESSAGES: Record<string, string> = {
  INVALID_CREDENTIALS: "Email or password is incorrect.",
  EMAIL_TAKEN: "An account with this email already exists.",
  WEAK_PASSWORD: "Password is too weak.",
  INVALID_INPUT: "Check your details and try again.",
  RATE_LIMITED: "Too many attempts. Try again later.",
  CSRF: "Request blocked.",
  AUTH_ERROR: "Could not complete the request.",
  UNEXPECTED: "Something went wrong. Try again.",
};

function messageFor(code: string): string {
  return MESSAGES[code] ?? MESSAGES.UNEXPECTED;
}

export function errorResponse(code: string, message: string, status: number): NextResponse {
  return NextResponse.json({ error: { code, message } }, { status });
}

// Single catch-translation for every auth route handler. An AuthError carries
// the already-mapped code + HTTP status (errors.ts owns the vendor→AuthError
// translation); anything else is an unexpected 500. The raw error is never
// echoed back — only the safe per-code message. We also log per the §3 policy:
// ONLY { code, requestId } via logAuthError — never the raw error/req/body. The
// optional `req` is read ONLY for its x-request-id header (never logged whole).
export function toErrorResponse(err: unknown, req?: Request): NextResponse {
  const mapped = isAuthError(err) ? err : new AuthError("UNEXPECTED", 500);
  logAuthError(mapped.code, req?.headers.get("x-request-id") ?? undefined);
  return errorResponse(mapped.code, messageFor(mapped.code), mapped.status);
}
