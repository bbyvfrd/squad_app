# SQUAD

Multi-sport recreational **sports coordination** app for Azerbaijan. SQUAD turns the messy chat-and-calls way games get organized into one clear loop: organizers create games, players request spots, organizers approve, and approval confirms the spot.

> **Status:** early. Product scope and architecture are locked; the app foundation is being stood up from `docs/plans/`. There is no application code yet — `docs/` is the starting context and build plan.

## The product (v1)

- **Core loop:** create game → request spot → approve / decline → approved = confirmed. No payments, no second confirmation step.
- **Users:** organizer (hero), player, venue owner (listings only).
- **Two surfaces, one app:** `/app` (player + organizer) and `/venue` (venue owner).
- **8 sports** — football, basketball, tennis, volleyball, padel, running, gym/fitness, swimming. Azerbaijan-wide, English (v1).

Full scope, personas, and domain model: [`docs/context/product.md`](docs/context/product.md).

## Stack

Next.js (one app, two route groups) · TypeScript · Tailwind + shadcn/ui · Supabase (Postgres + Auth) · Drizzle ORM (SQL migrations = schema source of truth) · Vercel · GitHub Actions · Terraform (HCP state) · Vitest + Playwright.

Architecture is **portable seams** — every vendor touchpoint sits behind an adapter implementing our own interface, so the managed stack can be swapped later without a rewrite. See [`docs/context/architecture.md`](docs/context/architecture.md).

## Repository layout

```
CLAUDE.md          # project memory for Claude Code; @-imports the load-bearing context
docs/
  context/         # REFERENCE — what & why (synced one-way from the brainstorm vault)
    product.md  decisions.md  architecture.md  design-system.md  glossary.md
    design/        # SQUAD design system: DESIGN.md, brand-spec.md, design-system.html, assets/
  plans/           # EXECUTABLE — how; run once, in order
    01-app-skeleton.md  02-ci-pipeline.md  03-terraform-iac.md  04-deploy-rollback.md
src/ …             # created by executing the plans
```

- **`docs/context/`** is long-lived reference. `CLAUDE.md` `@`-imports the load-bearing files so every Claude Code session starts grounded.
- **`docs/plans/`** are run-once build instructions, not reference — don't import them into `CLAUDE.md`.

## Getting started

The foundation isn't built yet. To stand it up, execute the plans **in order**, with a review checkpoint after each (Claude Code's plan-execution workflow):

1. [`docs/plans/01-app-skeleton.md`](docs/plans/01-app-skeleton.md) — Next.js app, portable seams, typed config, Dockerfile
2. [`docs/plans/02-ci-pipeline.md`](docs/plans/02-ci-pipeline.md) — CI gates (lint, test, security scan, build, E2E)
3. [`docs/plans/03-terraform-iac.md`](docs/plans/03-terraform-iac.md) — dev / staging / prod environments
4. [`docs/plans/04-deploy-rollback.md`](docs/plans/04-deploy-rollback.md) — deploy + health-gated rollback

The plans are cross-checked against each other (env keys, CI-job ↔ branch-protection names, the deploy/health contract). Once a plan is executed, the code is the source of truth — move the plan to `docs/plans/done/`.

After the skeleton lands, the intended scripts (confirm against `package.json`):

```bash
npm run dev          # local dev server
npm run lint         # ESLint + Prettier
npm run typecheck    # tsc --noEmit
npm test             # Vitest (unit/integration on an ephemeral Postgres)
npm run test:e2e     # Playwright core-loop smoke
npm run db:migrate   # apply SQL migrations
```

## Design system

**SQUAD** — dark-first cool slate, one brand color (SQUAD red `#EE4721`) used at most twice per screen, italic Inter Tight display, functional sport-state colors (live / slot / win / loss). Canonical files in [`docs/context/design/`](docs/context/design/) (`DESIGN.md` = tokens + spec, `design-system.html` = component reference). Summary + integration notes: [`docs/context/design-system.md`](docs/context/design-system.md).

> The design system is a superset athletic-product system; v1 ships only the subset the product scope allows (no payments, scores, leaderboards, teams, or live-match). A component existing in the system is not permission to ship that feature.

## Working with this repo

Read [`CLAUDE.md`](CLAUDE.md) first — it carries the stack, the seam rules, the conventions, the v1 scope guardrails, and the open questions an agent must not decide alone.

## Source of truth & sync

Product, research, and decisions live upstream in a separate **brainstorm vault**; this repo consumes a distilled, read-only slice in `docs/context/`. Direction is **one-way**: change a decision in the vault, then refresh the affected `docs/context/` file (context files are distilled — regenerate, don't blind-copy). Don't make product or architecture decisions here.
