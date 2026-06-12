# SQUAD Design System

> A global app for finding, organizing, and joining recreational sports games. Built on heavy display type, fired terracotta, and tactical jet-and-navy. **"Built Chunky."**

SQUAD replaces scattered sports coordination — WhatsApp threads, group chats, friend networks — with one place to discover games and venues, organize and join with trust, and keep games from falling apart. Three audiences: **Players** finding games, **Organizers** running them, and **Venue operators** filling pitch time. Global by default, but the current wedge is **Baku, Azerbaijan, soccer first**.

This design system is the brand's source of truth: type, color, components, voice, iconography, and a high-fidelity UI kit recreating the live "Coming Soon" surface plus the in-app surfaces it implies.

---

## Sources

All sources were imported from the `SQUAD/` codebase mounted via local file system. They live in [`reference/`](./reference/) for posterity. The reader of this design system **does not need access** to the original repo.

| File | What it is |
|---|---|
| `reference/DESIGN.md` | The locked brand identity spec — colors, type, components, named rules. |
| `reference/DESIGN.json` | Machine-readable mirror of `DESIGN.md` with component HTML/CSS samples. |
| `reference/PRODUCT.md` | Audience, brand personality, anti-references, design principles. |
| `reference/project-brief.md` | Wedge thesis: Baku + soccer + organizer reliability. |
| `reference/squad-coming-soon.html` | The actual production landing page. The only ship-ready surface today. |
| `reference/brand-kit.jsx` | React brand-kit components used in the original design canvas. |

The product surface today is a single waitlist page. Everything in `ui_kits/` is a high-fidelity recreation of that page plus a logical extrapolation of the in-app screens implied by `PRODUCT.md`.

---

## Index

```
SQUAD Design System/
├── README.md                — you are here
├── SKILL.md                 — agent skill manifest (cross-compatible with Claude Code)
├── CONTRIBUTING.md          — anti-drift rules: naming contract, role tokens, contrast gate
├── CHANGELOG.md             — versioned history of the system
├── colors_and_type.css      — CSS vars: ramps, semantic roles, dark theme, type scale, components
├── tokens.json              — machine-readable token export (W3C DTCG) for engineering handoff
├── assets/                  — locked logos (mark, horizontal, stacked)
├── reference/               — original source files
├── preview/                 — design-system cards (Type, Colors, Spacing, Components, Brand)
└── ui_kits/
└── ui_kits/
    └── squad_app/           — in-app screens, built from the canonical .sq-* system
        ├── README.md
        ├── index.html       — Home + Games, in a design canvas
        ├── kit.css          — screen chrome only (.sqk-*); components are canonical .sq-*
        ├── phone.jsx        — device frame, status bar, tab bar, MIcon, sport map
        ├── screens-home.jsx — Home feed
        └── screens-games.jsx— Games browse
```

---

## Content Fundamentals

The brand's voice is **plain-speak, not corporate**. Direct, opinionated, no hedging, no buzzwords. Every line of copy carries the product's reliability promise without saying "reliable" out loud.

**Tone**

- **Direct.** "Find your game." "List a venue." "Join now." Verbs, not adjectives.
- **Opinionated.** SQUAD takes a stance. "Games happen. The platform doesn't flake."
- **Industrial-tactical-athletic.** Reads like signage on a working gym wall, not a fitness app push notification.
- **No hedging.** Avoid "perhaps," "maybe," "you might want to," "we believe." Say what's true.

**Casing**

- Display + Headline tiers: **UPPERCASE**.
- Labels + Kickers: **UPPERCASE**.
- Title and below: **Mixed-case** with no Title Caps Manuevers — sentence case in body, capital nouns where natural.
- Buttons: **UPPERCASE** with the canonical `0.06em` tracking.

**Pronouns**

- Use **"you"** when speaking to a single user role on a marketing surface ("Find **your** game"). Use **"we"** sparingly, only when the platform itself is the subject ("we don't share your phone number"). Avoid first-person plurals as filler.

**Punctuation**

- **No em dashes.** Use commas, colons, semicolons, periods, or parentheses.
- **No exclamation marks** in product UI. They cheapen the voice.
- Periods at end of sentences in body copy. Not in marquee headlines unless a single decisive period adds weight ("`A SQUAD HOLDS.`").

**Emoji**

- **Not used.** SQUAD's brand language is type, color, and tracked uppercase labels. Emoji read as casual app-chrome and break the signage feel. The terracotta color spike is the "expressive" element.

**Numbers**

- Tabular numerals (`font-variant-numeric: tabular-nums`) on every column of digits — score panels, stat blocks, timers, KPI rows.
- Pad single-digit timers to two characters: `03`, not `3`.

**Vibe checklist**

| ✅ | ❌ |
|---|---|
| "FIND YOUR GAME" | "Discover Amazing Sports Experiences" |
| "Soccer · 7v7 · Sahil Park" | "Have fun playing football! ⚽" |
| "Reliability built in." | "We're on a mission to revolutionize..." |
| "Join now" | "Get started today!" |
| "No bench. All front." | "Together, we move forward 💪" |

**Real example copy from the live site**

- Hero: `THE SQUAD IS COMING.`
- Sub: `One place for recreational sports. Find games. Run them. Get noticed.`
- Stat block label: `WIN RATE`, `AVG BREAK`, `TROPHIES`
- Ticker: `LIVE FEED · © 2026 SQUAD INC.`

---

## Visual Foundations

**The North Star: "Built Chunky."** SQUAD looks like the sign on the wall of a working gym, not the gradient on a fitness app. Heavy type, surgical color, flat surfaces, generous whitespace. Every surface should feel substantial enough to lean against.

### Color

- Three families: **Terracotta** (the accent voice, hue ~35°), **Steel** (the dark structural family, hue ~230°), and **Linen** (the warm neutral family, hue ~80°). 10-step ramps each.
- **The brand's "white"** is `linen-100 / Pressed Bone (#F5F2E9)`. **The brand's "black"** is `steel-700 / Jet Ink (#13222C)`. Pure `#000` and `#fff` are forbidden.
- The page background is `linen-200 / Warm Linen (#EBE7DB)`. Warmer than off-white. Sets a document-grade tone.
- **Terracotta is a spike, not a wash.** Use Fired Terracotta on one element per screen — a badge, a single accent word, one stat block, one button. Never as a body-text color. Never on more than ~15% of any composition.
- On dark surfaces where Fired loses contrast, swap to `terra-300 / Heat Terracotta`.

### Semantic & status color

The three brand families (terracotta / steel / linen) carry *identity*. They do not carry *state*. Production UI needs to say "this worked," "be careful," "this broke," and "for your information" — so the system adds four semantic families, each tuned to SQUAD's muted, warm, athletic temperature rather than stock Bootstrap brightness.

| Family | Name | Hue | Solid (500) | On-solid text | Means |
|---|---|---|---|---|---|
| **Success** | Turf Green | ~150° | `#3C8A52` | Linen | Confirmed, locked, paid, live |
| **Warning** | Ochre | ~75° | `#C68A1C` | **Pressed Jet** | Unconfirmed, pending, attention |
| **Error** | Signal Red | ~25° | `#CE2530` | Linen | Cancelled, failed, destructive |
| **Info** | Slate Blue | ~235° | `#2C6E9B` | Linen | Neutral notice, new, nearby |

Each family ships six stops: `--{family}-50` (wash bg), `100` (tint), `200` (border), `500` (solid anchor), `600` (pressed), `700` (text-on-light). Plus `--on-{family}` tokens encoding the fill-text rule.

**Named rules:**

- **The Semantic Separation Rule.** Fired Terracotta is the *brand accent*, never a status. Error is a true signal-red (hue ~25°, redder and deeper than terracotta's orange ~35°) so "something is wrong" never reads as "this is on-brand." **Never use `terra-500` to mean error or destructive**, and never use `error-500` as a decorative accent.
- **The Warning Text Rule.** The ochre warning solid takes Pressed Jet text, not Linen — exactly like the terracotta CTA Contrast Rule. Gold needs dark text to pass AA.
- **State, not decoration.** Semantic color only appears where it carries meaning (a status, an alert, a validation message). It is never a layout or mood color. A green card "because green is nice" is a violation.

**Surfaces built on these tokens** (all in `colors_and_type.css`):

- `.sq-alert.is-{variant}` — inline banner: wash background + a **solid icon chip** carrying the semantic color. No colored edge stripe — the chip carries the meaning, keeping the system clear of the banned border-accent trope.
- `.sq-status.is-{variant}` / `.sq-status-soft.is-{variant}` — solid and wash status badges.
- `.sq-dot.is-{variant}` and `.sq-dot.is-live` — the smallest signal; `is-live` pulses (and stills under reduced-motion).

**Mapped to product states** — the design system ties color to SQUAD's real vocabulary so engineers don't reinvent it per screen: Open = success, Filling fast = info, Waitlist = warning (soft), Cancelled = error (soft), Full = jet. See `ui_kits/squad_app/components/StatusBadge.jsx` (`GameStatusBadge`) for the single source of truth.


### Type

- **Two families.** **Montserrat** is the signage voice — display, headline, title, labels, kickers, buttons, and big numbers. **Karla** is the reading voice — body, lede, prose, form inputs, and metadata. Montserrat is `--font-sans`; Karla is `--font-body`.
- **Why this pairing.** Montserrat's open geometric caps give headlines presence without Inter Tight's cramped tracking; Karla is a friendly grotesque that's highly legible at body sizes and adds just enough contrast to feel intentional. Geometric display over humanist-grotesque text is a classic, safe split.
- **Body is Karla 400** / line-height 1.6 / normal tracking. `<strong>` is 700. Lede is Karla 500 / 24px.
- **Display + Headline are uppercase Montserrat.** Title and below mixed-case. Labels and kickers are always uppercase Montserrat.
- The Color Spike Rule: one accent word per headline in Fired Terracotta; everything else stays in Jet Ink at the same heavy weight. **Italic is forbidden** — color does the spike.
- **Tracking is near-neutral** on Montserrat: `-0.015em` Display, `-0.012em` Headline. Karla body runs at normal tracking.
- **Two label voices only:** Label (Montserrat 600 / 11px / 0.16em) and Kicker (Montserrat 700 / 12px / 0.22em). Use `font-variant-numeric: tabular-nums` on digit columns.

### Spacing

- Strict 8-grid: 8 / 16 / 24 / 32 / 40 / 48 / 56 / 64 / 80 / 96 / 112 / 128.
- Section vertical padding lives 80–140. Card internal padding lives 48–96. Hero card padding is 96 / 80.

### Backgrounds & imagery

- **Flat, no gradients, no glass, no backdrop-blur.** The system rejects glassmorphism wholesale. Depth is built from color shift (linen → bone → jet) and scale, not blur.
- The live landing page does carry one **subtle radial sweep** of terracotta (`rgba(238,71,33,0.12)`) drifting across a faint grid background — but this is a brand-surface signature, not a generic gradient. Use it sparingly.
- Imagery: **real people, real games**. Photography shows actual organizers, venues, players. Trust is earned by specificity, not stock polish. Imagery should lean **warm** (linen-temperature whites, terracotta highlights), never cold blue stock.
- **No hand-drawn illustrations** in product UI. The brand voice is signage, not whimsy. Decorative SVGs are limited to the **Diagonal Accent Rule** (a 4px-wide, 220px-tall vertical bar of Fired Terracotta, anchored bottom-left, once per surface max).

### Animation

- **Easing:** `cubic-bezier(0.25, 1, 0.5, 1)` (`--ease-out`, ease-out-quart). No bounce, no elastic.
- **Durations:** 180ms for hover/focus, 320ms for surface transitions and modal entry.
- **Reveal pattern:** opacity 0 → 1 with an 18px translateY rise. Staggered across hero elements at 80 / 240 / 480 / 680 / 880 ms.
- **Reduced-motion respected.** All non-essential animation collapses to instant.
- The live landing page features a **flip-clock countdown** and a drifting grid background — these are signature, not template.

### Form inputs

A full input layer ships in `colors_and_type.css` and is shown in the **Text Fields** and **Choice Controls** cards. One coherent system, terracotta as the single "on / selected / focused" signal.

- **Text fields** (`.sq-input`, `.sq-textarea`, `.sq-select`, `.sq-input-row`): soft and tall — **56px high, 14px radius** (`--r-lg`), warm **Linen-50** fill, 1px Hairline border, **Karla 16px** jet text (inputs are reading text, so they use the body voice). Placeholder = Linen-500.
- **Icons sit inside the field.** Use `.sq-input-row` (a flex wrapper that carries the border + focus) with `.sq-input-ic` for a leading icon and/or a trailing action (search, mail, password-reveal). Plain fields use bare `.sq-input`.
- **Focus** is the brand signature: border → Fired Terracotta, fill lifts Linen-50 → Pressed Bone, and a **`0 0 0 4px rgba(238,71,33,0.12)`** glow. No default outline.
- **Validation:** `.is-error` / `.is-success` swap the border to Signal Red / Turf Green and tint the hint text. Never use terracotta to signal an error — terracotta is focus/brand, not status.
- **Labels** are the Montserrat Label voice (600 / 11px / 0.16em uppercase, Caption Ash); required = terracotta `*`, optional = ashed "· optional". Hints are Karla 12.5px.
- **Checkbox** (`.sq-check`): 20px, 4px radius, Hairline border; checked/indeterminate fills Fired Terracotta with a **Pressed Jet** glyph (the CTA contrast pairing). **Radio** (`.sq-choice`): 20px circle, terracotta ring + dot when selected.
- **Toggle** (`.sq-switch`): 46×26 track, Cool Slate off / Fired Terracotta on, bone knob slides on the standard 320ms quint ease. Hit area ≥ 44px via the label.
- **Segmented** (`.sq-segment`), **Stepper** (`.sq-stepper`, tabular numerals, 40px hit targets), and **Range** (`.sq-range`, terracotta thumb) round out the set.
- **Disabled:** Warm Linen fill, Caption Ash text, `not-allowed`. Every control has a `:focus-visible` terracotta ring for keyboard users.

### Hover & press states

- **Buttons:**
  - `primary` hover: bg `terra-300`, `transform: translateY(-1px)`. Active: bg `terra-400`, `transform: translateY(0)`.
  - `secondary` hover: bg `steel-800`, same -1px lift.
  - `outline` hover: bg `rgba(19,34,44,0.06)`. `outline-linen` hover: `rgba(235,231,219,0.08)`.
  - `ghost` hover: bg `rgba(238,71,33,0.08)`.
- **Focus-visible:** 2px outline `terra-500` with 2px offset. Always.
- **Cards & surfaces:** no hover state by default. Interactive cards lift 2px and tighten the hairline. Pressed state returns to flat.
- **Disabled:** bg `Hairline`, text `Caption Ash`, `cursor: not-allowed`. No hover, no pressed.

### Borders, shadows, corners

- **Hairline rule:** the only border in the system is 1px `linen-300 / Hairline (#D8D4CA)`. No multi-pixel borders. No dotted, no dashed, no double rules. Outline buttons use 2px Jet — they are the single exception.
- **Shadow vocabulary:** two shadows. `Hero Lift` (`0 2px 6px rgba(0,0,0,0.08), 0 12px 40px rgba(0,0,0,0.08)`) on top-level hero cards. **Card Lift** (`0 8px 22px rgba(19,34,44,0.08)`) appears only on a soft `.sq-card` while hovered/pressed — the in-app tappable feedback. Stat blocks, badges, buttons, and inputs stay flat at rest.
- **Corner radii:** `4px` badges, `6px` crisp data panels and stat blocks, **`14px` controls** (buttons + text fields), **`16px` (`--r-card`) the soft in-app card**. The brand runs two container reads: the crisp 6px panel for dense data, and the soft 16px `.sq-card` (a 1px **inset** Hairline ring, no layout-shifting border) for anything tappable. Both are on-brand — pick by density. See **The Soft-Card Evolution** in `colors_and_type.css`.
- **No `border-left` colored stripes** as accent — that's an anti-pattern. Use full borders, color shifts, or leading mono labels instead.

### Transparency & blur

- **Used surgically.** The live landing page uses `rgba(245,242,233,0.44)` on the theme toggle and `rgba(238,71,33,0.08)` for ghost-button hover fills — short stops in the 0.04–0.18 range only.
- **Backdrop-filter / blur is forbidden** as a decorative depth device. The system is flat. Background-clip text gradients are forbidden.

### Layout rules

- Page max-width: `1500px`. Content max-width: `1320px`. Section gutters: `clamp(32px, 4vw, 64px)`.
- Grid: 12-column flex/grid implied; spacing is rhythm, not column dogma.
- Fixed elements: a top topbar (lockup left, controls right). On the marketing page, a small mono ticker at the bottom. No floating action buttons.
- Body copy max-width: 65–75ch.
- Cards in pairs use `min-height: 380px` to lock vertical rhythm.

### Imagery color vibe

- **Warm**, never cold. Photography that runs neutral or cool gets a subtle warm grade applied (toward linen).
- **No grain filter** as a brand wash. Grain reads as 2010-era hipster, not 2026 sports.
- **No B&W default.** The brand's color story needs the linen page tone to register; full B&W kills it.

---

## In-app components

These are the canonical product surfaces, promoted from the shipped mobile app (Home + Games) into `colors_and_type.css` so every screen uses **one** button, **one** badge, **one** card. The marketing-only pieces (display hero, flip-timer) live in the UI kit; everything here is core. The `ui_kits/squad_app/` Home + Games screens are built entirely from these classes — only device chrome is kit-local (`.sqk-*`).

- **Soft card — `.sq-card`.** The default in-app container: 16px radius (`--r-card`), a 1px **inset** Hairline ring, 16px padding. Add `.is-interactive` for tappable cards (pointer, −1px hover lift + Card Lift shadow, flat on press). This is the surface every list item, game card, venue card, and tile sits on.
- **Chunky button — `.sq-btn` + `-primary / -secondary / -outline / -ghost`.** Montserrat 800, 0.06em, 14px radius, 52px tall (`-sm` 40px, `-lg` 56px). The **primary** is the brand's tactile moment: Fired Terracotta with a Pressed-Jet label (the CTA Contrast Rule) and a glossy press — inset top highlight, inset bottom shade, soft terracotta drop. Hover lifts to Heat Terracotta.
- **In-app badge — `.sq-badge` + `.is-open / .is-filling / .is-waiting / .is-cancelled / .is-full / .is-host / .is-terra`.** Montserrat 700, 6px radius, semantic wash + deep text; Full and Hosting take Jet. This is the badge you see *on the product*. The mono `.sq-status` is retained for tabular / signage contexts — two badge voices, used by context.
- **Capacity bar — `.sq-spots`.** Roster fill for a game: label + state row over a thin track. Fill and state color carry the status (`.is-open` success, `.is-filling` info, `.is-full` steel) — the one place a progress bar earns color.
- **Avatar stack — `.sq-avatars` / `.sq-av`.** Overlapping initials ringed in the card background. Tint per-person with oklch, or with a `.sq-sport-*` class.
- **Skill tag — `.sq-skill.lv-1…lv-5`.** Five graded steps from Linen (beginner) to Jet (professional). Steel ramp only — **skill is identity, never status**, so it never borrows a semantic color.
- **Chips & sport chips — `.sq-chip`, `.sq-sportchip`.** The filter pill (active = terracotta wash + ring) and the square-rounded sport-glyph tile.

### Feedback & overlay

The three states every real flow needs — ask, confirm, wait. All role-token based, so they theme for free; place the sheet/toast inside a positioned ancestor (the screen, a device frame, or a fixed full-page layer).

- **Bottom sheet — `.sq-scrim` > `.sq-sheet`.** The mobile modal: slides up over a scrim, 24px top corners, a grabber, a titled header with `.sq-sheet-close`, a `.sq-sheet-body`, and a `.sq-sheet-foot` of chunky buttons. Use for join / filter / confirm. Reduced-motion stills the slide.
- **Toast — `.sq-toast` (in `.sq-toast-wrap`).** Transient feedback: a floating jet chip (one look in both themes) carrying a **solid semantic icon chip** — same "chip carries the meaning" pattern as the alert — plus one optional Heat-Terracotta `.sq-toast-action`.
- **Skeleton — `.sq-skeleton` (+ `-line` / `-circle`).** Loading placeholder with a left-to-right sheen; size with inline width/height, compose into a card to mirror the real layout. Reduced-motion stills the shimmer.

### Navigation

System-owned chrome, lifted out of the UI kit so it's defined once.

- **Bottom tab bar — `.sq-tabbar` > `.sq-tab` (+ `.sq-tab-label`).** The mobile primary nav: icon + label, the active item is the terracotta spike (Heat Terracotta in dark). Fill the active glyph (`MIcon … FILL 1`).
- **Top bar — `.sq-topbar`.** Leading (back or `.sq-topbar-title`, `.is-lg` for the big screen title), a `.sq-topbar-spacer`, and `.sq-topbar-actions`. Add `.has-rule` for a hairline when content scrolls under it.
- **Icon button — `.sq-iconbtn`** (`.is-ghost`). The shared 40px affordance for back / close / overflow / theme — used by the top bar, sheets, and toolbars.

### Sport-identity tints

Each sport owns a stable hue (`.sq-sport-soccer`, `-basketball`, `-tennis`, `-volleyball`, `-padel`, `-running`, `-gym`, `-swimming`) so a soccer game always reads green, basketball amber, and so on. Built in oklch off **one hue per sport** with fixed chroma/lightness, so the family feels of one piece. Apply to a `.sq-sportchip` (tile tint) or a `.sq-av` (avatar tint). These are **identity** colors, never status — a tinted chip says "this is tennis," not "this is good." Distinct from the four semantic families and from the terracotta brand spike.

---

## Theming · light & dark

The product ships a light/dark toggle, so the system does too. Dark mode is a **role-token layer**, not a second palette: set `data-theme="dark"` on `<html>` (or any container — the tokens inherit, so you can preview a single dark card inside a light page).

**The rule: components reference role tokens, never raw ramps.** Surfaces use `--bg-page / --bg-surface / --bg-elevated / --bg-input / --bg-track`; ink uses `--fg-primary / --fg-body / --fg-caption / --fg-muted`; lines use `--rule-hairline / --rule-hairline-strong`; lift uses `--shadow-card-lift`. In dark, only these flip — the identity ramps (terra/steel/linen) and the semantic **solids** (`…-500/600`) never move.

- **Surfaces climb the steel ramp:** page `steel-800` → card `steel-700` → elevated `steel-600`. Ink inverts to Pressed Bone. Inputs/tracks become low-alpha white so they read on jet.
- **Semantic washes retune:** each family's wash (`-50`) goes deep and its on-light text (`-700`) goes light, so badges, alerts, and soft status stay legible on jet. Solids are untouched.
- **The accent text spike** swaps Fired → Heat Terracotta (`--accent-text`) where Fired loses contrast on jet. The terracotta button keeps its Fired fill (its Pressed-Jet label passes in both modes).
- **The skill ladder inverts** so brightness still climbs with level on a dark page.

If you author a new component, wire it to role tokens and it themes for free. Hardcode a `--linen-*` or `--steel-*` and you've created a light-only component — that's the one thing to avoid.

> **Aliasing gotcha:** a token defined as `var(--other-token)` (e.g. `--bg-card: var(--bg-surface)`) resolves at the element it's declared on. So `:root` aliases only re-theme when `data-theme` is on `<html>`. For container-scoped theming, the alias is re-declared inside the dark layer. Prefer referencing the primary role token directly in new work.

---

## Iconography

**Committed icon set: Material Symbols (Outlined).** SQUAD uses Google's [Material Symbols](https://fonts.google.com/icons) in the **Outlined** style — a variable icon font whose stroke-only outlines satisfy the brand's "no fills, no two-tone" rule, and whose weight axis lets icons sit at the same visual heft as Montserrat. This replaces the earlier Lucide placeholder.

Loaded from the Google Fonts CDN — it is the design system's **one external dependency** (every typeface is self-hosted). To remove it, download the Material Symbols Outlined variable font into `fonts/` and swap the `@import` in `colors_and_type.css` for an `@font-face` rule; nothing else changes.

**Axes (brand defaults, set on `.sq-icon`):**

- **FILL `0`** — outlined, never filled. Filling is restricted to a single deliberate status glyph (e.g. a confirmed check inside an alert chip) via `.sq-icon-fill`.
- **wght `500`** — substantial enough to hold next to Montserrat without competing. `.sq-icon-bold` (700) and `.sq-icon-thin` (300) exist but are rarely needed.
- **GRAD `0`**, **opsz** tracks the pixel size (20 at small sizes, 24/40/48 as it grows).

**Usage rules**

- **Outlined only.** No fills (except the restricted status glyph), no two-tone, no rounded/sharp style mixing — pick Outlined and stay there.
- **Sizes:** `.sq-icon-16` (inline with body / labels), `.sq-icon-20` (button-adjacent), `.sq-icon-24` (nav, cards), `.sq-icon-32` (hero callouts, empty states), `.sq-icon-48` (large empty states).
- **Color:** icons inherit `currentColor` and match adjacent text. They reinforce text, they are not decorative spikes. `.sq-icon-accent` (terracotta) is reserved for a single tactical pinpoint per card.
- **Spacing:** `gap: 8px` between icon and label; icons are `vertical-align: middle` to the label.
- **Markup:** `<span class="sq-icon">sports_soccer</span>` — the ligature name *is* the icon. Browse names at [fonts.google.com/icons](https://fonts.google.com/icons).

**Core SQUAD glyphs** (mapped to the product): `search`, `sports_soccer`, `sports_basketball`, `stadium`, `distance`, `tune`, `explore`, `trophy` (discover & play); `group`, `event`, `location_on`, `payments`, `verified`, `notifications`, `share`, `lock` (coordinate & trust).

**Emoji and unicode**

- **Emoji: never.** They break the brand's signage feel and the no-italic / no-decoration discipline.
- **Unicode chars** sparingly — `→`, `·`, `©`, `°`. Anything beyond is suspect.

**Logo & lockup (locked, do not modify)**

- `assets/squad_logomark.png` — the standalone two-blade mark. Used as favicon and as a watermark behind hero compositions.
- `assets/squad_logo_horizontal.png` — mark + wordmark side by side. Default lockup for the topbar.
- `assets/squad_logo_stacked.png` — mark above wordmark. Used in tall layouts (mobile splash, app icon contexts).
- **Do not redraw, recolor outside the approved tint set, or modify the silhouette.** Approved tints (applied via documented CSS filter recipes): `terra` (default, no filter), `jet`, `linen`, `slate`. The tint set is exhaustive.
- The logomark works as both a positive and a negative shape — the white interior of the mark is integral to the silhouette. Do not fill it.

---

## Caveats & Substitution Flags

- **Icons:** Material Symbols (Outlined) is the committed icon set, loaded from the Google Fonts CDN — the system's one external dependency. Self-host by dropping the variable font in `fonts/` if a no-CDN build is required.
- **Photography:** No real product photography exists yet. UI kit screens use placeholder image slots for venue cards, organizer avatars, and game shots — slots are clearly marked.
- **Venue + game data:** All in-app data in the UI kit is mocked from `PRODUCT.md` audience descriptions. There is no real venue dataset.
- **Inputs:** `DESIGN.md` noted inputs were **not yet present** in the original brand kit. They are now a **defined layer** of this system (see Form Inputs below) — `colors_and_type.css` ships the full `.sq-input` / `.sq-check` / `.sq-switch` family, demonstrated in the Text Fields and Choice Controls cards and built as React components in the UI kit. The values follow the documented direction (bone fill, hairline border, terracotta focus) plus the shipped signup form's focus signature. anticipated direction (linen background, jet text, hairline bottom border, terracotta focus). Treat as **proposed, not locked**.

---

## Quick start

1. Pull `colors_and_type.css` into your page.
2. Use `--terra-500`, `--steel-700`, `--linen-200` as anchors. Use `.sq-display`, `.sq-headline`, `.sq-label` etc. for type roles.
3. Default page bg = `var(--bg-page)`. Default text = `var(--fg-primary)` on light, `var(--fg-on-dark)` on dark.
4. One terracotta element per surface. One primary button per surface. Two-line headlines with one accent word.
5. When in doubt, lean heavier, scale larger, and check the **No Reflex Rule**: if it starts to feel like Linear or Notion, the page bg has drifted toward white or the weight has dropped below 900.

---

## Governance

This system drifted once — component CSS got authored inside a prototype and diverged from the documented rules. These artifacts keep it honest:

- **[`CONTRIBUTING.md`](./CONTRIBUTING.md)** — the rules that prevent drift: `colors_and_type.css` is the one source of truth; the `.sq-*` (canonical) vs `.sqk-*` (kit-local) naming contract; **components reference role tokens, never raw ramps**; prototypes consume canonical classes; how to add a component or token; the contrast gate.
- **[`CHANGELOG.md`](./CHANGELOG.md)** — versioned history. Every token or component change gets an entry.
- **[`tokens.json`](./tokens.json)** — W3C DTCG machine-readable export for engineering handoff. Generated from the CSS; regenerate when tokens change.
- **[`preview/a11y_contrast.html`](./preview/a11y_contrast.html)** — live WCAG contrast for every load-bearing pairing. AA is the floor. Three pairs are size-restricted: **terracotta text** (large only), **Caption Ash** (large / non-essential), and **solid Turf Green + linen** (icon chips / large fills, not small text).
