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
  const cookieOptions = remember
    ? { ...SESSION_COOKIE_OPTIONS, maxAge: REMEMBER_MAX_AGE }
    : SESSION_COOKIE_OPTIONS;
  return createServerClient(config.supabaseUrl, config.supabasePublishableKey, {
    cookieOptions,
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll(toSet) {
        try {
          for (const { name, value, options } of toSet) {
            // Force the SECURITY flags (so supabase-js can never drop httpOnly),
            // but PRESERVE its maxAge/expires — it uses maxAge:0 to delete stale
            // chunks, and the persistent-vs-session maxAge already comes from
            // cookieOptions above.
            cookieStore.set(name, value, {
              ...options,
              httpOnly: SESSION_COOKIE_OPTIONS.httpOnly,
              secure: SESSION_COOKIE_OPTIONS.secure,
              sameSite: SESSION_COOKIE_OPTIONS.sameSite,
              path: SESSION_COOKIE_OPTIONS.path,
              domain: SESSION_COOKIE_OPTIONS.domain,
            });
          }
        } catch {
          // Server Components cannot write cookies; the proxy refreshes the session.
        }
      },
    },
  });
}
