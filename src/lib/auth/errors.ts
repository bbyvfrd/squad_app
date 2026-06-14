import { isAuthApiError } from "@supabase/supabase-js";

/**
 * The single typed error the auth seam throws. Route handlers catch ONLY this and
 * map `code` → HTTP `status` for the `{ error: { code, message } }` envelope. The
 * raw Supabase error never escapes `lib/auth` (Seam Rule + logging policy, §3).
 */
export class AuthError extends Error {
  constructor(
    public readonly code: string,
    public readonly status: number,
  ) {
    super(code);
    this.name = "AuthError";
  }
}

// Pure type guard — used by http.ts (Task 7) to translate a thrown value into the
// error envelope without importing the vendor SDK.
export function isAuthError(e: unknown): e is AuthError {
  return e instanceof AuthError;
}

/**
 * The ONLY logging permitted in the auth request path (spec §3 logging policy).
 * Logs strictly { code, requestId } — NEVER the raw error object, the request, the
 * response, or any body (they hold passwords + tokens). Route handlers call this
 * (via http.ts) in their catch blocks; check-auth-logging.mjs forbids any other
 * console.* of a caught error / req / body under src/app/api/v1/auth.
 */
export function logAuthError(code: string, requestId?: string): void {
  console.warn(JSON.stringify({ event: "auth_error", code, requestId }));
}

// Supabase error.code → (our code, HTTP status). Keyed on `code` WHEN PRESENT.
const CODE_MAP: Record<string, { code: string; status: number }> = {
  invalid_credentials: { code: "INVALID_CREDENTIALS", status: 401 },
  email_exists: { code: "EMAIL_TAKEN", status: 409 },
  user_already_exists: { code: "EMAIL_TAKEN", status: 409 },
  weak_password: { code: "WEAK_PASSWORD", status: 422 },
  validation_failed: { code: "INVALID_INPUT", status: 400 },
  email_address_invalid: { code: "INVALID_INPUT", status: 400 },
};

/**
 * Translate any thrown value into our `AuthError`. Precedence:
 *  1. Already an `AuthError` → pass through (e.g. a CSRF 403 raised upstream).
 *  2. supabase-js `AuthApiError`:
 *     a. exact `error.code` match in CODE_MAP,
 *     b. `over_*_rate_limit` family → RATE_LIMITED (429),
 *     c. the token-endpoint bug: status 400 with `code === undefined` →
 *        INVALID_CREDENTIALS (401) — a bad password, NOT a generic 400,
 *     d. otherwise AUTH_ERROR with the vendor status (?? 400).
 *  3. Anything else → UNEXPECTED (500).
 */
export function mapSupabaseError(error: unknown): AuthError {
  if (error instanceof AuthError) return error;

  if (isAuthApiError(error)) {
    const code = error.code;
    const status = error.status;

    if (code) {
      const known = CODE_MAP[code];
      if (known) return new AuthError(known.code, known.status);
      if (code.startsWith("over_") && code.endsWith("_rate_limit")) {
        return new AuthError("RATE_LIMITED", 429);
      }
      return new AuthError("AUTH_ERROR", status ?? 400);
    }

    // No code — fall back to status. The token endpoint returns 400 for a bad
    // password with an undefined code; treat that as invalid credentials.
    if (status === 400) return new AuthError("INVALID_CREDENTIALS", 401);
    if (status === 429) return new AuthError("RATE_LIMITED", 429);
    return new AuthError("AUTH_ERROR", status ?? 400);
  }

  return new AuthError("UNEXPECTED", 500);
}
