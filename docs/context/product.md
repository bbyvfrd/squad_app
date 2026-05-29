# Product — Multi-Sport Coordination App (v1)

> Reference, distilled from the brainstorm vault (Phase 1 PRD + MVP build spec). The vault is the source of truth — do not re-decide scope here.

## What we're building

Recreational sports coordination for Azerbaijan. It replaces messy chat/call coordination with one clear loop: organizers create games, players request spots, organizers approve or decline, and approval confirms the spot. It is **not** a booking or payments product in v1.

## Core loop

1. Sign up / log in.
2. (Client) choose mode: player, organizer, or both.
3. Organizer creates a game.
4. Player browses, opens detail, requests a spot.
5. Organizer approves/declines → **approved = confirmed** (no payment, no second confirmation).
6. Venue info shows as read-only context.

## Personas

- **Organizer (hero).** Creates games; reviews and approves/declines requests; sees approved players, pending requests, and spots left; marks basic cancellations.
- **Player (secondary).** Browses and filters by sport; views game detail; requests a spot; sees an explicit status.
- **Venue owner (tertiary).** Creates, edits, and previews a venue **listing** only — no games, bookings, calendars, or analytics.

## Locked scope

| Area | Decision |
|---|---|
| Hero user | Organizer |
| Launch geography | Azerbaijan-wide (don't hard-code geo) |
| First UI language | English |
| Sports | football, basketball, tennis, volleyball, padel, running, gym/fitness, swimming |
| Surfaces | Client app (players + organizers); venue owner app (venue owners) |
| Client onboarding | player, organizer, or both |
| Venue owner role | manage listings only |
| Participation | requests require organizer approval |
| Confirmation | approval immediately confirms the spot (no extra step) |
| Cancellation/dropout | basic status tracking only |

## Surfaces & screens

- **Client app** (`/app`): signup/login + mode selection · organizer dashboard · browse games · game detail · create game · request management · venue detail (read-only).
- **Venue owner app** (`/venue`): signup/login · dashboard · create listing · edit listing · listing preview.

## Domain model (product objects — not the final schema)

| Object | Key fields |
|---|---|
| **User** | id, name, email, account surface (`client`\|`venue_owner`), client mode (`player`\|`organizer`\|`both`), created_at |
| **Venue** | id, owner_user_id, name, supported_sports[], location_text, contact_info, description, created_at |
| **Game** | id, organizer_user_id, optional venue_id, sport, title, datetime, max_players, location_text, notes, created_at |
| **GameParticipant** | id, game_id, user_id, status (`requested`\|`approved`\|`declined`\|`cancelled`), created_at |

## States

- **Client modes:** player / organizer / both.
- **Participation:** requested / approved / declined / cancelled.
- **Screen states:** loading / loaded / empty / validation error / save failure / load failure / success.

## In scope

Client app (player + organizer), venue owner app (listings only), organizer-first game creation + request management, player browse/detail/request, approval-based participation, basic cancellation status, the fixed eight sports, Azerbaijan-wide scope, English UI, read-only venue context.

## Out of scope (v1)

Payments/deposits/refunds/checkout · venue booking calendars or availability · maps · in-app chat · ratings/reviews/reputation · waitlists/replacement/penalties/fairness rules · admin panel · venue analytics · venue-owner game creation · tournaments/leagues/teams · native mobile.

## Success criteria

A user can sign up, choose a mode, browse games by sport, create a game, request to join, approve/decline as an organizer, see an approved spot with no payment or extra confirmation, and create/edit a venue listing. The product must make the core loop real — it does not need to be polished or monetizable first.
