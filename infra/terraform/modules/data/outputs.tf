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
