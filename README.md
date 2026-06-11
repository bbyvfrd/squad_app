# SQUAD

Multi-sport recreational **sports coordination** app for Azerbaijan. SQUAD turns the messy chat-and-calls way games get organized into one clear loop: organizers create games, players request spots, organizers approve, and approval confirms the spot.

- **Core loop:** create game → request spot → approve / decline → approved = confirmed. No payments, no second confirmation step.
- **Users:** organizer (hero), player, venue owner (listings only).
- **Two surfaces, one app:** `/` (player + organizer) and `/venue` (venue owner).
- **8 sports** — football, basketball, tennis, volleyball, padel, running, gym/fitness, swimming. Azerbaijan-wide, English (v1).

Full scope, personas, and domain model: [`docs/context/product.md`](docs/context/product.md).

## Prerequisites

- **Node 24+** (matches CI and the `node:24-alpine` production image)
- **pnpm 9+**
- **Docker** (for the container build and local Supabase)
- **Supabase CLI** (`brew install supabase/tap/supabase` or see [supabase.com/docs/guides/cli](https://supabase.com/docs/guides/cli))

## Local development

```bash
# 1. Install dependencies
pnpm install

# 2. Start local Supabase (Postgres + Auth + Studio at http://localhost:54323)
supabase start

# 3. Copy the env template and fill in values from `supabase status`
cp .env.example .env.local
#    NEXT_PUBLIC_SUPABASE_URL  → API URL from supabase status
#    NEXT_PUBLIC_SUPABASE_ANON_KEY → anon key from supabase status
#    DATABASE_URL              → DB URL from supabase status

# 4. Apply the schema migrations
pnpm dotenv -e .env.local -- drizzle-kit migrate

# 5. Run the dev server
pnpm dev
```

App runs at **http://localhost:3000**. Supabase Studio at **http://localhost:54323**.

## Testing

```bash
# Unit + contract tests (no DB required)
pnpm test

# DB integration tests (requires `supabase start`)
pnpm dotenv -e .env.local -- pnpm test:integration

# TypeScript type check
pnpm typecheck

# Lint
pnpm lint
```

## Container build

```bash
docker build -t squad-app:dev .
```

The image uses a non-root user and Next.js standalone output. On macOS with Docker Desktop, pass host network refs manually:

```bash
docker run -p 3000:3000 \
  -e DATABASE_URL=postgres://postgres:postgres@host.docker.internal:54322/postgres \
  -e NEXT_PUBLIC_SUPABASE_URL=http://host.docker.internal:54321 \
  -e NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key> \
  squad-app:dev
```

## Repository layout

```
src/
  app/(client)/           # player + organizer surface  → /
  app/(venue)/venue/      # venue-owner surface          → /venue
  app/api/health/         # health endpoint used by deploy gates
  lib/
    config/               # typed, fail-fast Zod env — ONLY place env vars are read
    db/                   # Drizzle schema (8-table model + RLS), client, and `newId()` UUIDv7 keys; `migrations/` is the schema source of truth
    auth/                 # AuthProvider interface + Supabase adapter + in-memory fake
migrations/               # SQL migrations — source of truth for the schema
docs/
  context/                # reference (product, architecture, design system, decisions)
  plans/                  # build plans (run once, in order; move to done/ after execution)
infra/terraform/          # Vercel + Supabase + GitHub IaC
Dockerfile                # multi-stage, non-root, standalone
```

## Stack

Next.js 16 · TypeScript · Tailwind CSS + shadcn/ui · Supabase (Postgres + Auth) · Drizzle ORM · Vercel · GitHub Actions · Terraform (HCP state) · Vitest + Playwright.

Architecture is **portable seams** — every vendor touchpoint sits behind an adapter implementing our own interface, so the managed stack can be swapped without a rewrite. `lib/config` is the only place `process.env` is read; `migrations/` is the schema source of truth (not the dashboard, not Terraform). See [`docs/context/architecture.md`](docs/context/architecture.md).

## Design system

**SQUAD** — dark-first cool slate, one brand color (SQUAD red `#EE4721`) used at most twice per screen, italic Inter Tight display, functional sport-state colors. Canonical files in [`docs/context/design/`](docs/context/design/) (`DESIGN.md` = tokens + spec, `design-system.html` = component reference). Summary + integration notes: [`docs/context/design-system.md`](docs/context/design-system.md).

> The design system is a superset athletic-product system; v1 ships only the subset the product scope allows (no payments, scores, leaderboards, teams, or live-match). A component existing in the system is not permission to ship that feature.

## Working with this repo

Read [`CLAUDE.md`](CLAUDE.md) first — it carries the stack, the seam rules, the conventions, the v1 scope guardrails, and the open questions that must not be decided here.

## Source of truth & sync

Product, research, and decisions live upstream in a separate **brainstorm vault**; this repo consumes a distilled, read-only slice in `docs/context/`. Direction is **one-way**: change a decision in the vault, then refresh the affected `docs/context/` file. Don't make product or architecture decisions here.

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

## Continuous Integration

`.github/workflows/ci.yml` runs on every PR and push to `main`. It is portable
(no Vercel/vendor deploy specifics — that lives in `deploy.yml`, Plan 4); the
`test` and `e2e` jobs use the Supabase CLI to provision a Postgres with the
`auth` schema/roles the migrations require.

| Job           | What it gates                                                                                         |
| ------------- | ----------------------------------------------------------------------------------------------------- |
| `secret-scan` | gitleaks — blocks any committed secret                                                                |
| `lint`        | Prettier + ESLint + `tsc`                                                                             |
| `test`        | Vitest unit/contract + integration against a Supabase-provisioned Postgres (migrations applied first) |
| `sast`        | Semgrep OSS (SAST)                                                                                    |
| `vuln-scan`   | Trivy filesystem (deps/secrets) + config (IaC/Dockerfile)                                             |
| `build-image` | Build → Trivy-scan image → push to GHCR by commit SHA (push to `main` only)                           |
| `e2e`         | Playwright smoke (health 200 + both route-group surfaces) against the app booted in CI                |

No external secrets are required; GHCR uses the built-in `GITHUB_TOKEN`.
Dependabot (`.github/dependabot.yml`) keeps npm deps, action pins, and the
Docker base image current.

Reproduce a job locally with Docker (gitleaks/semgrep/trivy) or the matching
`pnpm` script (`format:check`, `lint`, `typecheck`, `test`, `test:integration`,
`test:e2e`).

## Deploy & rollback

`deploy.yml` runs after CI succeeds on `main`:
staging (migrate → deploy → Playwright smoke) → **manual approval** (GitHub
`production` environment) → production (migrate → atomic deploy → health gate).
A failed production deploy/health gate auto-calls `rollback.yml` (only after a
deploy was actually attempted — a rejected approval or pre-deploy failure leaves
prod untouched and triggers no rollback).

- Approve a production deploy: GitHub → the run → "Review deployments" → approve.
- Manual rollback: `gh workflow run rollback.yml -f reason="<why>"` — cancel any
  in-flight Deploy run first (a dispatched rollback can race one and be re-promoted over).
- Migrations are forward-only; `vercel rollback` reverts the app, not the schema —
  keep migrations backward-compatible (expand/contract). Every deploy job runs
  `scripts/verify-migrations.mjs` after migrating (drizzle-kit can fail silently).
- Smoke/health checks target the stable production domains (`STAGING_URL`/`PROD_URL`
  repo variables) — per-deployment URLs are auth-protected.
- Deploy secrets + `STAGING_URL`/`PROD_URL` are managed by `infra/terraform/envs/deploy-secrets`.
