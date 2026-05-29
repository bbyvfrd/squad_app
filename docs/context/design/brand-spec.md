# SQUAD — brand spec (extracted)

**Source of truth:** `mpmj70py-squad_logomark.png` + `mpmj70pu-squad_logo_transparent_2.png`
**Extracted brand color:** `#EE4721` — `rgb(238, 71, 33)` — `oklch(64.7% 0.211 32)`
**Posture cues observed:** sharp italic geometric wordmark with forward lean (~12°), two parallelogram strokes forming the "S" — suggests speed, momentum, layered teams. No gradients, no shadows on the mark. Pure red-orange on white.

---

## Extended product palette (built around the mark)

The logo is the single brand color. Product surfaces use SQUAD red sparingly (CTAs, accents, brand chrome) and rely on a **dark warm-neutral canvas** plus a small set of functional sport colors for live state, availability, and momentum.

### Primary brand
```css
--brand-500:      #EE4721;                                              /* SQUAD red — logo source of truth */
--brand-400:      oklch(70% 0.20 32);                                   /* lighter — hover */
--brand-600:      oklch(58% 0.22 32);                                   /* deeper — active/pressed */
--brand-soft:     color-mix(in oklch, var(--brand-500) 16%, transparent); /* tints */
--brand-on-text:  oklch(16% 0.08 32);                                   /* text/icon color when sitting on brand-500 (WCAG AA at 15px) */
```

White-on-brand (`#fff` on `#EE4721`) clears 3.66:1 — short of AA for body text. `--brand-on-text` is a very dark warm red used on brand fills (primary CTAs, segmented active, FAB icon) and reads as intentional, not as a contrast bug.

### Sport-state colors (functional, never decorative)
```css
--live-500:   oklch(72% 0.21 145);  /* pitch green — game is LIVE NOW */
--live-soft:  color-mix(in oklch, var(--live-500) 18%, transparent);

--slot-500:   oklch(70% 0.16 230);  /* court blue — slots open, squad chip, info */
--slot-soft:  color-mix(in oklch, var(--slot-500) 16%, transparent);

--win-500:    oklch(85% 0.17 90);   /* floodlight yellow — streak, MVP, score */
--win-soft:   color-mix(in oklch, var(--win-500) 16%, transparent);

--loss-500:   oklch(56% 0.21 12);   /* crimson — losses, destructive, errors (hue 12 ≠ brand hue 32) */
--loss-400:   oklch(64% 0.20 12);   /* lighter — hover on destructive */
--loss-soft:  color-mix(in oklch, var(--loss-500) 18%, transparent);
```

`--loss-500` was previously hue 28 — 4° from brand red. To the eye it read as "SQUAD red" and made destructive actions indistinguishable from brand CTAs. Moved to hue 12 (crimson) so it reads as blood / wrong, not as brand.

### Semantic aliases (what generic UI should reference)
Sport tokens belong to sport contexts. Generic UI (toasts, alerts, validation, form errors) reads from these semantic aliases so it stays consistent across the player app and the venue CRM.

```css
--color-brand:   var(--brand-500);
--color-success: var(--live-500);   /* green — live + done + ok */
--color-info:    var(--slot-500);   /* blue — slots + info */
--color-warning: var(--win-500);    /* yellow — streak + caution */
--color-danger:  var(--loss-500);   /* crimson — destructive + error */
```

### Neutrals — DARK (default canvas)
Athletic dark-mode convention (Whoop, Strava night, Nike Run Club, Linear) is **cool neutral**, not warm. A cool charcoal makes the orange-red brand pop hardest (warm-on-cool = max contrast) and avoids the coffee-shop / beige feel a warm canvas slides into at low lightness.

**Off-black, not pure black.** Chroma sits at `0.012`–`0.020` — above the perceptual threshold (~`0.010`) so the cool cast is *visible*, below the level where neutrals start to read as blue. `--bg` lifts to 15% L for breathing room; `--fg` drops to 96% with a faint cool whisper so primary text reads as paper, not screen-glare. Surfaces step up the slate (15 → 19 → 23) instead of leaning on shadows.

```css
--bg:           oklch(15% 0.016 240);  /* page — committed slate charcoal */
--surface:      oklch(19% 0.018 240);  /* cards, modals */
--surface-2:    oklch(23% 0.020 240);  /* inputs, raised inside-cards */
--border:       oklch(28% 0.014 240);  /* hairlines */
--border-strong:oklch(38% 0.012 240);  /* selected/focused borders */
--fg:           oklch(96% 0.007 240);  /* primary text — off-white, cool whisper */
--muted:        oklch(72% 0.012 240);  /* secondary text */
--subtle:       oklch(60% 0.014 240);  /* tertiary text, captions — clears AA at 12px */
```

`--subtle` at 60% L ≈ ~5.0:1 on `--bg` — passes AA for normal text, stays clearly tertiary. Earlier values (chroma `0.003`–`0.008`) set hue 240 but lived below the perceptual threshold, so the eye read pure black/white. The lifted chroma is what makes the cool cast actually appear.

### Interaction-state tokens
The brand has hover/pressed (`--brand-400`, `--brand-600`); surfaces did not. These tokens give every list row, card, tab, and dropdown a consistent hover/pressed/disabled/focus expression. Chroma follows the same `0.012`–`0.020` slate band as the neutrals.

```css
--surface-hover:    oklch(21% 0.019 240);   /* between surface and surface-2 */
--surface-pressed:  oklch(25% 0.020 240);   /* pressed list row, segmented hover */
--ring:             color-mix(in oklch, var(--brand-500) 60%, transparent); /* focus indicator */
--ring-offset:      var(--bg);              /* 2px halo around ring so it never sits flush */
--disabled-fg:      oklch(42% 0.012 240);   /* text/icon at disabled */
--disabled-bg:      oklch(21% 0.016 240);   /* fill at disabled */
```

`--brand-soft` (16%) is too quiet for a focus ring — `--ring` at 60% is the visible indicator. Components keep using `--brand-soft` for tints (selected-pill background, halo glows).

### Neutrals — LIGHT (alt mode)
Same off-white discipline in reverse. `--surface-light` is `oklch(99.4% 0.004 240)` — paper-white, not monitor-pure `#fff` — so cards read as printed rather than backlit. `--bg-light` carries a soft slate wash; `--fg-light` is committed slate ink at 18% L instead of neutral black.

```css
--bg-light:           oklch(97% 0.008 240);   /* soft slate wash */
--surface-light:      oklch(99.4% 0.004 240); /* off-white, not pure #fff */
--surface-2-light:    oklch(95% 0.010 240);
--surface-hover-light:oklch(94% 0.012 240);
--surface-pressed-light: oklch(91% 0.014 240);
--fg-light:           oklch(18% 0.014 240);   /* committed slate ink */
--muted-light:        oklch(46% 0.014 240);
--subtle-light:       oklch(56% 0.014 240);   /* AA-safe at 12px on light surface */
--border-light:       oklch(89% 0.012 240);
--border-strong-light:oklch(77% 0.014 240);
--disabled-fg-light:  oklch(62% 0.010 240);
--disabled-bg-light:  oklch(92% 0.010 240);
```

---

## Type stacks

```css
/* DISPLAY — bold italic geometric sans (mirrors the logo's forward lean) */
--font-display: 'Inter Tight', 'Inter', -apple-system, BlinkMacSystemFont, system-ui, sans-serif;

/* BODY — neutral, high-x-height workhorse */
--font-body: 'Inter', -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif;

/* MONO — tabular numerics for scores, timestamps, distances */
--font-mono: 'JetBrains Mono', ui-monospace, 'SF Mono', Menlo, Consolas, monospace;
```

Display headlines use weight **800 italic** at hero/marketing scale and weight **700 upright** for in-product titles where legibility wins. Italic is the brand voice; never use it for body copy.

---

## Posture rules (3–5 observed/derived)

1. **Sharp geometry.** Card radius `8px`, input radius `6px`, pill radius `999px`. No rounded-card-with-coloured-left-border tropes.
2. **No shadows on dark.** Elevation comes from stepping up the surface tone (`--surface` → `--surface-2`), not box-shadow blurs. Modals are the one exception.
3. **One accent budget per screen.** Brand red is used at most twice: typically the primary CTA + one indicator (live pulse, brand pill). Everything else is a functional sport color or neutral.
4. **Tabular mono on every number.** Scores, distances, capacities, times — all `font-variant-numeric: tabular-nums` so columns align across rows in lists.
5. **One italic hero per page.** Display italic is loud — use it for the page-defining headline and nothing else. Product chrome stays upright.

---

## Logo & lockup rules
- **Logomark** (the parallelogram S): minimum size 20×20px, clear-space = the height of the mark on all sides.
- **Wordmark**: minimum size 80px wide; never stretch, never rotate further than its built-in italic.
- **Single color only.** Brand red on dark, brand red on light, or solid white knockout. Never duotone, never gradient, never on top of a busy photo.

---

## Mode default
**Dark-first** for player apps and product UI (matches athletic-app convention: Nike Run Club, Strava night mode, Whoop). Light mode is the alternate for marketing / venue-CRM contexts.
