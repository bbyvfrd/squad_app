# Terraform — squad-app infrastructure

Provisions per-environment Supabase + Vercel projects and repo-global GitHub
config. Schema is NOT here (it lives in `migrations/`).

## Apply order

1. `envs/repo` — branch protection, required checks, environments (once)
2. `envs/dev` — Supabase + Vercel for dev
3. `envs/staging`, `envs/prod` — same modules, env-specific vars

## Credentials

Set `VERCEL_API_TOKEN`, `SUPABASE_ACCESS_TOKEN`, `TF_VAR_vercel_api_token`,
`TF_VAR_github_token`, `TF_VAR_supabase_db_password` (see this repo's onboarding).

## State

Remote state on HCP Terraform (workspaces `squad-app-{repo,dev,staging,prod}`,
Local execution mode). Alternative: an S3-compatible (R2) backend.

## Before first apply — fill these placeholders

The committed configs intentionally carry placeholders for account-specific values. Fill them before applying:

- `REPLACE_WITH_HCP_ORG` — your HCP Terraform org name, in every `envs/*/backend.tf` (`repo`, `dev`, `staging`, `prod`).
- `REPLACE_WITH_ORG_SLUG` — your Supabase organization slug, in every `envs/{dev,staging,prod}/terraform.tfvars`.
- Staging + prod domains — `envs/staging/terraform.tfvars` (`app_site_url`) and `envs/prod/terraform.tfvars` (`app_site_url` / `app_domain`); replace the `.example` values with your real URLs.

Secrets are supplied via environment (never committed): `TF_VAR_vercel_api_token`, `TF_VAR_github_token`, `TF_VAR_supabase_db_password`, and `SUPABASE_ACCESS_TOKEN`.

## Apply procedure

Credentials must be exported (see Credentials above).

> **Important:** Authenticate to HCP Terraform before `init` — run `terraform login` (writes `~/.terraform.d/credentials.tfrc.json`) or set `TF_TOKEN_app_terraform_io=<token>`. State lives on the HCP cloud backend, so `init` needs this.

Apply in this order:

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

```bash
terraform -chdir=infra/terraform/envs/dev output -raw database_url
```
