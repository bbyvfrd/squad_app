terraform {
  required_providers {
    github = {
      source  = "integrations/github"
      version = "~> 6.0"
    }
    tfe = {
      source  = "hashicorp/tfe"
      version = "~> 0.60"
    }
  }
}

provider "github" {
  owner = var.github_owner
  token = var.github_token
}

# Reads TFE_TOKEN from the environment.
provider "tfe" {
  organization = var.hcp_organization
}
