---
title: App Foundation Plan — Portable Seams (Approach A)
type: design-spec
status: draft-for-review
date: 2026-05-29
phase: Phase 1 implementation planning
scope: Separate app repository (NOT this brainstorm vault)
tags:
  - sport-app/output
  - sport-app/foundation
  - sport-app/devops
---

# App Foundation Plan — Portable Seams (Approach A)

## 1. Context & Goal

This is the foundation / DevOps design for the **sport app's separate code repository**. It is a handoff artifact: this brainstorm vault stays the product/research source of truth, and this plan is implemented in the new app repo.

- **Driver:** future-proof for scale/team. v1 ships on managed platforms, but the foundation must not require a rewrite when a team and real load arrive.
- **Constraints (locked earlier):** solo founder + AI-assisted; optimize for fast/cheap validation; responsive web; one Next.js app with two route groups (`/app` client, `/venue` venue owner); Supabase + Vercel proposed as the managed platforms.
- **Strategy:** _portable seams._ Build on managed infra now; place clean abstractions so a later move to containers/cloud-native is a migration measured in days, not a rewrite.
- **Boundary:** this plans the separate app repo. Do **not** add app scaffolding to this brainstorm vault.

This design deliberately **right-sizes** the original enterprise-grade request (blue-green/canary, container orchestration, multi-env IaC, secrets management). Most of that is delivered through managed-platform features now, with a documented upgrade path to the heavy version later. See §9 for what is intentionally deferred.

## 2. Guiding Principle: The Seam Rule

**App code never imports a vendor SDK directly.** Each vendor touchpoint lives behind _one_ adapter module implementing _our_ interface. A vendor swap then touches one file, not the codebase.

Every concern is one of:

- **Abstracted** — load-bearing, hidden behind our interface (compute, database, auth, storage, config).
- **Commodity** — swappable by configuration (CI runner, provisioning provider).

Vendor-specific features (e.g., Supabase RLS, Vercel edge middleware) may be used, but must **never be load-bearing** — the app must remain correct without them.

## 3. Seam Map

| Concern                    | v1 (now)                                         | The seam                                                                                            | Swap to later                      |
| -------------------------- | ------------------------------------------------ | --------------------------------------------------------------------------------------------------- | ---------------------------------- |
| Compute / hosting          | Vercel                                           | `Dockerfile` + plain Next.js (no Vercel-only APIs in app code)                                      | Cloud Run, Fly, ECS, K8s           |
| Database                   | Supabase Postgres                                | Connection string + **Drizzle ORM** + SQL migrations                                                | RDS, Cloud SQL, self-hosted PG     |
| Auth                       | Supabase Auth                                    | `AuthProvider` interface + one adapter                                                              | Auth0, Cognito, Clerk, self-hosted |
| File storage _(if needed)_ | Supabase Storage                                 | `Storage` interface (S3-shaped); interface defined, adapter wired only when a feature needs uploads | S3, R2, GCS                        |
| Secrets / config           | Vercel + Supabase + GitHub env                   | Typed `config` module — single read point                                                           | Doppler, Vault, cloud SM           |
| CI                         | GitHub Actions                                   | Portable stages; vendor only in the deploy job                                                      | Same pipeline, new deploy target   |
| Provisioning               | Terraform (Vercel + Supabase + GitHub providers) | Modular TF + per-env vars                                                                           | Add AWS/GCP modules                |

The two highest-leverage future-proofing moves: the **`lib/` adapter boundary** (app logic stays vendor-agnostic) and the **`Dockerfile` built in CI from day one** (the app is a portable container long before one is needed).

## 4. Target Repo Layout (separate app repo)

```
src/
  app/(client)/…      # player + organizer surface
  app/(venue)/…       # venue-owner surface  (one Next.js app, two route groups)
  lib/
    config/           # typed env — the ONLY place env vars are read
    db/               # Drizzle schema + client (only module that knows it's Supabase)
    auth/             # AuthProvider interface + supabase adapter
    storage/          # Storage interface + adapter (wired only when uploads are needed)
migrations/           # SQL migrations = source of truth for schema
infra/terraform/
  modules/
    app/              # Vercel project + env vars + domain
    data/             # Supabase project settings (SSL enforce, network, RLS posture)
    repo/             # GitHub branch protection, required checks, environments + approval gate
    compute/          # SEAM: placeholder module + ADR for the future container-host path
  envs/
    dev/  staging/  prod/   # each calls the modules with its own vars
Dockerfile            # built in CI from day one, even while deploying to Vercel
.github/workflows/
  ci.yml              # secret scan · lint+typecheck · test · security scan · build+containerize · e2e
  deploy.yml          # staging → approval → prod (vendor-specific; the only vendor-aware workflow)
  rollback.yml        # manual dispatch + auto-triggered by failed health gate
```

## 5. CI/CD Pipeline

`ci.yml` is 100% portable (carries to any platform unchanged); only `deploy.yml` knows about Vercel.

### `ci.yml` — every PR and push

| Stage                   | Tooling (free, CI-agnostic)                                                                                            | Gate                          |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------- | ----------------------------- |
| 1. Secret scan          | `gitleaks` + GitHub push-protection                                                                                    | Block on any committed secret |
| 2. Lint + typecheck     | ESLint + Prettier + `tsc`                                                                                              | Block on error                |
| 3. Test                 | Vitest unit/integration against an **ephemeral Postgres service container** (also runs migrations → proves they apply) | Block on failure              |
| 4. Security scan        | `Semgrep OSS` (SAST) · `Trivy` (deps + IaC) · Dependabot (ongoing dep PRs)                                             | Block on high/critical        |
| 5. Build + containerize | Build Next.js → build Docker image → Trivy-scan image → push to **GHCR**, tagged by commit SHA                         | Block on image vuln           |
| 6. E2E smoke            | Playwright on the **core loop** (signup → create game → request → approve) against the PR preview URL                  | Block on failure              |

_Why build the container even though Vercel builds its own:_ it keeps the portability seam honest and tested — the day you leave Vercel, you already have a working, scanned image.

### `deploy.yml` — promotion flow

```
merge to main → [ci.yml gates pass]
  → deploy to STAGING (Vercel staging project + Supabase staging)
  → smoke test staging
  → ⏸ manual approval  (GitHub Environments protection)   [kept; relax to auto for solo speed if desired]
  → deploy to PRODUCTION  (atomic alias swap)
  → post-deploy health gate (/api/health + 1 core-loop check)
       └─ on failure → auto-trigger rollback.yml
```

### Deployment strategy & rollback

- **Blue-green is native:** Vercel deploys atomically (new build goes live by instant alias swap; old build stays warm). No infra needed.
- **Canary (% traffic shifting) is deferred** to the container-host phase (Argo Rollouts / Flagger). Premature before there is traffic to split.
- **Automated rollback:** every prior deployment is retained. `rollback.yml` (manual dispatch **and** auto-triggered by the failed health gate) re-promotes the last-known-good deployment. The pattern — _health-check → promote-previous-on-failure_ — is platform-agnostic and carries to the container-host phase unchanged.

## 6. Infrastructure as Code

Terraform, structured so **parity is guaranteed by construction**: all three environments instantiate the _same module_ with different variables.

| Deliverable (original ask)                  | v1 reality on Approach A                                                                                                                                                                                                                                                                                 |
| ------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Environment provisioning (dev/staging/prod) | Terraform via Vercel + Supabase + GitHub providers. Three envs = same module, different vars → parity by construction. **DB schema is not in TF** — it is owned by `migrations/` (TF = infra, migrations = schema).                                                                                      |
| Container orchestration setup               | **Intentionally deferred** (the point of Approach A). Ship the `Dockerfile` + `modules/compute/` placeholder + an ADR documenting the Cloud Run / ECS / K8s path. Nothing stood up until serverless is outgrown.                                                                                         |
| Network & security config                   | Codified, not deferred: branch protection + required checks + prod approval gate (GitHub provider); Supabase SSL enforcement, allowed origins/CORS, RLS posture; security headers in `next.config`; **least-privilege scoped CI tokens** (deploy tokens as GitHub Actions secrets, not personal tokens). |

**State management:** remote state with locking from day one (team-ready) via **HCP Terraform free tier** — no backend infra to run. Alternative: S3-compatible bucket backend (e.g., Cloudflare R2).

## 7. Environment Configuration

### `lib/config/` — single source of truth

Every env var is declared in one **Zod schema** and validated at boot. App code imports `config.<x>`, never `process.env`. The app **refuses to start** if a required var is missing or malformed (fail-fast). Moving to Doppler/Vault later changes only this module's loader.

### Config in three tiers, by sensitivity

| Tier                | Examples                            | Where it lives                                                                                                          |
| ------------------- | ----------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Public / build-time | `NEXT_PUBLIC_*`, feature flags      | Committed per-env defaults + `.env.example`                                                                             |
| Secrets / runtime   | DB URL, service keys, deploy tokens | Local: `.env.local` (gitignored) · CI: GitHub Actions secrets (scoped) · staging/prod: Vercel + Supabase per-env stores |
| The seam            | —                                   | Documented path to a dedicated secrets manager (Doppler/Vault/cloud SM) for when the team grows                         |

### Secrets management

- **`.env.example` is the contract** — every var documented (purpose, secret?, which envs); the Zod schema mirrors it one-to-one.
- Per-env values are set **through Terraform** (`modules/app`) → env vars are versioned IaC, not dashboard-clicked.
- **Least-privilege everywhere:** CI uses deploy-scoped tokens, never owner PATs. Service-role keys never reach the client (only anon / `NEXT_PUBLIC_` client-side).
- `gitleaks` + push protection stop secrets at commit time. A short **rotation runbook** documents how to rotate each credential.
- **Secrets manager stays a documented seam** in v1 (YAGNI); wiring Doppler/Vault is the team-growth upgrade.

### Multi-environment parity — enforced, not hoped-for

- **Infra parity:** same Terraform module across dev/staging/prod.
- **Config-shape parity:** same Zod schema in every env; a CI **parity-check job** diffs declared env keys across environments and fails if they diverge.
- **Data isolation:** a **separate Supabase project per environment** — no shared data across dev/staging/prod.
- **Local dev database:** **local Supabase via the Supabase CLI/Docker** — true prod-parity, works offline. (Falls back to a cloud dev project if local setup is impractical.)

## 8. Deliverables → Where They Land

Mapping the original three-part request to this design:

1. **CI/CD Pipeline** → §5. Security scanning (gitleaks, Semgrep, Trivy), automated testing (Vitest + Playwright), build/containerization (Docker → GHCR), deployment (Vercel atomic blue-green via `deploy.yml`), automated rollback (`rollback.yml` + health gate). Canary deferred (§9).
2. **Infrastructure as Code** → §6. Environment provisioning (Terraform, 3 envs, parity by construction), container orchestration (scaffolded seam, deferred), network/security config (codified).
3. **Environment Configuration** → §7. Secrets management (3 tiers + scoped tokens + rotation runbook), env-var management (typed Zod config + TF-managed values), multi-environment parity (same module + schema + CI parity check + per-env Supabase).

## 9. Explicitly Deferred (YAGNI now, seam ready)

Each is deferred because it would contradict validate-fast/cheap, **and** has a ready seam so adoption later is additive, not a rewrite:

- **Canary / progressive delivery** — seam: blue-green + health-gated rollback today; add Argo Rollouts/Flagger on a container host.
- **Container orchestration (K8s)** — seam: Dockerfile + `modules/compute/` placeholder + ADR.
- **Dedicated secrets manager** — seam: the `lib/config/` loader is the only swap point.
- **Multi-cloud / cloud provider IaC** — seam: modular Terraform; add provider modules.
- **`storage/` adapter** — seam: interface defined; adapter wired when a feature needs uploads.
- **Contended venue-slot booking (real-time, paid)** — v1 participation is approval-based, not slot-contention; seam: keep booking logic in one module (§11) so a Redis lock + `SELECT ... FOR UPDATE` and live propagation drop in locally. This is where the market blueprint's concurrency/geo/real-time machinery plugs in.
- **Admin / control-panel surface (3rd surface)** — v1 ships client + venue only; seam: the same route-group + shared-backend pattern adds a third surface without re-architecting.

## 10. Decisions Locked in This Design

- Approach A (portable seams) over B (container-first) and C (cloud-native now).
- ORM: **Drizzle**. Schema source of truth: **SQL migrations** (not Terraform, not dashboard).
- CI: **GitHub Actions**, portable stages + isolated deploy job.
- Security tooling: gitleaks, Semgrep OSS, Trivy, Dependabot.
- Testing: Vitest (unit/integration, PG service container) + Playwright (core-loop E2E, blocking in PR gate).
- Deployment: Vercel atomic blue-green; manual approval gate before prod (kept); health-gated automated rollback.
- IaC: Terraform (Vercel + Supabase + GitHub providers); state on HCP Terraform free tier.
- Config: typed Zod module, fail-fast; secrets in platform stores; per-env values via Terraform.
- Environments: dev / staging / prod with a separate Supabase project each; local dev via Supabase CLI/Docker.
- Container orchestration and dedicated secrets manager: scaffolded seams, not stood up.

## 11. Refinements from Market-Pattern Review (2026-05-29)

Added after comparing this design against ingested market patterns (Booking Platform Architecture; full comparison in Foundation Plans vs Market Architecture). The review confirmed the design is well-aligned and correctly right-sized — these are cheap, design-time refinements, not corrections.

1. **Idempotent core-loop writes.** Enforce idempotency on the core-loop mutations (create game, request-to-join, approve) with DB unique constraints — e.g., a unique `(game_id, player_id)` membership and a natural-key guard on bookings. Kills double-tap / retry duplicates at any scale, without the blueprint's Redis idempotency gateway. Lives in `migrations/`.
2. **One booking/participation service module.** Keep all participation/booking write logic behind a single domain module (e.g., `lib/booking/`), mirroring the vendor-seam discipline for the domain hot path. If contended venue-slot booking (with payments) ever enters scope, the concurrency upgrade (Redis lock + `SELECT ... FOR UPDATE`) is a localized change, not a refactor. See Double-Booking Prevention.
3. **Two deferrals named** (added to §9): the admin/control-panel surface and contended venue-slot booking — the exact points where the blueprint's concurrency, geospatial (Geospatial Discovery), and real-time pieces would later plug in.

Explicitly **not** adopted now: Redis, Kafka, PostGIS/H3, Go services, microservices, native mobile, payments — the blueprint itself defers these until traffic demands them, consistent with validate-fast/cheap.

## Related

- Database Schema & Backend Design (`docs/context/db-schema-and-backend-design.md`) — the data-layer design (schema, indexing, RLS, API) that sits on this foundation
- Phase 1 MVP Build Spec
- Decision Log
- Non-Decisions
- Foundation Plans vs Market Architecture

## The design-system seam (Plan 06)

The SQUAD design system (v1.5, `docs/context/design/`) enters the app through one
seam: `scripts/sync-design-system.mjs` vendors the canonical CSS into
`src/styles/squad/` (fonts re-wired through `next/font/local`; Material Symbols
subsetted to `icon-inventory.txt`), `src/app/globals.css` maps role tokens into
Tailwind v4 (`@theme inline`, stock palette removed, dark variant on
`[data-theme="dark"]`), and `src/components/ui/` is the only place `sq-*` class
strings exist. Product↔design vocabulary (DB `football` ↔ CSS `soccer`, skill
tiers, status badges) reconciles in `src/lib/ui/mappings.ts` and nowhere else.
