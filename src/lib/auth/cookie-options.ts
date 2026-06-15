import { config } from "@/lib/config";

// The single shared cookie-options object. @supabase/ssr's DEFAULT_COOKIE_OPTIONS
// is { httpOnly: false, sameSite: "lax", maxAge: 400 days } — we must NEVER rely on
// that. This is passed as `cookieOptions` to every writeable createServerClient AND
// re-applied per-cookie inside setAll, so supabase-js can't silently drop a flag.
// maxAge is intentionally absent here: it is decided per-call by the remember toggle
// (persistent cookie → REMEMBER_MAX_AGE; session cookie → no maxAge).
export const SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: config.nodeEnv === "production",
  sameSite: "lax" as const,
  path: "/",
  domain: config.authCookieDomain, // undefined → host-only for the demo
};

// 30-day persistent window (≈ refresh-token lifetime; see token-lifecycle spec §9).
// Scoped to the refresh-token lifetime, NOT the @supabase/ssr 400-day default.
export const REMEMBER_MAX_AGE = 60 * 60 * 24 * 30;
