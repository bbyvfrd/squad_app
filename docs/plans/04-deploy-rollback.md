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
2. **One Vercel project per environment, deployed with `--prod`, Git auto-deploy disabled.** Plan 3 created separate `sport-app-{dev,staging,prod}` Vercel projects (data isolation). Each is deployed to its _own_ production via the CLI; "blue-green / atomic alias swap" happens within each project (Vercel keeps the previous deployment warm). **Only the prod project is Git-linked** (Plan 3 sets `git_repo` for prod only), so the committed `vercel.json` (`deploymentEnabled.main=false`) and PR previews apply there; dev/staging are CLI-deploy-only — which also avoids the same repo spawning duplicate preview deploys across three projects.
3. **Deploy secrets are repo-level, named per environment.** The `production` GitHub _environment_ is used purely as the approval gate; secrets are repo-level (`VERCEL_PROJECT_ID_STAGING`/`_PROD`, etc.). This decouples the gate from secret scoping and avoids an approval deadlock on `rollback` (auto-rollback must run without waiting for a human). Environment-scoped secrets are noted as a later hardening.
4. **Migrations are forward-only and run before each deploy; rollback reverts the app, not the schema.** `drizzle-kit migrate` runs against the target env's Supabase (session-pooler URL) before the Vercel deploy. `vercel rollback` reverts the running app to the previous deployment; it does **not** revert migrations. Keep migrations backward-compatible (expand/contract) — this is called out in the runbook.
5. **`dev` is provisioned but not in the promotion flow.** `deploy.yml` promotes `staging → production`. The `dev` Vercel/Supabase project (Plan 3) is the cloud-dev fallback from §7; it is not auto-deployed.

## Staying Current With Context7 (per project directive)

Verified via Context7 on 2026-05-29; **re-verify before running**:

- **Vercel CLI** (`/websites/vercel`) — token auth via `--token`/`VERCEL_TOKEN`; CI flow = `vercel pull --environment=production` → `vercel build --prod` → `vercel deploy --prebuilt --prod` (the `--prebuilt` flag skips the Vercel-side build); `vercel rollback` "instantly restores the previous production deployment."
- **GitHub Actions** (`/websites/github_en_actions`) — reusable workflow via `on: workflow_call` (with `inputs`/`secrets`), callable from a job with `uses:` + `secrets: inherit`; manual approval via a job-level `environment:` with required reviewers.
- **NOT verified this session:** the Terraform `hashicorp/tfe` provider and its `tfe_outputs` data source (Context7's resolve did not return it). **Before applying Task 3, verify the current `hashicorp/tfe` version and that `data.tfe_outputs.<x>.values.<output>` is the correct accessor** (`resolve-library-id "Terraform Cloud tfe provider"` → `query-docs`). The pin below (`~> 0.60`) is a best-effort default.

## Boundary & Prerequisites

- **Runs in the app repo (Plans 1–3), not the vault.**
- **Plans 1–3 must be applied:** CI is green on `main`; Terraform `envs/repo` (branch protection + the `staging`/`production` environments) and `envs/{dev,staging,prod}` (Supabase + Vercel projects) are applied.
- **`main` is protected (Plan 3): no direct pushes.** Every change in this plan lands via a PR that passes the 9 required checks; the PR _merge_ is the push-to-`main` that triggers `deploy.yml`. (The per-task `git commit`s below are local — push a branch and open a PR to land them.)
- **Credentials:** the Plan 3 set, plus a **Vercel token** and your **Vercel org id** (`VERCEL_ORG_ID`). Get the org id: `vercel teams ls` / project settings. For the TF deploy-secrets root, a **TFE token** (`TFE_TOKEN`) to read workspace outputs.
- **⚠️ This plan deploys to real environments.** YAML authoring + `terraform validate` are offline; the actual deploy/rollback (Task 8) is outward-facing and credential-gated — confirm the target Vercel projects before pushing to `main`.

## File Structure (created/modified by this plan)

| File                                                 | Responsibility                                                                                        |
| ---------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `.github/workflows/deploy.yml`                       | Promotion flow: staging → approval → production + post-deploy health gate (created across Tasks 5, 7) |
| `.github/workflows/rollback.yml`                     | Reusable + manual rollback via `vercel rollback`                                                      |
| `vercel.json`                                        | Disable Vercel Git auto-deploy on `main`                                                              |
| `infra/terraform/modules/data/outputs.tf`            | Add `database_session_url` output (modify)                                                            |
| `infra/terraform/envs/{dev,staging,prod}/outputs.tf` | Expose `vercel_project_id` + `database_session_url` (create)                                          |
| `infra/terraform/envs/deploy-secrets/*`              | New root: read env outputs via `tfe_outputs`, write GitHub deploy secrets                             |
| `playwright.config.ts`                               | Allow targeting a deployed URL via `PLAYWRIGHT_BASE_URL` (modify)                                     |
| `infra/terraform/README.md` + `README.md`            | Deploy/rollback runbook (modify)                                                                      |

**Canonical names (do not rename):**

- Workflows: `deploy.yml` (`name: Deploy`), `rollback.yml` (`name: Rollback`). Caller of CI: the `CI` workflow name from Plan 2.
- Jobs: `staging`, `production`, `rollback` (in `deploy.yml`); `rollback-production` (in `rollback.yml`).
- Deploy secrets (GitHub Actions, repo-level): `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID_STAGING`, `VERCEL_PROJECT_ID_PROD`, `MIGRATION_DATABASE_URL_STAGING`, `MIGRATION_DATABASE_URL_PROD`. Repo **variable**: `PROD_URL` (the production URL, used by health checks).
- New TF root/workspace: `envs/deploy-secrets` / `sport-app-deploy-secrets`.

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
  # VERIFY the pooler `url` map keys for your provider version (expected
  # "transaction" and "session"). Migrations need a session/direct connection —
  # the transaction pooler (PgBouncer) rejects some DDL / prepared statements.
  # If "session" is absent, construct the direct URL instead:
  #   "postgresql://postgres:${var.database_password}@db.${supabase_project.this.id}.supabase.co:5432/postgres"
  value       = data.supabase_pooler.this.url["session"]
  sensitive   = true
  description = "Session-mode pooled connection string (suitable for DDL/migrations)."
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
  ( cd "infra/terraform/$dir" && terraform fmt -check && terraform init -backend=false && terraform validate ); done
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

> **Simpler solo alternative:** instead of this root, set the six secrets + `PROD_URL` variable once with `gh secret set` / `gh variable set` (values from `terraform output`). The workflows are identical either way. The Terraform route keeps them versioned IaC (§7).

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
      name = "sport-app-deploy-secrets"
    }
  }
}
```

Create `infra/terraform/envs/deploy-secrets/providers.tf` (verify the `tfe` version via Context7 first — see the Context7 note above):

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

Create `infra/terraform/envs/deploy-secrets/variables.tf`:

```hcl
variable "hcp_organization" { type = string }
variable "github_owner" { type = string }
variable "github_repository" { type = string }
variable "github_token" {
  type      = string
  sensitive = true
}
variable "vercel_token" {
  type      = string
  sensitive = true
}
variable "vercel_org_id" { type = string }
```

- [ ] **Step 3: Read env outputs and write the secrets**

Create `infra/terraform/envs/deploy-secrets/main.tf`:

```hcl
data "tfe_outputs" "staging" {
  organization = var.hcp_organization
  workspace    = "sport-app-staging"
}

data "tfe_outputs" "prod" {
  organization = var.hcp_organization
  workspace    = "sport-app-prod"
}

# Account-level, shared across environments.
resource "github_actions_secret" "vercel_token" {
  repository  = var.github_repository
  secret_name = "VERCEL_TOKEN"
  value       = var.vercel_token
}

resource "github_actions_secret" "vercel_org_id" {
  repository  = var.github_repository
  secret_name = "VERCEL_ORG_ID"
  value       = var.vercel_org_id
}

# Per-environment Vercel project ids.
resource "github_actions_secret" "vercel_project_staging" {
  repository  = var.github_repository
  secret_name = "VERCEL_PROJECT_ID_STAGING"
  value       = data.tfe_outputs.staging.values.vercel_project_id
}

resource "github_actions_secret" "vercel_project_prod" {
  repository  = var.github_repository
  secret_name = "VERCEL_PROJECT_ID_PROD"
  value       = data.tfe_outputs.prod.values.vercel_project_id
}

# Per-environment migration DB URLs (session pooler).
resource "github_actions_secret" "migration_db_staging" {
  repository  = var.github_repository
  secret_name = "MIGRATION_DATABASE_URL_STAGING"
  value       = data.tfe_outputs.staging.values.database_session_url
}

resource "github_actions_secret" "migration_db_prod" {
  repository  = var.github_repository
  secret_name = "MIGRATION_DATABASE_URL_PROD"
  value       = data.tfe_outputs.prod.values.database_session_url
}
```

- [ ] **Step 4: tfvars**

Create `infra/terraform/envs/deploy-secrets/terraform.tfvars`:

```hcl
hcp_organization  = "REPLACE_WITH_HCP_ORG"
github_owner      = "REPLACE_OWNER"
github_repository = "sport-app"
vercel_org_id     = "REPLACE_WITH_VERCEL_ORG_ID"
```

- [ ] **Step 5: Validate offline**

Run:

```bash
cd infra/terraform/envs/deploy-secrets
terraform fmt -check
terraform init -backend=false
terraform validate
cd -
```

Expected: providers install; `validate` prints "Success!". (If `data.tfe_outputs … .values` is rejected, the provider accessor changed — fix per the Context7-verified schema.)

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

Replace `playwright.config.ts` with:

```ts
import { defineConfig, devices } from "@playwright/test";

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
  // Boot a local server only when testing locally. Against a deployed URL
  // (PLAYWRIGHT_BASE_URL set), skip it and hit the remote target.
  webServer: process.env.PLAYWRIGHT_BASE_URL
    ? undefined
    : {
        command: "pnpm start",
        url: "http://127.0.0.1:3000",
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

## Task 5: `deploy.yml` — staging job

**Files:**

- Create: `.github/workflows/deploy.yml`

- [ ] **Step 1: Create `deploy.yml` with the workflow header and the staging job**

Create `.github/workflows/deploy.yml`:

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
      - uses: actions/checkout@v5
        with:
          ref: ${{ github.event.workflow_run.head_sha }}
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v5
        with:
          node-version: 20
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - name: Apply migrations (staging)
        run: pnpm exec drizzle-kit migrate
        env:
          DATABASE_URL: ${{ secrets.MIGRATION_DATABASE_URL_STAGING }}
      - name: Install Vercel CLI
        run: npm install -g vercel@latest
      - name: Pull staging env from Vercel
        run: vercel pull --yes --environment=production --token="$VERCEL_TOKEN"
      - name: Build
        run: vercel build --prod --token="$VERCEL_TOKEN"
      - name: Deploy to staging
        id: deploy
        run: echo "url=$(vercel deploy --prebuilt --prod --token="$VERCEL_TOKEN" | tail -1)" >> "$GITHUB_OUTPUT"
      - name: Install Playwright chromium
        run: pnpm exec playwright install --with-deps chromium
      - name: Smoke test staging
        run: pnpm test:e2e
        env:
          PLAYWRIGHT_BASE_URL: ${{ steps.deploy.outputs.url }}
```

- [ ] **Step 2: Validate the YAML**

Run: `python3 -c "import yaml; d=yaml.safe_load(open('.github/workflows/deploy.yml')); print('jobs:', sorted(d['jobs']))"`
Expected: `jobs: ['staging']`.

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/deploy.yml
git commit -m "ci: add deploy.yml staging job (migrate, deploy, smoke)"
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
        run: echo "Rolling back production — reason: ${{ inputs.reason }}"
      - name: Install Vercel CLI
        run: npm install -g vercel@latest
      - name: Roll back to the previous production deployment
        run: vercel rollback --yes --token="$VERCEL_TOKEN"
      - name: Verify production health after rollback
        run: |
          sleep 10
          curl -fsS "${{ vars.PROD_URL }}/api/health" | grep -q '"status":"ok"'
          echo "production healthy after rollback"
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
    - uses: actions/checkout@v5
      with:
        ref: ${{ github.event.workflow_run.head_sha }}
    - uses: pnpm/action-setup@v4
    - uses: actions/setup-node@v5
      with:
        node-version: 20
        cache: pnpm
    - run: pnpm install --frozen-lockfile
    - name: Apply migrations (production)
      run: pnpm exec drizzle-kit migrate
      env:
        DATABASE_URL: ${{ secrets.MIGRATION_DATABASE_URL_PROD }}
    - name: Install Vercel CLI
      run: npm install -g vercel@latest
    - name: Pull production env from Vercel
      run: vercel pull --yes --environment=production --token="$VERCEL_TOKEN"
    - name: Build
      run: vercel build --prod --token="$VERCEL_TOKEN"
    - name: Deploy to production (atomic alias swap)
      run: vercel deploy --prebuilt --prod --token="$VERCEL_TOKEN"
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

- [ ] **Step 1: Apply the deploy-secrets root (after dev/staging/prod are applied) and set `PROD_URL`**

Run (credentials per Plan 3 + `TFE_TOKEN` + `TF_VAR_vercel_token`):

```bash
terraform -chdir=infra/terraform/envs/deploy-secrets init
terraform -chdir=infra/terraform/envs/deploy-secrets apply
# Set the production URL variable used by the health checks (use your prod domain):
gh variable set PROD_URL --body "https://sport-app.example"
```

Expected: apply creates the six secrets; `gh secret list` shows them; `gh variable get PROD_URL` returns the URL.

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
  keep migrations backward-compatible (expand/contract).
- Secrets/`PROD_URL` are managed by `infra/terraform/envs/deploy-secrets`.
```

Append the apply order to `infra/terraform/README.md`:

```markdown
## Apply order (updated for Plan 4)

1. envs/repo 2. envs/dev, envs/staging, envs/prod 3. **envs/deploy-secrets** (reads staging/prod outputs)
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
- staging deploys via the Vercel CLI and passes a Playwright smoke against the live staging URL; migrations run before deploy.
- `production` is gated by the GitHub `production` environment (manual approval), deploys atomically with `--prod`, and a post-deploy `/api/health` gate blocks on failure.
- A failed production deploy/health gate auto-calls `rollback.yml` (`vercel rollback`); manual `workflow_dispatch` rollback also works.
- `vercel.json` disables Git auto-deploy on `main`; the gated workflow is the only deploy path.
- Deploy secrets + `PROD_URL` are managed by `envs/deploy-secrets` (or set via `gh` per the documented fallback); no secrets committed.
- Migrations are forward-only; the runbook states rollback reverts the app, not the schema.

**Foundation complete.** Plans 1–4 deliver: a portable, test-covered Next.js app (1); a gated CI pipeline (2); Terraform-managed multi-env infra with parity + approval gates (3); and a health-gated promotion + rollback flow (4). The remaining placeholders — the full core-loop E2E (Plan 2) and the post-deploy core-loop check (this plan) — are filled in when the `signup → create game → request → approve` feature work begins.
