# Changelog

All notable changes to the SQUAD Design System. Semver; newest first. The CSS (`colors_and_type.css`) is the source of truth — every entry below is reflected there and in `tokens.json`.

## [1.5.0] — 2026-06-04 · Governance

- **Contrast card** (`preview/a11y_contrast.html`) — live WCAG ratios for every load-bearing pairing, light + dark, with AA pass/fail. Surfaces three size-restricted pairs (terracotta text 3.06, Caption Ash 4.23, solid Turf Green + linen 3.79).
- **`tokens.json`** — W3C DTCG machine-readable token export for engineering handoff.
- **`CONTRIBUTING.md`** — anti-drift rules: source of truth, the `.sq-*` / `.sqk-*` naming contract, the role-token rule, how to add components/tokens, the contrast gate.
- **`CHANGELOG.md`** — this file.

## [1.4.0] — 2026-06-04 · Navigation

- Promoted navigation to canonical: **`.sq-tabbar` / `.sq-tab`** (bottom nav, active = terracotta spike → Heat in dark), **`.sq-topbar`** (app bar with title/`is-lg`/spacer/actions/`has-rule`), **`.sq-iconbtn`** (shared 40px affordance, filled or ghost).
- UI kit refactored to consume them; duplicate tab-bar CSS removed from `kit.css`; Games header now a `.sq-topbar`.
- Added `preview/components_nav.html`.

## [1.3.0] — 2026-06-04 · Feedback & overlay

- Added **`.sq-scrim` / `.sq-sheet`** (bottom sheet), **`.sq-toast`** (snackbar with solid semantic icon chip), **`.sq-skeleton`** (loading shimmer, reduced-motion aware).
- All role-token based — themed into dark for free.
- Added `preview/components_sheet.html`, `components_toast.html`, `components_skeleton.html`.

## [1.2.0] — 2026-06-04 · Dark mode

- Introduced the **role-token layer** (`--bg-surface/-elevated/-input/-track`, `--fg-primary/-body/-caption/-muted`, `--rule-hairline/-strong`, `--shadow-card-lift`, `--accent-text`) and a **`[data-theme="dark"]`** theme. Surfaces climb the steel ramp, ink inverts, semantic washes retune, the skill ladder inverts; identity ramps and semantic solids never move.
- Refactored every canonical `.sq-*` component, all form inputs, and the UI-kit chrome to consume role tokens.
- Theme toggle added to the UI kit; `preview/colors_theme.html` (light/dark) added.
- **Note:** components must reference role tokens, not raw ramps, or they won't theme. See CONTRIBUTING.

## [1.1.0] — 2026-06-04 · Reconciliation

- Promoted the shipped mobile-app components into canonical `.sq-*`: **`.sq-btn`** (chunky glossy terracotta primary), **`.sq-badge`** (Montserrat semantic), **`.sq-card`** (soft 16px, inset hairline, hover lift), **`.sq-spots`** (capacity bar), **`.sq-avatars`**, **`.sq-skill`** (graded 1–5), **`.sq-chip`**, **`.sq-sportchip`** + **`.sq-sport-*`** identity tints.
- Rebuilt `ui_kits/squad_app/` as the real Home + Games screens, composed entirely from canonical classes (only chrome is `.sqk-*`). Removed the stale, divergent prototype.
- **Self-hosted Material Symbols** (`fonts/MaterialSymbolsOutlined.woff2`) — the system now has zero external dependencies.
- Fixed the `.sq-label` override conflict; documented the soft-card evolution and the two badge voices.
- Added `preview/components_gamecard.html`, `colors_sport.html`; refreshed `components_buttons.html`, `components_badges.html`.

## [1.0.0] — baseline

- Foundations: terra / steel / linen ramps, four semantic families, type roles (Montserrat + Karla), the 8-grid, radii, the two shadows, motion, Material Symbols icons, and the full form-input layer (`.sq-input` family, choice controls, segmented/stepper/range).
