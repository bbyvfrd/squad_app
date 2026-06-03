# Schema v2 — Skill Levels, Identity, Game Timing, City

**Status:** Design (brainstormed 2026-06-03) — awaiting review before implementation plan.
**Source of truth:** authoritative schema doc is `docs/context/db-schema-and-backend-design.md`; this spec describes the next change set on top of it (post the per-game-roles change, migrations `0000`–`0002`).

## Goal

Extend the data layer with: per-user-per-sport **skill levels** (advisory, organizer-decides), **full name** on profiles, native **phone verification**, a game **end time**, and a **city** dimension for discovery.

## Locked decisions (from brainstorm)

- **Skill scale** = 5-tier enum, ordered: `beginner < intermediate < amateur < advanced < professional`.
- **Per-user skill** is **per sport** (a user has an independent level for each sport).
- **Game skill level** = a single level, nullable (`null` = "All levels"), read as a **minimum** ("that level and up") for the organizer's match indicator.
- **Enforcement = advisory.** A skill level **never blocks** a join request. The only rule: a user must have a declared level for the game's sport before requesting — the app prompts for it just-in-time. The organizer sees the player's level (and a "below required" flag) and decides on approval.
- **Skill-must-exist rule is enforced in the app layer only** (`lib/booking`); RLS `part_insert` is unchanged.
- **Phone is private** — lives in `auth.users` only (verified), never on the world-readable `profiles` table.
- **City = lookup table** (`cities`), mirroring `sports`.
- **Not in this pass:** gender preference, min players, game visibility, payments/cost.

## Schema changes

### New enum
```sql
CREATE TYPE skill_level AS ENUM ('beginner','intermediate','amateur','advanced','professional');
```

### New table: `client_sport_skills`
A client's declared level per sport. References `client_profiles` (only clients have sport skills).
```sql
CREATE TABLE client_sport_skills (
  profile_id   uuid     NOT NULL REFERENCES client_profiles(profile_id) ON DELETE CASCADE,
  sport_id     smallint NOT NULL REFERENCES sports(id) ON DELETE RESTRICT,
  skill_level  skill_level NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (profile_id, sport_id)
);
```
- Index: `client_sport_skills_sport_idx` on `(sport_id)` (for "players of sport X" lookups).
- **RLS:** readable by all authenticated (skill level is low-sensitivity and organizers need to see requesters' levels); writable only by self.
  - `csk_select` — `FOR SELECT TO authenticated USING (true)`
  - `csk_write` — `FOR ALL TO authenticated USING ((select auth.uid()) = profile_id) WITH CHECK ((select auth.uid()) = profile_id)`

### New table: `cities` (lookup, like `sports`)
```sql
CREATE TABLE cities (
  id            smallint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  key           text NOT NULL UNIQUE,        -- 'baku', 'ganja', ...
  name          text NOT NULL,
  display_order smallint NOT NULL DEFAULT 0,
  is_active     boolean NOT NULL DEFAULT true
);
```
- **RLS:** `cities_read` — `FOR SELECT TO authenticated USING (true)`; writes are service-role only (no write policy → denied).
- **Seed** (custom migration, idempotent) with major Azerbaijani cities: Baku, Ganja, Sumqayit, Mingachevir, Lankaran, Shaki, Yevlakh, Nakhchivan, Shirvan, Khirdalan. (Geography stays Azerbaijan-wide and expandable — no geo restriction hard-coded.)

### `profiles` — identity additions
- Add `full_name text NOT NULL` — added as `NOT NULL DEFAULT ''` to satisfy existing rows, then the default is dropped; the `handle_new_user` trigger populates it from signup metadata.
- Relax `display_name` to **nullable** (optional public handle; the app falls back to `full_name`).
- Add `city_id smallint NULL REFERENCES cities(id) ON DELETE SET NULL` (home city for default discovery filter).
- **Phone is NOT added here** (privacy — see Auth below).

### `handle_new_user` trigger update
Insert `full_name` (and existing `display_name`) from `raw_user_meta_data`:
```sql
INSERT INTO public.profiles (id, full_name, display_name)
VALUES (NEW.id,
        COALESCE(NEW.raw_user_meta_data ->> 'full_name', ''),
        NULLIF(NEW.raw_user_meta_data ->> 'display_name', ''));
```

### `games` — skill + timing + city
- Add `skill_level skill_level NULL` (`null` = all levels; minimum semantics).
- Add `ends_at timestamptz NULL` + `CHECK (ends_at IS NULL OR ends_at > starts_at)` (`chk_games_ends_after_starts`).
- Add `city_id smallint NULL REFERENCES cities(id) ON DELETE RESTRICT` (existing `location_text` stays as the specific spot).
- Optional index for city discovery: extend/adapt `games_open_upcoming_idx` or add `games_city_starts_idx (city_id, starts_at)` — finalise in the plan based on the discovery query.

## Behaviour (app layer — `lib/booking`)

The skill model is advisory and lives in the join path (no RLS change):
1. **Request to join** a game of sport `S`:
   - If the user has no `client_sport_skills` row for `S`, the app **prompts** them to choose a level and inserts the row.
   - Insert the participation **regardless** of whether the user's level meets `games.skill_level`.
2. **Organizer approval view** surfaces the requester's level for `S` alongside the game's level, flagging "below required" when `user_level < games.skill_level` (using the enum order). The organizer approves/declines as today.

`games.skill_level` is never a gate; it only drives the indicator and discovery filtering.

## Auth — phone verification

- Native **Supabase Auth phone OTP**. The verified phone lives in `auth.users` (`phone`, `phone_confirmed_at`); it is **not** mirrored into `profiles`.
- Enabling the phone provider (and email+phone signup/login) is an **Auth-provider configuration** change behind the existing `AuthProvider` seam (Supabase settings, codified in Terraform later) — not a table change.
- Owner-only access to one's own phone via the auth seam. If organizers ever need an approved player's contact, that is a separate, deliberate feature with its own visibility rule.

## Out of scope (this pass)

Gender preference, min players, game visibility, payments/cost, recurring games, teams. Each remains a future, additive change.

## Delivery

- **Migrations:** `0003` (generated) for the enum, `client_sport_skills`, `cities`, and the `profiles`/`games` column + RLS changes; `0004` (custom) for the `handle_new_user` trigger update + `cities` seed (Drizzle Kit can't express those). Two hand-edits to the generated `0003` are expected:
  - Adding `full_name NOT NULL` to the already-populated `profiles` table needs `ADD COLUMN ... NOT NULL DEFAULT ''` then `DROP DEFAULT` (drizzle-kit emits a bare `NOT NULL` add, which fails on existing rows).
  - **Order any statements where a policy/CHECK references a column being added/changed** (the `0002` lesson — drizzle-kit doesn't topologically sort policy/column dependencies, and a bad order rolls the whole migration back silently).
- **Tests (TDD):** integration coverage for — `client_sport_skills` per-sport uniqueness + self-only writes + broad read under RLS; `games.skill_level` / `ends_at` CHECK; `cities` seed + FK behaviour; `full_name` populated by the trigger; the advisory join (request succeeds despite a level mismatch). Keep the existing suite green.
- **Docs re-sync:** update `docs/context/db-schema-and-backend-design.md` (entity model §2, tables §3, authZ §5), `CLAUDE.md` (domain model), `glossary.md`, `product.md`, `decisions.md`.
- **Vault:** these are product/schema decisions made in-repo; flag them to fold back into the upstream brainstorm vault (one-way `vault → docs/context` discipline).

## Open / deferred details (resolve in the plan)

- Exact city seed list and whether `games.city_id` should later become required for discovery (nullable in v1).
- Final index choice for city-based discovery queries.
- Whether `display_name` should be backfilled from `full_name` for existing rows (local/test only; pre-launch).
