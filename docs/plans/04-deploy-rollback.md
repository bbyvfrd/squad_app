# Foundation Plan 4 — Deploy & Rollback Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the promotion flow on top of Plans 1–3 — `deploy.yml` (CI-green → migrate + deploy to staging → smoke → manual approval → migrate + atomic deploy to production → post-deploy health gate) and `rollback.yml` (manual dispatch **and** auto-called on a failed prod health gate, re-promoting the last-known-good deployment) — with deploy secrets managed as Terraform-wired IaC.

**Architecture:** Two GitHub Actions workflows driven by the Vercel CLI. `deploy.yml` runs only after the `CI` workflow succeeds on `main` (`workflow_run`), deploys each environment to its own Vercel project, and uses the GitHub `production` environment (created in Plan 3) as the manual approval gate. `rollback.yml` is a reusable workflow (`workflow_call` + `workflow_dispatch`) that runs `vercel rollback`. Vercel's own Git auto-deploy is disabled so the gated CLI flow is the single source of deploys. Deploy secrets are written to GitHub by a new `envs/deploy-secrets` Terraform root that reads the per-env workspace outputs.

**Tech Stack:** GitHub Actions (`workflow_run`, reusable workflows, environment approval), Vercel CLI (`pull`/`build`/`deploy --prebuilt --prod`/`rollback`), Drizzle migrations, Playwright (staging smoke), Terraform (`integrations/github`, `hashicorp/tfe`).

---

## Plan Series Context

This is **Plan 4 of 4** — the final foundation plan — derived from `output/2026-05-29-app-foundation-portable-seams-design.md`:

1. Plan 1 (done): App skeleton + portable seams + local data layer → §2–4, §7.
2. Plan 2 (done): CI pipeline (`ci.yml`) → §5.
3. Plan 3 (done): IaC — Terraform modules + per-env roots + state + repo config + parity check → §6, §7.
4. **Plan 4 (this doc):** Deploy + rollback → §5 (promotion flow + deployment strategy + automated rollback) and §8.

After this plan the foundation is complete. **Next is application-feature work** (the `signup → create game → request → approve` core loop), at which point the documented seams light up: the full core-loop E2E (Plan 2's placeholder) and the post-deploy core-loop check (this plan's placeholder) get real assertions.

## Refinements & Decisions (read before starting)

1. **`deploy.yml` triggers on `workflow_run` after `CI` succeeds — not on raw `push`.** The design says "merge to main → [ci.yml gates pass] → deploy." `workflow_run: { workflows: ["CI"], types: [completed], branches: [main] }` with `if: github.event.workflow_run.conclusion == 'success'` is exactly that gate. Jobs check out `github.event.workflow_run.head_sha` (the merged commit).
2. **One Vercel project per environment, deployed with `--prod`, Git auto-deploy disabled.** Plan 3 created separate `squad-app-{dev,staging,prod}` Vercel projects (data isolation). Each is deployed to its _own_ production via the CLI; "blue-green / atomic alias swap" happens within each project (Vercel keeps the previous deployment warm). **Only the prod project is Git-linked** (Plan 3 sets `git_repo` for prod only), so the committed `vercel.json` (`deploymentEnabled.main=false`) and PR previews apply there; dev/staging are CLI-deploy-only — which also avoids the same repo spawning duplicate preview deploys across three projects.
3. **Deploy secrets are repo-level, named per environment.** The `production` GitHub _environment_ is used purely as the approval gate; secrets are repo-level (`VERCEL_PROJECT_ID_STAGING`/`_PROD`, etc.). This decouples the gate from secret scoping and avoids an approval deadlock on `rollback` (auto-rollback must run without waiting for a human). Environment-scoped secrets are noted as a later hardening.
4. **Migrations are forward-only and run before each deploy; rollback reverts the app, not the schema.** `drizzle-kit migrate` runs against the target env's Supabase (session-pooler URL) before the Vercel deploy. `vercel rollback` reverts the running app to the previous deployment; it does **not** revert migrations. Keep migrations backward-compatible (expand/contract) — this is called out in the runbook.
5. **`dev` is provisioned but not in the promotion flow.** `deploy.yml` promotes `staging → production`. The `dev` Vercel/Supabase project (Plan 3) is the cloud-dev fallback from §7; it is not auto-deployed.
6. **Smoke/health checks hit the stable production domains, never the `vercel deploy` stdout URL.** Standard Protection (on by default for new projects) 401s generated deployment URLs but leaves production domains — incl. the auto-assigned `squad-app-staging.vercel.app` / `squad-app-prod.vercel.app` — public. Two repo **variables**, `STAGING_URL` and `PROD_URL` (Terraform-managed in Task 3), carry those URLs; `vercel deploy --prod` aliases the production domain as part of the deploy, so the domain serves the new deployment when the smoke runs.
7. **Migrations connect through the Supavisor session pooler (port 5432) — not the direct DB host and not the transaction pooler.** The direct `db.<ref>.supabase.co` host is IPv6-only by default and GitHub-hosted runners have no IPv6 egress; the transaction pooler (6543) rejects the prepared statements drizzle-kit's driver uses. The `database_session_url` output (Task 1) derives the session URL from the transaction URL by port swap when the provider exposes no `"session"` key.
8. **Every deploy verifies migrations actually applied.** `drizzle-kit migrate` can roll back a failed batch and still exit 0 (observed in this repo — see `migrations/0002_*.sql` ordering note), which would otherwise ship an app against an un-migrated schema. `scripts/verify-migrations.mjs` (Task 5) compares `migrations/meta/_journal.json` against the DB's `drizzle.__drizzle_migrations` after each migrate step and fails the job on mismatch.
9. **Workflow tooling versions mirror `ci.yml`** (`actions/checkout@v6`, `pnpm/action-setup@v6`, `actions/setup-node@v6`, Node 20) — one proven set across all workflows. Aligning Node with the `node:24` Dockerfile is a separate, all-workflows change (out of scope here).

## Staying Current With Context7 / docs (per project directive)

Re-verified 2026-06-10 against live vercel.com/docs pages and the provider binaries pinned in this repo's `.terraform/` trees:

- **Vercel CLI** — CI flow `vercel pull --yes --environment=production` → `vercel build --prod` → `vercel deploy --prebuilt --prod` is current. Setting `VERCEL_ORG_ID` + `VERCEL_PROJECT_ID` env vars skips project linking (no `vercel link`). **`VERCEL_TOKEN` as an env var is now supported and recommended over `--token` in CI** (keeps the token out of process lists) — the workflows below rely on the job-level `env:` only. `vercel deploy` prints the **unique deployment URL** on stdout; `vercel rollback` with **no argument** rolls back to the previous production deployment (`--yes` is *not* documented for rollback — don't pass it).
- **Vercel Deployment Protection** — new projects default to Standard Protection (`standard_protection_new` is the provider default in `vercel/vercel` 4.8.2): **generated deployment URLs (incl. the one `vercel deploy` prints) require auth (401 for curl/Playwright); production domains — including the auto-assigned `<project>.vercel.app` — stay public.** Smoke/health checks therefore target the stable production domains (`vars.STAGING_URL` / `vars.PROD_URL`), never the stdout URL. Fallback if a protected URL must ever be tested: the `x-vercel-protection-bypass` header with a project bypass secret.
- **GitHub Actions** — reusable workflow via `on: workflow_call` (with `inputs`/`secrets`), called from a job with `uses:` + `secrets: inherit`; manual approval via job-level `environment:` with required reviewers. Action versions below mirror the proven set in `ci.yml` (`actions/checkout@v6`, `pnpm/action-setup@v6`, `actions/setup-node@v6`, Node 20).
- **`integrations/github` v6 (binary v6.12.1 verified)** — `github_actions_secret` takes **`plaintext_value`** (NOT `value`; validate fails otherwise); `github_actions_variable` takes `value`.
- **`supabase/supabase` v1.9.1 (binary verified)** — `supabase_pooler.url` is a "map of pooler mode to connection string"; default projects typically expose only the `"transaction"` key, so the session URL is derived by port swap (6543 → 5432, same host/credentials). **After the first apply, confirm the actual keys** (`terraform console` → `data.supabase_pooler.this.url`).
- **`hashicorp/tfe`** — `data "tfe_outputs" { organization, workspace }` with accessor `data.tfe_outputs.<x>.values.<output>` (all values come back **sensitive**; fine for secrets). Auth: provider `token` → `TFE_TOKEN` env → `terraform login` credentials. *Live registry check was unavailable on 2026-06-10* — **before applying Task 3, confirm the latest 0.x version and that no 1.0 exists** (`~> 0.60` = `>= 0.60, < 1.0`).

## Boundary & Prerequisites

- **Runs in the app repo (Plans 1–3), not the vault.**
- **Plans 1–3 must be applied:** CI is green on `main`; Terraform `envs/repo` (branch protection + the `staging`/`production` environments) and `envs/{dev,staging,prod}` (Supabase + Vercel projects) are applied.
- **`main` is protected (Plan 3): no direct pushes.** Every change in this plan lands via a PR that passes the 9 required checks; the PR _merge_ is the push-to-`main` that triggers `deploy.yml`. (The per-task `git commit`s below are local — push a branch and open a PR to land them.)
- **Credentials:** the Plan 3 set, plus a **Vercel token** and your **Vercel org id** (`VERCEL_ORG_ID`). Get the org id: `vercel teams ls` / project settings. For the TF deploy-secrets root, a **TFE token** (`TFE_TOKEN`) to read workspace outputs.
- **⚠️ This plan deploys to real environments.** YAML authoring + `terraform validate` are offline; the actual deploy/rollback (Task 8) is outward-facing and credential-gated — confirm the target Vercel projects before pushing to `main`.

## File Structure (created/modified by this plan)

| File                                                 | Responsibility                                                                                         |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `.github/workflows/deploy.yml`                       | Promotion flow: staging → approval → production + post-deploy health gate (created across Tasks 5, 7)  |
| `.github/workflows/rollback.yml`                     | Reusable + manual rollback via `vercel rollback`                                                       |
| `vercel.json`                                        | Disable Vercel Git auto-deploy on `main`                                                               |
| `scripts/verify-migrations.mjs`                      | Post-migrate guard: journal vs `drizzle.__drizzle_migrations` (created in Task 5)                      |
| `infra/terraform/modules/data/outputs.tf`            | Add `database_session_url` output (modify)                                                             |
| `infra/terraform/envs/{dev,staging,prod}/outputs.tf` | Expose `vercel_project_id` + `database_session_url` (create)                                           |
| `infra/terraform/envs/deploy-secrets/*`              | New root: read env outputs via `tfe_outputs`, write GitHub deploy secrets + URL variables              |
| `playwright.config.ts`                               | Allow targeting a deployed URL via `PLAYWRIGHT_BASE_URL` (modify; keep the `/api/health` ready-probe)  |
| `infra/terraform/README.md` + `README.md`            | Deploy/rollback runbook (modify)                                                                       |

**Canonical names (do not rename):**

- Workflows: `deploy.yml` (`name: Deploy`), `rollback.yml` (`name: Rollback`). Caller of CI: the `CI` workflow name from Plan 2.
- Jobs: `staging`, `production`, `rollback` (in `deploy.yml`); `rollback-production` (in `rollback.yml`).
- Deploy secrets (GitHub Actions, repo-level): `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID_STAGING`, `VERCEL_PROJECT_ID_PROD`, `MIGRATION_DATABASE_URL_STAGING`, `MIGRATION_DATABASE_URL_PROD`. Repo **variables**: `STAGING_URL`, `PROD_URL` (stable production domains, used by smoke + health checks).
- New TF root/workspace: `envs/deploy-secrets` / `squad-app-deploy-secrets` (matches the existing `squad-app-{repo,dev,staging,prod}` workspaces; GitHub repo is `bbyvfrd/squad_app`).

---

## Task 1: Expose the Terraform outputs the deploy flow needs

`deploy.yml` needs each env's Vercel project id and a migration-capable DB URL. Surface them as workspace outputs so Task 3 can read them.

**Files:**

- Modify: `infra/terraform/modules/data/outputs.tf`
- Create: `infra/terraform/envs/dev/outputs.tf`, `infra/terraform/envs/staging/outputs.tf`, `infra/terraform/envs/prod/outputs.tf`

- [ ] **Step 1: Add a session-pooler URL output to the data module**

Append to `infra/terraform/modules/data/outputs.tf`:

```hcl
output "database_session_url" {
  # Migrations need a session-mode connection: the transaction pooler (6543)
  # rejects the prepared statements drizzle-kit's driver uses, and the DIRECT
  # db.<ref>.supabase.co host is IPv6-only by default — unreachable from
  # GitHub-hosted runners (no IPv6 egress). Supavisor serves session mode on
  # the SAME pooler host at port 5432, so when the provider's `url` map has no
  # "session" key (default projects expose only "transaction"), derive it by
  # port swap. After the first apply, confirm the real keys:
  #   terraform console → data.supabase_pooler.this.url
  value = try(
    data.supabase_pooler.this.url["session"],
    replace(data.supabase_pooler.this.url["transaction"], ":6543/", ":5432/")
  )
  sensitive   = true
  description = "Session-mode pooled connection string (DDL-capable, for migrations)."
}
```

- [ ] **Step 2: Add identical root outputs to all three envs (parity preserved)**

Create the **same** file at `infra/terraform/envs/dev/outputs.tf`, `infra/terraform/envs/staging/outputs.tf`, and `infra/terraform/envs/prod/outputs.tf`:

```hcl
output "vercel_project_id" {
  value = module.app.project_id
}

output "database_session_url" {
  value     = module.data.database_session_url
  sensitive = true
}
```

- [ ] **Step 3: Validate the changed module and envs (offline)**

Run:

```bash
for dir in modules/data envs/dev envs/staging envs/prod; do
  ( cd "infra/terraform/$dir" && terraform fmt && terraform init -backend=false && terraform validate ); done
diff infra/terraform/envs/dev/outputs.tf infra/terraform/envs/staging/outputs.tf && \
diff infra/terraform/envs/dev/outputs.tf infra/terraform/envs/prod/outputs.tf && echo "outputs-parity-ok"
```

Expected: each validates "Success!"; both `diff`s are empty and print `outputs-parity-ok`.

- [ ] **Step 4: Commit**

```bash
git add infra/terraform/modules/data/outputs.tf infra/terraform/envs/*/outputs.tf
git commit -m "feat(infra): expose vercel_project_id and session DB URL per env"
```

---

## Task 2: Disable Vercel Git auto-deploy on `main`

**Files:**

- Create: `vercel.json`

- [ ] **Step 1: Create `vercel.json`**

Create `vercel.json` at the repo root (CLI deploys are unaffected; this only stops Vercel's automatic build-on-push for `main`, so the gated workflow is the sole deploy path):

```json
{
  "git": {
    "deploymentEnabled": {
      "main": false
    }
  }
}
```

> Note: `vercel pull` (Tasks 5/7) writes a local `.vercel/` directory — create-next-app's `.gitignore` already ignores it; confirm `.vercel` is listed.

- [ ] **Step 2: Validate the JSON**

Run: `node -e "JSON.parse(require('fs').readFileSync('vercel.json','utf8')); console.log('json-ok')"`
Expected: prints `json-ok`.

- [ ] **Step 3: Commit**

```bash
git add vercel.json
git commit -m "chore: disable Vercel git auto-deploy on main (CLI-driven deploys)"
```

---

## Task 3: `envs/deploy-secrets` — Terraform-managed deploy secrets

A dedicated root that reads the staging/prod workspace outputs and writes the GitHub Actions deploy secrets. Applied **last** (after staging/prod exist).

> **Simpler solo alternative:** instead of this root, set the six secrets + `STAGING_URL`/`PROD_URL` variables once with `gh secret set` / `gh variable set` (values from `terraform output`). The workflows are identical either way. The Terraform route keeps them versioned IaC (§7).

**Files:**

- Create: `infra/terraform/envs/deploy-secrets/{backend,providers,variables,main}.tf` + `terraform.tfvars`

- [ ] **Step 1: Backend + providers**

Create `infra/terraform/envs/deploy-secrets/backend.tf`:

```hcl
terraform {
  required_version = ">= 1.7"
  cloud {
    organization = "REPLACE_WITH_HCP_ORG"
    workspaces {
      name = "squad-app-deploy-secrets"
    }
  }
}
```

(`REPLACE_WITH_HCP_ORG` is the repo's committed-placeholder convention — filled locally before apply, per `infra/terraform/README.md`.)

Create `infra/terraform/envs/deploy-secrets/providers.tf` (confirm the latest `hashicorp/tfe` 0.x via the registry first — see the verification note above):

```hcl
terraform {
  required_providers {
    github = {
      source  = "integrations/github"
      version = "~> 6.0"
    }
    tfe = {
      source  = "hashicorp/tfe"
      version = "~> 0.60"
    }
  }
}

provider "github" {
  owner = var.github_owner
  token = var.github_token
}

# Reads TFE_TOKEN from the environment.
provider "tfe" {
  organization = var.hcp_organization
}
```

- [ ] **Step 2: Variables**

Create `infra/terraform/envs/deploy-secrets/variables.tf` (`vercel_api_token` matches the existing `TF_VAR_vercel_api_token` convention from Plan 3 — no new env var to learn):

```hcl
variable "hcp_organization" { type = string }
variable "github_owner" { type = string }
variable "github_repository" { type = string }
variable "github_token" {
  type      = string
  sensitive = true
}
variable "vercel_api_token" {
  type      = string
  sensitive = true
}
variable "vercel_org_id" { type = string }
variable "staging_url" {
  type        = string
  description = "Public production domain of the staging Vercel project (smoke target)."
}
variable "prod_url" {
  type        = string
  description = "Public production domain of the prod Vercel project (health-gate target)."
}
```

- [ ] **Step 3: Read env outputs and write the secrets**

Create `infra/terraform/envs/deploy-secrets/main.tf`:

```hcl
# All tfe_outputs values come back marked sensitive — fine here, every
# consumer below is a secret. (Accessor verified: .values.<output_name>.)
data "tfe_outputs" "staging" {
  organization = var.hcp_organization
  workspace    = "squad-app-staging"
}

data "tfe_outputs" "prod" {
  organization = var.hcp_organization
  workspace    = "squad-app-prod"
}

# NOTE: github_actions_secret takes `plaintext_value` (NOT `value`) in
# integrations/github v6 — the provider encrypts it against the repo public key.

# Account-level, shared across environments.
resource "github_actions_secret" "vercel_token" {
  repository      = var.github_repository
  secret_name     = "VERCEL_TOKEN"
  plaintext_value = var.vercel_api_token
}

resource "github_actions_secret" "vercel_org_id" {
  repository      = var.github_repository
  secret_name     = "VERCEL_ORG_ID"
  plaintext_value = var.vercel_org_id
}

# Per-environment Vercel project ids.
resource "github_actions_secret" "vercel_project_staging" {
  repository      = var.github_repository
  secret_name     = "VERCEL_PROJECT_ID_STAGING"
  plaintext_value = data.tfe_outputs.staging.values.vercel_project_id
}

resource "github_actions_secret" "vercel_project_prod" {
  repository      = var.github_repository
  secret_name     = "VERCEL_PROJECT_ID_PROD"
  plaintext_value = data.tfe_outputs.prod.values.vercel_project_id
}

# Per-environment migration DB URLs (session pooler).
resource "github_actions_secret" "migration_db_staging" {
  repository      = var.github_repository
  secret_name     = "MIGRATION_DATABASE_URL_STAGING"
  plaintext_value = data.tfe_outputs.staging.values.database_session_url
}

resource "github_actions_secret" "migration_db_prod" {
  repository      = var.github_repository
  secret_name     = "MIGRATION_DATABASE_URL_PROD"
  plaintext_value = data.tfe_outputs.prod.values.database_session_url
}

# Smoke/health targets: the PUBLIC production domains (deployment URLs are
# auth-protected under Standard Protection). Plain repo variables, not secrets.
resource "github_actions_variable" "staging_url" {
  repository    = var.github_repository
  variable_name = "STAGING_URL"
  value         = var.staging_url
}

resource "github_actions_variable" "prod_url" {
  repository    = var.github_repository
  variable_name = "PROD_URL"
  value         = var.prod_url
}
```

- [ ] **Step 4: tfvars**

Create `infra/terraform/envs/deploy-secrets/terraform.tfvars` (non-secret values are committed per repo convention; tokens come from the environment: `TF_VAR_github_token`, `TF_VAR_vercel_api_token`, `TFE_TOKEN`):

```hcl
hcp_organization  = "REPLACE_WITH_HCP_ORG"
github_owner      = "bbyvfrd"
github_repository = "squad_app"
vercel_org_id     = "REPLACE_WITH_VERCEL_ORG_ID" # vercel teams ls / dashboard → settings

# Auto-assigned production domains stay public under Standard Protection.
# Swap prod_url for the real custom domain once one is attached.
staging_url = "https://squad-app-staging.vercel.app"
prod_url    = "https://squad-app-prod.vercel.app"
```

- [ ] **Step 5: Validate offline**

Run:

```bash
cd infra/terraform/envs/deploy-secrets
terraform fmt
terraform init -backend=false
terraform validate
cd -
```

Expected: providers install; `validate` prints "Success!". Validate catches two known traps: `github_actions_secret` rejecting a `value` argument (must be `plaintext_value`) and any change to the `data.tfe_outputs … .values` accessor.

- [ ] **Step 6: Commit**

```bash
git add infra/terraform/envs/deploy-secrets
git commit -m "feat(infra): add deploy-secrets root wiring TF outputs to GitHub secrets"
```

---

## Task 4: Let Playwright target a deployed URL

So `deploy.yml`'s staging smoke can run Plan 2's smoke specs against the live staging deployment.

**Files:**

- Modify: `playwright.config.ts`

- [ ] **Step 1: Replace `playwright.config.ts` to honor `PLAYWRIGHT_BASE_URL`**

Replace `playwright.config.ts` with (NOTE: this preserves the existing `/api/health` ready-probe and its comment — the current config probes the health route because `/` has no page in v1 and would never report ready; do not regress it to `/`):

```ts
import { defineConfig, devices } from "@playwright/test";

// When PLAYWRIGHT_BASE_URL is set (deploy.yml smoke), target that deployment
// and skip the local webServer. Unset (local dev / ci.yml), boot `pnpm start`.
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3000";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: "html",
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: process.env.PLAYWRIGHT_BASE_URL
    ? undefined
    : {
        command: "pnpm start",
        // Probe the health route, not `/`: there is no root page in v1 (only /app and /venue),
        // so `/` returns 404 and Playwright would never see a ready (2xx/3xx) response. `pnpm start`
        // (next start) auto-loads .env.local, so the health route reports db-up.
        url: "http://127.0.0.1:3000/api/health",
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
});
```

- [ ] **Step 2: Verify the local path still works**

Run (local Supabase running, schema applied, per Plan 2):

```bash
pnpm build && pnpm test:e2e
```

Expected: 3 passed (the `webServer` path is unchanged when `PLAYWRIGHT_BASE_URL` is unset).

- [ ] **Step 3: Verify the remote path is wired (against any reachable URL)**

Run: `PLAYWRIGHT_BASE_URL=https://example.com pnpm exec playwright test --list`
Expected: lists the 3 tests and does **not** try to start a local server (no `pnpm start`). (A full run against a real staging URL happens in CI.)

- [ ] **Step 4: Commit**

```bash
git add playwright.config.ts
git commit -m "test: allow Playwright to target a deployed URL via PLAYWRIGHT_BASE_URL"
```

---

## Task 5: migration guard + `deploy.yml` staging job

**Files:**

- Create: `scripts/verify-migrations.mjs`
- Create: `.github/workflows/deploy.yml`

- [ ] **Step 1: Create `scripts/verify-migrations.mjs`**

Why: `drizzle-kit migrate` can roll back a failed batch and still exit 0 — observed in this repo (see the ordering note at the top of `migrations/0002_drop_player_organizer_flags.sql`). Without this guard a deploy can ship an app against an un-migrated schema. Uses the `postgres` package already in `dependencies`.

Create `scripts/verify-migrations.mjs`:

```js
// Deploy guard: `drizzle-kit migrate` can roll back a failed batch and still
// exit 0 (no error output, nothing applied). Compare the committed journal
// against the DB's drizzle migrations table so a deploy never proceeds on an
// un-migrated schema. Run with DATABASE_URL set, after `drizzle-kit migrate`.
import { readFileSync } from "node:fs";
import postgres from "postgres";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("verify-migrations: DATABASE_URL is not set");
  process.exit(1);
}

const journal = JSON.parse(readFileSync("migrations/meta/_journal.json", "utf8"));
const expected = journal.entries.length;

const sql = postgres(url, { max: 1, prepare: false });
try {
  const [{ count }] =
    await sql`select count(*)::int as count from drizzle.__drizzle_migrations`;
  // "<" not "!==": a DB ahead of the journal (e.g. after a squash) is safe.
  if (count < expected) {
    console.error(
      `verify-migrations: FAILED — journal has ${expected} entries, database has ${count}`,
    );
    process.exit(1);
  }
  console.log(`verify-migrations: ok (${count} applied, ${expected} expected)`);
} finally {
  await sql.end();
}
```

- [ ] **Step 2: Verify the guard against the local database**

Run (local Supabase running with migrations applied, per Plan 1/2 dev setup):

```bash
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres node scripts/verify-migrations.mjs
```

Expected: `verify-migrations: ok (5 applied, 5 expected)` (count = entries in `migrations/meta/_journal.json`; grows with future migrations).

- [ ] **Step 3: Create `deploy.yml` with the workflow header and the staging job**

Create `.github/workflows/deploy.yml` (action versions and Node mirror `ci.yml`; the Vercel CLI authenticates via the job-level `VERCEL_TOKEN`/`VERCEL_ORG_ID`/`VERCEL_PROJECT_ID` env vars — no `vercel link`, no `--token` on command lines):

```yaml
name: Deploy

# Run only after the CI workflow succeeds on main (the "ci gates pass" gate).
on:
  workflow_run:
    workflows: ["CI"]
    types: [completed]
    branches: [main]

# Never cancel an in-flight production deploy.
concurrency:
  group: deploy-production
  cancel-in-progress: false

permissions:
  contents: read

jobs:
  staging:
    if: ${{ github.event.workflow_run.conclusion == 'success' }}
    runs-on: ubuntu-latest
    environment: staging
    env:
      VERCEL_TOKEN: ${{ secrets.VERCEL_TOKEN }}
      VERCEL_ORG_ID: ${{ secrets.VERCEL_ORG_ID }}
      VERCEL_PROJECT_ID: ${{ secrets.VERCEL_PROJECT_ID_STAGING }}
    steps:
      - uses: actions/checkout@v6
        with:
          ref: ${{ github.event.workflow_run.head_sha }}
      - uses: pnpm/action-setup@v6
      - uses: actions/setup-node@v6
        with:
          node-version: 20
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - name: Apply migrations (staging)
        run: pnpm exec drizzle-kit migrate
        env:
          DATABASE_URL: ${{ secrets.MIGRATION_DATABASE_URL_STAGING }}
      - name: Verify migrations applied (drizzle-kit can roll back silently)
        run: node scripts/verify-migrations.mjs
        env:
          DATABASE_URL: ${{ secrets.MIGRATION_DATABASE_URL_STAGING }}
      - name: Install Vercel CLI
        run: npm install -g vercel@latest
      # --environment=production pulls THIS project's production-target env config:
      # each env is its own Vercel project deployed to its own production (plan §2).
      - name: Pull staging env from Vercel
        run: vercel pull --yes --environment=production
      - name: Build
        run: vercel build --prod
      - name: Deploy to staging
        run: vercel deploy --prebuilt --prod
      - name: Install Playwright chromium
        run: pnpm exec playwright install --with-deps chromium
      # Target the stable production domain (vars.STAGING_URL): the unique URL
      # `vercel deploy` prints is auth-protected under Standard Protection (401).
      - name: Smoke test staging
        run: |
          if [ -z "$PLAYWRIGHT_BASE_URL" ]; then
            echo "STAGING_URL repo variable is not set — apply envs/deploy-secrets (Task 8) first"
            exit 1
          fi
          pnpm test:e2e
        env:
          PLAYWRIGHT_BASE_URL: ${{ vars.STAGING_URL }}
      - uses: actions/upload-artifact@v7
        if: ${{ !cancelled() }}
        with:
          name: playwright-report-staging
          path: playwright-report/
          retention-days: 7
```

- [ ] **Step 4: Validate the YAML**

Run: `python3 -c "import yaml; d=yaml.safe_load(open('.github/workflows/deploy.yml')); print('jobs:', sorted(d['jobs']))"`
Expected: `jobs: ['staging']`.

- [ ] **Step 5: Commit**

```bash
git add scripts/verify-migrations.mjs .github/workflows/deploy.yml
git commit -m "ci: add deploy.yml staging job (migrate, verify, deploy, smoke)"
```

---

## Task 6: `rollback.yml` — reusable + manual rollback

**Files:**

- Create: `.github/workflows/rollback.yml`

- [ ] **Step 1: Create `rollback.yml`**

Create `.github/workflows/rollback.yml`:

```yaml
name: Rollback

on:
  workflow_dispatch:
    inputs:
      reason:
        description: "Why are we rolling back?"
        required: false
        default: "manual rollback"
  workflow_call:
    inputs:
      reason:
        type: string
        required: false
        default: "auto rollback"

permissions:
  contents: read

jobs:
  rollback-production:
    runs-on: ubuntu-latest
    env:
      VERCEL_TOKEN: ${{ secrets.VERCEL_TOKEN }}
      VERCEL_ORG_ID: ${{ secrets.VERCEL_ORG_ID }}
      VERCEL_PROJECT_ID: ${{ secrets.VERCEL_PROJECT_ID_PROD }}
    steps:
      - name: Log reason
        env:
          REASON: ${{ inputs.reason }}
        # Block scalar: the message contains ": ", which YAML forbids in a plain scalar.
        run: |
          echo "Rolling back production — reason: $REASON"
      - name: Install Vercel CLI
        run: npm install -g vercel@latest
      # No deployment argument = roll back to the previous production deployment.
      # (No --yes: rollback has no project-setup prompt; --yes is not documented for it.)
      - name: Roll back to the previous production deployment
        run: vercel rollback
      - name: Verify production health after rollback
        run: |
          for i in $(seq 1 5); do
            if curl -fsS "${{ vars.PROD_URL }}/api/health" | grep -q '"status":"ok"'; then
              echo "production healthy after rollback"; exit 0
            fi
            echo "attempt $i: not healthy yet"; sleep 10
          done
          echo "post-rollback health check FAILED"; exit 1
```

- [ ] **Step 2: Validate the YAML and confirm both triggers are present**

Run:

```bash
python3 -c "import yaml; d=yaml.safe_load(open('.github/workflows/rollback.yml')); print('triggers:', sorted(d[True].keys()))"
```

Expected: `triggers: ['workflow_call', 'workflow_dispatch']` (PyYAML parses the `on:` key as the boolean `True`).

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/rollback.yml
git commit -m "ci: add rollback.yml (reusable + manual vercel rollback)"
```

---

## Task 7: `deploy.yml` — production job + auto-rollback

**Files:**

- Modify: `.github/workflows/deploy.yml`

- [ ] **Step 1: Add the `production` job under `jobs:` in `.github/workflows/deploy.yml`**

Append (the `environment: production` line is the manual approval gate — reviewers come from Plan 3's `github_repository_environment.production`):

```yaml
production:
  needs: staging
  runs-on: ubuntu-latest
  environment: production
  env:
    VERCEL_TOKEN: ${{ secrets.VERCEL_TOKEN }}
    VERCEL_ORG_ID: ${{ secrets.VERCEL_ORG_ID }}
    VERCEL_PROJECT_ID: ${{ secrets.VERCEL_PROJECT_ID_PROD }}
  steps:
    - uses: actions/checkout@v6
      with:
        ref: ${{ github.event.workflow_run.head_sha }}
    - uses: pnpm/action-setup@v6
    - uses: actions/setup-node@v6
      with:
        node-version: 20
        cache: pnpm
    - run: pnpm install --frozen-lockfile
    - name: Apply migrations (production)
      run: pnpm exec drizzle-kit migrate
      env:
        DATABASE_URL: ${{ secrets.MIGRATION_DATABASE_URL_PROD }}
    - name: Verify migrations applied (drizzle-kit can roll back silently)
      run: node scripts/verify-migrations.mjs
      env:
        DATABASE_URL: ${{ secrets.MIGRATION_DATABASE_URL_PROD }}
    - name: Install Vercel CLI
      run: npm install -g vercel@latest
    - name: Pull production env from Vercel
      run: vercel pull --yes --environment=production
    - name: Build
      run: vercel build --prod
    - name: Deploy to production (atomic alias swap)
      run: vercel deploy --prebuilt --prod
    # vars.PROD_URL is the public production domain; the deployment URL the CLI
    # prints is auth-protected under Standard Protection — never health-check it.
    - name: Post-deploy health gate
      run: |
        for i in $(seq 1 5); do
          if curl -fsS "${{ vars.PROD_URL }}/api/health" | grep -q '"status":"ok"'; then
            echo "production health ok"; exit 0
          fi
          echo "attempt $i: not healthy yet"; sleep 10
        done
        echo "production health gate FAILED"; exit 1
```

> **Core-loop placeholder:** when the `signup → create game → request → approve` routes exist, add one core-loop assertion to the health gate (e.g. a Playwright run with `PLAYWRIGHT_BASE_URL=${{ vars.PROD_URL }}`), per §5's "/api/health + 1 core-loop check".

- [ ] **Step 2: Add the auto-rollback caller job (runs only if production failed)**

Append:

```yaml
rollback:
  needs: production
  if: failure() && needs.production.result == 'failure'
  uses: ./.github/workflows/rollback.yml
  secrets: inherit
  with:
    reason: "auto: production deploy/health gate failed for ${{ github.event.workflow_run.head_sha }}"
```

- [ ] **Step 3: Validate the assembled workflow**

Run:

```bash
python3 -c "import yaml; d=yaml.safe_load(open('.github/workflows/deploy.yml')); print('jobs:', sorted(d['jobs']))"
```

Expected: `jobs: ['production', 'rollback', 'staging']`.

- [ ] **Step 4: Commit**

```bash
git add .github/workflows/deploy.yml
git commit -m "ci: add production deploy with approval gate, health gate, and auto-rollback"
```

---

## Task 8: Apply, document, and verify end to end

**⚠️ Outward-facing and credential-gated.** Steps 1–2 are offline/setup; Steps 3+ deploy to real environments — confirm the targets first.

**Files:**

- Modify: `infra/terraform/README.md`, `README.md`

- [ ] **Step 1: Apply the deploy-secrets root (after dev/staging/prod are applied, BEFORE merging the PR)**

Ordering matters: `terraform apply` runs from your local working tree, so apply this root from the feature branch **before** the PR merges — otherwise the first `Deploy` run fires with no secrets/variables and fails. Prereqs: `envs/staging` + `envs/prod` applied (their workspaces must hold the Task 1 outputs — re-apply them first if they predate Task 1), placeholders filled per `infra/terraform/README.md`, and credentials exported (`TF_VAR_github_token`, `TF_VAR_vercel_api_token`, `TFE_TOKEN`, HCP auth).

```bash
terraform -chdir=infra/terraform/envs/deploy-secrets init
terraform -chdir=infra/terraform/envs/deploy-secrets apply
gh secret list
gh variable list
```

Expected: apply creates six secrets + two variables; `gh secret list` shows `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID_STAGING`, `VERCEL_PROJECT_ID_PROD`, `MIGRATION_DATABASE_URL_STAGING`, `MIGRATION_DATABASE_URL_PROD`; `gh variable list` shows `STAGING_URL` and `PROD_URL`. (Fallback without Terraform: `gh secret set` / `gh variable set` with values from `terraform -chdir=infra/terraform/envs/<env> output`.)

- [ ] **Step 2: Document the promotion + rollback flow**

Append to `README.md`:

```markdown
## Deploy & rollback

`deploy.yml` runs after CI succeeds on `main`:
staging (migrate → deploy → Playwright smoke) → **manual approval** (GitHub
`production` environment) → production (migrate → atomic deploy → health gate).
A failed production deploy/health gate auto-calls `rollback.yml`.

- Approve a production deploy: GitHub → the run → "Review deployments" → approve.
- Manual rollback: `gh workflow run rollback.yml -f reason="<why>"`.
- Migrations are forward-only; `vercel rollback` reverts the app, not the schema —
  keep migrations backward-compatible (expand/contract). Every deploy job runs
  `scripts/verify-migrations.mjs` after migrating (drizzle-kit can fail silently).
- Smoke/health checks target the stable production domains (`STAGING_URL`/`PROD_URL`
  repo variables) — per-deployment URLs are auth-protected.
- Deploy secrets + `STAGING_URL`/`PROD_URL` are managed by `infra/terraform/envs/deploy-secrets`.
```

Update `infra/terraform/README.md` in three places (update in place — do not create a second apply-order section):

1. Retitle the existing `## Apply order` section to `## Apply order (updated for Plan 4)` and add step 3: `**envs/deploy-secrets** (reads staging/prod workspace outputs; needs TFE_TOKEN)`.
2. Extend the State section's workspace list to `squad-app-{repo,dev,staging,prod,deploy-secrets}`.
3. Extend the `## Apply procedure` bash block with the deploy-secrets step:

```bash
# 3) deploy-secrets (last — reads staging/prod workspace outputs; needs TFE_TOKEN
#    plus TF_VAR_github_token and TF_VAR_vercel_api_token exported)
terraform -chdir=infra/terraform/envs/deploy-secrets init
terraform -chdir=infra/terraform/envs/deploy-secrets apply
```

- [ ] **Step 3: Trigger the flow and verify staging deploys**

`main` is protected (Plan 3), so land these changes via a PR — the merge is the push-to-`main` that runs CI and then triggers `deploy.yml`:

```bash
git checkout -b deploy/foundation-plan-4
git push -u origin deploy/foundation-plan-4
gh pr create --fill --title "Foundation Plan 4: deploy & rollback"
gh pr checks --watch          # the 9 required checks must pass
gh pr merge --squash --delete-branch
gh run watch "$(gh run list --workflow=Deploy --limit 1 --json databaseId --jq '.[0].databaseId')"
```

Expected: once the PR merges and `CI` goes green on `main`, `Deploy` starts; the `staging` job migrates, deploys, and the Playwright smoke passes against the staging URL.

- [ ] **Step 4: Approve production and verify the health gate**

In the GitHub UI, approve the pending `production` deployment. Then:

```bash
curl -fsS "$(gh variable get PROD_URL)/api/health"
```

Expected: production deploys after approval; the post-deploy health gate passes; `curl` returns `{"status":"ok","db":"up"}`.

- [ ] **Step 5: Verify manual rollback works**

Run:

```bash
gh workflow run rollback.yml -f reason="verify rollback path"
gh run watch "$(gh run list --workflow=Rollback --limit 1 --json databaseId --jq '.[0].databaseId')"
```

Expected: `vercel rollback` restores the previous production deployment; the post-rollback health check passes.

- [ ] **Step 6: Commit**

```bash
git add README.md infra/terraform/README.md
git commit -m "docs: document deploy and rollback flow"
```

---

## Definition of Done (Plan 4)

- `deploy.yml` runs on `workflow_run` after `CI` succeeds on `main`; jobs `staging`, `production`, `rollback` present.
- staging deploys via the Vercel CLI and passes a Playwright smoke against the public staging production domain (`vars.STAGING_URL`); migrations run — and are verified via `scripts/verify-migrations.mjs` — before each deploy.
- `production` is gated by the GitHub `production` environment (manual approval), deploys atomically with `--prod`, and a post-deploy `/api/health` gate against `vars.PROD_URL` blocks on failure.
- A failed production deploy/health gate auto-calls `rollback.yml` (`vercel rollback`, no-arg = previous production deployment); manual `workflow_dispatch` rollback also works.
- `vercel.json` disables Git auto-deploy on `main`; the gated workflow is the only deploy path.
- Deploy secrets + `STAGING_URL`/`PROD_URL` are managed by `envs/deploy-secrets` (or set via `gh` per the documented fallback); no secrets committed; `github_actions_secret` uses `plaintext_value`.
- Migrations are forward-only; the runbook states rollback reverts the app, not the schema.

**Foundation complete.** Plans 1–4 deliver: a portable, test-covered Next.js app (1); a gated CI pipeline (2); Terraform-managed multi-env infra with parity + approval gates (3); and a health-gated promotion + rollback flow (4). The remaining placeholders — the full core-loop E2E (Plan 2) and the post-deploy core-loop check (this plan) — are filled in when the `signup → create game → request → approve` feature work begins.
