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

output "database_session_url" {
  # Migrations need a session-mode connection: the transaction pooler (6543)
  # rejects the prepared statements drizzle-kit's driver uses, and the DIRECT
  # db.<ref>.supabase.co host is IPv6-only by default — unreachable from
  # GitHub-hosted runners (no IPv6 egress). Supavisor serves session mode on
  # the SAME pooler host at port 5432, so when the provider's `url` map has no
  # "session" key (default projects expose only "transaction"), derive it by
  # port swap. The ":6543/" anchor deliberately includes the path slash: the
  # URL embeds the DB password, and replace() hits every occurrence — anchoring
  # on port+path keeps a freak password containing ":6543" out of reach.
  # After the first apply, confirm the real keys:
  #   terraform console → data.supabase_pooler.this.url
  value = try(
    data.supabase_pooler.this.url["session"],
    replace(data.supabase_pooler.this.url["transaction"], ":6543/", ":5432/")
  )
  sensitive   = true
  description = "Session-mode pooled connection string (DDL-capable, for migrations)."
}
