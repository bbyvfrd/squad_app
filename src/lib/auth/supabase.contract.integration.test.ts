import { describe } from "vitest";
import { config } from "@/lib/config";
import { SupabaseAuthProvider } from "./supabase";
import { runContract } from "./auth-contract";

// Real Auth/Postgres run of the shared contract (§11.1). Needs the integration env
// (real SUPABASE_URL + publishable/anon key, email confirmations OFF per §9). A
// unique email BASE per run keeps reruns from colliding; runContract sub-addresses
// it per case (a@… → contract-<ts>+meta@…) so the cases don't collide either.
//
// `runContract` is the single source of truth, authored + exported in ./auth-contract
// (NOT the .test.ts) — this file only ADDS the real-adapter run; the in-memory unit run
// lives in ./auth.contract.test.ts. Run via:
//   pnpm dotenv -e .env.local -- pnpm test:integration \
//     src/lib/auth/supabase.contract.integration.test.ts
const emailBase = `contract-${Date.now()}@example.com`;

describe("SupabaseAuthProvider (integration)", () => {
  runContract(
    "SupabaseAuthProvider",
    () => SupabaseAuthProvider.fromConfig(config.supabaseUrl, config.supabasePublishableKey),
    emailBase,
  );
});
