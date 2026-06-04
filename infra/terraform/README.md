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
