variable "organization_id" {
  type        = string
  description = "Supabase organization slug."
}

variable "project_name" {
  type        = string
  description = "Supabase project name (unique per environment)."
}

variable "database_password" {
  type        = string
  sensitive   = true
  description = "Postgres password for the project."
}

variable "region" {
  type        = string
  description = "Supabase region, e.g. eu-central-1."
}

variable "instance_size" {
  # null omits the arg — required for free-plan Supabase orgs, which reject an
  # explicit instance size (402 "cannot be specified for free plan"). Set a real
  # size only on a paid org.
  type    = string
  default = null
  validation {
    condition     = var.instance_size == null || contains(["micro", "small", "medium", "large"], var.instance_size)
    error_message = "instance_size must be null or one of: micro, small, medium, large."
  }
}

variable "network_restrictions" {
  type        = list(string)
  default     = ["0.0.0.0/0", "::/0"]
  description = "CIDR allowlist for the database. Tighten in staging/prod."
}

variable "site_url" {
  type        = string
  description = "Auth site URL for redirect handling."
}
