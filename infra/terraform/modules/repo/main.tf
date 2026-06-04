terraform {
  required_providers {
    github = {
      source  = "integrations/github"
      version = "~> 6.0"
    }
  }
}

data "github_repository" "this" {
  full_name = "${var.github_owner}/${var.repository}"
}

resource "github_branch_protection" "main" {
  repository_id                   = data.github_repository.this.node_id
  pattern                         = "main"
  enforce_admins                  = true
  require_conversation_resolution = true

  required_status_checks {
    strict   = true
    contexts = var.required_status_check_contexts
  }

  required_pull_request_reviews {
    required_approving_review_count = var.required_approving_review_count
    dismiss_stale_reviews           = true
  }
}

# Staging: deploy gate with no human approval (auto-promote after CI).
resource "github_repository_environment" "staging" {
  repository  = var.repository
  environment = "staging"

  deployment_branch_policy {
    protected_branches     = true
    custom_branch_policies = false
  }
}

# Production: the manual approval gate (§5 deploy flow).
resource "github_repository_environment" "production" {
  repository          = var.repository
  environment         = "production"
  prevent_self_review = var.prevent_self_review

  # Empty list = NO required reviewer; the prod gate is real only when the
  # caller supplies a reviewer id (see envs/repo, Task 8).
  reviewers {
    users = var.production_reviewer_user_ids
  }

  deployment_branch_policy {
    protected_branches     = true
    custom_branch_policies = false
  }
}
