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
  contract    = jsondecode(file("${path.module}/../../env-contract.json"))
  env_targets = ["production", "preview", "development"]
  secret_keys = toset(["DATABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"])

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
      key   = key
      value = local.env_values[key]
      # NOT marked sensitive: the deploy builds via `vercel build --prebuilt` in
      # CI, which runs `vercel pull` — and pull cannot read back Vercel "sensitive"
      # vars, so a prebuilt build can't see DATABASE_URL / the service-role key and
      # fails env validation. Vercel project access (yours) is the control. DB +
      # service-role still skip the unused `development` target.
      target    = contains(local.secret_keys, key) ? ["production", "preview"] : local.env_targets
      sensitive = false
    }
  ]
}
