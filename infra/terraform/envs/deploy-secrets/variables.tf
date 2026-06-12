variable "hcp_organization" { type = string }
variable "github_owner" { type = string }
variable "github_repository" { type = string }
variable "github_token" {
  type      = string
  sensitive = true
}
variable "vercel_api_token" {
  type      = string
  sensitive = true
}
variable "vercel_org_id" { type = string }
variable "staging_url" {
  type        = string
  description = "Public production domain of the staging Vercel project (smoke target)."
}
variable "prod_url" {
  type        = string
  description = "Public production domain of the prod Vercel project (health-gate target)."
}
