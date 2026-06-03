# Decisions

> Distilled from the vault decision log + non-decisions. **One-way sync:** change decisions in the vault, then refresh here. Never make or reverse these in the repo.

## Locked — product

- Hero user: organizer. Launch: Azerbaijan-wide (don't hard-code geo). Language: English (v1).
- Eight fixed sports; no user-created sports.
- Two surfaces: client (player + organizer) and venue owner (listings only).
- Client onboarding lets a user be player, organizer, or both.
- Participation is approval-based; approval immediately confirms the spot; **no** post-approval reconfirmation.
- Cancellation/dropout = basic status only (`requested`/`approved`/`declined`/`cancelled`). No waitlists, penalties, fees, or fairness rules.
- Venue owners manage listings only; they do not create games in v1.

## Locked — implementation

- Responsive **web** for v1 (native mobile is a v1 non-goal).
- App lives in **this separate repo**; the brainstorm vault stays the product/research source of truth.
- **One Next.js app, two route groups** (`/app`, `/venue`) sharing one backend.
- Stack: Supabase (Postgres + Auth), Vercel, Drizzle ORM (migrations = schema source of truth), Tailwind + shadcn/ui, GitHub Actions, Terraform (HCP state), Zod config (fail-fast), Vitest + Playwright.
- Architecture: **portable seams** (see `architecture.md`). Vercel atomic blue-green + health-gated rollback; CI portable with an isolated, vendor-aware deploy job only.
- Refinements (from the market-pattern review): idempotent core-loop writes via DB unique constraints; all participation/booking writes behind one `lib/booking/` module.
- **Data layer** (full spec: `docs/context/db-schema-and-backend-design.md`): identity = shared account + **split profiles** (`profiles` + `client_profiles` + `venue_owner_profiles`); **organizer/player are per-game roles** (any client can create and join — no per-user capability flags); authZ in two layers (app `lib/booking` primary + Supabase RLS as defense-in-depth, `(select auth.uid())` policies on every table); REST API under `/api/v1` (URI versioning) with action-based participation transitions; `sports` lookup table; derived spots-remaining; UUIDv7 PKs (app-generated); idempotent `UNIQUE(game_id, player_id)`.
- **Schema v2 additions (2026-06-03):** `profiles.full_name` NOT NULL; `profiles.display_name` nullable; advisory skill model: 5-tier `skill_level` enum + `client_sport_skills` (per-sport, per-user) — skill levels never gate joining (organizer decides); phone verification via native Supabase Auth phone OTP — phone lives in `auth.users`, never on `profiles`; `cities` lookup table (seeded, mirrors `sports` pattern); `profiles.city_id` + `games.city_id` FK to `cities`; `games.ends_at` (nullable, CHECK ends_at > starts_at); `games.skill_level` (nullable = all levels, minimum semantics).

## Non-decisions — deferred (do NOT lock here)

| Topic | Why deferred | What unblocks it |
|---|---|---|
| Payment provider / payments | Payment need is still speculative; money is out of v1 | Evidence that deposits/payments are part of the launch wedge |
| Cross-surface identity | Chosen direction: one auth system + an account-surface field; full separate-vs-unified accounts deferred | A later account-strategy pass |
| Maps / geocoding | v1 uses text location only | A feature that needs real geo/discovery |

## Open product questions — flag, don't decide

These need a vault brainstorm before the relevant area is implemented:

1. Venue-owner accounts fully separate from client accounts, or one identity across both surfaces later?
2. Exact invite/share artifact for organizers in v1 (reserve an entry point; don't define it).
3. Mandatory vs optional game-creation fields.
4. Mandatory vs optional venue-listing fields.
