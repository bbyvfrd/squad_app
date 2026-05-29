import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { client, db } from "./client";
import { newId } from "./id";
import { clientProfiles, games, participations, sports } from "./schema";

// Run `fn` as the Supabase `authenticated` role with auth.uid() = userId, using
// transaction-local settings. Postgres enforces policies because `authenticated`
// is neither a superuser nor the table owner.
async function asUser<T>(
  userId: string,
  fn: (tx: typeof client) => Promise<T>,
): Promise<T> {
  // postgres.js `begin` has a return type of `UnwrapPromiseArray<T>` which doesn't
  // satisfy `Promise<T>` in TypeScript's variance checks — cast at the call site.
  return client.begin(async (tx) => {
    await tx`select set_config('request.jwt.claims', ${JSON.stringify({ sub: userId, role: "authenticated" })}, true)`;
    await tx`select set_config('role', 'authenticated', true)`;
    return fn(tx as unknown as typeof client);
  }) as unknown as Promise<T>;
}

async function createAuthUser(displayName: string): Promise<string> {
  const id = newId();
  const email = `rls-${id}@example.com`;
  await client`
    insert into auth.users (instance_id, id, aud, role, email, raw_user_meta_data, created_at, updated_at)
    values ('00000000-0000-0000-0000-000000000000', ${id}, 'authenticated', 'authenticated',
            ${email}, ${`{"display_name":"${displayName}"}`}::jsonb, now(), now())
  `;
  return id;
}

async function footballId(): Promise<number> {
  const [row] = await db.select().from(sports).where(eq(sports.key, "football"));
  return row.id;
}

beforeAll(async () => {
  // The app reaches Postgres as `postgres` via Drizzle, so RLS is defense-in-depth
  // and the app never needs these grants. This functional test, however, runs AS
  // `authenticated`, which needs table privileges before RLS is even evaluated.
  // Supabase auto-grants those on table creation only until 2026-05-30 (see
  // supabase/config.toml `auto_expose_new_tables`); grant explicitly so the test
  // is correct regardless of that date. Idempotent, local-only.
  await client`grant usage on schema public to authenticated`;
  await client`grant select, insert, update, delete on all tables in schema public to authenticated`;
});

afterAll(async () => {
  await client.end();
});

describe("RLS is enabled on every public base table", () => {
  it("leaves no public table without row-level security", async () => {
    const rows = await client<{ relname: string }[]>`
      select c.relname
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity
    `;
    expect(rows.map((r) => r.relname)).toEqual([]);
  });
});

describe("participations RLS: read isolation", () => {
  it("hides a participation from an unrelated player", async () => {
    const organizer = await createAuthUser("Org");
    await db.insert(clientProfiles).values({ profileId: organizer, isOrganizer: true });
    const playerA = await createAuthUser("A");
    await db.insert(clientProfiles).values({ profileId: playerA, isPlayer: true });
    const playerB = await createAuthUser("B");
    await db.insert(clientProfiles).values({ profileId: playerB, isPlayer: true });

    const gameId = newId();
    await db.insert(games).values({
      id: gameId,
      organizerId: organizer,
      sportId: await footballId(),
      title: "RLS game",
      startsAt: new Date(Date.now() + 86_400_000),
      capacity: 10,
    });
    await db.insert(participations).values({ id: newId(), gameId, playerId: playerA });

    const seenByA = await asUser(playerA, (tx) => tx`select id from participations where game_id = ${gameId}`);
    expect(seenByA.length).toBeGreaterThanOrEqual(1);

    const seenByB = await asUser(playerB, (tx) => tx`select id from participations where game_id = ${gameId}`);
    expect(seenByB).toHaveLength(0);
  });
});

describe("games RLS: insert requires organizer capability", () => {
  it("blocks a player-only user from creating a game; allows an organizer", async () => {
    const fid = await footballId();

    const playerOnly = await createAuthUser("PlayerOnly");
    await db.insert(clientProfiles).values({ profileId: playerOnly, isPlayer: true });
    await expect(
      asUser(playerOnly, (tx) => tx`
        insert into games (id, organizer_id, sport_id, title, starts_at, capacity)
        values (${newId()}, ${playerOnly}, ${fid}, 'Nope', now() + interval '1 day', 8)
      `),
    ).rejects.toThrow(/row-level security/i);

    const organizer = await createAuthUser("Organizer");
    await db.insert(clientProfiles).values({ profileId: organizer, isOrganizer: true });
    const created = await asUser(organizer, (tx) => tx`
      insert into games (id, organizer_id, sport_id, title, starts_at, capacity)
      values (${newId()}, ${organizer}, ${fid}, 'Yes', now() + interval '1 day', 8)
      returning id
    `);
    expect(created).toHaveLength(1);
  });
});
