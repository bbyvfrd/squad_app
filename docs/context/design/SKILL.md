---
name: squad-design
description: Use this skill to generate well-branded interfaces and assets for SQUAD (the multisports matchmaking + venue booking app), either for production or throwaway prototypes/mocks. Contains essential design guidelines, colors, type, fonts, assets, and UI kit components for prototyping.
user-invocable: true
---

Read the README.md file within this skill, and explore the other available files (`colors_and_type.css`, `assets/`, `ui_kits/squad_app/`, `preview/`).

If creating visual artifacts (slides, mocks, throwaway prototypes, etc), copy assets out and create static HTML files for the user to view. Pull components from `ui_kits/squad_app/` rather than reinventing them — the screens are built entirely from the canonical `.sq-*` system (soft cards, the chunky terracotta button, Montserrat status badges, the capacity bar, avatar stacks, skill tags, sport-identity tints), so the Home + Games game cards, venue cards, and buttons are pixel-correct and on-system.

If working on production code, copy assets and read the rules here to become an expert in designing with the SQUAD brand.

If the user invokes this skill without any other guidance, ask them what they want to build or design, ask some questions, and act as an expert designer who outputs HTML artifacts _or_ production code, depending on the need.

## Brand essentials at a glance
- **Two families**: **Montserrat** is the signage voice (display, headline, title, labels, kickers, buttons, numbers); **Karla** is the reading voice (body, lede, prose, form inputs, metadata). Montserrat = `--font-sans`, Karla = `--font-body`. Both are **self-hosted** variable fonts in `fonts/` (no CDN).
- **Tracking is near-neutral** on Montserrat: `-0.015em` display, `-0.012em` headline. Body is Karla 400 / 1.6 / normal tracking. Do not reintroduce heavy negative tracking.
- **Three anchor colors**: Fired Terracotta `#EE4721` (terra-500), Jet Ink `#13222C` (steel-700), Warm Linen `#EBE7DB` (linen-200). Treat terracotta as a *spike* — never a backdrop, never more than ~15% of a surface.
- **No pure black/white**: Jet Ink replaces `#000`, Warm Linen replaces `#fff`.
- **Semantic colors** (status only, never identity): Success Turf `#3C8A52`, Warning Ochre `#C68A1C`, Error Signal Red `#CE2530`, Info Slate Blue `#2C6E9B`. Error is deliberately redder than terracotta — never use terracotta to mean error.
- **Voice**: plain-speak, direct, opinionated, industrial-tactical-athletic. Reads like signage on a gym wall. Short sentences. UPPERCASE display copy. No em dashes. No emoji.
- **Motion**: ease-out-quart `cubic-bezier(0.25,1,0.5,1)`, 180/320ms, no bounce, no springs.
- **Cards**: two reads — a crisp **6px** flat panel for dense data, and the soft **16px** `.sq-card` (1px inset Hairline ring, −1px hover lift) for anything tappable. 4px badges. The only border is a 1px Hairline `#D8D4CA`. Hero Lift shadow on the primary moment; Card Lift on interactive cards.
- **In-app components** are canonical `.sq-*` classes in `colors_and_type.css`: `.sq-btn` (chunky glossy terracotta primary), `.sq-badge` (Montserrat semantic), `.sq-card`, `.sq-spots` (capacity bar), `.sq-avatars`, `.sq-skill` (graded 1–5), `.sq-chip`, `.sq-sportchip` + `.sq-sport-*` identity tints.
- **Theming**: dark mode is a role-token layer — set `data-theme="dark"` on `<html>` or any container. Components reference role tokens (`--bg-surface`, `--fg-primary`, `--rule-hairline`, `--shadow-card-lift`…), never raw `--linen-*`/`--steel-*` ramps, so they theme for free.
- **Icons**: Material Symbols **Outlined** (variable icon font), **self-hosted** at `fonts/MaterialSymbolsOutlined.woff2`. Outlined only (stroke, no fill); FILL 0, wght 500 to match Montserrat. Markup `<span class="sq-icon">sports_soccer</span>` — the ligature name is the icon. Match adjacent text color; terracotta reserved for one pinpoint per card.
