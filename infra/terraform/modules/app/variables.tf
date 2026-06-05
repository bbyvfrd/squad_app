variable "project_name" {
  type        = string
  description = "Vercel project name (unique per environment)."
}

variable "git_repo" {
  type        = string
  default     = ""
  description = "GitHub repo in owner/name form to link for PR previews; empty = no Git link (CLI-only deploys). Link only one project (prod) to avoid duplicate previews across environments."
}

variable "production_branch" {
  type    = string
  default = "main"
}

variable "environment_variables" {
  type = list(object({
    key       = string
    value     = string
    target    = list(string)
    sensitive = bool
  }))
  description = "Env vars to set on the Vercel project."
}

variable "domain" {
  type        = string
  default     = ""
  description = "Custom domain to attach; empty string attaches none."
}
