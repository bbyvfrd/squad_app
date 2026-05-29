# Design System — SQUAD

> The configured visual design system. **Canonical files live in `design/`** (copied verbatim from the founder's open-design project — treat them as the source of truth; don't edit them to "clean up"):
>
> - `design/DESIGN.md` — the spec + the `:root` tokens to paste verbatim, system constants (breakpoints, z-index, motion), type/posture rules, component vocabulary, nav patterns, voice & numerics, anti-patterns, a11y contract.
> - `design/brand-spec.md` — the reasoning behind palette/posture (why cool slate, why crimson danger ≠ brand red, contrast math).
> - `design/design-system.html` — the working component reference (canonical classes: `.btn`, `.pill`, `.gamecard`, `.input`, `.topnav`, `.tabbar`, …). Open it in a browser.
> - `design/assets/` — logomark + wordmark PNGs.

## Headline rules (60-second version)

- **Brand:** SQUAD. One brand color — SQUAD red `#EE4721` — used **at most twice per screen** (primary CTA + one indicator).
- **Mode:** dark-first (cool off-black slate). Light mode only for marketing + the venue CRM (`/venue`).
- **Type:** Inter Tight (display — **italic 800** hero / upright 700 in-product), Inter (body), JetBrains Mono (numbers, eyebrows, timestamps — always `tabular-nums`).
- **Sport-state colors** (functional, never decorative): live = pitch green, slot = court blue, win = floodlight yellow, loss/danger = crimson (hue 12, deliberately ≠ brand red).
- **Posture:** sharp geometry; elevation by stepping surface tone, not shadows (shadows = overlays only); one italic hero per page; tabular mono on every number.
- **Tokens are the entry point:** paste the `:root` block from `design/DESIGN.md` into the app's global CSS.

## Integration notes (build — plan 01)

- **Delivery format:** SQUAD ships as **CSS custom properties + vanilla component classes** (OKLCH + `color-mix`), *not* Tailwind/shadcn. The planned stack is Tailwind + shadcn/ui, so plan 01 must choose the bridge: **(a)** map the `:root` tokens into the Tailwind theme + theme shadcn via CSS variables, or **(b)** ship SQUAD's CSS layer as-is and use its classes. Pick one before building components — never mix the two vocabularies.
- **Fonts:** Inter Tight, Inter, JetBrains Mono (Google Fonts; see the `<link>` in `design-system.html`).
- **Assets:** move `design/assets/*.png` to the repo's `public/` (or root); update the logo paths in `DESIGN.md`/`brand-spec.md` if you rename them.

## v1 scope vs the system (important)

SQUAD is a **full athletic-product** system — it carries vocabulary for scores (`.scorebox`), live match clocks (`.clock`), leaderboards (`.dt`), teams (`.teamcard`), ratings, and **payments** (`.btn-danger`, a `Pay` CTA verb). **v1 uses only a subset.** The product scope still governs *what we build*: no payments, scores, leaderboards, teams, live-match, or ratings in v1 (see `product.md` / `decisions.md`). A component existing in the system is **not** permission to ship that feature.

- The v1 voice-avoid list (no "Pay/Checkout/Book now") still holds for v1, even though SQUAD's general voice permits "Pay" — because v1 has no payments.

## Status mapping (v1)

| Participation status | SQUAD token | Reads as |
|---|---|---|
| requested | `--color-info` (court blue) | neutral/info |
| approved | `--color-success` (pitch green) | positive/confirmed |
| declined | neutral / `--muted` | clear, not aggressive |
| cancelled | `--color-warning` (muted) / `--loss-soft` | muted warning |

(Reserve `--color-danger` / crimson for destructive actions, not for "declined".)
