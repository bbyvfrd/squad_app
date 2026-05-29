import { config } from "@/lib/config";
import type { AuthProvider } from "./types";
import { SupabaseAuthProvider } from "./supabase";

export type { AuthProvider, AuthUser } from "./types";

export function getAuthProvider(): AuthProvider {
  return SupabaseAuthProvider.fromConfig(config.supabaseUrl, config.supabaseAnonKey);
}
