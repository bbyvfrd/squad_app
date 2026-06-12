terraform {
  required_version = ">= 1.7"
  cloud {
    organization = "SQUAD_APP"
    workspaces {
      name = "squad-app-dev"
    }
  }
}
