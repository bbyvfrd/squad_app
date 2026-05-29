# Glossary

> Domain vocabulary and market benchmarks. Deeper competitor profiles and pattern write-ups live in the brainstorm vault.

## Domain terms

- **Client app** — the surface for players and organizers (`/app`).
- **Venue owner app** — the surface for venue owners (`/venue`); listings only.
- **Organizer** — hero user; creates games and approves/declines participation.
- **Player** — requests spots in games and receives explicit status.
- **Venue owner** — publishes a venue listing that appears as read-only context on games.
- **Game** — a scheduled session in one of the eight sports, created by an organizer.
- **Game participant** — a user's relationship to a game, carrying a status.
- **Participation status** — `requested` → `approved` / `declined`; or `cancelled`.
- **Client mode** — `player` / `organizer` / `both` (a single user can do both).
- **Core loop** — create game → request → approve → confirmed.
- **The eight sports** — football, basketball, tennis, volleyball, padel, running, gym/fitness, swimming.

## Market benchmarks (reference only — not targets)

- **Playo** (India) — multi-sport marketplace + community; the closest analogue to this product.
- **Playtomic** (Spain/global) — racket sports; best-in-class matchmaking + split-payment mechanics.
- **Hudle** (India) — Playo's rival; partnership/celebrity-led growth.
- **Sportsman Web** (US) — B2B venue-operator SaaS (the incumbent venue-management tooling).

## Patterns observed in the market (reference, non-binding)

These are how Playo-scale platforms work. They are **not** v1 commitments — most solve problems v1 doesn't have yet.

- **Double-booking prevention** — relational uniqueness → optimistic concurrency → distributed locks. v1 is approval-based (not contended slot-booking), so the simplest relational end applies.
- **Geospatial discovery** — "venues near me"; a plain indexed SQL distance query likely suffices at low venue density (Redis GEO / PostGIS / H3 are later upgrades).
- **Split payment models** — card-on-file guarantees that clubs get paid; **out of v1** (payments deferred).
- **Matchmaking & gamification** — skill ratings, loyalty/Karma loops; not v1, but inform later phases.
