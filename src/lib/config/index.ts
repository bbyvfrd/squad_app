import { z } from "zod";

const envSchema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    DATABASE_URL: z.url(),
    NEXT_PUBLIC_SUPABASE_URL: z.url(),
    // At least one client key must be present (see .refine below). Both optional
    // individually: publishable is preferred for @supabase/ssr, anon is kept for
    // current consumers that haven't migrated.
    NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1).optional(),
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1).optional(),
    SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
    // Cookie Domain for the session cookie; unset → host-only (the demo default).
    AUTH_COOKIE_DOMAIN: z.string().optional(),
    // Comma-separated CSRF origin allowlist; unset → host-equality only.
    // Never a *.vercel.app suffix match (CSRF gate parses + compares origins).
    AUTH_ALLOWED_ORIGINS: z.string().optional(),
  })
  .refine((e) => Boolean(e.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? e.NEXT_PUBLIC_SUPABASE_ANON_KEY), {
    message: "one of NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY is required",
    path: ["NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"],
  });

// The exact env keys the schema declares — the single source of truth for the
// .env.example parity check (see env-parity.test.ts). Avoids a hand-copied list.
// In zod 4 `.refine()` returns a schema that still exposes `.shape` directly, so
// we read it the same way the pre-Plan-08 config did — no `.innerType()` needed.
export const ENV_KEYS = Object.keys(envSchema.shape);

export type Config = {
  nodeEnv: "development" | "test" | "production";
  databaseUrl: string;
  supabaseUrl: string;
  // Resolved client key: publishable ?? anon. supabaseAnonKey points at the same
  // resolved value so current consumers don't churn; @supabase/ssr reads the
  // publishable field. Both are non-empty because the refine guarantees one source.
  supabaseAnonKey: string;
  supabasePublishableKey: string;
  supabaseServiceRoleKey?: string;
  authCookieDomain?: string;
  authAllowedOrigins?: string;
};

export function parseEnv(env: Record<string, string | undefined>): Config {
  const parsed = envSchema.safeParse(env);
  if (!parsed.success) {
    // Surface only path + message — never i.input, which may hold secret
    // values (DATABASE_URL, service-role key) that must not leak into logs.
    const issues = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    throw new Error(`Invalid environment configuration: ${issues}`);
  }
  const e = parsed.data;
  // refine guarantees at least one is present; ! is safe.
  const clientKey = (e.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? e.NEXT_PUBLIC_SUPABASE_ANON_KEY)!;
  return {
    nodeEnv: e.NODE_ENV,
    databaseUrl: e.DATABASE_URL,
    supabaseUrl: e.NEXT_PUBLIC_SUPABASE_URL,
    supabaseAnonKey: clientKey,
    supabasePublishableKey: clientKey,
    supabaseServiceRoleKey: e.SUPABASE_SERVICE_ROLE_KEY,
    authCookieDomain: e.AUTH_COOKIE_DOMAIN,
    authAllowedOrigins: e.AUTH_ALLOWED_ORIGINS,
  };
}

// App-wide singleton. Importing this in app code triggers fail-fast validation.
export const config: Config = parseEnv(process.env);
