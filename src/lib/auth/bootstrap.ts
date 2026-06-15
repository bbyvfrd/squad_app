import "server-only";
import { db } from "@/lib/db/client";
import { clientProfiles } from "@/lib/db/schema";

// Lazily create the client-surface marker. Idempotent via PK (profile_id) +
// onConflictDoNothing — race-safe, mirrors the repo's idempotent-write convention.
// profileId MUST come from getCurrentUser().id, NEVER from request input: RLS does
// not enforce auth.uid() = profile_id over the Drizzle/postgres-js owner connection
// (spec §8), so the app layer is the sole guard.
export async function ensureClientProfile(profileId: string): Promise<void> {
  await db.insert(clientProfiles).values({ profileId }).onConflictDoNothing();
}
