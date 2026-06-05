# SEAM MODULE — intentionally has no resources in v1.
#
# The app already ships as a portable container (Dockerfile, Plan 1) that CI
# builds and scans (Plan 2). When serverless (Vercel) is outgrown, the
# container-host path (Cloud Run / ECS / Kubernetes) is implemented HERE behind
# this module's interface, so adoption is additive — not a rewrite.
#
# See docs/adr/0001-container-host-migration-path.md.
terraform {
  required_version = ">= 1.7"
}
