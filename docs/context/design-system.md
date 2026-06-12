# Design System — SQUAD (v1.5.0)

> The configured visual design system. **Canonical files live in `design/`** (synced from the founder's design project via the brainstorm vault — treat them as the source of truth; don't edit them to "clean up"):
>
> - `design/colors_and_type.css` — **the single source of truth.** Tokens (ramps, role tokens, semantic families, type, spacing, radii, motion), the dark theme, self-hosted `@font-face` rules, and every canonical `.sq-*` component.
> - `design/tokens.json` — generated W3C DTCG mirror of the CSS for engineering handoff. Regenerated when tokens change; never hand-edit as the primary.
> - `design/README.md` — the prose rules: voice & casing, visual foundations, component guide, theming, iconography. (Two known stale spots: it still says Material Symbols loads from a CDN — the CSS self-hosts it; and it points to a deleted `components/StatusBadge.jsx` — status mapping lives in `.sq-badge` variants now.)
> - `design/CONTRIBUTING.md` — the anti-drift contract: naming (`.sq-*` canonical vs `.sqk-*` kit-local), the **role-token rule**, the AA contrast gate, how to add components/tokens.
> - `design/CHANGELOG.md` — semver history (v1.0 → v1.5.0).
> - `design/preview/` — one rendered card per component/foundation; `preview/a11y_contrast.html` computes live WCAG ratios (AA is the floor).
> - `design/ui_kits/squad_app/` — reference Home + Games screens composed entirely from canonical classes.
> - `design/assets/` — locked logos (mark, horizontal, stacked) + approved tints.
> - `design/fonts/` — the self-hosted fonts the CSS references (Montserrat + Karla variable fonts, Material Symbols Outlined). The full static-weight set lives in the vault bundle.

## Headline rules (60-second version)

- **Brand:** SQUAD. One accent — **Fired Terracotta `#EE4721`** — used as a **spike, not a wash**: one terracotta element per surface, ≤~15% of any composition, never body text, **never a status color**.
- **Mode:** **light-default** (Warm Linen `#EBE7DB` page; no pure black or white — Jet Ink `#13222C` is "black", Pressed Bone `#F5F2E9` is "white"). Dark mode is a **role-token theme**: set `data-theme="dark"`; the product ships a light/dark toggle.
- **Type:** **Montserrat** (signage voice — display, headline, title, labels, kickers, buttons, numbers) + **Karla** (reading voice — body, lede, forms, metadata). **No mono font.** **Italic is forbidden** — the terracotta color spike is the emphasis device. `tabular-nums` on every digit column.
- **Status colors** (semantic, never brand): success **Turf Green** / warning **Ochre** (takes dark text) / error **Signal Red** / info **Slate Blue**. Sport **identity** tints (`.sq-sport-*`) and the skill ladder (`.sq-skill.lv-1…5`) are identity, never status.
- **Posture:** flat surfaces (no gradients, glass, or blur); two named shadows only (Hero Lift; Card Lift on interactive-card hover); two container reads — crisp 6px data panel vs soft 16px `.sq-card` for anything tappable; 1px warm hairline is the only border.
- **The role-token rule (most important):** components reference role tokens (`--bg-page/-surface/-elevated/-input/-track`, `--fg-primary/-body/-caption/-muted`, `--rule-hairline/-strong`, `--shadow-card-lift`, `--accent-text`) — **never raw `--linen-*`/`--steel-*` ramps**. A raw-ramp component is light-only and won't theme.

## Canonical component API

All in `colors_and_type.css`, all role-token based (they theme for free):

| Need | Class |
| --- | --- |
| Button (primary/secondary/outline/ghost; sm/lg) | `.sq-btn .sq-btn-*` |
| In-app status badge | `.sq-badge .is-open/.is-filling/.is-waiting/.is-cancelled/.is-full/.is-host/.is-terra` |
| Card surface (tappable) | `.sq-card` (+ `.is-interactive`) |
| Capacity / roster bar | `.sq-spots .is-open/.is-filling/.is-full` |
| Avatar stack | `.sq-avatars` / `.sq-av` |
| Skill tag (5 tiers) | `.sq-skill .lv-1…lv-5` |
| Filter pill / sport tile | `.sq-chip` / `.sq-sportchip` + `.sq-sport-*` |
| Alert / status / dot | `.sq-alert.is-*` / `.sq-status(-soft).is-*` / `.sq-dot.is-*` |
| Text fields & choice controls | `.sq-input` family, `.sq-check`, `.sq-choice`, `.sq-switch`, `.sq-segment`, `.sq-stepper`, `.sq-range` |
| Bottom sheet / toast / skeleton | `.sq-scrim`+`.sq-sheet` / `.sq-toast` / `.sq-skeleton` |
| Bottom tabs / top bar / icon button | `.sq-tabbar`+`.sq-tab` / `.sq-topbar` / `.sq-iconbtn` |

Icons: **Material Symbols Outlined**, self-hosted, ligature markup — `<span class="sq-icon">sports_soccer</span>`; FILL 0, wght 500; sizes 16/20/24/32/48.

## Integration notes (the bridge)

- **Delivery format:** SQUAD ships as **CSS custom properties + vanilla `.sq-*` classes**, _not_ Tailwind/shadcn. The planned stack is Tailwind + shadcn/ui, so the bridge must choose: **(a)** map tokens into the Tailwind theme (Tailwind v4 `@theme` can consume the CSS variables; `tokens.json` is the machine input) and re-express components as React components on those tokens, or **(b)** ship `colors_and_type.css` as-is and wrap `.sq-*` classes in thin React components. Pick one before building screens — never mix the two vocabularies. Whatever the choice, **preserve the role-token rule and the `data-theme="dark"` mechanism**.
- **Fonts:** self-hosted — no Google Fonts `<link>`, no CDN. Wire `design/fonts/` through `next/font/local` (or copy to `public/fonts/` and keep the `@font-face` rules). Montserrat = `--font-sans`, Karla = `--font-body`.
- **Sport keys:** the CSS says `.sq-sport-soccer`; the product vocabulary and DB seed say `football`. Reconcile **once** in the bridge layer (a mapping or a class rename), not per screen.
- **Assets:** logo PNGs live in `design/assets/`; copy what the app needs to `public/` at build time.
- **Adherence:** `design/_adherence.oxlintrc.json` is the design project's lint config for component imports — a useful seed if we later add design-adherence linting to the app.

## v1 scope vs the system (important)

SQUAD designs a **superset** of v1. The kit and CSS carry vocabulary for **waitlists** (`.sq-badge.is-waiting`), payments glyphs, ratings, win/leaderboard patterns. **v1 uses only the subset product scope allows** (see `product.md` / `decisions.md`): no payments, waitlists, ratings, scores, teams, or live-match. A component existing in the system is **not** permission to ship that feature.

- The v1 voice-avoid list (no "Pay / Checkout / Book now / Waitlist") still holds, even though the design system's general vocabulary permits them.

## Status mapping (v1)

Per the design system's own semantic definitions (success = "confirmed, locked"; warning = "unconfirmed, pending, attention"; error = "cancelled, failed"):

| Status | SQUAD treatment | Reads as |
| --- | --- | --- |
| participation `requested` | warning **soft** (`.sq-status-soft.is-warning` / Ochre wash) | pending, needs organizer attention |
| participation `approved` | success (`.sq-badge.is-open` family / Turf Green) | confirmed spot |
| participation `declined` | neutral jet/muted — no semantic color | clear, not aggressive |
| participation `cancelled` | error **soft** (Signal Red wash) | cancelled, calm not alarming |
| game `open` | success | accepting requests |
| game `full` (derived) | jet (`.sq-badge.is-full`) | no spots left |
| game `cancelled` | error soft | game off |

(Reserve solid Signal Red for destructive actions and true failures; terracotta is never a status.)
