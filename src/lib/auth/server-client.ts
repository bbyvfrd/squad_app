import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { config } from "@/lib/config";
import { SESSION_COOKIE_OPTIONS, REMEMBER_MAX_AGE } from "./cookie-options";

// Cookie-bound Supabase client for route handlers / server actions (the WRITE path).
// remember=true → persistent cookie (maxAge = REMEMBER_MAX_AGE); remember=false →
// a session cookie (no maxAge). The cookie session model lives entirely behind this
// factory + web-session.ts; the browser never imports @supabase/*.
export async function createSupabaseServerClient(remember = true) {
  const cookieStore = await cookies(); // async in Next 16
  // We pass SESSION_COOKIE_OPTIONS as cookieOptions for its SECURITY flags
  // (httpOnly/secure/sameSite/path/domain) — those survive into the per-cookie
  // options @supabase/ssr emits. We deliberately do NOT put maxAge here: the SDK
  // hard-overwrites cookieOptions.maxAge with its own 400-day DEFAULT on every SET
  // (see @supabase/ssr cookies.js: `maxAge: DEFAULT_COOKIE_OPTIONS.maxAge` applied
  // LAST). So the remember/session lifetime can't be set here — we own it in setAll.
  return createServerClient(config.supabaseUrl, config.supabasePublishableKey, {
    cookieOptions: SESSION_COOKIE_OPTIONS,
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll(toSet) {
        try {
          for (const { name, value, options } of toSet) {
            // @supabase/ssr emits two shapes:
            //   DELETE → maxAge:0 (clears stale chunks; signout). Preserve untouched.
            //   SET    → maxAge:400d (its DEFAULT). Override: own the lifetime here.
            const isDelete = options?.maxAge === 0;
            if (isDelete) {
              // Keep the deletion exactly as the SDK intends (maxAge:0, expires kept),
              // re-forcing only the SECURITY flags as insurance. Do NOT touch
              // path/domain: the SDK deliberately emits a host-only deletion entry
              // with domain stripped — re-adding domain would re-break that fallback.
              cookieStore.set(name, value, {
                ...options,
                httpOnly: SESSION_COOKIE_OPTIONS.httpOnly,
                secure: SESSION_COOKIE_OPTIONS.secure,
                sameSite: SESSION_COOKIE_OPTIONS.sameSite,
              });
              continue;
            }
            // SET path. Re-force the SECURITY flags, then own the lifetime: drop the
            // SDK's clobbered maxAge AND any expires (so a stale absolute expiry can't
            // override us), and set maxAge to REMEMBER_MAX_AGE when remember, else omit
            // it entirely (a session cookie). path/domain are left as the SDK applied
            // them via cookieOptions.
            const setOptions = {
              ...options,
              httpOnly: SESSION_COOKIE_OPTIONS.httpOnly,
              secure: SESSION_COOKIE_OPTIONS.secure,
              sameSite: SESSION_COOKIE_OPTIONS.sameSite,
            };
            delete setOptions.maxAge;
            delete setOptions.expires;
            if (remember) setOptions.maxAge = REMEMBER_MAX_AGE;
            cookieStore.set(name, value, setOptions);
          }
        } catch {
          // Server Components cannot write cookies; the proxy refreshes the session.
        }
      },
    },
  });
}
