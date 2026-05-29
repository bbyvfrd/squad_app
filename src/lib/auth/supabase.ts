import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { AuthProvider, AuthUser } from "./types";

export class SupabaseAuthProvider implements AuthProvider {
  constructor(private readonly sb: SupabaseClient) {}

  static fromConfig(url: string, anonKey: string): SupabaseAuthProvider {
    return new SupabaseAuthProvider(createClient(url, anonKey));
  }

  async signUp(email: string, password: string): Promise<AuthUser> {
    const { data, error } = await this.sb.auth.signUp({ email, password });
    if (error || !data.user) throw new Error(error?.message ?? "signUp failed");
    return { id: data.user.id, email: data.user.email ?? email };
  }

  async signIn(email: string, password: string) {
    const { data, error } = await this.sb.auth.signInWithPassword({ email, password });
    if (error || !data.user || !data.session) {
      throw new Error(error?.message ?? "signIn failed");
    }
    return {
      user: { id: data.user.id, email: data.user.email ?? email },
      token: data.session.access_token,
    };
  }

  async verify(token: string): Promise<AuthUser | null> {
    const { data, error } = await this.sb.auth.getUser(token);
    if (error || !data.user) return null;
    return { id: data.user.id, email: data.user.email ?? "" };
  }
}
