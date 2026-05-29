# Plan 05 — Database Schema (Data Layer) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Plan-01 placeholder schema with the authoritative 8-table SQUAD data model — split-profile identity, a sports lookup, the games + participations core loop, and venue listings — using app-generated UUIDv7 keys, the documented indexes, RLS on every table, a signup trigger, and a seeded sports table, all verified by integration tests.

**Architecture:** Drizzle ORM defines the tables, constraints, indexes, and RLS policies in `src/lib/db/schema.ts`; `drizzle-kit` generates the schema migration (the source of truth). A hand-written *custom* migration adds the objects Drizzle can't express — a `private` schema, the `handle_new_user` `SECURITY DEFINER` trigger on `auth.users`, and the 8-sport seed. The app reaches Postgres as the `postgres` role via Drizzle, so RLS is strict **defense-in-depth, never load-bearing**.

**Tech Stack:** Drizzle ORM 0.45 (`pg-core` + `drizzle-orm/supabase`), drizzle-kit 0.31, postgres.js, `uuidv7`, Supabase (local via CLI), Vitest.

---

## Plan Series Context

This is the **first plan derived from `docs/context/db-schema-and-backend-design.md`** (the backend-design series), and **Plan 05** in the `docs/plans/` sequence — it follows the 01–04 foundation series (skeleton, CI, IaC, deploy) which derived from a different design doc.

- **Plan 05 (this doc):** the **data layer** — schema, indexes, RLS, signup trigger, sports seed → spec §2, §3, §4, §5, and the §7 data-integrity layers.
- **Plan 06 (next):** the **backend API + domain layer** — `lib/booking` write logic (create-game / request / approve / decline / cancel with capacity + state-machine rules) and the `/api/v1` REST handlers + Zod/OpenAPI contracts + route-group surface guards → spec §6.

> **Spec is authoritative; this plan implements it.** Where this plan makes an implementation-detail choice the spec left open (e.g. *where* the UUIDv7 generator lives), it is called out inline with a rationale. Do not re-decide product or architecture here — that lives in the brainstorm vault (see `CLAUDE.md`).

## Boundary & Prerequisites

- **Runs in the existing app repo** (not the vault). Plan 01 (skeleton + local Supabase + db seam) must be complete.
- Required local tooling: **Node 20+**, **pnpm**, **Docker**, **Supabase CLI**.
- Verify before starting:
  - Run: `supabase status`
  - Expected: lists running services (API on `54321`, DB on `54322`). If not, run `supabase start`.
  - Run: `pnpm typecheck && pnpm test`
  - Expected: clean typecheck; all unit tests pass on a clean `main`.
  - Run: `test -f .env.local && echo ".env.local present"`
  - Expected: prints `.env.local present` (created in Plan 01 Task 5 with local Supabase keys).
- **This plan replaces the placeholder migration** (`migrations/0000_medical_miracleman.sql`, which created throwaway `users`/`venues`/`games`/`game_participants` tables). This is safe because the project is **pre-launch and Supabase is local-only** — no migration has been deployed to a shared/prod database (Plan 04 deploy is still only a doc). A `supabase db reset` rebuilds the local DB from the new migrations. If you have a teammate with a local DB, they re-run `supabase db reset` + `drizzle-kit migrate` after pulling.

## File Structure (touched by this plan)

| File | Responsibility |
|---|---|
| `src/lib/db/id.ts` | **Create.** `newId()` — app-generated, time-ordered UUIDv7 primary key |
| `src/lib/db/id.test.ts` | **Create.** Unit tests for `newId()` (version, ordering, uniqueness) |
| `src/lib/db/schema.ts` | **Rewrite.** The authoritative 8-table Drizzle schema: enums, columns, FKs, CHECKs, indexes, RLS policies |
| `drizzle.config.ts` | **Modify.** Add `entities.roles.provider: 'supabase'` so drizzle-kit treats Supabase roles as existing |
| `migrations/0000_*.sql` | **Replace.** Regenerated schema migration (tables + enums + indexes + RLS) = source of truth |
| `migrations/0001_*.sql` | **Create** (via `generate --custom`). `private` schema, `handle_new_user` trigger, sports seed |
| `migrations/meta/*` | **Regenerated** by drizzle-kit (journal + snapshots) |
| `src/lib/db/db.integration.test.ts` | **Rewrite.** Schema / trigger / constraint / seed integration tests |
| `src/lib/db/rls.integration.test.ts` | **Create.** RLS-enabled + RLS-enforcement integration tests |
| `package.json` | **Modify.** Add the `uuidv7` dependency |
| `README.md` | **Modify.** Document the data-layer schema + workflow |

**Canonical names used across tasks (do not rename):**

- Helper: `newId`.
- Tables (Drizzle export → SQL name): `profiles`→`profiles`, `clientProfiles`→`client_profiles`, `venueOwnerProfiles`→`venue_owner_profiles`, `sports`→`sports`, `venues`→`venues`, `games`→`games`, `participations`→`participations`, `venueSports`→`venue_sports`.
- Enums: `participationStatus`→`participation_status` (`requested`/`approved`/`declined`/`cancelled`); `gameStatus`→`game_status` (`open`/`cancelled`).
- DB objects: schema `private`; function `private.handle_new_user`; trigger `on_auth_user_created`.
- Constraints/indexes: `uq_participation`, `chk_client_capability`, `chk_games_capacity`, `games_sport_starts_idx`, `games_open_upcoming_idx`, `games_organizer_idx`, `games_venue_idx`, `games_share_token_uq`, `participations_game_status_idx`, `participations_player_idx`, `venues_owner_active_idx`, `venue_sports_sport_idx`.

> **Seam note.** `src/lib/db/schema.ts` imports `authUsers` / `authenticatedRole` from **`drizzle-orm/supabase`**. That is part of **Drizzle** (our DB-adapter library), *not* the `@supabase/supabase-js` vendor SDK, and it is used only inside the `src/lib/db` seam. This respects the Seam Rule (no vendor SDK in app code). RLS/triggers are Supabase-flavoured but are **never load-bearing**: the app works through Drizzle as the `postgres` role and enforces authorization in `lib/booking` (Plan 06).

---

## Task 1: UUIDv7 primary-key helper (`lib/db/id.ts`)

**Files:**
- Create: `src/lib/db/id.ts`
- Test: `src/lib/db/id.test.ts`
- Modify: `package.json` (add `uuidv7`)

- [ ] **Step 1: Install the `uuidv7` dependency**

Run: `pnpm add uuidv7`
Expected: `uuidv7` added to `dependencies` in `package.json`.

- [ ] **Step 2: Write the failing test**

Create `src/lib/db/id.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { newId } from "./id";

// 8-4-4-4-12 hex, with the version nibble pinned to 7 and the variant nibble to 8–b.
const UUID_V7_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

describe("newId", () => {
  it("returns a valid UUIDv7 (version nibble = 7)", () => {
    expect(newId()).toMatch(UUID_V7_RE);
  });

  it("is time-ordered: a batch of ids is already in sorted order", () => {
    const ids = Array.from({ length: 50 }, () => newId());
    expect(ids).toEqual([...ids].sort());
  });

  it("does not collide across many calls", () => {
    const n = 10_000;
    const ids = new Set(Array.from({ length: n }, () => newId()));
    expect(ids.size).toBe(n);
  });
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `pnpm test src/lib/db/id`
Expected: FAIL — "Cannot find module './id'".

- [ ] **Step 4: Implement the helper**

Create `src/lib/db/id.ts`:
```ts
import { uuidv7 } from "uuidv7";

/**
 * App-generated, time-ordered primary key for venues, games, and participations.
 *
 * UUIDv7 is time-ordered, so new rows append to the right edge of the primary-key
 * B-tree instead of fragmenting it the way random UUIDv4 would (schema spec §3).
 * PK columns therefore carry NO database default — the app always supplies the id
 * via this helper. `lib/booking` (Plan 06) generates ids through here.
 *
 * Placement note: the spec says ids are "generated app-side in lib/booking". The
 * generator lives here in `lib/db` because it is a database-identity concern and
 * the data-layer tests/seed need it before `lib/booking` exists; Plan 06 imports
 * `newId` from here rather than re-implementing it.
 */
export function newId(): string {
  return uuidv7();
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `pnpm test src/lib/db/id`
Expected: 3 passed.

- [ ] **Step 6: Commit**

```bash
git add src/lib/db/id.ts src/lib/db/id.test.ts package.json pnpm-lock.yaml
git commit -m "feat(db): add UUIDv7 primary-key helper"
```

---

## Task 2: Rewrite the Drizzle schema and regenerate the migration

**Files:**
- Rewrite: `src/lib/db/schema.ts`
- Modify: `drizzle.config.ts`
- Replace: `migrations/0000_*.sql`, `migrations/meta/*`
- Delete: `src/lib/db/db.integration.test.ts` (obsolete Plan-01 placeholder test — it imports the removed `users` table; recreated fresh in Task 4)

> This task defines the schema and **statically** regenerates + inspects the migration. The migration is *applied* to the database in Task 3 (one clean `supabase db reset` + `drizzle-kit migrate`), so there is no DB step here.

- [ ] **Step 1: Rewrite the schema to the authoritative 8-table model**

Replace the entire contents of `src/lib/db/schema.ts` with:
```ts
import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  foreignKey,
  index,
  pgEnum,
  pgPolicy,
  pgTable,
  primaryKey,
  smallint,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { authenticatedRole, authUsers } from "drizzle-orm/supabase";

// ── Enums ────────────────────────────────────────────────────────────────────
export const participationStatus = pgEnum("participation_status", [
  "requested",
  "approved",
  "declined",
  "cancelled",
]);

// 'completed' is deferred (spec §3).
export const gameStatus = pgEnum("game_status", ["open", "cancelled"]);

// ── Identity: shared account + split surface profiles ─────────────────────────
// profiles.id === auth.users.id. Row is created by the handle_new_user trigger
// (Task 3), so there is NO INSERT policy here.
export const profiles = pgTable(
  "profiles",
  {
    id: uuid("id").primaryKey().notNull(),
    displayName: text("display_name").notNull(),
    avatarUrl: text("avatar_url"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    foreignKey({
      columns: [t.id],
      foreignColumns: [authUsers.id],
      name: "profiles_id_auth_users_fk",
    }).onDelete("cascade"),
    // Holds only display fields, so a broad SELECT to all signed-in users is safe.
    pgPolicy("profiles_select", { for: "select", to: authenticatedRole, using: sql`true` }),
    pgPolicy("profiles_update", {
      for: "update",
      to: authenticatedRole,
      using: sql`(select auth.uid()) = id`,
      withCheck: sql`(select auth.uid()) = id`,
    }),
  ],
);

export const clientProfiles = pgTable(
  "client_profiles",
  {
    profileId: uuid("profile_id")
      .primaryKey()
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    isPlayer: boolean("is_player").notNull().default(false),
    isOrganizer: boolean("is_organizer").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    check("chk_client_capability", sql`is_player or is_organizer`),
    // Self-only. A SELECT path is required for UPDATE to work, hence FOR ALL.
    pgPolicy("client_self", {
      for: "all",
      to: authenticatedRole,
      using: sql`(select auth.uid()) = profile_id`,
      withCheck: sql`(select auth.uid()) = profile_id`,
    }),
  ],
);

export const venueOwnerProfiles = pgTable(
  "venue_owner_profiles",
  {
    profileId: uuid("profile_id")
      .primaryKey()
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    businessName: text("business_name"),
    contactPhone: text("contact_phone"),
    contactEmail: text("contact_email"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    pgPolicy("venue_owner_self", {
      for: "all",
      to: authenticatedRole,
      using: sql`(select auth.uid()) = profile_id`,
      withCheck: sql`(select auth.uid()) = profile_id`,
    }),
  ],
);

// ── Reference: sports lookup (lookup table, not an enum, so it can grow) ───────
export const sports = pgTable(
  "sports",
  {
    id: smallint("id").primaryKey().generatedAlwaysAsIdentity(),
    key: text("key").notNull().unique(),
    name: text("name").notNull(),
    displayOrder: smallint("display_order").notNull().default(0),
    isActive: boolean("is_active").notNull().default(true),
  },
  () => [
    // Public reference; writes are service-role only (no write policy → denied).
    pgPolicy("sports_read", { for: "select", to: authenticatedRole, using: sql`true` }),
  ],
);

// ── Venues (defined before games: games.venue_id references it) ───────────────
export const venues = pgTable(
  "venues",
  {
    id: uuid("id").primaryKey().notNull(), // app-supplied UUIDv7 (newId)
    ownerId: uuid("owner_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    address: text("address"),
    contactInfo: text("contact_info"),
    description: text("description"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => [
    index("venues_owner_active_idx").on(t.ownerId).where(sql`deleted_at is null`),
    pgPolicy("venues_select", {
      for: "select",
      to: authenticatedRole,
      using: sql`deleted_at is null or owner_id = (select auth.uid())`,
    }),
    pgPolicy("venues_write", {
      for: "all",
      to: authenticatedRole,
      using: sql`owner_id = (select auth.uid())`,
      withCheck: sql`owner_id = (select auth.uid()) and exists (select 1 from venue_owner_profiles v where v.profile_id = (select auth.uid()))`,
    }),
  ],
);

// ── Core coordination loop ────────────────────────────────────────────────────
export const games = pgTable(
  "games",
  {
    id: uuid("id").primaryKey().notNull(), // app-supplied UUIDv7 (newId)
    organizerId: uuid("organizer_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    sportId: smallint("sport_id")
      .notNull()
      .references(() => sports.id, { onDelete: "restrict" }),
    venueId: uuid("venue_id").references(() => venues.id, { onDelete: "set null" }),
    title: text("title").notNull(),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    capacity: smallint("capacity").notNull(),
    locationText: text("location_text"), // nullable in v1 (validation later)
    notes: text("notes"),
    status: gameStatus("status").notNull().default("open"),
    shareToken: text("share_token"), // invite/share seam
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }), // soft delete
  },
  (t) => [
    check("chk_games_capacity", sql`capacity > 0`),
    index("games_sport_starts_idx").on(t.sportId, t.startsAt),
    index("games_open_upcoming_idx")
      .on(t.startsAt)
      .where(sql`status = 'open' and deleted_at is null`),
    index("games_organizer_idx").on(t.organizerId).where(sql`deleted_at is null`),
    index("games_venue_idx").on(t.venueId).where(sql`venue_id is not null`),
    uniqueIndex("games_share_token_uq").on(t.shareToken).where(sql`share_token is not null`),
    pgPolicy("games_select", {
      for: "select",
      to: authenticatedRole,
      using: sql`deleted_at is null or organizer_id = (select auth.uid())`,
    }),
    pgPolicy("games_insert", {
      for: "insert",
      to: authenticatedRole,
      withCheck: sql`organizer_id = (select auth.uid()) and exists (select 1 from client_profiles c where c.profile_id = (select auth.uid()) and c.is_organizer)`,
    }),
    pgPolicy("games_update", {
      for: "update",
      to: authenticatedRole,
      using: sql`organizer_id = (select auth.uid())`,
      withCheck: sql`organizer_id = (select auth.uid())`,
    }),
  ],
);

export const participations = pgTable(
  "participations",
  {
    id: uuid("id").primaryKey().notNull(), // app-supplied UUIDv7 (newId)
    gameId: uuid("game_id")
      .notNull()
      .references(() => games.id, { onDelete: "cascade" }),
    playerId: uuid("player_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    status: participationStatus("status").notNull().default("requested"),
    requestedAt: timestamp("requested_at", { withTimezone: true }).defaultNow().notNull(),
    decidedAt: timestamp("decided_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    unique("uq_participation").on(t.gameId, t.playerId), // one request per player
    index("participations_game_status_idx").on(t.gameId, t.status),
    index("participations_player_idx").on(t.playerId),
    pgPolicy("part_select", {
      for: "select",
      to: authenticatedRole,
      using: sql`player_id = (select auth.uid()) or exists (select 1 from games g where g.id = game_id and g.organizer_id = (select auth.uid()))`,
    }),
    pgPolicy("part_insert", {
      for: "insert",
      to: authenticatedRole,
      withCheck: sql`player_id = (select auth.uid()) and exists (select 1 from client_profiles c where c.profile_id = (select auth.uid()) and c.is_player) and exists (select 1 from games g where g.id = game_id and g.status = 'open' and g.deleted_at is null)`,
    }),
    pgPolicy("part_update", {
      for: "update",
      to: authenticatedRole,
      using: sql`player_id = (select auth.uid()) or exists (select 1 from games g where g.id = game_id and g.organizer_id = (select auth.uid()))`,
      withCheck: sql`player_id = (select auth.uid()) or exists (select 1 from games g where g.id = game_id and g.organizer_id = (select auth.uid()))`,
    }),
  ],
);

export const venueSports = pgTable(
  "venue_sports",
  {
    venueId: uuid("venue_id")
      .notNull()
      .references(() => venues.id, { onDelete: "cascade" }),
    sportId: smallint("sport_id")
      .notNull()
      .references(() => sports.id, { onDelete: "restrict" }),
  },
  (t) => [
    primaryKey({ columns: [t.venueId, t.sportId] }),
    index("venue_sports_sport_idx").on(t.sportId),
    pgPolicy("vsports_read", { for: "select", to: authenticatedRole, using: sql`true` }),
    pgPolicy("vsports_write", {
      for: "all",
      to: authenticatedRole,
      using: sql`exists (select 1 from venues v where v.id = venue_id and v.owner_id = (select auth.uid()))`,
      withCheck: sql`exists (select 1 from venues v where v.id = venue_id and v.owner_id = (select auth.uid()))`,
    }),
  ],
);
```

- [ ] **Step 2: Add the Supabase roles entity to drizzle-kit config**

Edit `drizzle.config.ts` — add the `entities` block so drizzle-kit treats `authenticated`/`anon`/`service_role` as **existing** Supabase roles (it will NOT emit `CREATE ROLE`):
```ts
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/lib/db/schema.ts",
  out: "./migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "",
  },
  entities: {
    roles: {
      provider: "supabase",
    },
  },
});
```

- [ ] **Step 3: Remove the obsolete placeholder test, then typecheck**

The Plan-01 placeholder `src/lib/db/db.integration.test.ts` imports `users` from `./schema`, which the rewrite removes (it tests the old placeholder schema and is recreated fresh in Task 4). `tsc` typechecks test files, so remove it now to keep the typecheck clean. `git rm` also stages the deletion for the Step 6 commit:
```bash
git rm src/lib/db/db.integration.test.ts
```
Run: `pnpm typecheck`
Expected: clean (exit 0). If `drizzle-orm/supabase` types are missing, confirm `drizzle-orm@^0.45` is installed — it ships the `supabase` subpath.

- [ ] **Step 4: Delete the placeholder migration and regenerate from scratch**

Run:
```bash
rm -rf migrations
pnpm dotenv -e .env.local -- drizzle-kit generate
```
Expected: drizzle-kit recreates `migrations/` with one new `0000_*.sql` (random suffix) plus `meta/`. The output lists 8 tables, 2 enums, indexes, and policies.

- [ ] **Step 5: Inspect the generated SQL (this is the verification for this task)**

Run each check and confirm the expected result:
```bash
# 8 base tables
grep -c '^CREATE TABLE' migrations/0000_*.sql            # expect: 8
# both enums
grep 'CREATE TYPE' migrations/0000_*.sql                 # expect: participation_status AND game_status
# RLS enabled on every table
grep -c 'ENABLE ROW LEVEL SECURITY' migrations/0000_*.sql # expect: 8
# every policy emitted (15 pgPolicy declarations total)
grep -c 'CREATE POLICY' migrations/0000_*.sql            # expect: 15
# auth.users is REFERENCED, never created
grep 'auth"."users"' migrations/0000_*.sql               # expect: a FOREIGN KEY ... REFERENCES "auth"."users"("id")
grep -i 'create table "auth"' migrations/0000_*.sql || echo 'OK: auth schema not created'
grep -i 'create role' migrations/0000_*.sql || echo 'OK: no CREATE ROLE'
# partial indexes carry their WHERE clauses
grep -iE "where .*(deleted_at is null|status = 'open'|share_token is not null|venue_id is not null)" migrations/0000_*.sql
```
Expected: `8`, the two enum types, `8`, `15`, a `REFERENCES "auth"."users"` line, both `OK:` lines, and several partial-index `WHERE` matches. If the table count or policy count is off, fix `schema.ts` and re-run Steps 4–5.

- [ ] **Step 6: Commit the schema + regenerated migration together**

```bash
git add src/lib/db/schema.ts drizzle.config.ts migrations
git commit -m "feat(db): replace placeholder schema with authoritative 8-table model + RLS"
```

---

## Task 3: Custom migration — private schema, signup trigger, sports seed

**Files:**
- Create: `migrations/0001_*.sql` (via `drizzle-kit generate --custom`)

- [ ] **Step 1: Generate an empty custom migration**

Run: `pnpm dotenv -e .env.local -- drizzle-kit generate --custom --name=signup_trigger_and_sports_seed`
Expected: a new empty `migrations/0001_signup_trigger_and_sports_seed.sql` and an updated `meta/_journal.json`.

- [ ] **Step 2: Fill in the custom migration SQL**

Open the new `migrations/0001_signup_trigger_and_sports_seed.sql` and replace its (empty) contents with:
```sql
-- Objects Drizzle Kit can't express. Table DDL + RLS policies live in the
-- generated schema migration (0000); this adds a SECURITY DEFINER trigger in a
-- private (non-API-exposed) schema, plus reference seed data.

-- 1. private schema — a SECURITY DEFINER function must NOT live in an API-exposed schema.
CREATE SCHEMA IF NOT EXISTS private;

-- 2. handle_new_user: create a public.profiles row whenever an auth user is created.
--    Keeps profile creation off the client, so profiles needs no INSERT policy.
CREATE OR REPLACE FUNCTION private.handle_new_user()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data ->> 'display_name', ''));
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION private.handle_new_user();

-- 3. Seed the 8 fixed sports (idempotent — safe to re-run).
INSERT INTO public.sports (key, name, display_order) VALUES
  ('football',   'Football',      1),
  ('basketball', 'Basketball',    2),
  ('tennis',     'Tennis',        3),
  ('volleyball', 'Volleyball',    4),
  ('padel',      'Padel',         5),
  ('running',    'Running',       6),
  ('gym',        'Gym & Fitness', 7),
  ('swimming',   'Swimming',      8)
ON CONFLICT (key) DO NOTHING;
```

- [ ] **Step 3: Rebuild the local database from the new migrations**

This wipes the local DB (removing the old placeholder tables and the old drizzle migration tracking) and re-applies `0000` + `0001` cleanly:
```bash
supabase db reset
pnpm dotenv -e .env.local -- drizzle-kit migrate
```
Expected: `supabase db reset` finishes with a fresh local stack; `drizzle-kit migrate` reports applying 2 migrations with no error. (`supabase db reset` only runs `supabase/migrations/` — empty here — so it gives a clean Supabase base with `auth.users` and the `authenticated` role present, then Drizzle applies our schema.)

- [ ] **Step 4: Verify the trigger, seed, and private schema exist**

Run:
```bash
pnpm dotenv -e .env.local -- node -e "const p=require('postgres')(process.env.DATABASE_URL);(async()=>{const s=await p\`select count(*)::int n from sports\`;const t=await p\`select 1 from pg_trigger where tgname='on_auth_user_created'\`;const f=await p\`select 1 from pg_proc pr join pg_namespace n on n.oid=pr.pronamespace where n.nspname='private' and pr.proname='handle_new_user'\`;console.log('sports',s[0].n,'trigger',t.length,'fn',f.length);await p.end();})()"
```
Expected: `sports 8 trigger 1 fn 1`.

- [ ] **Step 5: Commit**

```bash
git add migrations
git commit -m "feat(db): add signup trigger and sports seed migration"
```

---

## Task 4: Schema / trigger / constraint / seed integration tests

**Files:**
- Create: `src/lib/db/db.integration.test.ts` (the Plan-01 placeholder was removed in Task 2)

> Integration tests run against the **real** local Postgres via the `postgres` superuser connection (so they bypass RLS — RLS is exercised separately in Task 5). They create fresh auth users per run (unique emails) and do not clean up; CI uses a fresh ephemeral Postgres each run (Plan 02), and locally the rows are harmless. The "exactly 8 sports" assertion stays stable because the seed is idempotent.

- [ ] **Step 1: Create the integration test**

Create `src/lib/db/db.integration.test.ts` (removed in Task 2) with:
```ts
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
  const email = `it-${id}@example.com`; // full UUIDv7 — globally unique even within the same millisecond
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
```

- [ ] **Step 2: Run the integration tests to verify they pass**

Run: `pnpm dotenv -e .env.local -- pnpm test:integration src/lib/db/db.integration`
Expected: all tests pass (requires Task 3's migrated DB and `supabase start` running).

- [ ] **Step 3: Commit**

```bash
git add src/lib/db/db.integration.test.ts
git commit -m "test(db): cover schema, trigger, constraints, and sports seed"
```

---

## Task 5: RLS enforcement integration tests

**Files:**
- Create: `src/lib/db/rls.integration.test.ts`

> These tests verify the spec's authorization promise: RLS is enabled on every table, and policies actually filter. They run queries **as the `authenticated` role** (via transaction-local `role` + `request.jwt.claims`), the canonical way to exercise Supabase RLS from a direct connection.

- [ ] **Step 1: Write the RLS test**

Create `src/lib/db/rls.integration.test.ts`:
```ts
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
  return client.begin(async (tx) => {
    await tx`select set_config('request.jwt.claims', ${JSON.stringify({ sub: userId, role: "authenticated" })}, true)`;
    await tx`select set_config('role', 'authenticated', true)`;
    return fn(tx as unknown as typeof client);
  });
}

async function createAuthUser(displayName: string): Promise<string> {
  const id = newId();
  const email = `rls-${id}@example.com`; // full UUIDv7 — globally unique even within the same millisecond
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
```

- [ ] **Step 2: Run the RLS tests to verify they pass**

Run: `pnpm dotenv -e .env.local -- pnpm test:integration src/lib/db/rls.integration`
Expected: all tests pass. (If a query fails with `permission denied for table`, the `beforeAll` grants did not run — confirm the migration was applied in Task 3 so the tables exist before grants.)

- [ ] **Step 3: Run the Supabase advisors / linter (spec §9)**

Run: `supabase db lint --level warning`
Expected: no errors. This catches schema issues locally. The full security/performance advisors (`0003_auth_rls_initplan`, unindexed-FK, RLS-disabled) run against a linked project via the Supabase MCP `get_advisors` — defer that to when a remote project exists (Plan 03/04). Our policies already use the initplan-safe `(select auth.uid())` form and every RLS-filtered column is indexed (spec §4), so those advisors should report clean.

- [ ] **Step 4: Commit**

```bash
git add src/lib/db/rls.integration.test.ts
git commit -m "test(db): verify RLS is enabled and enforced"
```

---

## Task 6: Document the data layer and run full verification

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Update the README layout note and add a schema section**

In `README.md`, replace the `src/lib/db` bullet under `## Layout`:
```markdown
- `src/lib/db` — Drizzle schema + client; `migrations/` is the schema source of truth
```
with:
```markdown
- `src/lib/db` — Drizzle schema (8-table model + RLS), client, and `newId()` UUIDv7 keys; `migrations/` is the schema source of truth
```

Then append this section to the end of `README.md`:
```markdown
## Database schema

The data model is the 8-table SQUAD schema from `docs/context/db-schema-and-backend-design.md`:
`profiles` (+ `client_profiles`, `venue_owner_profiles`), `sports`, `venues` (+ `venue_sports`),
`games`, and `participations`.

- **Source of truth:** `migrations/`. `0000_*.sql` (generated by drizzle-kit from `src/lib/db/schema.ts`)
  holds tables, indexes, and RLS policies; `0001_*.sql` (custom) holds the `private.handle_new_user`
  signup trigger and the sports seed.
- **Primary keys:** `venues` / `games` / `participations` use app-generated UUIDv7 ids via `newId()`
  (`src/lib/db/id.ts`) — no DB default. `sports` uses a generated `smallint` identity.
- **Authorization:** the app talks to Postgres as `postgres` via Drizzle; RLS is defense-in-depth.
- **Reset the local DB after schema changes:** `supabase db reset && pnpm dotenv -e .env.local -- drizzle-kit migrate`.
```

- [ ] **Step 2: Run the full verification suite**

Run: `pnpm typecheck && pnpm test && pnpm build`
Expected: typecheck clean; all unit tests pass; `next build` succeeds.

- [ ] **Step 3: Run the integration suite end to end**

Run: `pnpm dotenv -e .env.local -- pnpm test:integration`
Expected: every `*.integration.test.ts` (db + rls) passes.

- [ ] **Step 4: Commit**

```bash
git add README.md
git commit -m "docs(db): document the data-layer schema and workflow"
```

---

## Definition of Done (Plan 05)

- `pnpm typecheck && pnpm test && pnpm build` all pass.
- `supabase db reset && pnpm dotenv -e .env.local -- drizzle-kit migrate` applies `0000` + `0001` with no error.
- `pnpm dotenv -e .env.local -- pnpm test:integration` passes (schema, trigger, constraints, seed, and RLS enforcement).
- `migrations/` contains exactly the regenerated schema migration + the custom trigger/seed migration; the placeholder `users`/`game_participants` tables are gone.
- All 8 `public` base tables report `relrowsecurity = true`; the 15 policies exist.
- `sports` holds the 8 fixed sports; creating an `auth.users` row auto-creates a `profiles` row.
- No `@supabase/supabase-js` import was added outside `src/lib/`. (`drizzle-orm/supabase` in `schema.ts` is the Drizzle library, inside the db seam — allowed.)

**Next:** Plan 06 builds the backend API + domain layer on this schema — the `lib/booking` module (create-game / request / approve / decline / cancel, with capacity and status-state-machine rules enforced in a transaction) and the `/api/v1` REST route handlers with Zod/OpenAPI contracts and route-group surface guards (spec §6).
