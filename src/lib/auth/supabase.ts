import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { AuthProvider, AuthUser, SignUpMeta } from "./types";
import { mapSupabaseError } from "./errors";

export class SupabaseAuthProvider implements AuthProvider {
  constructor(private readonly sb: SupabaseClient) {}

  static fromConfig(url: string, anonKey: string): SupabaseAuthProvider {
    return new SupabaseAuthProvider(createClient(url, anonKey));
  }

  async signUp(email: string, password: string, meta: SignUpMeta): Promise<AuthUser> {
    const { data, error } = await this.sb.auth.signUp({
      email,
      password,
      // Feeds private.handle_new_user(); display_name is nullable (design spec §3).
      options: { data: { full_name: meta.fullName, display_name: meta.displayName ?? null } },
    });
    if (error || !data.user) throw mapSupabaseError(error);
    return { id: data.user.id, email: data.user.email ?? email };
  }

  async signIn(email: string, password: string) {
    const { data, error } = await this.sb.auth.signInWithPassword({ email, password });
    if (error || !data.user || !data.session) {
      throw mapSupabaseError(error);
    }
    return {
      user: { id: data.user.id, email: data.user.email ?? email },
      token: data.session.access_token,
    };
  }

  // LOCAL verification: getClaims(token) checks the signature against cached JWKS
  // (no network). Three result states + a possible throw on a malformed token;
  // a present-but-invalid Bearer must resolve to null (design spec §1, §9).
  async verify(token: string): Promise<AuthUser | null> {
    try {
      const { data, error } = await this.sb.auth.getClaims(token);
      if (error || !data?.claims?.sub) return null;
      return { id: data.claims.sub, email: data.claims.email ?? "" };
    } catch {
      return null;
    }
  }

  // Single-device sign-out (design spec §3). Bearer-issued sessions are stateless;
  // this clears the local session held by this client instance.
  async signOut(_token: string): Promise<void> {
    const { error } = await this.sb.auth.signOut({ scope: "local" });
    if (error) throw mapSupabaseError(error);
  }
}
