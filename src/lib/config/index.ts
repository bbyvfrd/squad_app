import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
});

// The exact env keys the schema declares — the single source of truth for the
// .env.example parity check (see env-parity.test.ts). Avoids a hand-copied list.
export const ENV_KEYS = Object.keys(envSchema.shape);

export type Config = {
  nodeEnv: "development" | "test" | "production";
  databaseUrl: string;
  supabaseUrl: string;
  supabaseAnonKey: string;
  supabaseServiceRoleKey?: string;
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
  return {
    nodeEnv: e.NODE_ENV,
    databaseUrl: e.DATABASE_URL,
    supabaseUrl: e.NEXT_PUBLIC_SUPABASE_URL,
    supabaseAnonKey: e.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    supabaseServiceRoleKey: e.SUPABASE_SERVICE_ROLE_KEY,
  };
}

// App-wide singleton. Importing this in app code triggers fail-fast validation.
export const config: Config = parseEnv(process.env);
