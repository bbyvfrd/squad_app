output "staging_environment" {
  value = github_repository_environment.staging.environment
}

output "production_environment" {
  value = github_repository_environment.production.environment
}
