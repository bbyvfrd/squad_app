<!-- Project memory for the app repo. Generated from the sport-app brainstorm vault; docs/context/ is synced one-way from the vault. -->

# CLAUDE.md

Guidance for Claude Code when working in this repository — the multi-sport recreational **sports coordination** app for Azerbaijan.

> [!important] Product/research source of truth is the brainstorm vault (a separate repo).
> This repo is **implementation only**. Do not invent or re-decide product scope, decisions, or research here — those live in the vault. Distilled context is synced into `docs/context/` (see [Relationship to the brainstorm vault](#relationship-to-the-brainstorm-vault)). When scope is unclear, read `docs/context/` or ask — don't guess.

## What we're building

Recreational games are still organized through messy chats, calls, and informal promises. This app turns that into one clear loop:

1. Organizer creates a game.
2. Player discovers it and requests a spot.
3. Organizer approves or declines.
4. **Approved = the spot is confirmed.** No payment, no second confirmation step.
5. Venue info appears as read-only context — not a booking flow.

It is **not** a booking, payments, or ticketing product in v1.

## Product scope (v1 — locked)

- **Users:** hero = **organizer**; secondary = player; tertiary = venue owner.
- **Two surfaces, one app, two route groups:** `/app` = client (player + organizer), `/venue` = venue owner (listings only). Auth/first-run routes (`/boot /welcome /signup /verify /intent /signin`) live under `app/(auth)/` — see Conventions.
- **Client roles:** organizer and player are **per-game roles, not account types** — every client user can both create games (as organizer) and request spots (as player). Never split player/organizer into separate apps.
- **8 fixed sports:** football, basketball, tennis, volleyball, padel, running, gym/fitness, swimming. No user-created sports.
- **Geography:** Azerbaijan-wide — do **not** hard-code a geo restriction (must allow later expansion). **Language:** English (v1).
- **Participation statuses:** `requested` → `approved` / `declined`, plus `cancelled`. That's the whole model — no waitlists, replacements, penalties, or fairness rules.

### Domain model (conceptual — authoritative schema is `docs/context/db-schema-and-backend-design.md`)

Identity uses **split profiles** (one auth account → a base `profiles` row + optional `client_profiles` / `venue_owner_profiles`), **not** a single user table. The full 10-table schema, indexing, RLS policies, and `/api/v1` surface live in the schema doc — consult it for any data/backend work.

| Object            | Table(s)                                                 | Key fields                                                                                                                                                                                                                                                                                               |
| ----------------- | -------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Identity**      | `profiles` (+ `client_profiles`, `venue_owner_profiles`) | profiles: `id` (= auth.users.id), `full_name` (NOT NULL), `display_name` (nullable, optional public handle), `city_id` · client_profiles: client-surface marker (no role flags — any client can organize and play) · venue_owner_profiles: business_name, contact · **phone lives in `auth.users` only** |
| **Skill**         | `client_sport_skills`                                    | (profile_id, sport_id) PK; `skill_level` enum (beginner/intermediate/amateur/advanced/professional); per-user per-sport; advisory only                                                                                                                                                                   |
| **City**          | `cities`                                                 | id, key (e.g. 'baku'), name; lookup table seeded with major Azerbaijani cities                                                                                                                                                                                                                           |
| **Venue**         | `venues` (+ `venue_sports`)                              | id, owner_id, name, supported sports (via `venue_sports`), address, contact_info, description                                                                                                                                                                                                            |
| **Game**          | `games`                                                  | id, organizer_id, optional venue_id, sport_id (→ `sports` lookup), title, starts_at, `ends_at` (nullable, CHECK > starts_at), `skill_level` (nullable = all levels), `city_id`, capacity, location_text, notes, status, share_token                                                                      |
| **Participation** | `participations`                                         | id, game_id, player_id, status (`requested`\|`approved`\|`declined`\|`cancelled`); `UNIQUE(game_id, player_id)`                                                                                                                                                                                          |

## Tech stack

| Layer     | Choice                                                                                                         |
| --------- | -------------------------------------------------------------------------------------------------------------- |
| Framework | **Next.js** (single app, two route groups: `app/(client)`, `app/(venue)`)                                      |
| Language  | TypeScript                                                                                                     |
| UI        | **Tailwind CSS + shadcn/ui**                                                                                   |
| DB        | **Supabase Postgres**, accessed via **Drizzle ORM**; SQL **migrations are the schema source of truth**         |
| Auth      | **Supabase Auth** (one auth system + an account-surface field — do not build separate-vs-unified accounts yet) |
| Hosting   | **Vercel**                                                                                                     |
| Config    | typed **Zod** module, validated at boot (fail-fast)                                                            |
| CI/CD     | **GitHub Actions**                                                                                             |
| IaC       | **Terraform** (Vercel + Supabase + GitHub providers); remote state on HCP Terraform                            |
| Tests     | **Vitest** (unit/integration on an ephemeral Postgres) + **Playwright** (core-loop E2E)                        |

> Do not pin or assume library versions/APIs from memory — **verify them with the Context7 MCP** before writing or upgrading code (standing directive). See [Standing directives](#standing-directives).

## Architecture: portable seams (non-negotiable)

The app ships on managed platforms now but must be portable later **without a rewrite**. Full rationale in `docs/context/architecture.md`. The discipline:

- **The Seam Rule:** app code **never imports a vendor SDK directly.** Each vendor touchpoint lives behind _one_ adapter implementing _our_ interface. A vendor swap then touches one file.
- Vendor-specific features (Supabase RLS, Vercel edge) may be used but must **never be load-bearing** — the app stays correct without them.
- **`lib/config/` is the only place `process.env` is read.** App code imports `config.<x>`.
- **Migrations own the schema** — not Terraform, not the dashboard.
- **Build the `Dockerfile` in CI from day one**, even though we deploy to Vercel — keeps the portability seam honest.

### Repo layout

```
src/
  app/(client)/…      # player + organizer surface  → /app
  app/(venue)/…       # venue-owner surface          → /venue
  lib/
    config/           # typed Zod env — ONLY place env vars are read
    db/               # Drizzle schema + client (only module that knows it's Supabase)
    auth/             # AuthProvider interface + supabase adapter
    booking/          # ALL participation/booking write logic (see conventions)
    storage/          # Storage interface + adapter (wired only when uploads are needed)
migrations/           # SQL migrations = source of truth for schema
infra/terraform/      # modules: app / data / repo / compute(seam) ; envs: dev/staging/prod
Dockerfile
.github/workflows/    # ci.yml (portable) · deploy.yml (only vendor-aware) · rollback.yml
```

## Conventions

- **Domain hot path in one module.** All create-game / request / approve / cancel write logic goes through `lib/booking/`. This localizes a future concurrency upgrade (e.g., a lock + `SELECT … FOR UPDATE`) if real contended slot-booking ever enters scope.
- **Idempotent writes.** Enforce idempotency on core-loop mutations with DB unique constraints — e.g. unique `(game_id, player_id)` participation. A player can request a spot only once; double-taps must not create duplicates.
- **Status is the single source of participation truth.** Player and organizer views render the same `requested/approved/declined/cancelled` model.
- **Skill levels are advisory — the organizer decides.** `games.skill_level` and `client_sport_skills` drive the organizer's "below required" indicator and discovery filtering only. Nothing in the DB or RLS gates a join request based on skill; the `lib/booking` layer may prompt for a level but never blocks the insert.
- **Match existing code.** Mirror the surrounding file's naming, structure, and idioms.
- **Tests gate the core loop.** Keep the Playwright path (signup → create game → request → approve) green.
- **The vocabulary law (design system).** Canonical `.sq-*` looks are consumed ONLY by importing from `src/components/ui/` — screen code never hand-writes `sq-*` class strings; class derivation lives only in `src/components/ui/` + `src/lib/ui/mappings.ts` (`pnpm check:design` gates this in CI). Token-mapped Tailwind utilities (`bg-surface`, `p-s2`, `rounded-card`, …) are for layout and bespoke surfaces; raw ramps (`--terra-*`/`--steel-*`/`--linen-*`) are deliberately not exposed as utilities.
- **Design-system upgrades are a file swap.** `src/styles/squad/` is generated — never hand-edit. To upgrade: re-run `pnpm sync:design` (and `--icons` if the inventory changed), read `docs/context/design/CHANGELOG.md`, run the theme E2E. Version pin: `src/styles/squad/VERSION`.
- **New icon = two steps.** Add the ligature name to `src/styles/squad/icon-inventory.txt` AND `src/lib/ui/icon-names.ts` (parity-tested), then `pnpm sync:design --icons`.
- **Auth/first-run screens live in `app/(auth)/`** (light-only Direction B), composed from `src/components/auth/` on the SQUAD tokens. Plan 08 wired the email/password path to Supabase (see the auth-backend bullet below); phone OTP / OAuth remain inert UI seams. Adding an auth icon follows the same two-step icon workflow (add to inventory + `ICON_NAMES`, then `pnpm sync:design --icons`). Auth routes: `/boot /welcome /signup /verify /intent /signin`.
- **Auth backend is wired (Plan 08).** Email+password only for the demo; phone OTP / OAuth / password-reset are reserved seams (inert UI). `@supabase/ssr` is imported in **exactly three** files — `src/lib/auth/{server-client,update-session,session}.ts` — each starting `import "server-only"`; **the browser never imports `@supabase/*`** (screens call `src/lib/auth/client.ts` → `/api/v1/auth/*`). One resolver `getCurrentUser(req?)` reads either an httpOnly cookie (web) or an `Authorization: Bearer` (native seam, verified locally via JWKS). Endpoints: `POST /api/v1/auth/{signup,signin,signout}` + `GET /api/v1/auth/session`; **no token is ever returned in a response body** (web = cookies only), **no `/refresh`**. Every cookie-auth POST runs `assertBrowserMutation` (fail-closed Origin/Referer + `x-squad-csrf` header), gated in CI by `check:csrf`; the `check:auth-logging` gate forbids `console.*` of a caught error/req/body under `api/v1/auth`. Route guarding lives in `src/proxy.ts` (Next 16 middleware→proxy rename). **RLS is inert over the Drizzle owner connection** — app-layer ownership checks (`requireUser` + per-query filters) are the only enforcement on `/api/v1`; see `docs/context/db-schema-and-backend-design.md` §5 + `rls.integration.test.ts`. Migration 0005 made `handle_new_user` idempotent. Email confirmations are **OFF for the demo** (must be re-enabled before public launch). Lazy client-surface bootstrap (`ensureClientProfile`) fires once in the `/app` layout guard, never from a GET.

## Commands

> Target scripts — confirm against `package.json` once the skeleton (plan `docs/plans/01-app-skeleton.md`) lands.

```bash
npm run dev          # local dev server
npm run lint         # ESLint + Prettier
npm run typecheck    # tsc --noEmit
npm test             # Vitest (unit/integration on ephemeral Postgres)
npm run test:e2e     # Playwright core-loop smoke
npm run db:migrate   # apply SQL migrations
```

## CI/CD

- **`ci.yml`** (every PR/push, 100% portable): secret scan (gitleaks) → lint+typecheck → test (+ migrations apply) → security scan (Semgrep, Trivy) → build + containerize → GHCR → Playwright E2E. Blocks on failure.
- **`deploy.yml`** (only vendor-aware): merge to `main` → staging → smoke → manual approval gate → prod (atomic alias swap) → post-deploy health gate → auto-rollback on failure.
- **Branch protection + required checks + prod approval** are codified in Terraform, not clicked in a dashboard.

## Design system — SQUAD (v1.5.0)

Configured visual system; canonical files in `docs/context/design/` (**`colors_and_type.css` = the single source of truth** — tokens, dark theme, every canonical `.sq-*` component; `tokens.json` = generated W3C DTCG mirror; `README.md` = prose rules; `CONTRIBUTING.md` = anti-drift contract; `CHANGELOG.md` = semver history; `preview/` = rendered cards + AA contrast gate; `ui_kits/squad_app/` = reference Home/Games screens; `assets/` = locked logos; `fonts/` = self-hosted fonts). Summary + integration notes: `docs/context/design-system.md`.

- **Brand:** SQUAD. One accent — Fired Terracotta `#EE4721` — a **spike, not a wash**: one terracotta element per surface, ≤~15%, never body text, **never a status color**. **Light-default** (Warm Linen page; no pure black/white); dark mode is a role-token theme via `data-theme="dark"`, with an in-product toggle.
- **Type:** **Montserrat** (signage — display/headline/labels/buttons/numbers) + **Karla** (reading — body/forms/metadata). No mono font. **Italic is forbidden** — the color spike is the emphasis device. `tabular-nums` on every digit column.
- **Status colors** (semantic, ≠ brand): success Turf Green / warning Ochre (dark text) / error Signal Red / info Slate Blue — mapped to product states in `docs/context/design-system.md`. Sport tints (`.sq-sport-*`) and the skill ladder (`.sq-skill.lv-1…5` ↔ the 5-tier `skill_level` enum) are **identity, never status**. Flat surfaces; two named shadows only.
- **The role-token rule:** components reference role tokens (`--bg-surface`, `--fg-primary`, `--rule-hairline`, `--accent-text`, …), never raw `--linen-*`/`--steel-*` ramps — raw-ramp components won't theme.
- **Integration:** SQUAD is CSS-vars + vanilla `.sq-*` classes, _not_ Tailwind/shadcn — the bridge into the app stack must pick one vocabulary (`tokens.json` is the machine input) and must preserve the role-token rule + `data-theme` mechanism. Fonts and icons (Material Symbols Outlined) are **self-hosted — no CDN, no Google Fonts `<link>`**. Sport-key nit: CSS `soccer` = product `football`; reconcile once in the bridge.
- **Scope guard:** SQUAD is a superset (**waitlist badge**, payments glyphs, ratings, win/leaderboard vocabulary all exist). v1 ships only the subset the product scope allows — no payments/waitlists/ratings/scores/teams/live-match. A component existing ≠ the feature is in v1.
- **Voice (use):** Create game, Request spot, Approve, Decline, Spots left, Pending requests, Confirmed, Cancelled, Venue details. Short verbs, present tense; numbers carry the claim; one verb per CTA. Casing by tier: display/labels/buttons UPPERCASE, title and below mixed-case. No emoji, no em dashes, no exclamation marks.
- **Voice (avoid in v1 — no payments/booking yet):** Book now, Checkout, Pay, Deposit, Wallet, Ticket, Reserve court, League, Tournament, Waitlist.

## Standing directives

- **Verify versions/APIs with the Context7 MCP** when planning or writing code that touches a library/framework/CLI — don't rely on training-data memory.
- **Naming** (brand, features, packages, public-facing strings): English + Latin script only; no Turkic words; avoid obvious/taken names; vet for unintended Azerbaijani connotations.
- **Respect the non-decisions.** Cross-surface identity stays one auth system + surface field (separate-vs-unified accounts is deferred). Don't introduce payments, maps, or chat.

## Do NOT (guardrails against scope creep)

Out of scope for v1 — do not build unless the vault's scope changes:

- payments / deposits / refunds / checkout
- venue booking calendars, availability, or operations tooling
- maps integration · in-app chat · ratings/reviews/reputation
- waitlists, replacement automation, cancellation fees/penalties
- admin panel · venue analytics dashboards · venue-owner game creation
- tournaments / leagues / teams · native mobile app

## Relationship to the brainstorm vault

The vault is the upstream **brain**; this repo consumes a curated, read-only slice of it.

- `docs/context/` holds distilled, stable artifacts synced from the vault (product, decisions, architecture, schema/backend design, design system, glossary). The vault's raw research does **not** belong here.
- This file `@`-imports the two load-bearing ones — `@docs/context/decisions.md` and `@docs/context/architecture.md` — so they are always in context. Read `docs/context/product.md`, `docs/context/db-schema-and-backend-design.md`, `docs/context/design-system.md`, and `docs/context/glossary.md` when a task touches them.
- Build instructions live in `docs/plans/` (run once, in order) — not imported here. See the bundle README.
- **Direction is one-way:** change product/architecture decisions in the vault, then re-sync the affected `docs/context/` file. Never decide them here.

## Open questions — do NOT silently decide

Flag these to the user instead of choosing for them (they need a vault brainstorm first):

1. Should venue-owner accounts be fully separate from client accounts, or can one identity reach both surfaces later?
2. What exact invite/share artifact do organizers get in v1? (reserve an entry point; don't define it)
3. Which game-creation fields are mandatory vs optional?
4. Which venue-listing fields are mandatory vs optional?
