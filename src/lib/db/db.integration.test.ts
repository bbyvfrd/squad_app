import { afterAll, describe, expect, it } from "vitest";
import { and, count, eq } from "drizzle-orm";
import { client, db } from "./client";
import { newId } from "./id";
import { clientProfiles, games, participations, profiles, sports } from "./schema";

// Create a Supabase auth user by inserting directly into auth.users (the
// integration DB connects as the `postgres` superuser, which may write the auth
// schema). The on_auth_user_created trigger then creates the public.profiles row.
async function createAuthUser(displayName: string): Promise<string> {
  const id = newId();
  const email = `it-${id}@example.com`;
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

afterAll(async () => {
  await client.end();
});

describe("sports seed", () => {
  it("seeds exactly the 8 fixed sports", async () => {
    const rows = await db.select().from(sports);
    expect(rows).toHaveLength(8);
    expect(rows.map((s) => s.key).sort()).toEqual([
      "basketball", "football", "gym", "padel", "running", "swimming", "tennis", "volleyball",
    ]);
  });
});

describe("handle_new_user trigger", () => {
  it("creates a profiles row from auth.users metadata", async () => {
    const id = await createAuthUser("Trigger User");
    const [profile] = await db.select().from(profiles).where(eq(profiles.id, id));
    expect(profile?.displayName).toBe("Trigger User");
  });
});

describe("constraints", () => {
  it("blocks a duplicate (game_id, player_id) participation", async () => {
    const organizer = await createAuthUser("Org");
    await db.insert(clientProfiles).values({ profileId: organizer, isOrganizer: true });
    const player = await createAuthUser("Player");
    await db.insert(clientProfiles).values({ profileId: player, isPlayer: true });

    const gameId = newId();
    await db.insert(games).values({
      id: gameId,
      organizerId: organizer,
      sportId: await footballId(),
      title: "Sunday football",
      startsAt: new Date(Date.now() + 86_400_000),
      capacity: 10,
    });

    await db.insert(participations).values({ id: newId(), gameId, playerId: player });
    await expect(
      db.insert(participations).values({ id: newId(), gameId, playerId: player }),
    ).rejects.toThrow();
  });

  it("rejects a game with capacity <= 0", async () => {
    const organizer = await createAuthUser("Org2");
    await db.insert(clientProfiles).values({ profileId: organizer, isOrganizer: true });
    await expect(
      db.insert(games).values({
        id: newId(),
        organizerId: organizer,
        sportId: await footballId(),
        title: "Bad capacity",
        startsAt: new Date(Date.now() + 86_400_000),
        capacity: 0,
      }),
    ).rejects.toThrow();
  });

  it("rejects a client_profile that is neither player nor organizer", async () => {
    const u = await createAuthUser("Neither");
    await expect(
      db.insert(clientProfiles).values({ profileId: u, isPlayer: false, isOrganizer: false }),
    ).rejects.toThrow();
  });
});

describe("derived spots-remaining", () => {
  it("counts approved participations for a game", async () => {
    const organizer = await createAuthUser("Org3");
    await db.insert(clientProfiles).values({ profileId: organizer, isOrganizer: true });
    const gameId = newId();
    await db.insert(games).values({
      id: gameId,
      organizerId: organizer,
      sportId: await footballId(),
      title: "Counting",
      startsAt: new Date(Date.now() + 86_400_000),
      capacity: 5,
    });

    const p1 = await createAuthUser("P1");
    await db.insert(clientProfiles).values({ profileId: p1, isPlayer: true });
    const p2 = await createAuthUser("P2");
    await db.insert(clientProfiles).values({ profileId: p2, isPlayer: true });

    await db.insert(participations).values({ id: newId(), gameId, playerId: p1, status: "approved" });
    await db.insert(participations).values({ id: newId(), gameId, playerId: p2, status: "requested" });

    const [{ approved }] = await db
      .select({ approved: count() })
      .from(participations)
      .where(and(eq(participations.gameId, gameId), eq(participations.status, "approved")));
    expect(approved).toBe(1);
  });
});
