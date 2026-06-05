terraform {
  required_version = ">= 1.7"
  cloud {
    organization = "REPLACE_WITH_HCP_ORG"
    workspaces {
      name = "squad-app-repo"
    }
  }
}
