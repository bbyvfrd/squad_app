import { afterAll, describe, expect, it } from "vitest";
import { and, count, eq } from "drizzle-orm";
import { client, db } from "./client";
import { newId } from "./id";
import { cities, clientProfiles, clientSportSkills, games, participations, profiles, sports } from "./schema";

// Create a Supabase auth user by inserting directly into auth.users (the
// integration DB connects as the `postgres` superuser, which may write the auth
// schema). The on_auth_user_created trigger then creates the public.profiles row.
async function createAuthUser(displayName: string): Promise<string> {
  const id = newId();
  const email = `it-${id}@example.com`;
  await client`
    insert into auth.users (instance_id, id, aud, role, email, raw_user_meta_data, created_at, updated_at)
    values ('00000000-0000-0000-0000-000000000000', ${id}, 'authenticated', 'authenticated',
            ${email}, ${`{"full_name":"${displayName}","display_name":"${displayName}"}`}::jsonb, now(), now())
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

describe("client_profiles", () => {
  it("accepts a client profile with no role flags (any client can play and organize)", async () => {
    const u = await createAuthUser("Client");
    await db.insert(clientProfiles).values({ profileId: u });
    const [row] = await db.select().from(clientProfiles).where(eq(clientProfiles.profileId, u));
    expect(row?.profileId).toBe(u);
  });
});

describe("constraints", () => {
  it("blocks a duplicate (game_id, player_id) participation", async () => {
    const organizer = await createAuthUser("Org");
    await db.insert(clientProfiles).values({ profileId: organizer });
    const player = await createAuthUser("Player");
    await db.insert(clientProfiles).values({ profileId: player });

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
    await db.insert(clientProfiles).values({ profileId: organizer });
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
});

describe("derived spots-remaining", () => {
  it("counts approved participations for a game", async () => {
    const organizer = await createAuthUser("Org3");
    await db.insert(clientProfiles).values({ profileId: organizer });
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
    await db.insert(clientProfiles).values({ profileId: p1 });
    const p2 = await createAuthUser("P2");
    await db.insert(clientProfiles).values({ profileId: p2 });

    await db.insert(participations).values({ id: newId(), gameId, playerId: p1, status: "approved" });
    await db.insert(participations).values({ id: newId(), gameId, playerId: p2, status: "requested" });

    const [{ approved }] = await db
      .select({ approved: count() })
      .from(participations)
      .where(and(eq(participations.gameId, gameId), eq(participations.status, "approved")));
    expect(approved).toBe(1);
  });
});

describe("cities seed", () => {
  it("seeds the expected cities", async () => {
    const rows = await db.select().from(cities);
    expect(rows.length).toBeGreaterThanOrEqual(10);
    expect(rows.map((c) => c.key)).toContain("baku");
  });
});

describe("handle_new_user trigger (full_name)", () => {
  it("populates full_name from auth metadata", async () => {
    const id = await createAuthUser("Aydan Mammadova");
    const [profile] = await db.select().from(profiles).where(eq(profiles.id, id));
    expect(profile?.fullName).toBe("Aydan Mammadova");
  });
});

describe("client_sport_skills", () => {
  it("stores one level per (player, sport) and rejects a duplicate", async () => {
    const u = await createAuthUser("Skilled");
    await db.insert(clientProfiles).values({ profileId: u });
    const sport = await footballId();
    await db.insert(clientSportSkills).values({ profileId: u, sportId: sport, skillLevel: "amateur" });
    await expect(
      db.insert(clientSportSkills).values({ profileId: u, sportId: sport, skillLevel: "advanced" }),
    ).rejects.toThrow();
  });
});

describe("games timing + skill", () => {
  it("rejects ends_at on or before starts_at, accepts a later ends_at", async () => {
    const organizer = await createAuthUser("Timer");
    await db.insert(clientProfiles).values({ profileId: organizer });
    const sport = await footballId();
    const starts = new Date(Date.now() + 86_400_000);
    await expect(
      db.insert(games).values({
        id: newId(), organizerId: organizer, sportId: sport, title: "Bad end",
        startsAt: starts, endsAt: new Date(starts.getTime() - 3_600_000), capacity: 8,
      }),
    ).rejects.toThrow();
    await expect(
      db.insert(games).values({
        id: newId(), organizerId: organizer, sportId: sport, title: "Equal end",
        startsAt: starts, endsAt: starts, capacity: 8,
      }),
    ).rejects.toThrow();
    await db.insert(games).values({
      id: newId(), organizerId: organizer, sportId: sport, title: "Good end",
      startsAt: starts, endsAt: new Date(starts.getTime() + 3_600_000), capacity: 8,
      skillLevel: "advanced",
    });
  });
});

describe("skill is advisory (no DB gate)", () => {
  it("allows a participation even when the player's level is below the game's", async () => {
    const organizer = await createAuthUser("Org");
    await db.insert(clientProfiles).values({ profileId: organizer });
    const sport = await footballId();
    const gameId = newId();
    await db.insert(games).values({
      id: gameId, organizerId: organizer, sportId: sport, title: "Advanced game",
      startsAt: new Date(Date.now() + 86_400_000), capacity: 8, skillLevel: "advanced",
    });

    const player = await createAuthUser("Beginner");
    await db.insert(clientProfiles).values({ profileId: player });
    await db.insert(clientSportSkills).values({ profileId: player, sportId: sport, skillLevel: "beginner" });

    // No DB constraint compares skill — the request is allowed; the organizer decides.
    await db.insert(participations).values({ id: newId(), gameId, playerId: player });
    const [{ n }] = await db
      .select({ n: count() })
      .from(participations)
      .where(eq(participations.gameId, gameId));
    expect(n).toBe(1);
  });
});
