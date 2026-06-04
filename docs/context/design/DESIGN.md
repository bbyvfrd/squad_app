# SQUAD — design system

**Persona:** athletic product designer. Dark-first, off-black cool slate, italic geometric display, single brand red used at most twice per screen. Sport-functional color (live / slot / win / loss) does the talking; brand red owns the action.

**Mode default:** dark. Light mode is the alternate for marketing pages and the venue CRM.

---

## :root tokens (paste verbatim)

```css
:root {
  /* ── brand ─────────────────────────────────────────────────────── */
  --brand-500: #ee4721; /* SQUAD red — logo source of truth */
  --brand-400: oklch(70% 0.2 32); /* hover */
  --brand-600: oklch(58% 0.22 32); /* active / pressed */
  --brand-soft: color-mix(in oklch, var(--brand-500) 16%, transparent);
  --brand-on-text: oklch(16% 0.08 32); /* dark warm — text/icon on brand fills (AA at 15px) */

  /* ── sport state (functional, never decorative) ────────────────── */
  --live-500: oklch(72% 0.21 145); /* pitch green — game is LIVE NOW */
  --live-soft: color-mix(in oklch, var(--live-500) 18%, transparent);
  --slot-500: oklch(70% 0.16 230); /* court blue — slots open, squad chip, info */
  --slot-soft: color-mix(in oklch, var(--slot-500) 16%, transparent);
  --win-500: oklch(85% 0.17 90); /* floodlight yellow — streak, MVP, score */
  --win-soft: color-mix(in oklch, var(--win-500) 16%, transparent);
  --loss-500: oklch(56% 0.21 12); /* crimson — destructive, errors (hue 12 ≠ brand hue 32) */
  --loss-400: oklch(64% 0.2 12); /* hover on destructive */
  --loss-600: oklch(48% 0.22 12); /* destructive button fill */
  --loss-soft: color-mix(in oklch, var(--loss-500) 18%, transparent);

  /* ── semantic aliases — generic UI reads from these ────────────── */
  --color-brand: var(--brand-500);
  --color-success: var(--live-500);
  --color-info: var(--slot-500);
  --color-warning: var(--win-500);
  --color-danger: var(--loss-500);

  /* ── neutrals — DARK (default canvas) ──────────────────────────── */
  /* cool slate, chroma 0.012–0.020 — above perceptual threshold so the
     cool cast is visible. Surfaces step the slate (15→19→23); no shadows
     on content. Off-white fg (96%) — no screen glare. */
  --bg: oklch(15% 0.016 240);
  --surface: oklch(19% 0.018 240);
  --surface-2: oklch(23% 0.02 240);
  --border: oklch(28% 0.014 240);
  --border-strong: oklch(38% 0.012 240);
  --fg: oklch(96% 0.007 240);
  --muted: oklch(72% 0.012 240);
  --subtle: oklch(60% 0.014 240); /* tertiary — passes AA at 12px */

  /* ── interaction states ────────────────────────────────────────── */
  --surface-hover: oklch(21% 0.019 240);
  --surface-pressed: oklch(25% 0.02 240);
  --ring: color-mix(in oklch, var(--brand-500) 60%, transparent);
  --ring-offset: var(--bg);
  --disabled-fg: oklch(42% 0.012 240);
  --disabled-bg: oklch(21% 0.016 240);

  /* ── type ──────────────────────────────────────────────────────── */
  --font-display: "Inter Tight", "Inter", -apple-system, BlinkMacSystemFont, system-ui, sans-serif;
  --font-body: "Inter", -apple-system, BlinkMacSystemFont, "SF Pro Text", system-ui, sans-serif;
  --font-mono: "JetBrains Mono", ui-monospace, "SF Mono", Menlo, Consolas, monospace;

  /* ── scale ─────────────────────────────────────────────────────── */
  --fs-d1: clamp(64px, 9vw, 128px); /* page-defining italic display */
  --fs-d2: clamp(40px, 5vw, 64px); /* section openers */
  --fs-h1: clamp(28px, 3.2vw, 40px);
  --fs-h2: 22px;
  --fs-h3: 17px;
  --fs-body: 15px;
  --fs-meta: 13px;
  --fs-mono-sm: 11px;

  /* ── spacing — 8pt grid ────────────────────────────────────────── */
  --gap-2xs: 4px;
  --gap-xs: 8px;
  --gap-sm: 12px;
  --gap-md: 20px;
  --gap-lg: 32px;
  --gap-xl: 56px;
  --gap-2xl: 96px;

  --container: 1280px;
  --gutter: clamp(20px, 4vw, 48px);

  /* ── radii ─────────────────────────────────────────────────────── */
  --r-sm: 6px;
  --r-md: 8px;
  --r-lg: 16px;
  --r-pill: 999px;

  /* ── elevation — overlays only; content stays flat ─────────────── */
  --shadow-sm: 0 1px 2px 0 oklch(0% 0 0 / 0.1), 0 1px 3px 0 oklch(0% 0 0 / 0.06);
  --shadow-md: 0 4px 8px -2px oklch(0% 0 0 / 0.22), 0 2px 4px -1px oklch(0% 0 0 / 0.12);
  --shadow-lg: 0 12px 24px -6px oklch(0% 0 0 / 0.32), 0 6px 12px -3px oklch(0% 0 0 / 0.18);
  --shadow-overlay: 0 24px 48px -12px oklch(0% 0 0 / 0.55), 0 12px 24px -6px oklch(0% 0 0 / 0.32);

  /* ── motion — 3 durations, 2 easings ───────────────────────────── */
  --dur-fast: 120ms; /* state echo (hover, focus) */
  --dur-base: 180ms; /* surface transition (drawer open) */
  --dur-slow: 280ms; /* orchestrated entry (modal, toast) */
  --ease-out: cubic-bezier(0.22, 1, 0.36, 1);
  --ease-in-out: cubic-bezier(0.65, 0, 0.35, 1);
}

/* ── light-mode swap (marketing + venue CRM only) ─────────────────── */
.light {
  --bg: oklch(97% 0.008 240); /* soft slate wash */
  --surface: oklch(99.4% 0.004 240); /* off-white card, not monitor-pure */
  --surface-2: oklch(95% 0.01 240);
  --surface-hover: oklch(94% 0.012 240);
  --surface-pressed: oklch(91% 0.014 240);
  --border: oklch(89% 0.012 240);
  --border-strong: oklch(77% 0.014 240);
  --fg: oklch(18% 0.014 240); /* committed slate ink, not black */
  --muted: oklch(46% 0.014 240);
  --subtle: oklch(56% 0.014 240);
  --disabled-fg: oklch(62% 0.01 240);
  --disabled-bg: oklch(92% 0.01 240);
}
```

---

## System constants

### Breakpoints

The working reference uses three thresholds across every responsive grid — name them so a new file doesn't reinvent the numbers.

```css
:root {
  --bp-sm: 540px; /* phone landscape → small tablet */
  --bp-md: 820px; /* tablet → laptop split */
  --bp-lg: 920px; /* product grid breakpoint (gamecards, stats, duo layouts) */
}
```

Use `--bp-md` for chrome reflow (topnav collapse, sheet vs. modal swap). Use `--bp-lg` for product grids (gamecards going single-column). Use `--bp-sm` for the densest specimens (state-demo grids, radii samples).

### z-index scale

```css
:root {
  --z-base: 0; /* content plane */
  --z-sticky: 10; /* sticky page elements (in-screen pill-tabs, top-tabs underline) */
  --z-nav: 20; /* topnav, tabbar */
  --z-popover: 40; /* dropdowns, autocomplete, tooltips */
  --z-modal: 60; /* modal + frosted backdrop */
  --z-sheet: 70; /* bottom sheet (must sit above modal on phone) */
  --z-toast: 80; /* toasts — always on top of every surface */
}
```

### Animation names (reuse, don't redefine)

- `pulse` — 2.4s ease-in-out infinite. Soft halo expand-and-fade on the live-strip dot (topnav, header strips). Larger, slower, ambient.
- `pulse-dot` — 2s ease-in-out infinite. Opacity 1 → 0.45 → 1 on a 6–8px live dot (status pills, scorebox clock, live toasts). Tight, urgent.
- `sk` — 1.6s linear infinite. Background-position shimmer on `.skeleton` / `.sk-line` / `.sk-block`. Loading state only.

A global `prefers-reduced-motion: reduce` guard collapses all three to `animation: none`; the live dot degrades to a static halo via `box-shadow: 0 0 0 2px var(--live-soft)`. Never invent a fourth ambient animation — if you need a new motion, define it as a one-shot transition on the component, not an infinite keyframe.

### Light-mode trigger

The `.light` class swap applies in exactly two contexts:

1. **Marketing pages** — public site, landing, press, careers.
2. **Venue CRM** — the operator-facing dashboard.

Player apps and product UI stay dark-first; do not auto-swap on `prefers-color-scheme: light`. The brand voice (athletic, evening floodlight, broadcast) lives in dark. When the user explicitly toggles light mode inside a player app, honour it, but do not opt in by default.

### Sport tokens in light mode

Sport tokens (`--live-500`, `--slot-500`, `--win-500`, `--loss-500`) **do not shift** under `.light`. Pitch green stays pitch green, court blue stays court blue. The dark→light swap only re-tunes neutrals and surface chrome — functional sport color is a constant so a "live" badge reads the same in both modes. The `*-soft` variants automatically re-tune because they're `color-mix` blends against transparent.

---

## Type rules

- **Display = italic geometric sans.** Inter Tight, weight **800 italic** at hero scale (`--fs-d1`, `--fs-d2`). One italic hero per page — never use italic for body.
- **In-product titles = upright Inter Tight 700** (`--fs-h1`, `--fs-h2`). Legibility wins over voice.
- **Body = Inter 400/500** at 15px, `line-height: 1.55`, `text-wrap: pretty`.
- **Mono = JetBrains Mono** for: eyebrows / kickers, captions, timestamps, scores, distances, rankings, identifiers. Always `font-variant-numeric: tabular-nums` on numbers.
- Display letter-spacing: `-0.04em` at d1, `-0.035em` at d2, `-0.02em` at h1, `-0.01em` at h2.
- The brand voice is **forward lean.** When emphasising a single word inside a display headline, wrap it in `<em>` styled `color: var(--brand-500); font-weight: 900`.

---

## Posture rules (5, non-negotiable)

1. **Sharp geometry.** Card radius `--r-lg` (16px), input radius `--r-sm` (6px), button radius `--r-md` (8px), pills `--r-pill`. No rounded-card-with-coloured-left-border tropes (toasts are the one exception — left border carries the semantic).
2. **No shadows on content.** Elevation steps the surface tone (`--surface` → `--surface-2`). Shadows are reserved for overlays: toasts, modals, sheets, popovers.
3. **One accent budget per screen.** Brand red is used **at most twice** — typically primary CTA + one indicator (live pulse, brand pill, segmented-active). Everything else is a sport color or neutral.
4. **Tabular mono on every number.** Scores, distances, capacities, times, rankings, deltas — all `font-variant-numeric: tabular-nums` so columns align.
5. **One italic hero per page.** Italic display is loud — use it for the page-defining headline and the score module, nothing else. Product chrome stays upright.

---

## Component vocabulary

The full reference lives in `design-system.html`. Canonical classes a builder should reach for first:

| Need                        | Class                                                                                 | Notes                                                                                                                                 |
| --------------------------- | ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| Primary action              | `.btn .btn-primary`                                                                   | brand fill, `--brand-on-text` label, hover → `--brand-400`                                                                            |
| Quiet action                | `.btn .btn-secondary`                                                                 | transparent + `--border-strong`                                                                                                       |
| Tertiary                    | `.btn .btn-ghost`                                                                     | text-only, hover → `--surface-hover`                                                                                                  |
| Destructive                 | `.btn .btn-danger`                                                                    | `--loss-600` fill                                                                                                                     |
| Status pills                | `.pill .pill-live` / `-scheduled` / `-slot` / `-full` / `-win` / `-brand` / `-danger` | mono uppercase 11px, dot 6px when live                                                                                                |
| Sport selector              | `.sport-pill` (+ `.is-selected`)                                                      | brand-soft fill when selected                                                                                                         |
| Form input                  | `.input` / `.textarea` / `.select`                                                    | `--surface-2` fill, focus → brand-500 border + `--ring` halo                                                                          |
| Search                      | `.search-bar`                                                                         | pill-radius, mono inside                                                                                                              |
| Segmented                   | `.segmented` (+ `button.is-active`)                                                   | brand fill on active                                                                                                                  |
| Game card                   | `.gamecard` (+ `.is-live` / `.is-full`)                                               | `is-live` lifts border to live-500 mix; live ALWAYS wins over hover                                                                   |
| Venue card                  | `.venuecard`                                                                          | uses `.ph` branded skeleton placeholder                                                                                               |
| Team card                   | `.teamcard` (+ `.crest`)                                                              | brand-gradient crest, italic display stats                                                                                            |
| Score module                | `.scorebox`                                                                           | italic d2 numbers, mono live clock                                                                                                    |
| Player chip                 | `.player-chip`                                                                        | pill-radius, mono rating in win-500                                                                                                   |
| Toasts                      | `.toast` (+ `-success` / `-danger` / `-info` / `-live`)                               | left-border semantic, `--shadow-md`                                                                                                   |
| Modal                       | `.modal`                                                                              | `--shadow-overlay`, frosted backdrop                                                                                                  |
| Bottom sheet                | `.sheet`                                                                              | brand-default phone idiom                                                                                                             |
| Leaderboard                 | `.dt`                                                                                 | hairline rows, no zebra, `is-self` brand-soft, mono deltas                                                                            |
| KPI block                   | `.stat-grid`                                                                          | italic d2 numbers, sparkline trend                                                                                                    |
| Sparkline                   | `.spark` (+ `.up` / `.down` / `.muted`)                                               | currentColor strokes                                                                                                                  |
| Progress                    | `.progress` (+ `.live` / `.win`)                                                      | brand-500 fill + glow                                                                                                                 |
| Skeleton                    | `.skeleton` + `.sk-line` / `.sk-block`                                                | shimmer via background-position                                                                                                       |
| Branded image slot          | `.ph` (`data-label="…"`)                                                              | slate gradient + half-bled logomark — drop on any container awaiting real photography                                                 |
| Top navigation (web)        | `.topnav` + `.topnav-inner`                                                           | sticky `z-index: var(--z-nav)`, frosted blur, mono meta-strip on the right; collapses below `--bp-md`                                 |
| Bottom tab bar (mobile)     | `.tabbar` + `.tab` (+ `.is-active` / `.create`)                                       | five-slot phone nav; `.create` is the centred FAB-style tab; wrap icon in `.tab-icon-wrap` to attach a `.badge`                       |
| In-screen tabs — compact    | `.pill-tabs` (+ `button.is-active`, `.count`)                                         | segmented pill row for filter strips and sheet headers; 2–4 short labels                                                              |
| In-screen tabs — page level | `.top-tabs` (+ `button.is-active`, `.count`)                                          | underline row, horizontally scrolls on mobile; 5+ tabs or page-level switches                                                         |
| Venue CRM sidebar           | _reserved_                                                                            | not yet built. Use `.topnav` chrome tokens (`--z-nav`, frosted surface, mono meta) as the base when defining the operator-facing nav  |
| Progress meter (circular)   | `.meter` (+ `.win` / `.live` / `.muted`)                                              | SVG ring, rounded caps, fill driven by `--p` (0–100). `.muted` strips the glow                                                        |
| Match clock                 | `.clock` (+ `.halftime` / `.full-time`)                                               | shares `.meter` geometry, live-green fill, centre count has a `′` suffix; `.halftime` freezes at 50% muted, `.full-time` at 100% live |
| Badge primitive             | `.badge` (+ `.dot` / `.live` / `.danger` / `.soft`)                                   | smallest carrier of state; sits in a 2px `--surface` ring so it cuts cleanly out of any nav surface                                   |

---

## Navigation patterns

Three surfaces, one rulebook — never mix vocabularies inside a single shell.

1. **`.topnav` (desktop web).** Sticky, frosted, mono meta-strip on the right (status / city / clock). Brand mark + wordmark on the left, primary action button on the far right. Below `--bp-md`, the meta-strip collapses and only the brand + primary action remain; secondary destinations move into a sheet behind a single icon button.
2. **`.tabbar` + `.tab` (mobile app).** Five slots maximum; the centre slot is `.tab.create` (FAB-style, brand fill). Attention is drawn _only_ by dropping a `.badge` into `.tab-icon-wrap` — never by recoloring an icon, never by adding a second active state. `.badge.dot.live` for live events, neutral `.badge` for counts, `.badge.danger` for action-required.
3. **Venue CRM sidebar** is the third surface and is **not yet built in `design-system.html`**. When the first venue-CRM screen lands, the sidebar must inherit `--z-nav`, the frosted-surface treatment, and the mono uppercase meta voice from `.topnav` — do not invent a new chrome language for it.

In-screen switching inside any of these shells uses `.pill-tabs` (compact, segmented, lives inside a card) or `.top-tabs` (full-bleed underline, page-level). Bottom-nav is always for **global destinations**; in-screen tabs are always for **scoped views of one destination**. Don't blur the two.

---

## Iconography & imagery

**Icons**

- Inline SVG only. `fill="none" stroke="currentColor" stroke-width="1.6"`.
- Three sizes via classes: `.ic-sm` (16px), `.ic` (20px), `.ic-lg` (24px).
- Color modifiers: `.ic--muted`, `.ic--brand`. Default inherits `currentColor`.
- Never use emoji as feature icons. Never use coloured stock icon sets.

**Imagery**

- **Athletic photography is the only positive direction.** Players mid-action, floodlit pitches, locker-room interiors, scoreboards, kit detail. Cool color cast preferred — matches the dark slate canvas.
- **Default placeholder is `.ph`** (`<div class="ph" data-label="venue · floodlit"></div>`) — a stage-lit slate gradient with a half-bled SQUAD logomark anchored bottom-right and a mono caption pill top-left. Use it on every card, hero, and venue tile that is awaiting real photography. Do **not** substitute stock photography, generic gradient blocks, or AI-generated faces while waiting.
- **No SVG humans, faces, or hand-drawn scenery.** No isometric illustration packs. No floating 3D blobs.

---

## Logo & lockup

- **Logomark** (parallelogram S): min 20×20px, clear-space = the height of the mark on all sides. Asset: `mpmj70py-squad_logomark.png` (project root).
- **Wordmark**: min 80px wide. Asset: `mpmj70pu-squad_logo_transparent_2.png` (project root). Reference these paths directly — do not re-export from a screenshot.
- **Forward lean is built-in (~12° italic).** Never apply additional `transform: rotate(...)` or `skewX(...)`; the italic IS the angle. If you need to echo the lean in surrounding type (display headlines, the wordmark in a hero), use Inter Tight 800 italic at the same scale so the cadence matches.
- **Single color only.** Brand red on dark, brand red on light, or solid white knockout. Never duotone, never gradient, never on busy photography.

---

## Voice & numerics

### Copy register

The brand persona is **athletic product designer** — write like a coach calling a play, not like a marketing department.

- **Short verbs, present tense.** "Find a game. Join a squad. Show up." Not "Discover how SQUAD is revolutionising the way amateur athletes connect."
- **No filler adjectives.** "Premier-League pitch in Hackney" beats "world-class state-of-the-art football facility in vibrant East London."
- **Numbers carry the claim.** "8/12 slots, 6.30pm Tuesday" beats "almost full, soon, evening." If you don't have the number, leave a labelled placeholder — don't invent.
- **One verb per CTA.** "Join", "Host", "Pay", "Cancel". Never "Click here to join now". Sentence case on buttons; mono uppercase only on eyebrows / status pills / data labels.
- **Italic is reserved.** A single `<em>` per display headline, only for the word that carries the lean (`Find a <em>squad</em>.`). Never italicise body copy or whole sentences.

### Numeric formatting

Tabular mono is set up in the type rules; these are the formatting conventions on top of it.

| Quantity                         | Format                                                  | Example            |
| -------------------------------- | ------------------------------------------------------- | ------------------ |
| Score (final / live)             | digits + en-dash + digits, single spaces                | `3 – 1`            |
| Capacity                         | filled / total, slash                                   | `8/12`             |
| Delta (rank, form, score change) | sign + digits                                           | `+3` / `−2`        |
| Distance                         | digits + unit, single space                             | `2.4 km` / `850 m` |
| Time of day                      | 12h lowercase, no leading zero                          | `6.30pm`           |
| Match clock                      | digits + prime, no space                                | `72′` / `90+3′`    |
| Duration                         | digits + unit, no space                                 | `90min` / `15s`    |
| Rating (player)                  | one decimal                                             | `7.8`              |
| Currency                         | symbol + integer for whole, two decimals for fractional | `£12` / `£12.50`   |

Always use the en-dash (`–`) for score, never the hyphen (`-`). Always use the minus sign (`−`, U+2212) for negative deltas, never the hyphen. These are tabular-mono characters — column alignment depends on it.

---

## Anti-patterns (audit before shipping)

- Purple/violet gradient backgrounds. We use cool slate.
- Generic emoji feature icons (✨ 🚀 🎯 …).
- Rounded card with a left-coloured-border accent (toasts exempted).
- Hand-drawn SVG humans / faces / scenery.
- Inter/Roboto/Arial as a **display** face. Body is fine; display is italic Inter Tight.
- Invented metrics ("10× faster", "99.9% uptime") without a source.
- Filler copy — "Feature One / Feature Two", lorem ipsum.
- A gradient on every background.
- Brand red used more than twice on one screen.
- Sport state used decoratively (a green border just because green is nice). Sport tokens belong in sport contexts.
- Pure black `#000` or pure white `#fff` in the chrome. Both have committed off-tones in this system.
- Tracking the same hue (orange-red 32) for destructive — `--loss-500` lives at hue 12 (crimson) to keep brand and danger visually distinct.

---

## Accessibility contract

- All keyboard-reachable controls share the same focus expression: `box-shadow: 0 0 0 2px var(--ring-offset), 0 0 0 4px var(--ring)`.
- Respect `prefers-reduced-motion` — kill live-pulse, skeleton shimmer, and decay transitions to ~0ms. The live dot degrades to a static halo, not a vestibular pulse.
- `--brand-on-text` (dark warm red) sits on brand fills instead of white — white-on-brand fails AA at body sizes; the dark warm variant reads as intentional.
- `--subtle` at 60% L clears ~5.0:1 on `--bg` — passes AA for tertiary text at 12px.

---

## Source

Brand color extracted from `mpmj70py-squad_logomark.png` (#EE4721). Full reasoning behind palette/posture choices lives in `brand-spec.md`. Working component reference: `design-system.html`.
