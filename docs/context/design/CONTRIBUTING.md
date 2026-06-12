# Contributing to the SQUAD Design System

This system drifted once: component CSS got authored inside a prototype, diverged from the documented rules, and nobody noticed until the prototype and the product looked different. These rules exist so that doesn't happen again. Read them before you add or change anything.

## The one source of truth

**`colors_and_type.css` is the system.** Tokens, type, icons, semantic color, inputs, and every canonical `.sq-*` component live there. Everything else is derived:

- `tokens.json` — a generated mirror for engineering handoff. **Regenerate it when tokens change**; never hand-edit it as the primary.
- `preview/*.html` — one card per component/foundation, built **only** on `colors_and_type.css`.
- `ui_kits/squad_app/` — an *application* of the system, not a second system.
- `README.md` / `SKILL.md` — the prose rules. Keep them in sync with the CSS.

## The naming contract

| Prefix | Meaning | Lives in |
|---|---|---|
| `.sq-*` | **Canonical system** — the public API | `colors_and_type.css` |
| `.sqk-*` | **Kit-local** screen chrome (one UI kit's frame/headers/rails) | `ui_kits/squad_app/kit.css` |

If two classes do the same job under different prefixes, you have drift. A component used by more than one screen is canonical — promote it to `.sq-*` and delete the local copy.

## The rules that keep it coherent

1. **Components reference role tokens, never raw ramps.** Use `--bg-surface / --fg-primary / --rule-hairline / --shadow-card-lift / --accent-text`, not `--linen-100 / --steel-700`. A component wired to a raw ramp is a light-only component — it won't theme. This is the single most important rule.
2. **Prototypes consume canonical classes.** Never fork component CSS into a kit to tweak it. If the canonical component is wrong, fix it canonically. (This is the exact mistake that started the cleanup.)
3. **Terracotta is a spike, not a system color.** One terracotta element per surface, ≤~15%. Never as body text (it's AA-large only — see the contrast card). Never as a status (error is a separate, redder red).
4. **Skill is identity, not status.** Identity color (sport tints, skill ladder) never borrows a semantic family, and a semantic color never appears as decoration.
5. **Flat. No gradients, no glass, no backdrop-blur.** Depth comes from color shift and the two named shadows only.

## Adding a component

1. Write it in `colors_and_type.css` using role tokens. Confirm it holds in **both** themes (`data-theme="dark"` on a wrapper).
2. Add a `preview/<group>_<name>.html` card (line 1: `<!-- @dsCard group="…" -->`), built only on `colors_and_type.css`.
3. Add a one-line entry to the README **In-app components** (or relevant) section.
4. If a kit needs it, have the kit *use* the new `.sq-*` class — don't re-implement it.

## Adding or changing a token

1. Edit `:root` in `colors_and_type.css`. If it should flip in dark, add it to the `[data-theme="dark"]` layer.
2. Avoid two-level aliases (`--x: var(--y)`) for anything a component consumes — they bake at `:root` and won't re-theme under a scoped container. Reference the primary role token directly.
3. Regenerate `tokens.json`.

## The contrast gate

Before locking any new foreground/background pair, check it in `preview/a11y_contrast.html` (it computes live). **AA is the floor** (≥4.5 normal, ≥3.0 large). Three pairs are already known to be size-restricted — respect them:

- **Terracotta text** — large only (≥24px). Never body.
- **Caption Ash (steel-400)** — large / non-essential only; body-critical text uses Body Smoke.
- **Solid Turf Green + linen text** — icon chips / large fills only; for text status use the soft (wash) badge.

## Versioning

Semver on the system as a whole. Any token or component change gets a `CHANGELOG.md` entry. Breaking a public `.sq-*` class or token name is a major bump and needs a migration note.
