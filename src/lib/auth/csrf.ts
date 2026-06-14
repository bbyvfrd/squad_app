import { config } from "@/lib/config";
import { AuthError } from "./errors";

/**
 * Whether THIS request is authenticated by a verified Bearer with no auth cookie.
 * The CSRF gate is skipped only in that state — the exemption is tied to verified
 * auth, never to mere `Authorization` header presence (§7). The caller (route
 * handler / `getCurrentUser` path) supplies both facts; `assertBrowserMutation`
 * never re-verifies the token itself.
 */
type MutationContext = {
  bearerVerified: boolean;
  hasAuthCookie: boolean;
};

// Parse a header value into a normalized scheme://host:port origin, or null.
function parseOrigin(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

// The set of origins this host accepts: its own request origin plus any configured
// allowlist entry. Comparison is on the parsed origin (scheme+host+port), never a
// substring — host equality only, never a `*.vercel.app` suffix match (§2).
function allowedOrigins(req: Request): Set<string> {
  const allowed = new Set<string>();
  // Self-origin from the Host header (NOT new URL(req.url).origin): behind a proxy
  // like Vercel, req.url is the internal origin, while the browser's Origin reflects
  // the public host — so Host is what makes a legit same-origin request match. This is
  // not a CSRF bypass: a victim's browser always sends the real Host, and a cross-origin
  // attacker still can't set x-squad-csrf. In prod, also pin config.authAllowedOrigins
  // so the gate never rests on the Host header alone.
  const host = req.headers.get("host");
  if (host) {
    const url = new URL(req.url);
    allowed.add(`${url.protocol}//${host}`);
  }
  const configured = config.authAllowedOrigins;
  if (configured) {
    for (const entry of configured.split(",")) {
      const origin = parseOrigin(entry.trim());
      if (origin) allowed.add(origin);
    }
  }
  return allowed;
}

/**
 * Fail-closed CSRF guard for every cookie-auth mutation. Two mandatory gates:
 *  1. Origin (or, if absent, Referer) parses to an allowed origin. Both absent → 403.
 *  2. The `x-squad-csrf` custom header is present (only same-origin JS can set it).
 * Either gate failing → `AuthError("CSRF", 403)`. Skipped ONLY for a verified
 * Bearer with no auth cookie (the native transport, immune to CSRF).
 */
export function assertBrowserMutation(req: Request, ctx?: MutationContext): void {
  if (ctx?.bearerVerified && !ctx.hasAuthCookie) return;

  const allowed = allowedOrigins(req);
  const origin = parseOrigin(req.headers.get("origin"));
  const candidate = origin ?? parseOrigin(req.headers.get("referer"));
  if (!candidate || !allowed.has(candidate)) {
    throw new AuthError("CSRF", 403);
  }

  if (!req.headers.get("x-squad-csrf")) {
    throw new AuthError("CSRF", 403);
  }
}
