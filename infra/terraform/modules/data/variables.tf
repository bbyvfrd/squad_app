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
  type    = string
  default = "micro"
  validation {
    condition     = contains(["micro", "small", "medium", "large"], var.instance_size)
    error_message = "instance_size must be one of: micro, small, medium, large."
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
