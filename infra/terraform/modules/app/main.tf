terraform {
  required_providers {
    vercel = {
      source  = "vercel/vercel"
      version = "~> 4.8"
    }
  }
}

resource "vercel_project" "this" {
  name      = var.project_name
  framework = "nextjs"

  # Link Git only when a repo is given (prod, for PR previews). dev/staging
  # deploy via the CLI (Plan 4), so they need no Git link — this also stops the
  # same repo from spawning preview deploys across all three projects.
  git_repository = var.git_repo == "" ? null : {
    type              = "github"
    repo              = var.git_repo
    production_branch = var.production_branch
  }
}

resource "vercel_project_environment_variables" "this" {
  project_id = vercel_project.this.id
  variables  = var.environment_variables
}

resource "vercel_project_domain" "this" {
  count      = var.domain == "" ? 0 : 1
  project_id = vercel_project.this.id
  domain     = var.domain
}
