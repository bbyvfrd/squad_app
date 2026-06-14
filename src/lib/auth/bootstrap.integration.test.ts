import { afterAll, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";

// `import "server-only"` (the build-time guard at the top of bootstrap.ts) throws
// when loaded outside React's `react-server` export condition, which the vitest node
// env does not set. Stub it to a no-op so the module under test imports; the real
// guard stays in the source and still blocks client bundles. Mirrors session.test.ts.
vi.mock("server-only", () => ({}));

import { client, db } from "@/lib/db/client";
import { newId } from "@/lib/db/id";
import { clientProfiles, profiles } from "@/lib/db/schema";
import { ensureClientProfile } from "./bootstrap";

// Mirror db.integration.test.ts: create a Supabase auth user by inserting directly
// into auth.users (the integration DB connects as `postgres`). The
// on_auth_user_created trigger then creates the public.profiles row.
async function createAuthUser(fullName: string): Promise<string> {
  const id = newId();
  const email = `boot-${id}@example.com`;
  await client`
    insert into auth.users (instance_id, id, aud, role, email, raw_user_meta_data, created_at, updated_at)
    values ('00000000-0000-0000-0000-000000000000', ${id}, 'authenticated', 'authenticated',
            ${email}, ${JSON.stringify({ full_name: fullName, display_name: fullName })}::jsonb, now(), now())
  `;
  return id;
}

afterAll(async () => {
  await client.end();
});

describe("ensureClientProfile", () => {
  it("relies on the trigger for the base profile, then adds the client marker", async () => {
    const id = await createAuthUser("Bootstrap User");

    // The handle_new_user trigger already created the base profiles row.
    const [profile] = await db.select().from(profiles).where(eq(profiles.id, id));
    expect(profile?.id).toBe(id);

    await ensureClientProfile(id);
    const [marker] = await db.select().from(clientProfiles).where(eq(clientProfiles.profileId, id));
    expect(marker?.profileId).toBe(id);
  });

  it("is idempotent: calling twice leaves exactly one client_profiles row", async () => {
    const id = await createAuthUser("Idempotent User");

    await ensureClientProfile(id);
    await ensureClientProfile(id); // double-tap must not throw or duplicate

    const rows = await db.select().from(clientProfiles).where(eq(clientProfiles.profileId, id));
    expect(rows).toHaveLength(1);
  });
});
