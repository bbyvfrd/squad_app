output "vercel_project_id" {
  value = module.app.project_id
}

output "database_session_url" {
  value     = module.data.database_session_url
  sensitive = true
}
