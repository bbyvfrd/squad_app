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
