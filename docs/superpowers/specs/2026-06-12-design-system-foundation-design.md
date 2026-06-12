# Design-System Foundation Slice — Design

**Status:** Design (brainstormed 2026-06-12) — approved direction; awaiting spec review before the implementation plan (Plan 06).
**Source of truth:** the SQUAD design system v1.5.0 in `docs/context/design/` (synced from the vault, PR #16). `colors_and_type.css` is the system; this spec describes how the app consumes it.
**Context:** the founder is concurrently designing app screens in Claude Design with this exact system. This slice deliberately builds everything *below* the screen level — vendored tokens, fonts, theming, typed component wrappers, app shell — and **no app screens**. Screens arrive later as composition work.

## Goal

Make the app speak SQUAD natively: any screen designed with the v1.5 canonical system can be composed in this codebase from typed React components, in both themes, with the design system upgradeable by file-swap.

## Locked decisions (from brainstorm, founder-approved)

- **Bridge approach = hybrid.** `colors_and_type.css` ships verbatim as the app's design layer (canonical `.sq-*` classes remain the only implementation of component looks), AND role tokens are mapped into Tailwind v4 via `@theme inline` so utilities understand them. Full translation to Tailwind components was rejected (forks the system; every upstream release becomes manual porting). Adopt-as-is-without-token-map was rejected (leaves Tailwind's stock palette as a back door).
- **The vocabulary law.** `.sq-*` classes are the only way a canonical component gets its look — never restyle one with utilities. Token-mapped Tailwind utilities are for layout (flex/grid/gap/size) and bespoke surfaces with no canonical component. Tailwind's default palette is **removed** (`--color-*: initial`) so off-system colors fail at compile time.
- **shadcn/ui is NOT initialized in this slice.** It enters later, one primitive at a time, only for behavior the system lacks (popover/select panel/combobox/dialog behavior), each generated component immediately re-skinned to role tokens (map `--background: var(--bg-page)`, `--primary: var(--terra-500)`, `--destructive: var(--error-500)`, `--ring: var(--terra-500)`, radius from `--r-lg`; dark hook overridden to `data-theme`).
- **The role-token rule binds the app** (per `design/CONTRIBUTING.md`): new app-side styles reference role tokens, never raw `--linen-*`/`--steel-*` ramps. Raw ramps are deliberately *not* mapped to Tailwind utilities.
- **Fonts and icons stay self-hosted.** No CDN, no Google Fonts `<link>`.
- **Sport-key reconciliation happens once, in TypeScript** — never a CSS rename (would fork the canonical vocabulary).
- **Prerequisite (step 0):** PR #16 (design system v1.5 sync) is merged; this spec builds on those files.

## Architecture

### 1. Vendor pipeline (`scripts/sync-design-system.mjs`)

- Copies `docs/context/design/colors_and_type.css` → `src/styles/squad/colors_and_type.css` with exactly one mechanical transform: **strip the `@font-face` block** (fonts move to `next/font`, below). Byte-identical otherwise.
- Converts the 4 variable TTFs to **woff2** and subsets to `latin` + `latin-ext` (Azerbaijani names — ə in "Gənclik" — appear in real data even though UI is English). Outputs checked in under `src/styles/squad/fonts/`.
- Subsets `MaterialSymbolsOutlined.woff2` (3.9 MB full set) against `src/styles/squad/icon-inventory.txt` — a checked-in list of used icon ligature names — keeping the `liga` layout feature. Result is tens of KB.
- Writes/updates `src/styles/squad/VERSION` (`1.5.0`). **Upgrade procedure:** re-run the script, read `design/CHANGELOG.md`, re-run both-theme screenshot tests.

### 2. Fonts (`src/lib/fonts.ts`, wired in the root layout)

- `next/font/local`, three families: Montserrat (`weight: '100 900'`, normal + italic variable files, `variable: '--font-montserrat'`, `display: 'swap'`), Karla (`weight: '200 800'`, same shape, `--font-karla`), Material Symbols (`--font-icons`, **`display: 'block'`** — hides raw ligature text instead of flashing it, **`adjustFontFallback: false`** — metric fallback is meaningless for glyphs, `preload: true`).
- **Bridge re-point** (next/font generates private family names, so the canonical `--font-sans: 'Montserrat', …` won't match): one app-side override block after the vendored import — `:root { --font-sans: var(--font-montserrat), system-ui, sans-serif; --font-body: var(--font-karla), system-ui, sans-serif; }` and `.sq-icon { font-family: var(--font-icons); }`. These three lines are the *only* sanctioned edits layered over the vendored CSS.
- Remove the scaffold Geist fonts from `layout.tsx`.

### 3. Tailwind v4 bridge (`src/app/globals.css`)

Order matters: vendored CSS first, then the bridge.

- `@import` the vendored `colors_and_type.css`.
- **Neutralize the stock palette:** `@theme { --color-*: initial; }` before declaring ours.
- **`@theme inline` map** (inline is required — it emits the referenced var at the consuming element, which is exactly the fix for the system's documented "two-level aliases bake at `:root`" gotcha): role-token colors (`--color-page: var(--bg-page)`, `--color-surface: var(--bg-surface)`, `--color-elevated`, `--color-input`, `--color-track`, `--color-primary-fg: var(--fg-primary)`, body/caption/muted, rules, `--color-accent: var(--accent)`, `--color-accent-text: var(--accent-text)`), the four semantic families (solid/wash/text stops only), fonts, spacing (`--spacing-s1…s16`), radii (`--radius-xs…pill`, `--radius-card`), the two shadows, ease/duration tokens.
- **Not mapped:** raw ramps (`--terra-*`, `--steel-*`, `--linen-*`) — enforcing the role-token rule at the utility level.
- `@custom-variant dark (&:where([data-theme="dark"], [data-theme="dark"] *));` so any app-side `dark:` utility matches the system's mechanism.

### 4. Theming

- **next-themes** with `attribute="data-theme"`, `defaultTheme="light"` (brand is light-default), `enableSystem` on; client `providers.tsx` wrapped by the server root layout; `suppressHydrationWarning` on `<html>`. Its pre-hydration inline script prevents flash and keeps static rendering available (a cookie read would force dynamic rendering — rejected).
- Toggle = a `.sq-iconbtn` in `.sq-topbar-actions` (the system's own canonical placement).

### 5. Component wrapper layer (`src/components/ui/`)

Thin typed React wrappers over canonical classes — class composition (`cn` helper; CVA acceptable, it's only class strings), no visual re-implementation. Server components by default; client only where behavior demands.

| Wrapper | Canonical class | Behavior beyond CSS |
| --- | --- | --- |
| `Icon` | `.sq-icon` (+ size/fill modifiers) | renders ligature name; types restricted to the icon inventory |
| `Button` | `.sq-btn` + variants/sizes | — |
| `Badge`, `StatusBadge`, `Dot` | `.sq-badge .is-*`, `.sq-status(-soft)`, `.sq-dot` | variants from the mapping module |
| `Card` | `.sq-card` (+ `.is-interactive`) | — |
| `Spots` | `.sq-spots .is-*` | derived fill % |
| `AvatarStack` | `.sq-avatars`/`.sq-av` | overflow count |
| `SkillTag` | `.sq-skill .lv-1…5` | level from enum via mapping module |
| `Chip`, `SportChip` | `.sq-chip`, `.sq-sportchip` + `.sq-sport-*` | toggle state; sport class via mapping module |
| `Field/Input/InputRow/Textarea/Select` | `.sq-input` family | — (native controls; native `<select>` is the v1 picker) |
| `Check/Radio/Switch` | `.sq-check`, `.sq-choice`, `.sq-switch` | — (native inputs, CSS handles states) |
| `Segmented` | `.sq-segment` | radiogroup semantics + arrow-key roving focus (~40 lines, hand-rolled) |
| `Stepper` | `.sq-stepper` | clamping + `aria-live` value |
| `Alert` | `.sq-alert.is-*` | — |
| `Sheet` | `.sq-scrim`/`.sq-sheet` | **native `<dialog>.showModal()`** — top-layer, focus trap, Esc, scroll lock for free (~50 lines). If drag-to-dismiss is ever required, swap internals to Vaul behind the same props (seam pattern) |
| `Toast` | `.sq-toast` | hand-rolled store + queue + timers + `aria-live` (~80 lines); sonner only if stacking/swipe is later wanted |
| `Skeleton` | `.sq-skeleton` | — |
| `Tabbar`, `Topbar`, `IconButton` | `.sq-tabbar`/`.sq-tab`, `.sq-topbar`, `.sq-iconbtn` | Tabbar active state via `usePathname` + `<Link>` |

**Out of this slice:** popover/combobox/date-picker (no canonical component; first shadcn/Radix adoption point, when a screen needs one — v1 ships native `<select>` and `input[type=datetime-local]` styled by `.sq-input`).

### 6. Mapping module (`src/lib/ui/mappings.ts`)

The **single** product↔design reconciliation point:

- `SPORT_UI: Record<DbSportKey, { className, icon }>` keyed by the DB seed keys — `football → { 'sq-sport-soccer', 'sports_soccer' }`; the other 7 are identity (verified against `migrations/0001`).
- `skill_level` enum → `lv-1…lv-5` (beginner=1 … professional=5).
- Participation status → badge variant: `requested → is-waiting` (the warning-wash badge class; **copy reads "Pending" — never "Waitlist"**, which is out of v1 scope; only the class name is reused), `approved → is-open` (success), `declined →` neutral jet, `cancelled → is-cancelled` (error-soft). Copy strings per the voice rules (`docs/context/design-system.md`).

### 7. App shell

- `(client)` layout: mobile-width content container, `.sq-topbar` (logo lockup; theme toggle in actions), `.sq-tabbar` wired to the route group with active state, safe-area insets.
- `(venue)` layout: topbar-only shell (no tabbar) — venue surface is listings-only and barely exists yet.
- Proof page: style the `/app` stub into a mini-Home — one upcoming-game `Card` with `Badge`/`Spots`/`AvatarStack`/`SkillTag`, a sport rail from the DB-seeded sports through `SPORT_UI` — proving tokens, fonts, icons, both themes, and the mapping end-to-end.

## Error handling & edge cases

- **Icon inventory discipline:** an icon name not in the inventory renders as raw text. Mitigations: `Icon`'s name prop is typed from the inventory; CI grep fails if a `.sq-icon` literal in `src/` is missing from the inventory file.
- **Theme flash:** prevented by next-themes' inline script; verified by a Playwright check (load in dark → no light flash before first paint).
- **Container-scoped theming:** works because the token map is `@theme inline`; documented caveat — if shadcn vars are ever added, they are two-level aliases and must be re-declared inside the dark layer (same pattern the system uses for `--bg-card`).
- **Upstream majors:** a renamed `.sq-*` class breaks loudly at the wrapper's class string — wrappers are the declared seam; fix at the wrapper, never by forking the CSS.

## Testing

- Existing CI gates (lint, typecheck, Vitest, Playwright smoke, security scans) stay green throughout.
- New: both-theme screenshot tests of the proof page; theme no-flash check; axe accessibility pass on the proof page (the system claims AA — hold it to that); icon-inventory CI grep.
- The full core-loop E2E remains the *product* phase's gate, not this slice's.

## Out of scope (this slice)

App screens of any kind; shadcn initialization; discovery/auth/create-game flows; the SMS/OTP provider spike (parallel product-phase prep, not part of this slice's deliverable); venue surface beyond the bare shell.

## Sequencing (coarse — the implementation plan refines this)

0. Merge PR #16 (prerequisite). 1. Vendor pipeline + fonts. 2. Tailwind bridge + theming. 3. Wrappers (Icon/Button/Card/Badge/SportChip/Input first — they unblock screen work). 4. Mapping module. 5. Shell. 6. Proof page + tests + docs (write the vocabulary law into `CLAUDE.md`/`docs/context/architecture.md` as a convention).

Estimated ~5–6.5 dev-days. After this slice, screens exported from Claude Design are ingested via the vault pipeline and become composition work on top of these parts.

## Related

- `docs/context/design-system.md` — the system summary + status mapping this spec consumes.
- `docs/context/design/CONTRIBUTING.md` — the upstream contract the vocabulary law extends into the app.
- Vault: `wiki/log.md` [2026-06-12] entries (ingest, handoff, this decision); decision log entry of the same date.
