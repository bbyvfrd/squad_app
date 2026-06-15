import "server-only";
import { cookies } from "next/headers";
import { createSupabaseServerClient } from "./server-client";
import { AuthError, mapSupabaseError } from "./errors";
import type { AuthUser } from "./types";
import type { SignupInput, SigninInput } from "./schemas";

/**
 * The web cookie-session adapter. Route handlers call these (never supabase-js) so
 * no vendor client or vendor error escapes `lib/auth`. Each function creates the
 * cookie-bound ssr client (which writes/clears the httpOnly session cookies via its
 * `setAll`), calls supabase-js, translates errors via `mapSupabaseError`, and returns
 * our `AuthUser`. No token is ever returned — tokens live only in the cookies (§3).
 */

export async function signUpWeb(input: SignupInput): Promise<AuthUser> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signUp({
    email: input.email,
    password: input.password,
    // Feeds private.handle_new_user(): full_name (NOT NULL) + optional display_name.
    options: { data: { full_name: input.fullName, display_name: input.displayName ?? null } },
  });
  if (error) throw mapSupabaseError(error);
  if (!data.user) throw new AuthError("UNEXPECTED", 500);
  return { id: data.user.id, email: data.user.email ?? input.email };
}

export async function signInWeb(input: SigninInput): Promise<AuthUser> {
  // Anti session-fixation (§3): drop any stale sb-* chunks BEFORE the write so a
  // pre-seeded cookie can't survive into the new session. supabase-js will write
  // the fresh chunks via setAll; we only clear what's already there. Wrapped in
  // try/catch because cookies() can be read-only in some contexts.
  try {
    const store = await cookies();
    store
      .getAll()
      .filter((c) => c.name.startsWith("sb-"))
      .forEach((c) => store.delete(c.name));
  } catch {
    // No writable cookie store (e.g. server-component render) — the proxy and the
    // subsequent setAll still produce a correct session; clearing is best-effort.
  }
  // remember selects persistent (maxAge) vs session cookie — see server-client.ts.
  const supabase = await createSupabaseServerClient(input.remember ?? true);
  const { data, error } = await supabase.auth.signInWithPassword({
    email: input.email,
    password: input.password,
  });
  if (error) throw mapSupabaseError(error);
  if (!data.user) throw new AuthError("UNEXPECTED", 500);
  return { id: data.user.id, email: data.user.email ?? input.email };
}

export async function signOutWeb(): Promise<void> {
  const supabase = await createSupabaseServerClient();
  // scope:"local" = single-device; the supabase-js default is global (§3, §14).
  const { error } = await supabase.auth.signOut({ scope: "local" });
  if (error) throw mapSupabaseError(error);
}
