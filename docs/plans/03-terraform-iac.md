# Foundation Plan 3 — Terraform IaC Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Codify all environment infrastructure as Terraform — a Supabase project + Vercel project per environment (dev/staging/prod) provisioned from one shared module set, plus repo-global GitHub branch protection, required status checks, and a prod approval gate — with remote state on HCP Terraform, a deferred-but-scaffolded `compute/` seam, and a CI job that enforces env-var parity between the infra and the app schema.

**Architecture:** `infra/terraform/` holds four reusable modules (`data` = Supabase, `app` = Vercel, `repo` = GitHub, `compute` = empty seam) and five root configs (`envs/dev`, `envs/staging`, `envs/prod` — each calling `data` + `app` with only its variables differing, so parity is guaranteed by construction — plus `envs/repo` for repo-global GitHub config, applied once). Schema stays in `migrations/` (Plan 1), not Terraform. Secrets enter via HCP Terraform / env vars; Supabase outputs are wired into Vercel env vars so per-env config is versioned IaC, never dashboard-clicked.

**Tech Stack:** Terraform ≥ 1.7, HCP Terraform (remote state), providers `vercel/vercel ~> 4.8`, `supabase/supabase ~> 1.0`, `integrations/github ~> 6.0`, plus a Node parity script wired into the Plan 2 CI workflow.

---

## Plan Series Context

This is **Plan 3 of 4** in the foundation series derived from `output/2026-05-29-app-foundation-portable-seams-design.md`:

1. Plan 1 (done): App skeleton + portable seams + local data layer → spec §2, §3, §4, §7.
2. Plan 2 (done): CI pipeline (`ci.yml`) → spec §5.
3. **Plan 3 (this doc):** IaC — Terraform modules + per-env roots + state + repo config + the config parity-check job → spec §6 and the infra half of §7.
4. Plan 4: Deploy + rollback (`deploy.yml`, `rollback.yml`, post-deploy health gate) → spec §5, §8. **Picks up:** the GitHub Actions *deploy* secrets (Vercel deploy token, etc., consuming this plan's Terraform outputs via remote state), the staging→approval→prod flow that uses the environments created here, and the full core-loop E2E against a live preview.

## Refinements From The Source Design (read before starting)

The design §4 sketches `envs/{dev,staging,prod}`. Implementing it faithfully requires three corrections, each recorded as a deliberate decision (not a silent change):

1. **A dedicated `envs/repo` root owns repo-global GitHub config.** Branch protection on `main`, required status checks, and the `staging`/`production` environments are **repository-global**, not per-environment. If `envs/dev`, `envs/staging`, and `envs/prod` each managed them, three workspaces would fight over the same `main`-branch protection rule and the same environment resources — guaranteed state conflicts. So repo-global config lives in one `envs/repo` root/workspace, applied once. The per-env roots own only what is genuinely per-environment: a Supabase project + a Vercel project. "Parity by construction" therefore applies to the `data` + `app` modules — exactly the things that differ per environment.
2. **Per-env GitHub Actions *deploy* secrets are deferred to Plan 4.** §7's "per-env values via Terraform" is satisfied here by the **Vercel project env vars** (the app's runtime config, set by `modules/app`). The GitHub Actions *deploy* secrets (Vercel deploy token, CI's Supabase keys) are consumed only by `deploy.yml`, which is Plan 4 — so they are created there, next to their consumer, reading this plan's Terraform outputs via remote state.
3. **No schema, no RLS policies in Terraform.** Per §6, the database schema is owned by `migrations/` (Plan 1) and RLS policies live in those migrations. `modules/data` configures only *project-level* settings (network restrictions, auth `site_url`, exposed API schemas). This keeps "TF = infra, migrations = schema" honest.
4. **Security headers stay app-layer.** §6 also lists "security headers in `next.config`" — that is application code (`next.config.ts`), not infrastructure. It belongs to app hardening (Plan 1's territory), is tracked there, and is intentionally out of scope for this Terraform plan.

## Staying Current With Context7 (per project directive)

Provider schemas drift; **re-verify each provider's current major and resource arguments via Context7 (`resolve-library-id` → `query-docs`) before applying**, and bump the pins. Verified via Context7 on 2026-05-29:

- **`vercel/vercel`** (`/vercel/terraform-provider-vercel`, `>= 4.8`) — `provider "vercel" { api_token, team }`; `vercel_project` with `git_repository = { type="github", repo="owner/repo" }`; `vercel_project_environment_variables` (bulk: `variables = [{ key, value, target=["production","preview","development"], sensitive }]`); `vercel_project_domain { project_id, domain }`. (`production_branch` inside `git_repository`, and setting `git_repository = null` to skip linking, are both valid in v4 — confirm against your pinned version.)
- **`supabase/supabase`** (`/supabase/terraform-provider-supabase`, `~> 1.0`) — `provider "supabase" {}` reads `SUPABASE_ACCESS_TOKEN`; `supabase_project { organization_id, name, database_password, region, instance_size }` **creates** a project; `supabase_settings { project_ref, api/auth/network/database = jsonencode({...}) }`; data sources `supabase_apikeys` (`anon_key`, `service_role_key`) and `supabase_pooler` (`url["transaction"]`).
- **`integrations/github`** (`/integrations/terraform-provider-github`, `~> 6.0`) — `github_branch_protection { repository_id, pattern, required_status_checks { strict, contexts }, required_pull_request_reviews { required_approving_review_count } }`; `github_repository_environment { repository, environment, reviewers { users }, deployment_branch_policy {...} }`; `github_actions_secret`/`github_actions_environment_secret` use `value` (the `plaintext_value` arg is deprecated).

The committed `.terraform.lock.hcl` files (Task 1) pin exact provider versions for reproducibility; Plan 2's Dependabot already covers the GitHub Actions used by CI.

## Boundary & Prerequisites

- **This plan runs in the app repo (Plans 1–2), under `infra/terraform/` — not the brainstorm vault.**
- **Accounts required:** HCP Terraform (Terraform Cloud), Vercel, Supabase, and the GitHub repo (exists from Plan 1). HCP and GitHub free tiers suffice. **Supabase's free tier caps active projects per org (commonly 2)** — provisioning dev + staging + prod (3 projects) likely needs a paid Supabase org, or pause/defer the `dev` project (it is not in the deploy flow). **Vercel Hobby is non-commercial** — a commercial launch needs Pro. Confirm current tier limits before applying.
- **Tooling:** Terraform ≥ 1.7 (`mock_provider` for tests), `node` 20+, `git`, and the `gh`, `vercel`, and `supabase` CLIs for verification. Verify:
  - Run: `terraform version && node -v && gh auth status`
  - Expected: Terraform ≥ 1.7; Node ≥ 20; `gh` authenticated.
- **⚠️ `terraform apply` (Task 10) creates real, billable, outward-facing resources** (Supabase projects, Vercel projects) and **changes GitHub merge rules**. `fmt`/`validate`/`test`/parity are all offline and safe; `plan`/`apply` need credentials and are explicitly gated. Do not apply without confirming the target accounts/org.
- **Least privilege (§7):** the Vercel token is deploy-scoped, the Supabase token is the account access token, the GitHub token is a fine-grained PAT with admin on this one repo. Never owner-wide PATs.

## File Structure (created by this plan)

| File | Responsibility |
|---|---|
| `infra/terraform/modules/data/{main,variables,outputs}.tf` | Supabase project + settings; outputs anon/service keys + DB URL |
| `infra/terraform/modules/app/{main,variables,outputs}.tf` | Vercel project + env vars (wired from `data`) + optional domain |
| `infra/terraform/modules/app/tests/app.tftest.hcl` | `terraform test` (mocked provider) for the domain-count logic |
| `infra/terraform/modules/repo/{main,variables,outputs}.tf` | GitHub branch protection + required checks + environments + approval gate |
| `infra/terraform/modules/compute/{main,variables,outputs,README}.tf/.md` | Deferred container-host SEAM (no resources in v1) |
| `infra/terraform/envs/dev/{backend,providers,variables,main}.tf` + `terraform.tfvars` | dev root: `data` + `app` |
| `infra/terraform/envs/staging/…`, `infra/terraform/envs/prod/…` | staging/prod roots — `main.tf`/`providers.tf` identical to dev (parity) |
| `infra/terraform/envs/repo/{backend,providers,variables,main}.tf` + `terraform.tfvars` | repo-global GitHub config root |
| `infra/terraform/env-contract.json` | Single source of truth for the app's env-var key set |
| `infra/terraform/scripts/check-env-parity.mjs` | Asserts the contract == app `.env.example` keys |
| `infra/terraform/README.md` | Terraform runbook (apply order, creds, state) |
| `docs/adr/0001-container-host-migration-path.md` | ADR for the deferred compute seam |
| `.github/workflows/ci.yml` | Add `tf-check` + `parity` jobs (modify Plan 2's file) |
| `.gitignore` | Ignore Terraform state/`.terraform/`; keep lock files + non-secret tfvars (modify) |

**Canonical names (do not rename):**
- Modules: `data`, `app`, `repo`, `compute`. Roots/workspaces: `sport-app-dev`, `sport-app-staging`, `sport-app-prod`, `sport-app-repo`.
- App env-var keys (must equal Plan 1's Zod schema / `.env.example`): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `DATABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (TF-managed) + `NODE_ENV` (platform-managed).
- Required-status-check contexts = the CI job names: `secret-scan`, `lint`, `test`, `sast`, `vuln-scan`, `build-image`, `e2e` (Plan 2) + `tf-check`, `parity` (this plan).
- `envs/dev/main.tf` and `envs/staging/main.tf` and `envs/prod/main.tf` are **byte-identical** — parity is the point.

---

## Task 1: Bootstrap — state backend, tokens, repo hygiene

**Files:**
- Create: `infra/terraform/README.md` (stub), `infra/terraform/scripts/` (dir)
- Modify: `.gitignore`

- [ ] **Step 1: Create the HCP Terraform org and four workspaces**

In HCP Terraform (app.terraform.io): create an organization (note its name), then create four **CLI-driven** workspaces with **Execution Mode = Local** (state in HCP, runs execute locally so provider credentials stay on your machine): `sport-app-dev`, `sport-app-staging`, `sport-app-prod`, `sport-app-repo`.
Verify: `terraform login` then the four workspaces are listed in the HCP UI.
(Alternative documented in `README.md` Step 6: an S3-compatible backend such as Cloudflare R2 instead of HCP.)

- [ ] **Step 2: Collect the provider credentials as local env vars**

Export (add to your shell profile or a gitignored `infra/terraform/.env` you `source`):
```bash
export VERCEL_API_TOKEN=...          # vercel.com/account/tokens (deploy-scoped)
export SUPABASE_ACCESS_TOKEN=...     # supabase.com/dashboard/account/tokens
export TF_VAR_vercel_api_token="$VERCEL_API_TOKEN"
export TF_VAR_github_token=...        # fine-grained PAT, admin on this repo only
export TF_VAR_supabase_db_password=...# strong password; reused as the project DB password
```
Verify: `vercel whoami && supabase projects list >/dev/null && echo "creds-ok"`
Expected: prints your Vercel user and `creds-ok`.

- [ ] **Step 3: Add Terraform ignores to `.gitignore`**

Append to `.gitignore`:
```gitignore
# Terraform
infra/terraform/**/.terraform/*
*.tfstate
*.tfstate.*
crash.log
crash.*.log
*.secret.tfvars
infra/terraform/.env
# Keep committed: .terraform.lock.hcl and non-secret terraform.tfvars
```

- [ ] **Step 4: Create the runbook stub**

Create `infra/terraform/README.md`:
```markdown
# Terraform — sport-app infrastructure

Provisions per-environment Supabase + Vercel projects and repo-global GitHub
config. Schema is NOT here (it lives in `migrations/`).

## Apply order
1. `envs/repo`   — branch protection, required checks, environments (once)
2. `envs/dev`    — Supabase + Vercel for dev
3. `envs/staging`, `envs/prod` — same modules, env-specific vars

## Credentials
Set `VERCEL_API_TOKEN`, `SUPABASE_ACCESS_TOKEN`, `TF_VAR_vercel_api_token`,
`TF_VAR_github_token`, `TF_VAR_supabase_db_password` (see this repo's onboarding).

## State
Remote state on HCP Terraform (workspaces `sport-app-{repo,dev,staging,prod}`,
Local execution mode). Alternative: an S3-compatible (R2) backend.
```

- [ ] **Step 5: Commit**

```bash
git add infra/terraform/README.md .gitignore
git commit -m "chore(infra): bootstrap terraform runbook and ignores"
```

---

## Task 2: `modules/data` — Supabase project + settings

**Files:**
- Create: `infra/terraform/modules/data/variables.tf`, `infra/terraform/modules/data/main.tf`, `infra/terraform/modules/data/outputs.tf`

- [ ] **Step 1: Define inputs**

Create `infra/terraform/modules/data/variables.tf`:
```hcl
variable "organization_id" {
  type        = string
  description = "Supabase organization slug."
}

variable "project_name" {
  type        = string
  description = "Supabase project name (unique per environment)."
}

variable "database_password" {
  type        = string
  sensitive   = true
  description = "Postgres password for the project."
}

variable "region" {
  type        = string
  description = "Supabase region, e.g. eu-central-1."
}

variable "instance_size" {
  type    = string
  default = "micro"
  validation {
    condition     = contains(["micro", "small", "medium", "large"], var.instance_size)
    error_message = "instance_size must be one of: micro, small, medium, large."
  }
}

variable "network_restrictions" {
  type        = list(string)
  default     = ["0.0.0.0/0", "::/0"]
  description = "CIDR allowlist for the database. Tighten in staging/prod."
}

variable "site_url" {
  type        = string
  description = "Auth site URL for redirect handling."
}
```

- [ ] **Step 2: Create the project and settings**

Create `infra/terraform/modules/data/main.tf`:
```hcl
terraform {
  required_providers {
    supabase = {
      source  = "supabase/supabase"
      version = "~> 1.0"
    }
  }
}

resource "supabase_project" "this" {
  organization_id   = var.organization_id
  name              = var.project_name
  database_password = var.database_password
  region            = var.region
  instance_size     = var.instance_size

  lifecycle {
    # Changing the password must not silently destroy/recreate the project.
    ignore_changes = [database_password]
  }
}

resource "supabase_settings" "this" {
  project_ref = supabase_project.this.id

  network = jsonencode({
    restrictions = var.network_restrictions
  })

  api = jsonencode({
    db_schema            = "public,storage,graphql_public"
    db_extra_search_path = "public,extensions"
    max_rows             = 1000
  })

  auth = jsonencode({
    site_url = var.site_url
  })
}

# Read back the generated keys and pooled connection string.
data "supabase_apikeys" "this" {
  project_ref = supabase_project.this.id
}

data "supabase_pooler" "this" {
  project_ref = supabase_project.this.id
}
```

- [ ] **Step 3: Export the values the app needs**

Create `infra/terraform/modules/data/outputs.tf`:
```hcl
output "project_ref" {
  value       = supabase_project.this.id
  description = "Supabase project ref (used to build the public API URL)."
}

output "anon_key" {
  value     = data.supabase_apikeys.this.anon_key
  sensitive = true
}

output "service_role_key" {
  value     = data.supabase_apikeys.this.service_role_key
  sensitive = true
}

output "database_url" {
  value       = data.supabase_pooler.this.url["transaction"]
  sensitive   = true
  description = "Pooled (transaction) connection string for the running app."
}
```

- [ ] **Step 4: Format and validate the module (offline)**

Run:
```bash
cd infra/terraform/modules/data
terraform fmt -check
terraform init -backend=false
terraform validate
cd -
```
Expected: `fmt -check` prints nothing (exit 0); `init` installs the supabase provider; `validate` prints "Success! The configuration is valid."

- [ ] **Step 5: Commit**

```bash
git add infra/terraform/modules/data
git commit -m "feat(infra): add Supabase data module"
```

---

## Task 3: `modules/app` — Vercel project + env vars + domain

**Files:**
- Create: `infra/terraform/modules/app/variables.tf`, `infra/terraform/modules/app/main.tf`, `infra/terraform/modules/app/outputs.tf`, `infra/terraform/modules/app/tests/app.tftest.hcl`

- [ ] **Step 1: Define inputs**

Create `infra/terraform/modules/app/variables.tf`:
```hcl
variable "project_name" {
  type        = string
  description = "Vercel project name (unique per environment)."
}

variable "git_repo" {
  type        = string
  default     = ""
  description = "GitHub repo in owner/name form to link for PR previews; empty = no Git link (CLI-only deploys). Link only one project (prod) to avoid duplicate previews across environments."
}

variable "production_branch" {
  type    = string
  default = "main"
}

variable "environment_variables" {
  type = list(object({
    key       = string
    value     = string
    target    = list(string)
    sensitive = bool
  }))
  description = "Env vars to set on the Vercel project."
}

variable "domain" {
  type        = string
  default     = ""
  description = "Custom domain to attach; empty string attaches none."
}
```

- [ ] **Step 2: Create the project, env vars, and optional domain**

Create `infra/terraform/modules/app/main.tf` (the Vercel default team comes from the provider block, so no `team_id` here):
```hcl
terraform {
  required_providers {
    vercel = {
      source  = "vercel/vercel"
      version = "~> 4.8"
    }
  }
}

resource "vercel_project" "this" {
  name      = var.project_name
  framework = "nextjs"

  # Link Git only when a repo is given (prod, for PR previews). dev/staging
  # deploy via the CLI (Plan 4), so they need no Git link — this also stops the
  # same repo from spawning preview deploys across all three projects.
  git_repository = var.git_repo == "" ? null : {
    type              = "github"
    repo              = var.git_repo
    production_branch = var.production_branch
  }
}

resource "vercel_project_environment_variables" "this" {
  project_id = vercel_project.this.id
  variables  = var.environment_variables
}

resource "vercel_project_domain" "this" {
  count      = var.domain == "" ? 0 : 1
  project_id = vercel_project.this.id
  domain     = var.domain
}
```

- [ ] **Step 3: Export the project id**

Create `infra/terraform/modules/app/outputs.tf`:
```hcl
output "project_id" {
  value = vercel_project.this.id
}

output "project_name" {
  value = vercel_project.this.name
}
```

- [ ] **Step 4: Write a `terraform test` for the domain-count logic (runs offline via a mocked provider)**

Create `infra/terraform/modules/app/tests/app.tftest.hcl`:
```hcl
mock_provider "vercel" {}

variables {
  project_name = "sport-app-test"
  git_repo     = "acme/sport-app"
  domain       = ""
  environment_variables = [
    {
      key       = "NEXT_PUBLIC_SUPABASE_URL"
      value     = "https://example.supabase.co"
      target    = ["production"]
      sensitive = false
    },
  ]
}

run "no_domain_resource_when_blank" {
  command = plan
  assert {
    condition     = length(vercel_project_domain.this) == 0
    error_message = "No domain resource should be planned when domain is empty."
  }
}

run "one_domain_resource_when_set" {
  command = plan
  variables {
    domain = "app.example.com"
  }
  assert {
    condition     = length(vercel_project_domain.this) == 1
    error_message = "Exactly one domain resource should be planned when a domain is set."
  }
}
```

- [ ] **Step 5: Format, validate, and run the test**

Run:
```bash
cd infra/terraform/modules/app
terraform fmt -check
terraform init -backend=false
terraform validate
terraform test
cd -
```
Expected: `validate` succeeds; `terraform test` prints `2 passed, 0 failed` (the mocked provider means no Vercel API calls and no credentials needed).

- [ ] **Step 6: Commit**

```bash
git add infra/terraform/modules/app
git commit -m "feat(infra): add Vercel app module with mocked terraform test"
```

---

## Task 4: `modules/repo` — branch protection, required checks, approval gate

**Files:**
- Create: `infra/terraform/modules/repo/variables.tf`, `infra/terraform/modules/repo/main.tf`, `infra/terraform/modules/repo/outputs.tf`

- [ ] **Step 1: Define inputs (required-check contexts default to the real CI job names)**

Create `infra/terraform/modules/repo/variables.tf`:
```hcl
variable "github_owner" {
  type = string
}

variable "repository" {
  type = string
}

variable "required_status_check_contexts" {
  type = list(string)
  # Must match job names in .github/workflows/ci.yml.
  default = [
    "secret-scan", # Plan 2
    "lint",        # Plan 2
    "test",        # Plan 2
    "sast",        # Plan 2
    "vuln-scan",   # Plan 2
    "build-image", # Plan 2
    "e2e",         # Plan 2
    "tf-check",    # Plan 3 (Task 9)
    "parity",      # Plan 3 (Task 9)
  ]
}

variable "required_approving_review_count" {
  type        = number
  default     = 0 # solo founder: enforce PR + CI, but no approver needed
  validation {
    condition     = var.required_approving_review_count >= 0 && var.required_approving_review_count <= 6
    error_message = "required_approving_review_count must be between 0 and 6."
  }
}

variable "production_reviewer_user_ids" {
  type        = list(string)
  default     = []
  description = "GitHub user IDs that may approve production deploys. Solo: your own id."
}

variable "prevent_self_review" {
  type        = bool
  default     = false # solo founder approves their own prod deploy as the checkpoint
}
```

- [ ] **Step 2: Create branch protection + environments**

Create `infra/terraform/modules/repo/main.tf`:
```hcl
terraform {
  required_providers {
    github = {
      source  = "integrations/github"
      version = "~> 6.0"
    }
  }
}

data "github_repository" "this" {
  full_name = "${var.github_owner}/${var.repository}"
}

resource "github_branch_protection" "main" {
  repository_id                   = data.github_repository.this.node_id
  pattern                         = "main"
  enforce_admins                  = true
  require_conversation_resolution = true

  required_status_checks {
    strict   = true
    contexts = var.required_status_check_contexts
  }

  required_pull_request_reviews {
    required_approving_review_count = var.required_approving_review_count
    dismiss_stale_reviews           = true
  }
}

# Staging: deploy gate with no human approval (auto-promote after CI).
resource "github_repository_environment" "staging" {
  repository  = var.repository
  environment = "staging"

  deployment_branch_policy {
    protected_branches     = true
    custom_branch_policies = false
  }
}

# Production: the manual approval gate (§5 deploy flow).
resource "github_repository_environment" "production" {
  repository          = var.repository
  environment         = "production"
  prevent_self_review = var.prevent_self_review

  reviewers {
    users = var.production_reviewer_user_ids
  }

  deployment_branch_policy {
    protected_branches     = true
    custom_branch_policies = false
  }
}
```

- [ ] **Step 3: Outputs**

Create `infra/terraform/modules/repo/outputs.tf`:
```hcl
output "staging_environment" {
  value = github_repository_environment.staging.environment
}

output "production_environment" {
  value = github_repository_environment.production.environment
}
```

- [ ] **Step 4: Format and validate (offline)**

Run:
```bash
cd infra/terraform/modules/repo
terraform fmt -check
terraform init -backend=false
terraform validate
cd -
```
Expected: `validate` prints "Success! The configuration is valid."

- [ ] **Step 5: Commit**

```bash
git add infra/terraform/modules/repo
git commit -m "feat(infra): add GitHub repo module (branch protection, env approval gate)"
```

---

## Task 5: `modules/compute` seam + ADR

**Files:**
- Create: `infra/terraform/modules/compute/variables.tf`, `infra/terraform/modules/compute/main.tf`, `infra/terraform/modules/compute/outputs.tf`, `infra/terraform/modules/compute/README.md`, `docs/adr/0001-container-host-migration-path.md`

- [ ] **Step 1: Create the empty seam module**

Create `infra/terraform/modules/compute/variables.tf`:
```hcl
variable "enabled" {
  type        = bool
  default     = false
  description = "When true (a future phase), provision a container host. v1: false."
}
```

Create `infra/terraform/modules/compute/main.tf`:
```hcl
# SEAM MODULE — intentionally has no resources in v1.
#
# The app already ships as a portable container (Dockerfile, Plan 1) that CI
# builds and scans (Plan 2). When serverless (Vercel) is outgrown, the
# container-host path (Cloud Run / ECS / Kubernetes) is implemented HERE behind
# this module's interface, so adoption is additive — not a rewrite.
#
# See docs/adr/0001-container-host-migration-path.md.
terraform {
  required_version = ">= 1.7"
}
```

Create `infra/terraform/modules/compute/outputs.tf`:
```hcl
output "enabled" {
  value = var.enabled
}
```

Create `infra/terraform/modules/compute/README.md`:
```markdown
# compute (seam, deferred)

No resources in v1. Hosting is Vercel (see `modules/app`). This module is the
single place the future container-host (Cloud Run / ECS / K8s) is wired in.
Rationale and migration path: `docs/adr/0001-container-host-migration-path.md`.
```

- [ ] **Step 2: Write the ADR**

Create `docs/adr/0001-container-host-migration-path.md`:
```markdown
# ADR 0001 — Container-host migration path (compute seam)

- Status: Accepted
- Date: 2026-05-29

## Context
v1 hosts on Vercel for speed and zero ops. The portable-seams design requires
that leaving serverless later is a migration, not a rewrite. Container
orchestration (K8s/ECS/Cloud Run) is premature before there is real load.

## Decision
Defer container orchestration. Keep the seam ready:
- The app builds to a standalone container (Dockerfile, Plan 1), built and
  vulnerability-scanned in CI (Plan 2).
- `infra/terraform/modules/compute/` exists as an empty, interface-only module.
- App code touches no Vercel-only APIs (the `lib/` adapter rule), so the
  runtime is swappable.

## Consequences
- Now: no orchestration cost or complexity; Vercel atomic deploys serve as
  blue-green (Plan 4).
- Later: implement `modules/compute` (e.g. Cloud Run), point DNS at it, and
  reuse the existing image and CI unchanged. Canary/progressive delivery
  (Argo Rollouts / Flagger) is added at that point, not before.
```

- [ ] **Step 3: Format and validate**

Run:
```bash
cd infra/terraform/modules/compute
terraform fmt -check
terraform init -backend=false
terraform validate
cd -
test -f docs/adr/0001-container-host-migration-path.md && echo "adr-ok"
```
Expected: `validate` succeeds; prints `adr-ok`.

- [ ] **Step 4: Commit**

```bash
git add infra/terraform/modules/compute docs/adr
git commit -m "feat(infra): scaffold deferred compute seam module + ADR 0001"
```

---

## Task 6: `envs/dev` root + the env-var contract

This is the per-environment shape. It calls `data` + `app`, deriving the Vercel env-var **keys** from the shared `env-contract.json` so they cannot drift from the app schema.

**Files:**
- Create: `infra/terraform/env-contract.json`, `infra/terraform/envs/dev/backend.tf`, `infra/terraform/envs/dev/providers.tf`, `infra/terraform/envs/dev/variables.tf`, `infra/terraform/envs/dev/main.tf`, `infra/terraform/envs/dev/terraform.tfvars`

- [ ] **Step 1: Create the env-var contract (single source of truth)**

Create `infra/terraform/env-contract.json`:
```json
{
  "tf_managed": [
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "DATABASE_URL",
    "SUPABASE_SERVICE_ROLE_KEY"
  ],
  "platform_managed": [
    "NODE_ENV"
  ]
}
```

- [ ] **Step 2: Backend (HCP workspace) and providers**

Create `infra/terraform/envs/dev/backend.tf` (replace the org name with yours from Task 1):
```hcl
terraform {
  required_version = ">= 1.7"
  cloud {
    organization = "REPLACE_WITH_HCP_ORG"
    workspaces {
      name = "sport-app-dev"
    }
  }
}
```

Create `infra/terraform/envs/dev/providers.tf` (per-env roots need only Vercel + Supabase; GitHub lives in `envs/repo`):
```hcl
terraform {
  required_providers {
    vercel = {
      source  = "vercel/vercel"
      version = "~> 4.8"
    }
    supabase = {
      source  = "supabase/supabase"
      version = "~> 1.0"
    }
  }
}

provider "vercel" {
  api_token = var.vercel_api_token
  team      = var.vercel_team
}

# Reads SUPABASE_ACCESS_TOKEN from the environment.
provider "supabase" {}
```

- [ ] **Step 3: Variables**

Create `infra/terraform/envs/dev/variables.tf`:
```hcl
variable "environment" { type = string }
variable "project_slug" { type = string }
variable "git_repo" { type = string }

variable "vercel_api_token" {
  type      = string
  sensitive = true
}
variable "vercel_team" {
  type    = string
  default = null
}

variable "supabase_org_id" { type = string }
variable "supabase_region" { type = string }
variable "supabase_instance_size" {
  type    = string
  default = "micro"
}
variable "supabase_db_password" {
  type      = string
  sensitive = true
}

variable "app_site_url" { type = string }
variable "app_domain" {
  type    = string
  default = ""
}
```

- [ ] **Step 4: Wire `data` → `app`, building env vars from the contract**

Create `infra/terraform/envs/dev/main.tf`:
```hcl
module "data" {
  source = "../../modules/data"

  organization_id   = var.supabase_org_id
  project_name      = "${var.project_slug}-${var.environment}"
  database_password = var.supabase_db_password
  region            = var.supabase_region
  instance_size     = var.supabase_instance_size
  site_url          = var.app_site_url
}

locals {
  contract     = jsondecode(file("${path.module}/../../env-contract.json"))
  env_targets  = ["production", "preview", "development"]
  secret_keys  = toset(["DATABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"])

  # Values for every TF-managed key. A key in the contract with no value here
  # fails the plan — keeping the contract and this map honest.
  env_values = {
    NEXT_PUBLIC_SUPABASE_URL      = "https://${module.data.project_ref}.supabase.co"
    NEXT_PUBLIC_SUPABASE_ANON_KEY = module.data.anon_key
    DATABASE_URL                  = module.data.database_url
    SUPABASE_SERVICE_ROLE_KEY     = module.data.service_role_key
  }
}

module "app" {
  source = "../../modules/app"

  project_name = "${var.project_slug}-${var.environment}"
  git_repo     = var.git_repo
  domain       = var.app_domain

  environment_variables = [
    for key in local.contract.tf_managed : {
      key       = key
      value     = local.env_values[key]
      target    = local.env_targets
      sensitive = contains(local.secret_keys, key)
    }
  ]
}
```

- [ ] **Step 5: Non-secret tfvars**

Create `infra/terraform/envs/dev/terraform.tfvars` (replace owner/org placeholders):
```hcl
environment            = "dev"
project_slug           = "sport-app"
git_repo               = "" # dev deploys via CLI (Plan 4); no Git link
supabase_org_id        = "REPLACE_WITH_ORG_SLUG"
supabase_region        = "eu-central-1"
supabase_instance_size = "micro"
app_site_url           = "http://localhost:3000"
app_domain             = ""
vercel_team            = null
```

- [ ] **Step 6: Validate offline (no credentials, no state)**

Run:
```bash
cd infra/terraform/envs/dev
terraform fmt -check
terraform init -backend=false
terraform validate
cd -
```
Expected: providers install; `validate` prints "Success! The configuration is valid." (`file()` reads the committed contract; module outputs are unknown at validate, which is fine.)

- [ ] **Step 7: Commit**

```bash
git add infra/terraform/env-contract.json infra/terraform/envs/dev
git commit -m "feat(infra): add dev env root and env-var contract"
```

---

## Task 7: `envs/staging` + `envs/prod` (parity by construction)

staging and prod are the **same** `main.tf` + `providers.tf` as dev — only `backend.tf` (workspace) and `terraform.tfvars` (values) differ. Copying the files verbatim is what guarantees parity.

**Files:**
- Create: `infra/terraform/envs/staging/{backend,providers,variables,main}.tf` + `terraform.tfvars`
- Create: `infra/terraform/envs/prod/{backend,providers,variables,main}.tf` + `terraform.tfvars`

- [ ] **Step 1: Copy the dev root into staging and prod**

Run:
```bash
for env in staging prod; do
  mkdir -p infra/terraform/envs/$env
  cp infra/terraform/envs/dev/providers.tf  infra/terraform/envs/$env/providers.tf
  cp infra/terraform/envs/dev/variables.tf  infra/terraform/envs/$env/variables.tf
  cp infra/terraform/envs/dev/main.tf        infra/terraform/envs/$env/main.tf
done
```

- [ ] **Step 2: Create each backend with its own workspace**

Create `infra/terraform/envs/staging/backend.tf`:
```hcl
terraform {
  required_version = ">= 1.7"
  cloud {
    organization = "REPLACE_WITH_HCP_ORG"
    workspaces {
      name = "sport-app-staging"
    }
  }
}
```

Create `infra/terraform/envs/prod/backend.tf`:
```hcl
terraform {
  required_version = ">= 1.7"
  cloud {
    organization = "REPLACE_WITH_HCP_ORG"
    workspaces {
      name = "sport-app-prod"
    }
  }
}
```

- [ ] **Step 3: Per-env tfvars (the only place values differ)**

Create `infra/terraform/envs/staging/terraform.tfvars`:
```hcl
environment            = "staging"
project_slug           = "sport-app"
git_repo               = "" # staging deploys via CLI (Plan 4); no Git link
supabase_org_id        = "REPLACE_WITH_ORG_SLUG"
supabase_region        = "eu-central-1"
supabase_instance_size = "micro"
app_site_url           = "https://staging.sport-app.example"
app_domain             = ""
vercel_team            = null
```

Create `infra/terraform/envs/prod/terraform.tfvars`:
```hcl
environment            = "prod"
project_slug           = "sport-app"
git_repo               = "REPLACE_OWNER/sport-app" # only prod links Git (PR previews)
supabase_org_id        = "REPLACE_WITH_ORG_SLUG"
supabase_region        = "eu-central-1"
supabase_instance_size = "small"
app_site_url           = "https://sport-app.example"
app_domain             = "sport-app.example"
vercel_team            = null
```

- [ ] **Step 4: Assert parity (the module wiring is identical) and validate**

Run:
```bash
diff infra/terraform/envs/dev/main.tf infra/terraform/envs/staging/main.tf && \
diff infra/terraform/envs/dev/main.tf infra/terraform/envs/prod/main.tf && \
echo "parity-ok"
for env in staging prod; do
  ( cd infra/terraform/envs/$env && terraform fmt -check && terraform init -backend=false && terraform validate ); done
```
Expected: both `diff`s produce no output (identical) and print `parity-ok`; each env validates "Success!". If a `diff` shows changes, the envs have drifted — revert the difference; only `terraform.tfvars`/`backend.tf` may differ.

- [ ] **Step 5: Commit**

```bash
git add infra/terraform/envs/staging infra/terraform/envs/prod
git commit -m "feat(infra): add staging and prod env roots (identical wiring, env-specific vars)"
```

---

## Task 8: `envs/repo` — apply repo-global GitHub config once

**Files:**
- Create: `infra/terraform/envs/repo/{backend,providers,variables,main}.tf` + `terraform.tfvars`

- [ ] **Step 1: Backend + GitHub provider**

Create `infra/terraform/envs/repo/backend.tf`:
```hcl
terraform {
  required_version = ">= 1.7"
  cloud {
    organization = "REPLACE_WITH_HCP_ORG"
    workspaces {
      name = "sport-app-repo"
    }
  }
}
```

Create `infra/terraform/envs/repo/providers.tf`:
```hcl
terraform {
  required_providers {
    github = {
      source  = "integrations/github"
      version = "~> 6.0"
    }
  }
}

provider "github" {
  owner = var.github_owner
  token = var.github_token
}
```

- [ ] **Step 2: Variables**

Create `infra/terraform/envs/repo/variables.tf`:
```hcl
variable "github_owner" { type = string }
variable "github_repository" { type = string }
variable "github_token" {
  type      = string
  sensitive = true
}
variable "production_reviewer_user_ids" {
  type    = list(string)
  default = []
}
```

- [ ] **Step 3: Call the repo module**

Create `infra/terraform/envs/repo/main.tf`:
```hcl
module "repo" {
  source = "../../modules/repo"

  github_owner                 = var.github_owner
  repository                   = var.github_repository
  production_reviewer_user_ids = var.production_reviewer_user_ids
}
```

- [ ] **Step 4: tfvars**

Create `infra/terraform/envs/repo/terraform.tfvars`:
```hcl
github_owner      = "REPLACE_OWNER"
github_repository = "sport-app"
# Your own GitHub numeric user ID so you can approve production deploys.
# Find it: gh api user --jq .id
production_reviewer_user_ids = ["REPLACE_YOUR_GITHUB_USER_ID"]
```

- [ ] **Step 5: Validate offline**

Run:
```bash
cd infra/terraform/envs/repo
terraform fmt -check
terraform init -backend=false
terraform validate
cd -
```
Expected: `validate` prints "Success! The configuration is valid."

- [ ] **Step 6: Commit**

```bash
git add infra/terraform/envs/repo
git commit -m "feat(infra): add repo-global GitHub config root"
```

---

## Task 9: CI — env-var parity check + Terraform validation gate

Add the §7 cross-config parity check and a Terraform fmt/validate gate to Plan 2's `ci.yml`. Both become required status checks (already in `modules/repo`'s default contexts).

**Files:**
- Create: `infra/terraform/scripts/check-env-parity.mjs`
- Modify: `.github/workflows/ci.yml`

- [ ] **Step 1: Write the parity script**

Create `infra/terraform/scripts/check-env-parity.mjs`:
```js
import { readFileSync } from "node:fs";

function exampleKeys() {
  return readFileSync(".env.example", "utf8")
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith("#"))
    .map((l) => l.split("=")[0])
    .sort();
}

const contract = JSON.parse(
  readFileSync("infra/terraform/env-contract.json", "utf8"),
);
const declared = [...contract.tf_managed, ...contract.platform_managed].sort();
const example = exampleKeys();

const missing = example.filter((k) => !declared.includes(k));
const extra = declared.filter((k) => !example.includes(k));

if (missing.length || extra.length) {
  console.error("Env-var parity FAILED: infra contract and app .env.example diverge.");
  if (missing.length) console.error("  In .env.example but not the TF contract:", missing);
  if (extra.length) console.error("  In the TF contract but not .env.example:", extra);
  process.exit(1);
}
console.log(`Env-var parity OK — ${declared.length} keys aligned (app schema == TF contract).`);
```

- [ ] **Step 2: Verify the script passes, then prove it catches drift**

Run:
```bash
node infra/terraform/scripts/check-env-parity.mjs
```
Expected: prints `Env-var parity OK — 5 keys aligned ...` (the 4 TF-managed + `NODE_ENV`).

Now prove it fails on drift:
```bash
node -e "const f='infra/terraform/env-contract.json';const fs=require('fs');const j=JSON.parse(fs.readFileSync(f));j.tf_managed.push('STRIPE_KEY');fs.writeFileSync(f,JSON.stringify(j,null,2));"
node infra/terraform/scripts/check-env-parity.mjs || echo "caught-drift"
git checkout -- infra/terraform/env-contract.json
```
Expected: the second run exits non-zero and prints `caught-drift`; the contract is then restored.

- [ ] **Step 3: Add the `tf-check` and `parity` jobs under `jobs:` in `.github/workflows/ci.yml`**

Append (siblings of the Plan 2 jobs):
```yaml
  # Plan 3 — Terraform formatting + validation gate (offline; no cloud creds).
  tf-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
      - uses: hashicorp/setup-terraform@v3
        with:
          terraform_version: "1.9.8"
      - name: terraform fmt
        run: terraform -chdir=infra/terraform fmt -check -recursive
      - name: Validate every module and env
        run: |
          set -e
          for dir in infra/terraform/modules/* infra/terraform/envs/*; do
            echo "== validating $dir =="
            terraform -chdir="$dir" init -backend=false -input=false
            terraform -chdir="$dir" validate
          done

  # Plan 3 — app env-var schema must match the Terraform env contract (§7).
  parity:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
      - uses: actions/setup-node@v5
        with:
          node-version: 20
      - name: Check env-var parity
        run: node infra/terraform/scripts/check-env-parity.mjs
```

- [ ] **Step 4: Validate the workflow still parses and has all nine jobs**

Run:
```bash
python3 -c "import yaml; d=yaml.safe_load(open('.github/workflows/ci.yml')); print(sorted(d['jobs']))"
```
Expected: `['build-image', 'e2e', 'lint', 'parity', 'sast', 'secret-scan', 'test', 'tf-check', 'vuln-scan']`

- [ ] **Step 5: Commit**

```bash
git add infra/terraform/scripts .github/workflows/ci.yml
git commit -m "ci: add Terraform validate gate and env-var parity check"
```

---

## Task 10: Apply (credential-gated) + runbook + verification

**⚠️ This task creates real, billable cloud resources and changes GitHub merge rules. Confirm the target HCP org, Vercel team, Supabase org, and GitHub repo before applying.** Steps 1–2 are offline; Steps 3+ require the Task 1 credentials and make real changes.

**Files:**
- Modify: `infra/terraform/README.md`

- [ ] **Step 1: Flesh out the runbook with the apply procedure**

Append to `infra/terraform/README.md`:
```markdown
## Apply procedure
Credentials must be exported (Task 1). Apply in this order:

```bash
# 1) Repo-global GitHub config (once)
terraform -chdir=infra/terraform/envs/repo init
terraform -chdir=infra/terraform/envs/repo apply

# 2) dev, then staging, then prod
for env in dev staging prod; do
  terraform -chdir=infra/terraform/envs/$env init
  terraform -chdir=infra/terraform/envs/$env apply
done
```

To read an output (e.g. for Plan 4 wiring):
`terraform -chdir=infra/terraform/envs/dev output -raw database_url`
```

- [ ] **Step 2: Confirm the whole tree formats and validates offline**

Run:
```bash
terraform -chdir=infra/terraform fmt -check -recursive && echo "fmt-ok"
node infra/terraform/scripts/check-env-parity.mjs
```
Expected: `fmt-ok` and the parity OK line.

- [ ] **Step 3: Plan the repo config and review it (no changes yet)**

Run:
```bash
terraform -chdir=infra/terraform/envs/repo init
terraform -chdir=infra/terraform/envs/repo plan
```
Expected: a plan creating `github_branch_protection.main` and the `staging`/`production` environments. Confirm the `required_status_checks.contexts` list shows all nine CI job names.

- [ ] **Step 4: Apply the repo config, then verify branch protection is live**

Run:
```bash
terraform -chdir=infra/terraform/envs/repo apply
gh api "repos/$(gh repo view --json nameWithOwner --jq .nameWithOwner)/branches/main/protection" --jq '.required_status_checks.contexts'
```
Expected: apply succeeds; the `gh api` call lists the nine contexts. (Solo note: with `required_approving_review_count = 0` you can still merge your own PRs once checks pass; bump it and add reviewers when a team joins.)

- [ ] **Step 5: Plan and apply `dev` end to end**

Run:
```bash
terraform -chdir=infra/terraform/envs/dev init
terraform -chdir=infra/terraform/envs/dev apply
terraform -chdir=infra/terraform/envs/dev output project_ref
```
Expected: apply creates the Supabase project, sets the Vercel project + its env vars, and prints a `project_ref`. In the Vercel dashboard the `sport-app-dev` project shows `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `DATABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`. (Repeat for staging/prod when ready, per the runbook.)

- [ ] **Step 6: Commit the runbook**

```bash
git add infra/terraform/README.md
git commit -m "docs(infra): document terraform apply procedure"
```

---

## Definition of Done (Plan 3)

- `infra/terraform/` contains modules `data`, `app`, `repo`, `compute` and roots `envs/{dev,staging,prod,repo}`.
- `terraform fmt -check -recursive` is clean; every module and env passes `terraform validate` (offline); `modules/app` passes `terraform test` (2 passed).
- `envs/{dev,staging,prod}/main.tf` are byte-identical (`diff` empty) — parity by construction.
- `env-contract.json` exists; `check-env-parity.mjs` passes and is proven to fail on drift; CI has `tf-check` + `parity` jobs (nine jobs total) and both are in `modules/repo`'s required-check contexts.
- `modules/compute` is an interface-only seam; ADR 0001 documents the container-host path.
- Remote state is on HCP Terraform (four workspaces); secrets come from env/TF Cloud vars, never committed; Supabase outputs are wired into Vercel env vars (per-env config is IaC).
- (Credential-gated) `envs/repo` and `envs/dev` apply cleanly; `main` branch protection requires the nine checks; the `production` environment has the approval gate.

**Next:** Plan 4 (deploy/rollback) adds `deploy.yml` (merge → staging → manual approval via the `production` environment created here → prod atomic alias swap) and `rollback.yml` (manual + health-gated), the post-deploy `/api/health` + core-loop gate, and the GitHub Actions **deploy secrets** — created in Terraform from this plan's outputs (consumed via the `tfe_outputs`/remote-state data source) so the Vercel deploy token and CI Supabase keys stay versioned IaC.
