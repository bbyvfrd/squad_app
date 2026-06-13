# Plan 06 — Design-System Foundation (SQUAD v1.5 Bridge) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the app speak SQUAD natively — vendored v1.5 design CSS, self-hosted fonts + subsetted icon font, role tokens mapped into Tailwind v4, a flash-free light/dark theme, a typed React component layer over every canonical `.sq-*` component, the app shells, and a proof page rendering in both themes — all gated in CI.

**Architecture:** The canonical `colors_and_type.css` ships verbatim (one mechanical transform: `@font-face` stripped; fonts move to `next/font/local`). Role tokens flow into Tailwind via `@theme inline` (the stock palette is deleted). Screen code never hand-writes `sq-*` class strings — they live only in `src/components/ui/` (CI-grep enforced); one TypeScript mapping module reconciles product↔design vocabulary (`football`↔`soccer`, skill tiers, status badges).

**Tech Stack:** Next.js 16 (App Router, RSC), React 19, Tailwind CSS v4 (`@theme inline`, `@custom-variant`), next-themes, `next/font/local`, Vitest 4 + @testing-library/react (jsdom), Playwright (+ @axe-core/playwright), fonttools/pyftsubset (local font prep only), pnpm.

---

## Plan Series Context

This is **Plan 06** — the first plan of the product-build series, derived from the vault spec `output/2026-06-12-design-system-foundation-spec.md` (founder-approved 2026-06-12). It follows the executed foundation series (Plans 01–04) and data layer (Plan 05). It builds **no app screens**: the founder is designing screens in Claude Design in parallel; they arrive later as typed composition work on top of this slice (Plans 07+).

**Decisions this plan implements (do not re-decide here):** hybrid bridge; vocabulary law + `sq-` containment; shadcn NOT initialized; self-hosted fonts/icons; advisory mapping module; light-default + `data-theme="dark"`. Rationale lives in the spec and the vault decision log [2026-06-12].

## Boundary & Prerequisites

- **Runs in the `squad_app` repo** (not the vault), on a feature branch, merged via PR (main requires PRs + green checks).
- **PR #16 (design-system v1.5 sync) must be merged first** — this plan reads `docs/context/design/`. Task 0 verifies.
- Required local tooling: **Node 24+**, **pnpm**, **git**, **Python 3 + fonttools + Brotli** (font prep only: `python3 -m pip install fonttools brotli`), network access once (icon subset download).
- **Standing directive:** verify any library API you're unsure of with the Context7 MCP at execution time. The load-bearing shapes used below (Tailwind v4 `@theme inline` / `@custom-variant`, `next/font/local` variable-font ranges, next-themes `attribute="data-theme"`) were Context7-verified on 2026-06-12.
- Read before starting: `docs/context/design-system.md` (60-second rules, status mapping) and `docs/context/design/CONTRIBUTING.md` (role-token rule).

## File Structure (created/modified by this plan)

| File | Responsibility |
| --- | --- |
| `scripts/sync-design-system.mjs` | Vendor pipeline: copy canonical CSS (strip `@font-face`), write VERSION, download subsetted icon font (`--icons`) |
| `scripts/sync-design-system.test.ts` | Unit test for the `stripFontFaces` transform |
| `scripts/check-design-rules.mjs` | CI gate: no `sq-` class literals outside `src/components/ui/` + `src/styles/squad/` |
| `src/styles/squad/colors_and_type.css` | **Vendored** canonical CSS (generated — never hand-edit) |
| `src/styles/squad/VERSION` | Pinned design-system version (`1.5.0`) |
| `src/styles/squad/icon-inventory.txt` | Sorted list of used Material Symbols names (subset input) |
| `src/styles/squad/fonts/*.woff2` | Self-hosted fonts: Montserrat/Karla variable (4) + icon subset (1) |
| `src/lib/fonts.ts` | `next/font/local` declarations (montserrat, karla, materialSymbols) |
| `src/lib/ui/mappings.ts` | THE product↔design reconciliation point (sports, skill, statuses) |
| `src/lib/ui/mappings.test.ts` | Totality + copy tests |
| `src/lib/ui/cn.ts` | Class-join helper |
| `src/lib/ui/icon-names.ts` | `ICON_NAMES` const + `IconName` union (mirrors inventory; parity-tested) |
| `src/components/providers.tsx` | Client `ThemeProvider` (next-themes, `attribute="data-theme"`) |
| `src/components/ui/*.tsx` (+ `*.test.tsx`) | The typed component layer (every canonical component) |
| `src/app/globals.css` | Vendored import + font re-point + palette reset + `@theme inline` + dark variant + base |
| `src/app/layout.tsx` | Fonts wiring, `suppressHydrationWarning`, ThemeProvider |
| `src/app/(client)/layout.tsx` | Client shell: topbar + tabbar + mobile container |
| `src/app/(venue)/layout.tsx` | Venue shell: topbar only |
| `src/app/(client)/app/page.tsx` | Proof page (mini-Home, DB-seeded sport rail) |
| `e2e/theme.spec.ts` | No-flash + both-theme computed-style checks + screenshots + axe |
| `e2e/smoke.spec.ts` | Updated client-surface assertion (proof page replaces stub text) |
| `.github/workflows/ci.yml` | `Design rules` step in the `lint` job |
| `.prettierignore` | Excludes the vendored CSS |
| `CLAUDE.md`, `docs/context/architecture.md` | Conventions: vocabulary law, `sq-` containment, upgrade procedure |

**Canonical names used across tasks (do not rename):** `stripFontFaces`, `montserrat`, `karla`, `materialSymbols`, `cn`, `ICON_NAMES`, `IconName`, `SPORT_UI`, `SportKey`, `SKILL_UI`, `PARTICIPATION_BADGE`, `GAME_BADGE`, `Icon`, `Button`, `Badge`, `StatusBadge`, `Dot`, `Card`, `Alert`, `Skeleton`, `Text`, `SkillTag`, `Chip`, `SportChip`, `Spots`, `AvatarStack`, `Field`, `Input`, `InputRow`, `Textarea`, `Select`, `Checkbox`, `Radio`, `Switch`, `Segmented`, `Stepper`, `Sheet`, `toast`, `Toaster`, `Tabbar`, `Topbar`, `IconButton`, `ThemeToggle`, `ThemeProvider`.

**Markup is canon:** when a component's inner structure is unclear, extract it from the rendered reference — `docs/context/design/preview/components_*.html` and `docs/context/design/ui_kits/squad_app/*.jsx` — never invent structure. The classes used in every task below were extracted from those files on 2026-06-12.

---

### Task 0: Branch + preflight

**Files:** none (verification only)

- [ ] **Step 1: Verify PR #16 is merged and tooling exists**

```bash
cd ../squad_app && git checkout main && git pull
test -f docs/context/design/colors_and_type.css && echo DESIGN-OK
test -f docs/context/design/fonts/MaterialSymbolsOutlined.woff2 && echo FONTS-OK
node -v && pnpm -v && python3 -m pip show fonttools brotli | grep -E "^Name" || python3 -m pip install fonttools brotli
```

Expected: `DESIGN-OK`, `FONTS-OK`, versions print. If DESIGN-OK fails: **stop — merge PR #16 first.**

- [ ] **Step 2: Create the branch and baseline**

```bash
git checkout -b feat/design-system-foundation
pnpm install && pnpm typecheck && pnpm test && pnpm build
```

Expected: all green before any change.

---

### Task 1: Vendor sync script (CSS + VERSION)

**Files:**
- Create: `scripts/sync-design-system.mjs`
- Test: `scripts/sync-design-system.test.ts`
- Modify: `.prettierignore` (create if missing), `package.json` (script)

- [ ] **Step 1: Write the failing test**

```ts
// scripts/sync-design-system.test.ts
import { describe, expect, it } from "vitest";
import { stripFontFaces } from "./sync-design-system.mjs";

describe("stripFontFaces", () => {
  it("removes every @font-face block and nothing else", () => {
    const css = `/* head */\n@font-face {\n  font-family: 'X';\n  src: url('fonts/x.woff2');\n}\n:root {\n  --terra-500: #EE4721;\n}\n@font-face { font-family: 'Y'; }\n.sq-btn { color: var(--terra-500); }\n`;
    const out = stripFontFaces(css);
    expect(out).not.toContain("@font-face");
    expect(out).not.toContain("fonts/x.woff2");
    expect(out).toContain("--terra-500: #EE4721;");
    expect(out).toContain(".sq-btn { color: var(--terra-500); }");
  });
});
```

- [ ] **Step 2: Run it — expect failure**

Run: `pnpm vitest run scripts/sync-design-system.test.ts`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement the script**

```js
// scripts/sync-design-system.mjs
// Vendors the SQUAD design system into the app. Source of truth: docs/context/design/.
// Usage: node scripts/sync-design-system.mjs [--icons]
//   (no flag)  copy colors_and_type.css (with @font-face stripped) + write VERSION
//   --icons    additionally download the subsetted Material Symbols font (network)
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const SRC = "docs/context/design";
const OUT = "src/styles/squad";

export function stripFontFaces(css) {
  // @font-face blocks contain no nested braces — a non-greedy block match is exact.
  return css.replace(/@font-face\s*\{[^}]*\}\s*/g, "");
}

export function designVersion(changelog) {
  const m = changelog.match(/^## \[(\d+\.\d+\.\d+)\]/m);
  if (!m) throw new Error("No semver heading found in design CHANGELOG");
  return m[1];
}

async function fetchIconSubset(names) {
  const family =
    "Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200";
  const url = `https://fonts.googleapis.com/css2?family=${family}&icon_names=${names.join(",")}&display=block`;
  // A modern UA is required or the API serves TTF instead of woff2.
  const css = await (await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 Chrome/120" } })).text();
  const woff2 = css.match(/url\((https:[^)]+\.woff2)\)/)?.[1];
  if (!woff2) throw new Error(`No woff2 URL in css2 response:\n${css.slice(0, 300)}`);
  const buf = Buffer.from(await (await fetch(woff2)).arrayBuffer());
  writeFileSync(path.join(OUT, "fonts/material-symbols-subset.woff2"), buf);
  console.log(`icon subset: ${names.length} icons, ${(buf.length / 1024).toFixed(1)} KB`);
}

async function main() {
  mkdirSync(path.join(OUT, "fonts"), { recursive: true });
  const css = readFileSync(path.join(SRC, "colors_and_type.css"), "utf8");
  const header = `/* VENDORED from ${SRC}/colors_and_type.css — DO NOT EDIT.\n   Regenerate: node scripts/sync-design-system.mjs (fonts load via next/font; @font-face stripped). */\n`;
  writeFileSync(path.join(OUT, "colors_and_type.css"), header + stripFontFaces(css));
  const version = designVersion(readFileSync(path.join(SRC, "CHANGELOG.md"), "utf8"));
  writeFileSync(path.join(OUT, "VERSION"), version + "\n");
  console.log(`vendored design system v${version}`);
  if (process.argv.includes("--icons")) {
    const names = readFileSync(path.join(OUT, "icon-inventory.txt"), "utf8")
      .split("\n").map((s) => s.trim()).filter(Boolean).sort();
    await fetchIconSubset(names);
  }
}

if (process.argv[1] && import.meta.url.endsWith(path.basename(process.argv[1]))) {
  await main();
}
```

- [ ] **Step 4: Run the test — expect pass**

Run: `pnpm vitest run scripts/sync-design-system.test.ts`
Expected: PASS.

- [ ] **Step 5: Add the pnpm script, prettierignore, and run the sync**

In `package.json` scripts add: `"sync:design": "node scripts/sync-design-system.mjs"`.
Create/append `.prettierignore`:

```
src/styles/squad/colors_and_type.css
```

Run: `pnpm sync:design`
Expected: `vendored design system v1.5.0`; `src/styles/squad/colors_and_type.css` exists and `grep -c "@font-face" src/styles/squad/colors_and_type.css` prints `0`; `cat src/styles/squad/VERSION` prints `1.5.0`.

- [ ] **Step 6: Commit**

```bash
git add scripts/sync-design-system.{mjs,test.ts} src/styles/squad .prettierignore package.json
git commit -m "feat(design): vendor pipeline — canonical CSS (fonts stripped) + VERSION pin"
```

---

### Task 2: Font assets (woff2 conversion + icon subset)

**Files:**
- Create: `src/styles/squad/icon-inventory.txt`, `src/styles/squad/fonts/*.woff2` (5)

- [ ] **Step 1: Create the icon inventory** (seeded from the kit screens + this plan's components; one name per line, sorted)

```
add
arrow_forward
check
chevron_right
close
dark_mode
directions_run
distance
error
expand_more
fitness_center
image
info
light_mode
location_on
lock
pool
remove
schedule
search
sports_basketball
sports_soccer
sports_tennis
sports_volleyball
stadium
swap_vert
tune
verified
warning
waving_hand
```

Save as `src/styles/squad/icon-inventory.txt`. **Workflow rule (document in Task 16's docs):** using a new icon = add its name here + re-run `pnpm sync:design --icons`.

- [ ] **Step 2: Convert the four text variable fonts to subsetted woff2**

`U+0000-02AF` covers Latin + Latin-Ext-A/B + IPA (Azerbaijani `ə` U+0259); `U+20A0-20CF` covers the manat sign `₼`.

```bash
for f in Montserrat-VariableFont_wght Montserrat-Italic-VariableFont_wght Karla-VariableFont_wght Karla-Italic-VariableFont_wght; do
  python3 -m fontTools.subset "docs/context/design/fonts/$f.ttf" \
    --output-file="src/styles/squad/fonts/$f.woff2" --flavor=woff2 \
    --unicodes="U+0000-02AF,U+2000-206F,U+20A0-20CF,U+2100-214F" \
    --layout-features='*'
done
ls -lh src/styles/squad/fonts/
```

Expected: four `.woff2` files, each well under its source TTF size (roughly 100–250 KB each).

- [ ] **Step 3: Download the icon subset**

Run: `pnpm sync:design --icons`
Expected: `icon subset: 30 icons, <100 KB`. (The css2 `icon_names` endpoint performs correct ligature-closure subsetting server-side — local pyftsubset cannot, because retaining a–z retains every icon ligature.)
**Offline fallback (only if the download fails):** `cp docs/context/design/fonts/MaterialSymbolsOutlined.woff2 src/styles/squad/fonts/material-symbols-subset.woff2` and file a follow-up to re-subset before any deploy — never ship 3.9 MB silently.

- [ ] **Step 4: Commit**

```bash
git add src/styles/squad/icon-inventory.txt src/styles/squad/fonts
git commit -m "feat(design): self-hosted woff2 fonts (latin+latin-ext+ipa) and 30-icon Material Symbols subset"
```

---

### Task 3: next/font wiring

**Files:**
- Create: `src/lib/fonts.ts`
- Modify: `src/app/layout.tsx`

- [ ] **Step 1: Create `src/lib/fonts.ts`**

```ts
import localFont from "next/font/local";

export const montserrat = localFont({
  src: [
    { path: "../styles/squad/fonts/Montserrat-VariableFont_wght.woff2", weight: "100 900", style: "normal" },
    { path: "../styles/squad/fonts/Montserrat-Italic-VariableFont_wght.woff2", weight: "100 900", style: "italic" },
  ],
  variable: "--font-montserrat",
  display: "swap",
});

export const karla = localFont({
  src: [
    { path: "../styles/squad/fonts/Karla-VariableFont_wght.woff2", weight: "200 800", style: "normal" },
    { path: "../styles/squad/fonts/Karla-Italic-VariableFont_wght.woff2", weight: "200 800", style: "italic" },
  ],
  variable: "--font-karla",
  display: "swap",
});

export const materialSymbols = localFont({
  src: [{ path: "../styles/squad/fonts/material-symbols-subset.woff2", weight: "100 700", style: "normal" }],
  variable: "--font-icons",
  display: "block", // hide raw ligature text rather than flash it
  adjustFontFallback: false, // metric fallback is meaningless for glyphs
  preload: true,
});
```

- [ ] **Step 2: Rewrite `src/app/layout.tsx`** (Geist removed; providers arrive in Task 5 — this compiles standalone)

```tsx
import type { Metadata } from "next";
import { karla, materialSymbols, montserrat } from "@/lib/fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: "SQUAD",
  description: "Find games. Run them. Get noticed.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${montserrat.variable} ${karla.variable} ${materialSymbols.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
```

(If the repo's path alias is not `@/`, check `tsconfig.json` `paths` and match it.)

- [ ] **Step 3: Verify**

Run: `pnpm typecheck && pnpm build`
Expected: green (fonts compile; visual wiring lands with Task 4).

- [ ] **Step 4: Commit**

```bash
git add src/lib/fonts.ts src/app/layout.tsx
git commit -m "feat(design): self-hosted fonts via next/font/local (Montserrat, Karla, icon subset)"
```

---

### Task 4: globals.css — vendored import + Tailwind bridge

**Files:**
- Modify: `src/app/globals.css` (full rewrite)

- [ ] **Step 1: Replace `src/app/globals.css` entirely**

```css
@import "tailwindcss";
@import "../styles/squad/colors_and_type.css";

/* ── Bridge layer (the ONLY sanctioned additions over the vendored CSS) ───────── */

/* 1. Re-point family tokens at next/font (private family names). */
:root {
  --font-sans: var(--font-montserrat), system-ui, -apple-system, "Segoe UI", sans-serif;
  --font-body: var(--font-karla), system-ui, -apple-system, "Segoe UI", sans-serif;
}
.sq-icon {
  font-family: var(--font-icons);
}

/* 2. Kill Tailwind's stock palette — off-system colors must not compile. */
@theme {
  --color-*: initial;
}

/* 3. Role tokens → utilities. `inline` emits the referenced var at the consuming
      element, so utilities re-theme under [data-theme] even container-scoped
      (the same rule as CONTRIBUTING's alias gotcha). Raw ramps stay unmapped. */
@theme inline {
  --color-page: var(--bg-page);
  --color-surface: var(--bg-surface);
  --color-elevated: var(--bg-elevated);
  --color-input: var(--bg-input);
  --color-track: var(--bg-track);
  --color-ink: var(--fg-primary);
  --color-body: var(--fg-body);
  --color-caption: var(--fg-caption);
  --color-muted: var(--fg-muted);
  --color-hairline: var(--rule-hairline);
  --color-hairline-strong: var(--rule-hairline-strong);
  --color-accent: var(--accent);
  --color-accent-text: var(--accent-text);
  --color-success: var(--success-500);
  --color-success-wash: var(--success-50);
  --color-success-text: var(--fg-success);
  --color-warning: var(--warning-500);
  --color-warning-wash: var(--warning-50);
  --color-warning-text: var(--fg-warning);
  --color-error: var(--error-500);
  --color-error-wash: var(--error-50);
  --color-error-text: var(--fg-error);
  --color-info: var(--info-500);
  --color-info-wash: var(--info-50);
  --color-info-text: var(--fg-info);

  --font-sans: var(--font-sans);
  --font-body: var(--font-body);

  --spacing-s1: var(--s1);
  --spacing-s2: var(--s2);
  --spacing-s3: var(--s3);
  --spacing-s4: var(--s4);
  --spacing-s5: var(--s5);
  --spacing-s6: var(--s6);
  --spacing-s7: var(--s7);
  --spacing-s8: var(--s8);
  --spacing-s10: var(--s10);
  --spacing-s12: var(--s12);
  --spacing-s14: var(--s14);
  --spacing-s16: var(--s16);

  --radius-xs: var(--r-xs);
  --radius-sm: var(--r-sm);
  --radius-md: var(--r-md);
  --radius-lg: var(--r-lg);
  --radius-card: var(--r-card);
  --radius-xl: var(--r-xl);
  --radius-xxl: var(--r-xxl);
  --radius-pill: var(--r-pill);

  --shadow-hero-lift: var(--shadow-hero-lift);
  --shadow-card-lift: var(--shadow-card-lift);

  --ease-out: var(--ease-out);
  --ease-quint: var(--ease-quint);
}

/* 4. Dark variant follows the system's mechanism, not a .dark class. */
@custom-variant dark (&:where([data-theme="dark"], [data-theme="dark"] *));

/* 5. Base. */
body {
  background: var(--bg-page);
  color: var(--fg-primary);
  font-family: var(--font-body);
}

/* 6. App-local reset for the Sheet host <dialog> (bespoke, not canonical —
      the canonical .sq-scrim/.sq-sheet render INSIDE it). */
dialog.sqapp-sheet-host {
  padding: 0;
  border: 0;
  background: transparent;
  max-width: 100vw;
  max-height: 100dvh;
  width: 100vw;
  height: 100dvh;
}
dialog.sqapp-sheet-host::backdrop {
  background: transparent; /* .sq-scrim carries the scrim look */
}
```

- [ ] **Step 2: Verify the page renders on-system**

Run: `pnpm build && pnpm start &` then `curl -s http://127.0.0.1:3000/app | grep -o "Client surface" && kill %1`
Expected: build green; page serves. Visual check (optional now, gated in Task 16): page background is Warm Linen, not white.

- [ ] **Step 3: Commit**

```bash
git add src/app/globals.css
git commit -m "feat(design): Tailwind v4 bridge — vendored CSS, palette reset, @theme inline role tokens, data-theme dark variant"
```

---

### Task 5: Theming (next-themes)

**Files:**
- Create: `src/components/providers.tsx`
- Modify: `src/app/layout.tsx`, `package.json`

- [ ] **Step 1: Install** — `pnpm add next-themes`

- [ ] **Step 2: Create `src/components/providers.tsx`**

```tsx
"use client";

import { ThemeProvider } from "next-themes";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="data-theme" defaultTheme="light" enableSystem>
      {children}
    </ThemeProvider>
  );
}
```

- [ ] **Step 3: Wrap the body content in `src/app/layout.tsx`**

```tsx
import { Providers } from "@/components/providers";
// inside RootLayout's return:
      <body className="min-h-full flex flex-col">
        <Providers>{children}</Providers>
      </body>
```

- [ ] **Step 4: Verify** — `pnpm typecheck && pnpm build` green. (`suppressHydrationWarning` is already on `<html>` from Task 3.)

- [ ] **Step 5: Commit**

```bash
git add src/components/providers.tsx src/app/layout.tsx package.json pnpm-lock.yaml
git commit -m "feat(design): next-themes provider on data-theme, light default"
```

---

### Task 6: Mapping module

**Files:**
- Create: `src/lib/ui/mappings.ts`
- Test: `src/lib/ui/mappings.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
// src/lib/ui/mappings.test.ts
import { describe, expect, it } from "vitest";
import { GAME_BADGE, PARTICIPATION_BADGE, SKILL_UI, SPORT_UI } from "./mappings";

describe("SPORT_UI", () => {
  it("maps all 8 seeded sport keys (migrations/0001)", () => {
    expect(Object.keys(SPORT_UI).sort()).toEqual([
      "basketball", "football", "gym", "padel", "running", "swimming", "tennis", "volleyball",
    ]);
  });
  it("reconciles football to the soccer design key exactly once", () => {
    expect(SPORT_UI.football.className).toBe("sq-sport-soccer");
    expect(SPORT_UI.football.icon).toBe("sports_soccer");
    expect(SPORT_UI.basketball.className).toBe("sq-sport-basketball");
  });
});

describe("SKILL_UI", () => {
  it("maps the 5-tier enum to lv-1..lv-5 in order", () => {
    expect(SKILL_UI.beginner).toBe("lv-1");
    expect(SKILL_UI.professional).toBe("lv-5");
    expect(Object.keys(SKILL_UI)).toHaveLength(5);
  });
});

describe("status badges", () => {
  it("requested reads Pending — never Waitlist (v1 scope guard)", () => {
    expect(PARTICIPATION_BADGE.requested).toEqual({ className: "is-waiting", label: "Pending" });
  });
  it("covers every participation and game status", () => {
    expect(Object.keys(PARTICIPATION_BADGE).sort()).toEqual(["approved", "cancelled", "declined", "requested"]);
    expect(Object.keys(GAME_BADGE).sort()).toEqual(["cancelled", "full", "open"]);
  });
});
```

- [ ] **Step 2: Run — expect FAIL** — `pnpm vitest run src/lib/ui/mappings.test.ts`

- [ ] **Step 3: Implement `src/lib/ui/mappings.ts`**

```ts
// THE single product↔design reconciliation point. Product code speaks DB keys;
// design classes are derived here and nowhere else.
import type { IconName } from "./icon-names";

// DB seed keys — see migrations/0001_signup_trigger_and_sports_seed.sql.
export type SportKey =
  | "football" | "basketball" | "tennis" | "volleyball"
  | "padel" | "running" | "gym" | "swimming";

export const SPORT_UI: Record<SportKey, { className: string; icon: IconName; label: string }> = {
  football: { className: "sq-sport-soccer", icon: "sports_soccer", label: "Football" }, // DB football ↔ CSS soccer
  basketball: { className: "sq-sport-basketball", icon: "sports_basketball", label: "Basketball" },
  tennis: { className: "sq-sport-tennis", icon: "sports_tennis", label: "Tennis" },
  volleyball: { className: "sq-sport-volleyball", icon: "sports_volleyball", label: "Volleyball" },
  padel: { className: "sq-sport-padel", icon: "sports_tennis", label: "Padel" }, // closest Material glyph; swap if a padel glyph ships
  running: { className: "sq-sport-running", icon: "directions_run", label: "Running" },
  gym: { className: "sq-sport-gym", icon: "fitness_center", label: "Gym / Fitness" },
  swimming: { className: "sq-sport-swimming", icon: "pool", label: "Swimming" },
};

// skill_level enum (schema.ts) → .sq-skill tier class.
export type SkillLevel = "beginner" | "intermediate" | "amateur" | "advanced" | "professional";
export const SKILL_UI: Record<SkillLevel, string> = {
  beginner: "lv-1",
  intermediate: "lv-2",
  amateur: "lv-3",
  advanced: "lv-4",
  professional: "lv-5",
};

type BadgeSpec = { className: string; label: string };

// participation_status → .sq-badge variant. Copy per docs/context/design-system.md:
// requested uses the warning-wash class but NEVER the word "Waitlist" (out of v1 scope).
export type ParticipationStatus = "requested" | "approved" | "declined" | "cancelled";
export const PARTICIPATION_BADGE: Record<ParticipationStatus, BadgeSpec> = {
  requested: { className: "is-waiting", label: "Pending" },
  approved: { className: "is-open", label: "Confirmed" },
  declined: { className: "is-full", label: "Declined" }, // jet/neutral treatment — clear, not aggressive
  cancelled: { className: "is-cancelled", label: "Cancelled" },
};

export type GameStatus = "open" | "full" | "cancelled";
export const GAME_BADGE: Record<GameStatus, BadgeSpec> = {
  open: { className: "is-open", label: "Open" },
  full: { className: "is-full", label: "Full" },
  cancelled: { className: "is-cancelled", label: "Cancelled" },
};
```

(`icon-names.ts` arrives in Task 7 — create a stub now so this compiles:)

```ts
// src/lib/ui/icon-names.ts  (stub — replaced in Task 7)
export type IconName = string;
```

- [ ] **Step 4: Run — expect PASS** — `pnpm vitest run src/lib/ui/mappings.test.ts`

- [ ] **Step 5: Commit**

```bash
git add src/lib/ui
git commit -m "feat(design): product<->design mapping module (sports, skill tiers, status badges)"
```

---

### Task 7: cn helper + typed Icon

**Files:**
- Create: `src/lib/ui/cn.ts`, `src/components/ui/icon.tsx`
- Replace: `src/lib/ui/icon-names.ts` (real version + parity test)
- Test: `src/lib/ui/icon-names.test.ts`, `src/components/ui/icon.test.tsx`

- [ ] **Step 1: Add the test deps** — `pnpm add -D @testing-library/react @testing-library/jest-dom jsdom`

- [ ] **Step 2: `src/lib/ui/cn.ts`**

```ts
export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}
```

- [ ] **Step 3: Replace the icon-names stub with the real module + failing parity test**

```ts
// src/lib/ui/icon-names.ts
// MUST mirror src/styles/squad/icon-inventory.txt (the subset input) — parity-tested.
export const ICON_NAMES = [
  "add", "arrow_forward", "check", "chevron_right", "close", "dark_mode",
  "directions_run", "distance", "error", "expand_more", "fitness_center",
  "image", "info", "light_mode", "location_on", "lock", "pool", "remove",
  "schedule", "search", "sports_basketball", "sports_soccer", "sports_tennis",
  "sports_volleyball", "stadium", "swap_vert", "tune", "verified", "warning",
  "waving_hand",
] as const;
export type IconName = (typeof ICON_NAMES)[number];
```

```ts
// src/lib/ui/icon-names.test.ts
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { ICON_NAMES } from "./icon-names";

describe("icon names", () => {
  it("exactly mirror the subset inventory file", () => {
    const inventory = readFileSync("src/styles/squad/icon-inventory.txt", "utf8")
      .split("\n").map((s) => s.trim()).filter(Boolean).sort();
    expect([...ICON_NAMES].sort()).toEqual(inventory);
  });
});
```

Run: `pnpm vitest run src/lib/ui/icon-names.test.ts` — Expected: PASS (fix either side if not).

- [ ] **Step 4: Failing Icon test**

```tsx
// src/components/ui/icon.test.tsx
// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Icon } from "./icon";

describe("Icon", () => {
  it("renders the ligature name inside .sq-icon with a size class", () => {
    render(<Icon name="search" size={24} />);
    const el = screen.getByText("search");
    expect(el).toHaveClass("sq-icon", "sq-icon-24");
    expect(el).toHaveAttribute("aria-hidden", "true");
  });
  it("is labelable when meaningful", () => {
    render(<Icon name="lock" label="Private game" />);
    expect(screen.getByLabelText("Private game")).toBeInTheDocument();
  });
});
```

Run: `pnpm vitest run src/components/ui/icon.test.tsx` — Expected: FAIL.

- [ ] **Step 5: Implement `src/components/ui/icon.tsx`**

```tsx
import { cn } from "@/lib/ui/cn";
import type { IconName } from "@/lib/ui/icon-names";

type IconProps = {
  name: IconName;
  size?: 16 | 20 | 24 | 32 | 48;
  fill?: boolean; // restricted: one deliberate status glyph per surface
  accent?: boolean; // terracotta pinpoint — max one per card
  label?: string; // provide when the icon carries meaning; otherwise aria-hidden
  className?: string;
};

export function Icon({ name, size = 24, fill, accent, label, className }: IconProps) {
  return (
    <span
      className={cn("sq-icon", `sq-icon-${size}`, fill && "sq-icon-fill", accent && "sq-icon-accent", className)}
      aria-hidden={label ? undefined : true}
      aria-label={label}
      role={label ? "img" : undefined}
    >
      {name}
    </span>
  );
}
```

- [ ] **Step 6: Run — expect PASS** — `pnpm vitest run src/components/ui/icon.test.tsx`

- [ ] **Step 7: Commit**

```bash
git add src/lib/ui src/components/ui package.json pnpm-lock.yaml
git commit -m "feat(design): cn helper + inventory-typed Icon component"
```

---

### Task 8: Button, Badge, Dot, Card, Alert, Skeleton

**Files:**
- Create: `src/components/ui/{button,badge,card,alert,skeleton,text}.tsx`
- Test: `src/components/ui/{button,card}.test.tsx`

- [ ] **Step 1: Failing tests (the two with enforcement logic)**

```tsx
// src/components/ui/button.test.tsx
// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Button } from "./button";

describe("Button", () => {
  it("composes variant and size classes and defaults type=button", () => {
    render(<Button variant="primary" size="sm">Request spot</Button>);
    const b = screen.getByRole("button", { name: "Request spot" });
    expect(b).toHaveClass("sq-btn", "sq-btn-primary", "sq-btn-sm");
    expect(b).toHaveAttribute("type", "button");
  });
});
```

```tsx
// src/components/ui/card.test.tsx
// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Card } from "./card";

describe("Card", () => {
  it("renders a plain div by default", () => {
    render(<Card data-testid="c">x</Card>);
    expect(screen.getByTestId("c").tagName).toBe("DIV");
    expect(screen.getByTestId("c")).toHaveClass("sq-card");
  });
  it("renders interactive cards as a link (focusable)", () => {
    render(<Card href="/app/games/1">Game</Card>);
    const a = screen.getByRole("link", { name: "Game" });
    expect(a).toHaveClass("sq-card", "is-interactive");
  });
  it("renders interactive cards as a button when given onClick", () => {
    render(<Card onClick={() => {}}>Open</Card>);
    expect(screen.getByRole("button", { name: "Open" })).toHaveClass("is-interactive");
  });
});
```

Run: `pnpm vitest run src/components/ui` — Expected: new tests FAIL.

- [ ] **Step 2: Implement**

```tsx
// src/components/ui/button.tsx
import { cn } from "@/lib/ui/cn";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "outline" | "ghost";
  size?: "sm" | "lg";
};

export function Button({ variant = "primary", size, className, type = "button", ...rest }: ButtonProps) {
  return (
    <button
      type={type}
      className={cn("sq-btn", `sq-btn-${variant}`, size && `sq-btn-${size}`, className)}
      {...rest}
    />
  );
}
```

```tsx
// src/components/ui/badge.tsx
import { cn } from "@/lib/ui/cn";

export function Badge({ variant, className, ...rest }: React.HTMLAttributes<HTMLSpanElement> & { variant?: string }) {
  return <span className={cn("sq-badge", variant, className)} {...rest} />;
}

export function Dot({ variant, live, className, ...rest }: React.HTMLAttributes<HTMLSpanElement> & { variant?: "success" | "warning" | "error" | "info"; live?: boolean }) {
  return <span className={cn("sq-dot", variant && `is-${variant}`, live && "is-live", className)} aria-hidden {...rest} />;
}
```

```tsx
// src/components/ui/card.tsx
import Link from "next/link";
import { cn } from "@/lib/ui/cn";

type BaseProps = { className?: string; children: React.ReactNode };
type CardProps =
  | (BaseProps & { href: string; onClick?: never } & Omit<React.ComponentProps<typeof Link>, "href" | "className">)
  | (BaseProps & { onClick: React.MouseEventHandler<HTMLButtonElement>; href?: never })
  | (BaseProps & { href?: never; onClick?: never } & React.HTMLAttributes<HTMLDivElement>);

// Interactive cards MUST be focusable/actionable — a tappable <div> is an a11y bug.
export function Card(props: CardProps) {
  if ("href" in props && props.href) {
    const { className, href, ...rest } = props;
    return <Link href={href} className={cn("sq-card", "is-interactive", className)} {...rest} />;
  }
  if ("onClick" in props && props.onClick) {
    const { className, ...rest } = props;
    return <button type="button" className={cn("sq-card", "is-interactive", className)} {...rest} />;
  }
  const { className, ...rest } = props as BaseProps & React.HTMLAttributes<HTMLDivElement>;
  return <div className={cn("sq-card", className)} {...rest} />;
}
```

```tsx
// src/components/ui/alert.tsx
import { cn } from "@/lib/ui/cn";
import { Icon } from "./icon";
import type { IconName } from "@/lib/ui/icon-names";

const ALERT_ICON: Record<"success" | "warning" | "error" | "info", IconName> = {
  success: "check", warning: "warning", error: "error", info: "info",
};

export function Alert({ variant, title, children, className }: { variant: "success" | "warning" | "error" | "info"; title: string; children?: React.ReactNode; className?: string }) {
  return (
    <div className={cn("sq-alert", `is-${variant}`, className)} role={variant === "error" ? "alert" : "status"}>
      <span className="sq-alert-ic"><Icon name={ALERT_ICON[variant]} size={20} fill /></span>
      <div>
        <strong>{title}</strong>
        {children}
      </div>
    </div>
  );
}
```

> The `.sq-alert` inner markup above (`.sq-alert-ic` chip) — verify against `docs/context/design/preview/colors_status.html` while implementing (`grep -A4 'sq-alert' docs/context/design/preview/colors_status.html`) and match it exactly; adjust the wrapper spans to the preview, keeping the component's props unchanged.

```tsx
// src/components/ui/skeleton.tsx
import { cn } from "@/lib/ui/cn";

export function Skeleton({ shape, className, style }: { shape?: "line" | "circle"; className?: string; style?: React.CSSProperties }) {
  return <span className={cn("sq-skeleton", shape && `sq-skeleton-${shape}`, className)} style={style} aria-hidden />;
}
```

```tsx
// src/components/ui/text.tsx
// Canonical type roles as components — keeps sq-* type classes inside the layer.
import { cn } from "@/lib/ui/cn";

type Role = "display" | "headline" | "title" | "lede" | "label" | "kicker";
const TAG: Record<Role, "h1" | "h2" | "p" | "span"> = {
  display: "h1", headline: "h1", title: "h2", lede: "p", label: "span", kicker: "span",
};

export function Text({ role, as, className, ...rest }: React.HTMLAttributes<HTMLElement> & { role: Role; as?: "h1" | "h2" | "h3" | "p" | "span" | "div" }) {
  const Tag = (as ?? TAG[role]) as React.ElementType;
  return <Tag className={cn(`sq-${role}`, className)} {...rest} />;
}
```

- [ ] **Step 3: Run — expect PASS** — `pnpm vitest run src/components/ui && pnpm typecheck`

- [ ] **Step 4: Commit**

```bash
git add src/components/ui
git commit -m "feat(design): Button, Badge, Dot, Card (a11y-enforced interactive), Alert, Skeleton, Text roles"
```

---

### Task 9: StatusBadge, SkillTag, Chip, SportChip, Spots, AvatarStack

**Files:**
- Create: `src/components/ui/{status-badge,skill-tag,chip,sport-chip,spots,avatar-stack}.tsx`
- Test: `src/components/ui/status-badge.test.tsx`, `src/components/ui/spots.test.tsx`

- [ ] **Step 1: Failing tests**

```tsx
// src/components/ui/status-badge.test.tsx
// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { StatusBadge } from "./status-badge";

describe("StatusBadge", () => {
  it("renders requested as Pending with the warning-wash class", () => {
    render(<StatusBadge kind="participation" status="requested" />);
    const el = screen.getByText("Pending");
    expect(el).toHaveClass("sq-badge", "is-waiting");
  });
  it("never renders the word Waitlist", () => {
    render(<StatusBadge kind="participation" status="requested" />);
    expect(screen.queryByText(/waitlist/i)).toBeNull();
  });
});
```

```tsx
// src/components/ui/spots.test.tsx
// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Spots } from "./spots";

describe("Spots", () => {
  it("derives fill % and exposes a textual capacity", () => {
    render(<Spots taken={8} capacity={14} />);
    expect(screen.getByText("8/14 players")).toBeInTheDocument();
    expect(screen.getByText("6 spots left")).toBeInTheDocument();
    const fill = document.querySelector(".sq-spots-fill") as HTMLElement;
    expect(fill.style.width).toBe("57%");
    expect(fill).toHaveClass("is-open");
  });
  it("reads full at capacity", () => {
    render(<Spots taken={14} capacity={14} />);
    expect(screen.getByText("Full")).toBeInTheDocument();
    expect(document.querySelector(".sq-spots-fill")).toHaveClass("is-full");
  });
});
```

Run: `pnpm vitest run src/components/ui` — Expected: new tests FAIL.

- [ ] **Step 2: Implement** (markup extracted from `preview/components_gamecard.html`)

```tsx
// src/components/ui/status-badge.tsx
import { GAME_BADGE, PARTICIPATION_BADGE, type GameStatus, type ParticipationStatus } from "@/lib/ui/mappings";
import { Badge } from "./badge";

type StatusBadgeProps =
  | { kind: "participation"; status: ParticipationStatus; className?: string }
  | { kind: "game"; status: GameStatus; className?: string };

export function StatusBadge({ kind, status, className }: StatusBadgeProps) {
  const spec = kind === "participation" ? PARTICIPATION_BADGE[status] : GAME_BADGE[status];
  return <Badge variant={spec.className} className={className}>{spec.label}</Badge>;
}
```

```tsx
// src/components/ui/skill-tag.tsx
import { cn } from "@/lib/ui/cn";
import { SKILL_UI, type SkillLevel } from "@/lib/ui/mappings";

const LABEL: Record<SkillLevel, string> = {
  beginner: "Beginner", intermediate: "Intermediate", amateur: "Amateur", advanced: "Advanced", professional: "Professional",
};

export function SkillTag({ level, className }: { level: SkillLevel; className?: string }) {
  return <span className={cn("sq-skill", SKILL_UI[level], className)}>{LABEL[level]}</span>;
}
```

```tsx
// src/components/ui/chip.tsx
"use client";

import { cn } from "@/lib/ui/cn";

export function Chip({ active, className, children, ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean }) {
  return (
    <button type="button" aria-pressed={active} className={cn("sq-chip", active && "is-active", className)} {...rest}>
      {children}
    </button>
  );
}
```

```tsx
// src/components/ui/sport-chip.tsx
import { cn } from "@/lib/ui/cn";
import { SPORT_UI, type SportKey } from "@/lib/ui/mappings";
import { Icon } from "./icon";

export function SportChip({ sport, className }: { sport: SportKey; className?: string }) {
  const ui = SPORT_UI[sport];
  return (
    <span className={cn("sq-sportchip", ui.className, className)} title={ui.label}>
      <Icon name={ui.icon} size={20} label={ui.label} />
    </span>
  );
}
```

```tsx
// src/components/ui/spots.tsx
import { cn } from "@/lib/ui/cn";

export function Spots({ taken, capacity, className }: { taken: number; capacity: number; className?: string }) {
  const left = Math.max(0, capacity - taken);
  const pct = capacity > 0 ? Math.round((taken / capacity) * 100) : 0;
  const state = left === 0 ? "is-full" : left <= 2 ? "is-filling" : "is-open";
  return (
    <div className={cn("sq-spots", className)}>
      <div className="sq-spots-row">
        <span className="sq-spots-label">{taken}/{capacity} players</span>
        <span className={cn("sq-spots-state", state)}>{left === 0 ? "Full" : `${left} spots left`}</span>
      </div>
      <div className="sq-spots-track" role="img" aria-label={`${taken} of ${capacity} spots taken`}>
        <div className={cn("sq-spots-fill", state)} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
```

```tsx
// src/components/ui/avatar-stack.tsx
import { cn } from "@/lib/ui/cn";

export function AvatarStack({ names, max = 4, className }: { names: string[]; max?: number; className?: string }) {
  const shown = names.slice(0, max);
  const extra = names.length - shown.length;
  return (
    <div className={cn("sq-avatars", className)} aria-label={`${names.length} going`}>
      {shown.map((n) => (
        <div key={n} className="sq-av" title={n}>{n.split(/\s+/).map((p) => p[0]).join("").slice(0, 2).toUpperCase()}</div>
      ))}
      {extra > 0 && <div className="sq-av">+{extra}</div>}
    </div>
  );
}
```

- [ ] **Step 3: Run — expect PASS** — `pnpm vitest run src/components/ui && pnpm typecheck`

- [ ] **Step 4: Commit**

```bash
git add src/components/ui
git commit -m "feat(design): StatusBadge, SkillTag, Chip, SportChip, Spots, AvatarStack (mapping-enforced)"
```

---

### Task 10: Form layer — Field, Input family, Check/Radio/Switch

**Files:**
- Create: `src/components/ui/{field,input,choice}.tsx`
- Test: `src/components/ui/field.test.tsx`

- [ ] **Step 1: Failing test (the aria wiring is the point)**

```tsx
// src/components/ui/field.test.tsx
// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Field } from "./field";
import { Input } from "./input";

describe("Field", () => {
  it("wires label, hint, and error to the control", () => {
    render(
      <Field label="Game title" hint="Visible to players" error="Required" name="title">
        <Input name="title" />
      </Field>,
    );
    const input = screen.getByLabelText(/Game title/);
    expect(input).toHaveAccessibleDescription(/Visible to players/);
    expect(input).toHaveAccessibleDescription(/Required/);
    expect(input).toHaveAttribute("aria-invalid", "true");
  });
});
```

Run: `pnpm vitest run src/components/ui/field.test.tsx` — Expected: FAIL.

- [ ] **Step 2: Implement**

```tsx
// src/components/ui/field.tsx
import { cloneElement, isValidElement } from "react";
import { cn } from "@/lib/ui/cn";

type FieldProps = {
  label: string;
  name: string;
  hint?: string;
  error?: string;
  optional?: boolean;
  className?: string;
  children: React.ReactNode;
};

export function Field({ label, name, hint, error, optional, className, children }: FieldProps) {
  const id = `field-${name}`;
  const hintId = hint ? `${id}-hint` : undefined;
  const errId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errId].filter(Boolean).join(" ") || undefined;
  const control = isValidElement(children)
    ? cloneElement(children as React.ReactElement<Record<string, unknown>>, {
        id,
        "aria-describedby": describedBy,
        "aria-invalid": error ? "true" : undefined,
      })
    : children;
  return (
    <div className={cn("sq-field", className)}>
      <label className="sq-field-label" htmlFor={id}>
        {label}
        {optional && <span> · optional</span>}
      </label>
      {control}
      {hint && <p className="sq-field-hint" id={hintId}>{hint}</p>}
      {error && <p className="sq-field-hint" id={errId} style={{ color: "var(--fg-error)" }}>{error}</p>}
    </div>
  );
}
```

```tsx
// src/components/ui/input.tsx
import { cn } from "@/lib/ui/cn";
import { Icon } from "./icon";
import type { IconName } from "@/lib/ui/icon-names";

export function Input({ className, invalid, ...rest }: React.InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }) {
  return <input className={cn("sq-input", invalid && "is-error", className)} {...rest} />;
}

export function Textarea({ className, ...rest }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn("sq-textarea", className)} {...rest} />;
}

export function Select({ className, ...rest }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={cn("sq-select", className)} {...rest} />;
}

// Icon-inside-field row: the row carries border + focus; input is bare.
export function InputRow({ icon, className, children }: { icon: IconName; className?: string; children: React.ReactNode }) {
  return (
    <div className={cn("sq-input-row", className)}>
      <span className="sq-input-ic"><Icon name={icon} size={20} /></span>
      {children}
    </div>
  );
}
```

```tsx
// src/components/ui/choice.tsx
// Native inputs — the vendored CSS styles :checked/:focus-visible via siblings.
// Markup extracted from preview/components_choice.html.
import { cn } from "@/lib/ui/cn";

const CHECK_PATH = "M20 6 9 17l-5-5";

export function Checkbox({ label, className, ...rest }: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label className={cn("sq-check", className)}>
      <input type="checkbox" {...rest} />
      <span className="sq-box">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.4"><path d={CHECK_PATH} /></svg>
      </span>
      {label}
    </label>
  );
}

export function Radio({ label, className, ...rest }: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label className={cn("sq-choice", className)}>
      <input type="radio" {...rest} />
      <span className="sq-ring" />
      {label}
    </label>
  );
}

export function Switch({ label, className, ...rest }: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label className={cn("sq-switch", className)}>
      <input type="checkbox" role="switch" {...rest} />
      <span className="sq-switch-track"><span className="sq-switch-knob" /></span>
      {label}
    </label>
  );
}
```

> `Radio`'s inner span: confirm the exact element/class against `preview/components_choice.html` (`grep -A2 'sq-choice' docs/context/design/preview/components_choice.html`) and match it; keep the props as written.

- [ ] **Step 3: Run — expect PASS** — `pnpm vitest run src/components/ui && pnpm typecheck`

- [ ] **Step 4: Commit**

```bash
git add src/components/ui
git commit -m "feat(design): form layer — Field aria wiring, input family, native choice controls"
```

---

### Task 11: Segmented + Stepper

**Files:**
- Create: `src/components/ui/{segmented,stepper}.tsx`
- Test: `src/components/ui/segmented.test.tsx`

- [ ] **Step 1: Failing test (keyboard semantics are the point)**

```tsx
// src/components/ui/segmented.test.tsx
// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Segmented } from "./segmented";

const OPTS = [
  { value: "all", label: "All" },
  { value: "today", label: "Today" },
  { value: "week", label: "Week" },
];

describe("Segmented", () => {
  it("is a radiogroup with one tabbable item", () => {
    render(<Segmented options={OPTS} value="all" onChange={() => {}} label="When" />);
    expect(screen.getByRole("radiogroup", { name: "When" })).toBeInTheDocument();
    const radios = screen.getAllByRole("radio");
    expect(radios.filter((r) => r.getAttribute("tabindex") === "0")).toHaveLength(1);
  });
  it("moves selection with ArrowRight", () => {
    const onChange = vi.fn();
    render(<Segmented options={OPTS} value="all" onChange={onChange} label="When" />);
    fireEvent.keyDown(screen.getByRole("radio", { name: "All" }), { key: "ArrowRight" });
    expect(onChange).toHaveBeenCalledWith("today");
  });
});
```

Run: `pnpm vitest run src/components/ui/segmented.test.tsx` — Expected: FAIL.

- [ ] **Step 2: Implement**

```tsx
// src/components/ui/segmented.tsx
"use client";

import { cn } from "@/lib/ui/cn";

type Option<T extends string> = { value: T; label: string };

export function Segmented<T extends string>({ options, value, onChange, label, className }: {
  options: Option<T>[];
  value: T;
  onChange: (v: T) => void;
  label: string;
  className?: string;
}) {
  function onKeyDown(e: React.KeyboardEvent, idx: number) {
    const delta = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 0;
    if (!delta) return;
    e.preventDefault();
    const next = options[(idx + delta + options.length) % options.length];
    onChange(next.value);
  }
  return (
    <div role="radiogroup" aria-label={label} className={cn("sq-segment", className)}>
      {options.map((o, i) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={o.value === value}
          tabIndex={o.value === value ? 0 : -1}
          className={cn(o.value === value && "is-active")}
          onClick={() => onChange(o.value)}
          onKeyDown={(e) => onKeyDown(e, i)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
```

> Confirm the active-item class against `preview/components_choice.html` (`grep -A4 'sq-segment' …`) — if the canonical active class differs from `is-active`, match the canonical one in both component and test.

```tsx
// src/components/ui/stepper.tsx
"use client";

import { cn } from "@/lib/ui/cn";
import { Icon } from "./icon";

export function Stepper({ value, onChange, min = 0, max = 99, label, className }: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  label: string;
  className?: string;
}) {
  const clamp = (v: number) => Math.min(max, Math.max(min, v));
  return (
    <div className={cn("sq-stepper", className)} aria-label={label}>
      <button type="button" aria-label={`Decrease ${label}`} disabled={value <= min} onClick={() => onChange(clamp(value - 1))}>
        <Icon name="remove" size={20} />
      </button>
      <span aria-live="polite" style={{ fontVariantNumeric: "tabular-nums" }}>{value}</span>
      <button type="button" aria-label={`Increase ${label}`} disabled={value >= max} onClick={() => onChange(clamp(value + 1))}>
        <Icon name="add" size={20} />
      </button>
    </div>
  );
}
```

- [ ] **Step 3: Run — expect PASS** — `pnpm vitest run src/components/ui && pnpm typecheck`

- [ ] **Step 4: Commit**

```bash
git add src/components/ui
git commit -m "feat(design): Segmented (radiogroup + roving focus) and Stepper (clamped, aria-live)"
```

---

### Task 12: Sheet (native dialog) + Toast

**Files:**
- Create: `src/components/ui/{sheet,toast}.tsx`
- Test: `src/components/ui/toast.test.tsx`

- [ ] **Step 1: Failing toast-store test**

```tsx
// src/components/ui/toast.test.tsx
// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { act, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Toaster, toast } from "./toast";

describe("toast", () => {
  it("renders queued toasts in an aria-live region and dismisses", () => {
    render(<Toaster />);
    act(() => { toast({ message: "Spot confirmed", variant: "success" }); });
    expect(screen.getByText("Spot confirmed")).toBeInTheDocument();
    expect(screen.getByRole("status")).toBeInTheDocument();
  });
});
```

Run: `pnpm vitest run src/components/ui/toast.test.tsx` — Expected: FAIL.

- [ ] **Step 2: Implement**

```tsx
// src/components/ui/toast.tsx
"use client";

// Minimal module store — no context needed; Toaster subscribes, toast() pushes.
import { useEffect, useState, useSyncExternalStore } from "react";
import { cn } from "@/lib/ui/cn";
import { Icon } from "./icon";
import type { IconName } from "@/lib/ui/icon-names";

type Variant = "success" | "warning" | "error" | "info";
type ToastItem = { id: number; message: string; variant: Variant; actionLabel?: string; onAction?: () => void };

let nextId = 1;
let items: ToastItem[] = [];
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export function toast(t: Omit<ToastItem, "id">) {
  items = [...items, { ...t, id: nextId++ }];
  emit();
}

function dismiss(id: number) {
  items = items.filter((t) => t.id !== id);
  emit();
}

const ICON: Record<Variant, IconName> = { success: "check", warning: "warning", error: "error", info: "info" };

function ToastRow({ t }: { t: ToastItem }) {
  useEffect(() => {
    const h = setTimeout(() => dismiss(t.id), 5000);
    return () => clearTimeout(h);
  }, [t.id]);
  return (
    <div className="sq-toast">
      <span className={cn("sq-toast-ic", `is-${t.variant}`)}><Icon name={ICON[t.variant]} size={16} fill /></span>
      <span className="sq-toast-msg">{t.message}</span>
      {t.actionLabel && (
        <button type="button" className="sq-toast-action" onClick={() => { t.onAction?.(); dismiss(t.id); }}>
          {t.actionLabel}
        </button>
      )}
    </div>
  );
}

export function Toaster() {
  const snapshot = useSyncExternalStore(
    (cb) => { listeners.add(cb); return () => listeners.delete(cb); },
    () => items,
    () => items,
  );
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  return (
    <div className="sq-toast-wrap" role="status" aria-live="polite">
      {snapshot.map((t) => <ToastRow key={t.id} t={t} />)}
    </div>
  );
}
```

```tsx
// src/components/ui/sheet.tsx
"use client";

// Native <dialog>.showModal(): top-layer, focus trap, Esc, inert background — free.
// Canonical .sq-scrim/.sq-sheet render INSIDE the dialog (its own chrome is reset
// by dialog.sqapp-sheet-host in globals.css). Swap internals to Vaul later if
// drag-to-dismiss is ever required — keep these props.
import { useEffect, useRef } from "react";
import { Icon } from "./icon";

export function Sheet({ open, onClose, title, sub, foot, children }: {
  open: boolean;
  onClose: () => void;
  title: string;
  sub?: string;
  foot?: React.ReactNode;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog ref={ref} className="sqapp-sheet-host" onClose={onClose} aria-label={title}>
      {open && (
        <div className="sq-scrim" onClick={onClose}>
          <div className="sq-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="sq-sheet-grip" />
            <div className="sq-sheet-head">
              <div>
                <div className="sq-sheet-title">{title}</div>
                {sub && <div className="sq-sheet-sub">{sub}</div>}
              </div>
              <button type="button" className="sq-sheet-close" onClick={onClose} aria-label="Close">
                <Icon name="close" size={20} />
              </button>
            </div>
            <div className="sq-sheet-body">{children}</div>
            {foot && <div className="sq-sheet-foot">{foot}</div>}
          </div>
        </div>
      )}
    </dialog>
  );
}
```

- [ ] **Step 3: Run — expect PASS** — `pnpm vitest run src/components/ui && pnpm typecheck`

- [ ] **Step 4: Commit**

```bash
git add src/components/ui
git commit -m "feat(design): Sheet on native dialog + Toast store with aria-live"
```

---

### Task 13: Navigation — Tabbar, Topbar, IconButton, ThemeToggle

**Files:**
- Create: `src/components/ui/{tabbar,topbar,icon-button,theme-toggle}.tsx`
- Test: `src/components/ui/icon-button.test.tsx`

- [ ] **Step 1: Failing test**

```tsx
// src/components/ui/icon-button.test.tsx
// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { IconButton } from "./icon-button";

describe("IconButton", () => {
  it("requires and applies an accessible name", () => {
    render(<IconButton icon="tune" label="Filters" />);
    expect(screen.getByRole("button", { name: "Filters" })).toHaveClass("sq-iconbtn");
  });
});
```

Run: `pnpm vitest run src/components/ui/icon-button.test.tsx` — Expected: FAIL.

- [ ] **Step 2: Implement**

```tsx
// src/components/ui/icon-button.tsx
import { cn } from "@/lib/ui/cn";
import { Icon } from "./icon";
import type { IconName } from "@/lib/ui/icon-names";

export function IconButton({ icon, label, ghost, className, ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  icon: IconName;
  label: string; // required — icon-only controls MUST have a name
  ghost?: boolean;
}) {
  return (
    <button type="button" aria-label={label} className={cn("sq-iconbtn", ghost && "is-ghost", className)} {...rest}>
      <Icon name={icon} size={24} />
    </button>
  );
}
```

```tsx
// src/components/ui/theme-toggle.tsx
"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { IconButton } from "./icon-button";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return <IconButton icon="dark_mode" label="Toggle theme" ghost disabled />;
  const dark = resolvedTheme === "dark";
  return (
    <IconButton
      icon={dark ? "light_mode" : "dark_mode"}
      label={dark ? "Switch to light mode" : "Switch to dark mode"}
      ghost
      onClick={() => setTheme(dark ? "light" : "dark")}
    />
  );
}
```

```tsx
// src/components/ui/tabbar.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/ui/cn";
import { Icon } from "./icon";
import type { IconName } from "@/lib/ui/icon-names";

export type TabItem = { href: string; icon: IconName; label: string };

export function Tabbar({ items }: { items: TabItem[] }) {
  const pathname = usePathname();
  return (
    <nav className="sq-tabbar" aria-label="Primary">
      {items.map((t) => {
        const active = pathname === t.href || pathname.startsWith(`${t.href}/`);
        return (
          <Link key={t.href} href={t.href} className={cn("sq-tab", active && "is-active")} aria-current={active ? "page" : undefined}>
            <Icon name={t.icon} size={24} fill={active} />
            <span className="sq-tab-label">{t.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
```

```tsx
// src/components/ui/topbar.tsx
import { cn } from "@/lib/ui/cn";

export function Topbar({ title, large, rule, actions, leading, className }: {
  title?: string;
  large?: boolean;
  rule?: boolean;
  actions?: React.ReactNode;
  leading?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("sq-topbar", rule && "has-rule", className)}>
      {leading}
      {title && <span className={cn("sq-topbar-title", large && "is-lg")}>{title}</span>}
      <span className="sq-topbar-spacer" />
      {actions && <div className="sq-topbar-actions">{actions}</div>}
    </div>
  );
}
```

- [ ] **Step 3: Run — expect PASS** — `pnpm vitest run src/components/ui && pnpm typecheck`

- [ ] **Step 4: Commit**

```bash
git add src/components/ui
git commit -m "feat(design): Tabbar (route-aware), Topbar, IconButton (named), ThemeToggle"
```

---

### Task 14: App shells

**Files:**
- Create: `src/app/(client)/layout.tsx`, `src/app/(venue)/layout.tsx`

- [ ] **Step 1: Client shell**

```tsx
// src/app/(client)/layout.tsx
import Image from "next/image";
import { Tabbar, type TabItem } from "@/components/ui/tabbar";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { Topbar } from "@/components/ui/topbar";

// Routes beyond /app arrive with the screen plans (07+); the tabbar is the
// canonical chrome and tolerates not-yet-existing routes (they 404 until built).
const TABS: TabItem[] = [
  { href: "/app", icon: "search", label: "Home" },
  { href: "/app/games", icon: "stadium", label: "Games" },
];

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="mx-auto flex min-h-dvh w-full max-w-md flex-col"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <Topbar
        rule
        leading={<Image src="/squad_logo_horizontal.png" alt="SQUAD" width={96} height={24} priority />}
        actions={<ThemeToggle />}
      />
      <main className="flex-1 p-s2">{children}</main>
      <Tabbar items={TABS} />
    </div>
  );
}
```

- [ ] **Step 2: Copy the logo asset**

```bash
cp docs/context/design/assets/squad_logo_horizontal.png public/squad_logo_horizontal.png
```

- [ ] **Step 3: Venue shell**

```tsx
// src/app/(venue)/layout.tsx
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { Topbar } from "@/components/ui/topbar";

export default function VenueLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-3xl flex-col">
      <Topbar title="SQUAD Venues" rule actions={<ThemeToggle />} />
      <main className="flex-1 p-s2">{children}</main>
    </div>
  );
}
```

- [ ] **Step 4: Verify** — `pnpm typecheck && pnpm build` green; `pnpm test` green.

- [ ] **Step 5: Commit**

```bash
git add src/app public/squad_logo_horizontal.png
git commit -m "feat(design): client shell (topbar + tabbar + theme toggle) and venue shell"
```

---

### Task 15: Proof page (mini-Home)

**Files:**
- Modify: `src/app/(client)/app/page.tsx` (replace stub), `e2e/smoke.spec.ts` (assertion update)

- [ ] **Step 1: Replace the stub with the proof page** (server component; sports come from the seeded DB through the mapping — the same path real screens will use)

```tsx
// src/app/(client)/app/page.tsx
import { asc } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { sports } from "@/lib/db/schema";
import { AvatarStack } from "@/components/ui/avatar-stack";
import { Card } from "@/components/ui/card";
import { SkillTag } from "@/components/ui/skill-tag";
import { SportChip } from "@/components/ui/sport-chip";
import { Spots } from "@/components/ui/spots";
import { StatusBadge } from "@/components/ui/status-badge";
import { Text } from "@/components/ui/text";
import { SPORT_UI, type SportKey } from "@/lib/ui/mappings";

export default async function Home() {
  const rows = await db.select().from(sports).orderBy(asc(sports.displayOrder));
  return (
    <div className="flex flex-col gap-s3">
      <Text role="headline">FIND YOUR GAME</Text>

      <section aria-label="Browse by sport" className="flex gap-s1 overflow-x-auto">
        {rows.map((s) => (
          <SportChip key={s.key} sport={s.key as SportKey} />
        ))}
      </section>

      <section aria-label="Upcoming game">
        <Card href="/app">
          <div className="flex items-center justify-between">
            <strong>{SPORT_UI.football.label} · 7v7 · Sahil Park</strong>
            <StatusBadge kind="game" status="open" />
          </div>
          <SkillTag level="intermediate" />
          <Spots taken={8} capacity={14} />
          <AvatarStack names={["Farid B", "Aysel M", "Tural H", "Nigar K", "Elvin Q"]} />
        </Card>
      </section>
    </div>
  );
}
```

(Check `src/lib/db/schema.ts` for the actual exported `sports` column names — if the seed orders by a different column (`display_order` ↔ `displayOrder`) or has no order column, sort by `id` instead. The page must compile against the real schema, not this snippet.)

- [ ] **Step 2: Update the smoke E2E assertion** — in `e2e/smoke.spec.ts`, replace the client-surface test:

```ts
test("client surface renders the proof Home", async ({ page }) => {
  await page.goto("/app");
    await expect(page.getByRole("heading", { name: "FIND YOUR GAME" })).toBeVisible();
  await expect(page.getByText("Open")).toBeVisible();
});
```

- [ ] **Step 3: Verify locally** (needs local Supabase running, like the existing integration tests)

Run: `pnpm typecheck && pnpm test && pnpm build && pnpm test:e2e`
Expected: all green; `/app` shows the linen page, Montserrat headline, 8 sport chips, one game card.

- [ ] **Step 4: Commit**

```bash
git add src/app e2e/smoke.spec.ts
git commit -m "feat(design): proof page — mini-Home from DB-seeded sports through the mapping"
```

---

### Task 16: Gates — design-rules check, theme E2E, axe

**Files:**
- Create: `scripts/check-design-rules.mjs`, `e2e/theme.spec.ts`
- Modify: `package.json`, `.github/workflows/ci.yml`

- [ ] **Step 1: The containment check**

```js
// scripts/check-design-rules.mjs
// Gate: canonical sq-* class literals may appear ONLY in src/components/ui/
// and src/lib/ui/ (the mapping module derives classes there). Screens consume
// the typed component layer.
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

const ALLOWED = [path.normalize("src/components/ui"), path.normalize("src/lib/ui")];
const ROOT = "src";
const offenders = [];

function walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = path.join(dir, name);
    if (statSync(p).isDirectory()) {
      if (p.startsWith(path.normalize("src/styles/squad"))) continue;
      walk(p);
    } else if (/\.(ts|tsx)$/.test(name)) {
      if (ALLOWED.some((a) => p.startsWith(a))) continue;
      const lines = readFileSync(p, "utf8").split("\n");
      lines.forEach((line, i) => {
        if (/["'`][^"'`]*\bsq-[a-z]/.test(line)) offenders.push(`${p}:${i + 1}  ${line.trim()}`);
      });
    }
  }
}

walk(ROOT);
if (offenders.length) {
  console.error("Design-rule violation: sq-* class literals outside src/components/ui/:\n" + offenders.join("\n"));
  process.exit(1);
}
console.log("design rules OK");
```

Add to `package.json` scripts: `"check:design": "node scripts/check-design-rules.mjs"`.
Run: `pnpm check:design` — Expected: `design rules OK` (fix any offender by routing through the component layer).

- [ ] **Step 2: Add the CI step** — in `.github/workflows/ci.yml`, `lint` job, after the `Typecheck` step:

```yaml
      - name: Design rules
        run: pnpm check:design
```

- [ ] **Step 3: Theme + a11y E2E** — `pnpm add -D @axe-core/playwright`, then:

```ts
// e2e/theme.spec.ts
import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const LIGHT_BG = "rgb(235, 231, 219)"; // --linen-200 Warm Linen
const DARK_BG = "rgb(12, 24, 32)"; // --steel-800

test("light is the default and uses the warm linen page", async ({ page }) => {
  await page.goto("/app");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await expect(page.locator("body")).toHaveCSS("background-color", LIGHT_BG);
  const font = await page.locator("h1").evaluate((el) => getComputedStyle(el).fontFamily);
  expect(font).toMatch(/Montserrat/i);
  await page.screenshot({ path: "test-results/proof-light.png", fullPage: true });
});

test("dark theme applies without a light flash", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("theme", "dark"));
  await page.goto("/app", { waitUntil: "domcontentloaded" });
  // next-themes' pre-hydration script must have set the attribute already.
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(page.locator("body")).toHaveCSS("background-color", DARK_BG);
  await page.screenshot({ path: "test-results/proof-dark.png", fullPage: true });
});

test("toggle switches theme from the topbar", async ({ page }) => {
  await page.goto("/app");
  await page.getByRole("button", { name: "Switch to dark mode" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
});

test("proof page has no serious a11y violations in either theme", async ({ page }) => {
  for (const theme of ["light", "dark"]) {
    await page.addInitScript((t) => localStorage.setItem("theme", t as string), theme);
    await page.goto("/app");
    const results = await new AxeBuilder({ page }).analyze();
    const serious = results.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
    expect(serious, JSON.stringify(serious, null, 2)).toEqual([]);
  }
});
```

- [ ] **Step 4: Run everything**

Run: `pnpm check:design && pnpm test && pnpm test:e2e`
Expected: all green; `test-results/proof-{light,dark}.png` exist (attach to the PR for the founder).

- [ ] **Step 5: Commit**

```bash
git add scripts/check-design-rules.mjs e2e/theme.spec.ts package.json pnpm-lock.yaml .github/workflows/ci.yml
git commit -m "feat(design): CI gates — sq-* containment, theme no-flash + both-theme checks, axe"
```

---

### Task 17: Conventions docs + PR

**Files:**
- Modify: `CLAUDE.md`, `docs/context/architecture.md`

- [ ] **Step 1: Add the conventions to `CLAUDE.md`** — in the `## Conventions` section, append:

```markdown
- **The vocabulary law (design system).** Canonical `.sq-*` looks are consumed ONLY by importing from `src/components/ui/` — screen code never hand-writes `sq-*` class strings; class derivation lives only in `src/components/ui/` + `src/lib/ui/mappings.ts` (`pnpm check:design` gates this in CI). Token-mapped Tailwind utilities (`bg-surface`, `p-s2`, `rounded-card`, …) are for layout and bespoke surfaces; raw ramps (`--terra-*`/`--steel-*`/`--linen-*`) are deliberately not exposed as utilities.
- **Design-system upgrades are a file swap.** `src/styles/squad/` is generated — never hand-edit. To upgrade: re-run `pnpm sync:design` (and `--icons` if the inventory changed), read `docs/context/design/CHANGELOG.md`, run the theme E2E. Version pin: `src/styles/squad/VERSION`.
- **New icon = two steps.** Add the ligature name to `src/styles/squad/icon-inventory.txt` AND `src/lib/ui/icon-names.ts` (parity-tested), then `pnpm sync:design --icons`.
```

- [ ] **Step 2: Note the bridge in `docs/context/architecture.md`** — append under the seams discussion:

```markdown
## The design-system seam (Plan 06)

The SQUAD design system (v1.5, `docs/context/design/`) enters the app through one
seam: `scripts/sync-design-system.mjs` vendors the canonical CSS into
`src/styles/squad/` (fonts re-wired through `next/font/local`; Material Symbols
subsetted to `icon-inventory.txt`), `src/app/globals.css` maps role tokens into
Tailwind v4 (`@theme inline`, stock palette removed, dark variant on
`[data-theme="dark"]`), and `src/components/ui/` is the only place `sq-*` class
strings exist. Product↔design vocabulary (DB `football` ↔ CSS `soccer`, skill
tiers, status badges) reconciles in `src/lib/ui/mappings.ts` and nowhere else.
```

- [ ] **Step 3: Full verification**

Run: `pnpm format:check && pnpm lint && pnpm typecheck && pnpm check:design && pnpm test && pnpm build && pnpm test:e2e`
Expected: everything green. (Run `pnpm format` first if Prettier complains about new files.)

- [ ] **Step 4: Commit + PR**

```bash
git add CLAUDE.md docs/context/architecture.md
git commit -m "docs: design-system conventions — vocabulary law, upgrade procedure, icon workflow"
git push -u origin feat/design-system-foundation
gh pr create --title "Plan 06: design-system foundation (SQUAD v1.5 bridge)" --body "Implements docs/plans/06-design-system-foundation.md (spec: vault output/2026-06-12-design-system-foundation-spec.md). Vendored v1.5 CSS + woff2/subset fonts + Tailwind @theme inline bridge + data-theme dark + typed component layer + shells + proof page. New CI gates: check:design containment, theme no-flash, axe. Screenshots: test-results/proof-{light,dark}.png.

🤖 Generated with [Claude Code](https://claude.com/claude-code)"
```

Expected: PR opens; CI green (the deploy that follows merge exercises staging + the health gate as usual).

---

## Definition of Done (Plan 06)

- `pnpm format:check && pnpm lint && pnpm typecheck && pnpm check:design && pnpm test && pnpm build && pnpm test:e2e` all pass locally and in CI.
- `/app` renders the proof mini-Home: Warm Linen page, Montserrat headline, 8 DB-seeded sport chips (football shows the soccer tint/glyph), a game card with status badge / skill tag / capacity bar / avatar stack — in **both** themes, with no theme flash (E2E-verified) and zero serious axe violations.
- The vendored layer is regenerable: `pnpm sync:design --icons` reproduces `src/styles/squad/` byte-for-byte (modulo the downloaded subset).
- Total font payload ≤ ~1 MB: four text woff2 + one icon subset woff2 (vs 3.9 MB unsubsetted icons alone); no Google Fonts `<link>`, no CDN.
- No `sq-*` literal exists outside `src/components/ui/` (`check:design` green).
- `CLAUDE.md` + `architecture.md` document the vocabulary law, upgrade procedure, and icon workflow.

**Next:** screen plans (07+) — composed from this layer once the founder's Claude Design screens are exported and ingested through the vault. **Vault reverse-sync after merge:** refresh `output/app-repo-handoff/` mirrors (CLAUDE.md, architecture.md changed here) and log execution in the vault, per the established convention.
