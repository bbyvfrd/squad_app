# ADR 0001 — Container-host migration path (compute seam)

- Status: Accepted
- Date: 2026-05-29

## Context

v1 hosts on Vercel for speed and zero ops. The portable-seams design requires
that leaving serverless later is a migration, not a rewrite. Container
orchestration (K8s/ECS/Cloud Run) is premature before there is real load.

## Decision

Defer container orchestration. Keep the seam ready:

- The app builds to a standalone container (Dockerfile, Plan 1), built and
  vulnerability-scanned in CI (Plan 2).
- `infra/terraform/modules/compute/` exists as an empty, interface-only module.
- App code touches no Vercel-only APIs (the `lib/` adapter rule), so the
  runtime is swappable.

## Consequences

- Now: no orchestration cost or complexity; Vercel atomic deploys serve as
  blue-green (Plan 4).
- Later: implement `modules/compute` (e.g. Cloud Run), point DNS at it, and
  reuse the existing image and CI unchanged. Canary/progressive delivery
  (Argo Rollouts / Flagger) is added at that point, not before.
