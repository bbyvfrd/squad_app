module "repo" {
  source = "../../modules/repo"

  github_owner                 = var.github_owner
  repository                   = var.github_repository
  production_reviewer_user_ids = var.production_reviewer_user_ids
}
