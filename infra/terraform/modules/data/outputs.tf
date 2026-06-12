locals {
  # Supabase's pooler API returns connection strings with a literal
  # "[YOUR-PASSWORD]" placeholder, NEVER the real password — inject the password
  # we set on the project so the strings actually authenticate (the bare pooler
  # URL fails with 28P01 "password authentication failed"). Literal replace (the
  # search is not wrapped in //, so it's not a regex) is safe for any password.
  database_url = replace(
    data.supabase_pooler.this.url["transaction"],
    "[YOUR-PASSWORD]",
    var.database_password
  )

  # Migrations need SESSION mode (port 5432): the transaction pooler (6543)
  # rejects the prepared statements drizzle-kit's driver uses, and the direct
  # db.<ref>.supabase.co host is IPv6-only (unreachable from GitHub-hosted
  # runners). Supavisor serves session mode on the SAME pooler host at 5432, so
  # when the provider exposes no "session" key, derive it by port-swapping the
  # transaction URL — then inject the password the same way.
  database_session_url = replace(
    try(
      data.supabase_pooler.this.url["session"],
      replace(data.supabase_pooler.this.url["transaction"], ":6543/", ":5432/")
    ),
    "[YOUR-PASSWORD]",
    var.database_password
  )
}

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
  value       = local.database_url
  sensitive   = true
  description = "Pooled (transaction) connection string for the running app."
}

output "database_session_url" {
  value       = local.database_session_url
  sensitive   = true
  description = "Session-mode pooled connection string (DDL-capable, for migrations)."
}
