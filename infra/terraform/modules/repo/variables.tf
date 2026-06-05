variable "github_owner" {
  type = string
}

variable "repository" {
  type = string
}

variable "required_status_check_contexts" {
  type = list(string)
  # Must match job names in .github/workflows/ci.yml.
  default = [
    "secret-scan", # Plan 2
    "lint",        # Plan 2
    "test",        # Plan 2
    "sast",        # Plan 2
    "vuln-scan",   # Plan 2
    "build-image", # Plan 2
    "e2e",         # Plan 2
    "tf-check",    # Plan 3 (Task 9)
    "parity",      # Plan 3 (Task 9)
  ]
}

variable "required_approving_review_count" {
  type    = number
  default = 0 # solo founder: enforce PR + CI, but no approver needed
  validation {
    condition     = var.required_approving_review_count >= 0 && var.required_approving_review_count <= 6
    error_message = "required_approving_review_count must be between 0 and 6."
  }
}

variable "production_reviewer_user_ids" {
  type        = list(string)
  default     = []
  description = "GitHub user IDs that may approve production deploys. Solo: your own id."
}

variable "prevent_self_review" {
  type    = bool
  default = false # solo founder approves their own prod deploy as the checkpoint
}
