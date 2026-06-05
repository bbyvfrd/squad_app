variable "github_owner" {
  type = string
}

variable "github_repository" {
  type = string
}

variable "github_token" {
  type      = string
  sensitive = true
}

variable "production_reviewer_user_ids" {
  type    = list(string)
  default = []
}
