terraform {
  required_providers {
    vercel = {
      source  = "vercel/vercel"
      version = "~> 4.8"
    }
    supabase = {
      source  = "supabase/supabase"
      version = "~> 1.0"
    }
  }
}

provider "vercel" {
  api_token = var.vercel_api_token
  team      = var.vercel_team
}

# Reads SUPABASE_ACCESS_TOKEN from the environment.
provider "supabase" {}
