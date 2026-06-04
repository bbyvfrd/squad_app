mock_provider "vercel" {}

variables {
  project_name = "squad-app-test"
  git_repo     = "acme/squad-app"
  domain       = ""
  environment_variables = [
    {
      key       = "NEXT_PUBLIC_SUPABASE_URL"
      value     = "https://example.supabase.co"
      target    = ["production"]
      sensitive = false
    },
  ]
}

run "no_domain_resource_when_blank" {
  command = plan
  assert {
    condition     = length(vercel_project_domain.this) == 0
    error_message = "No domain resource should be planned when domain is empty."
  }
}

run "one_domain_resource_when_set" {
  command = plan
  variables {
    domain = "app.example.com"
  }
  assert {
    condition     = length(vercel_project_domain.this) == 1
    error_message = "Exactly one domain resource should be planned when a domain is set."
  }
}
