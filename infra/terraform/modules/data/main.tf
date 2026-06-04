terraform {
  required_providers {
    supabase = {
      source  = "supabase/supabase"
      version = "~> 1.0"
    }
  }
}

resource "supabase_project" "this" {
  organization_id   = var.organization_id
  name              = var.project_name
  database_password = var.database_password
  region            = var.region
  instance_size     = var.instance_size

  lifecycle {
    # Changing the password must not silently destroy/recreate the project.
    ignore_changes = [database_password]
  }
}

resource "supabase_settings" "this" {
  project_ref = supabase_project.this.id

  network = jsonencode({
    restrictions = var.network_restrictions
  })

  api = jsonencode({
    db_schema            = "public,storage,graphql_public"
    db_extra_search_path = "public,extensions"
    max_rows             = 1000
  })

  auth = jsonencode({
    site_url = var.site_url
  })
}

# Read back the generated keys and pooled connection string.
data "supabase_apikeys" "this" {
  project_ref = supabase_project.this.id
}

data "supabase_pooler" "this" {
  project_ref = supabase_project.this.id
}
