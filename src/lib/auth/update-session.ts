import "server-only";
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { config } from "@/lib/config";
import { SESSION_COOKIE_OPTIONS, REMEMBER_MAX_AGE } from "./cookie-options";

// The ONE place the web session is refreshed and cookies are (re)written. Runs in
// the proxy on every guarded request. Hard rule: no code between createServerClient
// and getClaims() — getClaims() performs the token refresh; anything in between can
// desync request/response cookies and log users out at random.
export async function updateSession(
  request: NextRequest,
): Promise<{ userId: string | null; response: NextResponse }> {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(config.supabaseUrl, config.supabasePublishableKey, {
    cookieOptions: SESSION_COOKIE_OPTIONS,
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(toSet, headers) {
        // Mirror onto the request so downstream sees the fresh values, then rebuild
        // the response and re-attach every cookie. This setAll MIRRORS server-client.ts:
        // we force only the SECURITY flags and OWN the lifetime — we never re-force
        // path/domain (re-adding domain re-breaks the SDK's host-only deletion fallback).
        for (const { name, value } of toSet) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of toSet) {
          // @supabase/ssr emits two shapes:
          //   DELETE → maxAge:0 (clears stale chunks; signout). Preserve untouched.
          //   SET    → maxAge:400d (its DEFAULT). Override: own the lifetime here.
          const isDelete = options?.maxAge === 0;
          if (isDelete) {
            // Keep the deletion exactly as the SDK intends (maxAge:0, expires kept),
            // re-forcing only the SECURITY flags as insurance.
            response.cookies.set(name, value, {
              ...options,
              httpOnly: SESSION_COOKIE_OPTIONS.httpOnly,
              secure: SESSION_COOKIE_OPTIONS.secure,
              sameSite: SESSION_COOKIE_OPTIONS.sameSite,
            });
            continue;
          }
          // SET path. Re-force the SECURITY flags, then own the lifetime: drop the
          // SDK's clobbered 400-day maxAge AND any expires (so a stale absolute expiry
          // can't override us), and bound the lifetime to REMEMBER_MAX_AGE.
          //
          // The proxy cannot know the original remember toggle (no remember=false
          // signal survives into a refresh), so we always use the bounded
          // REMEMBER_MAX_AGE on a refresh. A remember=false session cookie therefore
          // becomes bounded-persistent after the first token refresh — an accepted v1
          // limitation; the proper fix (a companion remember-flag cookie) is deferred.
          const setOptions = {
            ...options,
            httpOnly: SESSION_COOKIE_OPTIONS.httpOnly,
            secure: SESSION_COOKIE_OPTIONS.secure,
            sameSite: SESSION_COOKIE_OPTIONS.sameSite,
          };
          delete setOptions.maxAge;
          delete setOptions.expires;
          setOptions.maxAge = REMEMBER_MAX_AGE;
          response.cookies.set(name, value, setOptions);
        }
        // Cache headers (Cache-Control/Expires/Pragma) so a CDN can't cache a Set-Cookie.
        for (const [key, val] of Object.entries(headers)) response.headers.set(key, val);
      },
    },
  });

  const { data } = await supabase.auth.getClaims(); // triggers refresh; local JWKS verify
  return { userId: data?.claims?.sub ?? null, response };
}
