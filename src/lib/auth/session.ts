import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { config } from "@/lib/config";
import { AuthError } from "./errors";
import { getAuthProvider } from "./index";
import type { AuthUser } from "./types";

// One resolver, two transports. `req` is optional: route handlers pass it (to read
// the Bearer header); server components / layouts call with no arg (cookie only).
export async function getCurrentUser(req?: Request): Promise<AuthUser | null> {
  // 1) NATIVE seam — a present-but-invalid Bearer must NOT fall through to cookie.
  const authz = req?.headers.get("authorization");
  const bearer = authz?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (bearer) return getAuthProvider().verify(bearer); // verify() === getClaims(token), local JWKS

  // 2) WEB path — verify the SSR cookie session, read-only (proxy owns refresh writes).
  const store = await cookies();
  const sb = createServerClient(config.supabaseUrl, config.supabasePublishableKey, {
    cookies: { getAll: () => store.getAll(), setAll: () => {} },
  });
  const { data, error } = await sb.auth.getClaims();
  // getClaims has THREE states: {data,error:null}=valid, {data:null,error}=invalid,
  // {data:null,error:null}=no session. Guard all three on data.claims.sub.
  if (error || !data?.claims?.sub) return null;
  return { id: data.claims.sub, email: data.claims.email ?? "" };
}

// The single ownership entry point for route handlers. Once games /api/v1 lands,
// every resource query filters by requireUser(req).id — RLS is no backstop (§8).
export async function requireUser(req?: Request): Promise<AuthUser> {
  const user = await getCurrentUser(req);
  if (!user) throw new AuthError("UNAUTHORIZED", 401);
  return user;
}
