variable "environment" { type = string }
variable "project_slug" { type = string }
variable "git_repo" { type = string }

variable "vercel_api_token" {
  type      = string
  sensitive = true
}
variable "vercel_team" {
  type    = string
  default = null
}

variable "supabase_org_id" { type = string }
variable "supabase_region" { type = string }
variable "supabase_instance_size" {
  type    = string
  default = "micro"
}
variable "supabase_db_password" {
  type      = string
  sensitive = true
}

variable "app_site_url" { type = string }
variable "app_domain" {
  type    = string
  default = ""
}
