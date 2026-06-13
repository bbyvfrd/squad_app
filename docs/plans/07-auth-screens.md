# Plan 07 — Auth & First-Run Screens (Claude Design handoff) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Recreate the founder's 10 Direction-B "Warm Linen" auth/onboarding screens (Claude Design handoff) as pixel-perfect, responsive, navigable Next.js routes composed on the Plan 06 SQUAD layer — **UI only, not yet wired to Supabase auth**.

**Architecture:** A new `app/(auth)/` route group renders the screens as real mobile-width pages (no device phone-frame chrome — the real app _is_ the phone). All visual styling is ported verbatim (light variant only) from the handoff `auth.css` into one app-local stylesheet; it consumes design tokens already present in `src/styles/squad/colors_and_type.css`. The screens are **light-only** (Direction A/dark was retired), enforced by re-asserting the light role tokens on the auth root so they don't flip under the app's dark theme. Material icons render through the Plan 06 `Icon` component (font ligatures — **never SVG**); the only SVGs are the Google/Apple brand marks. Interactions (method toggle, password reveal, onboarding carousel, OTP entry, chip multi-select, remember toggle, screen-to-screen navigation) are real client state; form submits navigate to the next screen rather than calling auth.

**Tech Stack:** Next.js 16 (App Router, RSC + `"use client"` islands), React 19, Tailwind v4 + the vendored SQUAD tokens, `next/font/local`, Vitest 4 + @testing-library/react (jsdom), Playwright (+ @axe-core/playwright), pnpm.

---

## Plan Series Context

This is **Plan 07** — the first _screen_ plan, composed on top of the Plan 06 design-system foundation (merged to `main` in PR #18). The founder designed these screens in Claude Design; the handoff bundle was exported and the relevant source is staged read-only in this repo (see below). This plan implements **`auth_screens/Auth Screens.html`** only — the games/home screens in the same bundle are out of scope.

**Decisions already made (do not re-litigate here):**
- **Pixel-perfect UI only** this pass — no Supabase wiring; email/phone/social submit advances the flow visually. Real auth (email via `lib/auth`, phone OTP via a Supabase SMS provider) is a deliberate follow-up.
- **Direction B "Warm Linen", light-only.** Dark direction (A) was retired by the founder.
- **Material icons as font ligatures, never SVG** (founder was emphatic). Brand marks (Google/Apple) are the sole SVG exception — they are logos, not icons.
- The **"intent" screen is optional/cosmetic** ("tailors your home") — there is no data model for it yet; it must not block the flow and writes nothing.
- **Venue owner is a separate app** — represented as an external launch row, not an inline role.

## Boundary & Prerequisites

- Runs on branch **`feat/auth-screens`** (already created from `main` after PR #18 merged), merged via PR.
- **Plan 06 must be on `main`** (it is — `dc725a5`): provides `Icon`, the vendored tokens (`src/styles/squad/colors_and_type.css`), `next/font` wiring, and the icon-subset pipeline (`scripts/sync-design-system.mjs`). Task 0 verifies.
- Required local tooling: Node 24+, pnpm, Python 3 + fonttools + brotli (icon-subset regeneration), one-time network access (icon subset download).
- The chats confirm intent; the rendered spec is the source of truth for layout/copy.

## Design source (staged, read-only — the spec)

`docs/design-handoff/auth-screens/` (copied from the handoff bundle):
- `screens-b.jsx` — the 10 screen components (`B_Boot`, `B_Onb1..3`, `B_SignUp`, `B_SignUpPhone`, `B_OTP`, `B_Intent`, `B_LogIn`, `B_Phone`). **Authoritative for layout, structure, copy.**
- `auth.css` — the `au-*` / `onb-*` / `role-*` / `chip-*` / `method-*` / `otp-*` / `boot-*` styles. **Authoritative for visual styling.** Port the **light** rules only; skip the phone-frame (`.ph-*`) and dark (`.au-field-dark`, `*-dark`) blocks.
- `phone.jsx` — `MIcon` + `IconXxx` wrappers (Material names + weights), `Field` primitive, `GoogleG`/`AppleMark` brand SVGs, and the (to-be-dropped) `PhoneFrame`.
- `canvas.html` — the design-canvas wrapper showing the artboard→component mapping + flow sections.

> **Markup is canon.** Read these files for exact structure, classes, sizes, and copy. Recreate the visual output; do not import the prototype's React or render it — translate to the app's stack.

## Route map (10 artboards → 6 routes)

The email/phone artboards are one screen with a method toggle; the 3 onboarding artboards are one carousel.

| Route | Artboard(s) | Notes |
| --- | --- | --- |
| `/boot` | 01 Boot | Splash: stacked logo + indeterminate bar + "Warming up the pitch". Links to `/welcome` (a real app would redirect post-session-check). |
| `/welcome` | 02–04 Intro | 3-slide carousel (client state). Slide 1 uses `clay_map.png` hero; 2–3 use the placeholder visual. Final slide: **Get started → `/signup`**, "Log in → `/signin`". |
| `/signup` | 05 Email, 06 Phone | Method toggle. Email: name+email+password → **`/intent`**. Phone: name+phone → **`/verify?flow=signup`**. "Log in → `/signin`". Back → `/welcome`. |
| `/verify` | 07 OTP | 6-box code. **Verify →** `/intent` when `?flow=signup`, else `/app`. Back → previous. |
| `/intent` | 08 Intent | Optional chip multi-select + venue launch row. **Continue / Skip → `/app`**. Back → `/signup`. |
| `/signin` | 09 Email, 10 Phone | Method toggle. Email: email+password+remember+forgot → **`/app`**. Phone: phone → **`/verify?flow=signin`**. "Create account → `/signup`". Back → `/welcome`. |

"Into the app" = `/app` (the Plan 06 proof home). These flows are **unguarded** (UI demo); a real auth guard/redirect is future work — note it, don't build it.

## File Structure (created/modified by this plan)

| File | Responsibility |
| --- | --- |
| `src/styles/squad/icon-inventory.txt`, `src/lib/ui/icon-names.ts` | +9 Material names (parity-tested); regenerate the subset font |
| `public/auth/{clay_map,logo_stacked,mark_jet}.png` | Onboarding hero + boot/onboarding marks (served assets) |
| `src/app/(auth)/auth.css` | Ported auth styling (light only); imported by the auth layout |
| `src/app/(auth)/layout.tsx` | Auth shell: mobile container, warm-linen surface, `.auth-root` light-token re-assertion (no topbar/tabbar) |
| `src/components/auth/*.tsx` (+ `*.test.tsx`) | Shared primitives: `AuField`, `AuButton`/`SocialButton`, `MethodTabs`, `Pager`, `BackButton`, `Divider`, `SocialRow` (+ `GoogleMark`/`AppleMark`), `PhoneField`, `OtpInput`, `IntentChip`/`ChipGroup`, `VendorLaunch`, `RememberToggle`, `AuthScreen` (shared padded layout) |
| `src/app/(auth)/{boot,welcome,signup,verify,intent,signin}/page.tsx` | The six routes |
| `e2e/auth.spec.ts` | Smoke (routes render, method toggle) + axe on key screens (both are light) |
| `CLAUDE.md`, `docs/context/architecture.md` | Note the `(auth)` group, the icon-add workflow already used, and the auth-is-light-only rule |

**Canonical names (do not rename):** `AuField`, `AuButton`, `SocialButton`, `MethodTabs`, `Pager`, `BackButton`, `Divider`, `SocialRow`, `GoogleMark`, `AppleMark`, `PhoneField`, `OtpInput`, `IntentChip`, `ChipGroup`, `VendorLaunch`, `RememberToggle`, `AuthScreen`.

## Conventions / adaptation rules (apply to every screen task)

1. **Drop the phone frame.** Implement only the inner screen content (`PhoneFrame`'s children). The mobile container + safe-area padding lives in the `(auth)` layout; screens fill it. No `.ph-frame/.ph-island/.ph-status/.ph-home`.
2. **Light-only.** The auth root re-asserts `--bg-page`/`--bg-card`/`--bg-surface` to their linen values + `color-scheme: light`, so screens stay light even if the app's `data-theme="dark"`. Don't add a theme toggle to auth.
3. **Icons = `Icon` component (ligatures).** Map each design `IconXxx` to `<Icon name=... size=... />` using the Material name + weight from `phone.jsx`. **Never** hand-write `sq-*` class strings in `.tsx` (the `check:design` gate forbids it) and **never** draw SVG icons. Brand marks (`GoogleMark`/`AppleMark`) are inline SVG components — the only exception.
4. **Real inputs.** The prototype fakes inputs with caret `<span>`s for static mockups; in the app use real `<input>`/controlled state. Keep the exact `.au-input-row` chrome and focus ring.
5. **Real client interactions.** Method toggle, password reveal (`visibility` icon), carousel slides + pager, OTP digit entry/auto-advance, chip multi-select, remember toggle — all real `useState`. Submits call `router.push(...)` per the route map; no network.
6. **Accessibility.** Buttons are `<button>`; icon-only controls get `aria-label`; inputs get associated `<label>`; the carousel "Skip"/Next are real buttons; respect the design's `prefers-reduced-motion` blocks (port them). The auth screens must pass the same **zero-serious-axe** bar as Plan 06 (Task 9 enforces; fix contrast like the Plan 06 tabbar override if axe flags terracotta/caption text).
7. **Styling.** Port the relevant `auth.css` blocks verbatim into `src/app/(auth)/auth.css` (light rules only). Per-screen layout (the inline flex/padding in `screens-b.jsx`) becomes small classes in that stylesheet or inline `style` — match the px exactly (the design uses specific px, not the `--s*` scale). Components live in `src/components/auth/`; `sq-*` never appears in `.tsx`, but `auth.css` may target `.sq-icon` (CSS files aren't scanned).
8. **Match existing code** (Plan 06 component idioms: `cn` from `@/lib/ui/cn`, `"use client"` only where state/handlers exist, co-located `*.test.tsx`, Prettier printWidth 100, run `pnpm exec prettier --write` on touched files before committing).

---

### Task 0: Branch + preflight

**Files:** none (verification); the design spec is already staged under `docs/design-handoff/`.

- [ ] **Step 1: Confirm branch + Plan 06 foundation present**

```bash
git branch --show-current            # → feat/auth-screens
git log -1 --oneline main            # → Plan 06 (#18) on main
test -f src/components/ui/icon.tsx && test -f src/styles/squad/colors_and_type.css && echo FOUNDATION-OK
test -f docs/design-handoff/auth-screens/screens-b.jsx && echo SPEC-OK
```

Expected: `FOUNDATION-OK`, `SPEC-OK`.

- [ ] **Step 2: Green baseline**

```bash
pnpm install && pnpm typecheck && pnpm test && pnpm build
```

Expected: all green (33 ui files present; 37 tests pass).

- [ ] **Step 3: Commit the staged design reference**

```bash
git add docs/design-handoff
git commit -m "docs(design): stage auth-screens handoff reference (spec for Plan 07)"
```

---

### Task 1: Extend the icon subset (+9 Material icons)

**Files:**
- Modify: `src/styles/squad/icon-inventory.txt`, `src/lib/ui/icon-names.ts`
- Regenerate: `src/styles/squad/fonts/material-symbols-subset.woff2`

The auth screens use 9 Material icons not in the 30-icon inventory. Add them (sorted), keep `ICON_NAMES` in parity, regenerate the subset.

- [ ] **Step 1: Add the 9 names to the inventory** — insert so the file stays one-name-per-line, then sort:

```
arrow_back
bolt
checklist
groups
mail
open_in_new
person
smartphone
visibility
```

(Existing 30 stay. Final count: 39. The icon-names parity test sorts both sides, so ordering in the file is not load-bearing, but keep it sorted for readability.)

- [ ] **Step 2: Mirror them into `ICON_NAMES`** in `src/lib/ui/icon-names.ts` (the `as const` array). Add the same 9 strings.

- [ ] **Step 3: Run the parity test — expect PASS**

Run: `pnpm vitest run src/lib/ui/icon-names.test.ts`
Expected: PASS (ICON_NAMES sorted === inventory sorted). If it fails, the two lists diverge — reconcile.

- [ ] **Step 4: Regenerate the subset font**

Run: `pnpm sync:design --icons`
Expected: `icon subset: 39 icons, <100 KB` (the >1 MB tripwire must not fire). Confirm: `python3 -c "from fontTools.ttLib import TTFont; f=TTFont('src/styles/squad/fonts/material-symbols-subset.woff2'); print(f.flavor)"` → `woff2`.

- [ ] **Step 5: Verify nothing regressed** — `pnpm typecheck && pnpm test` green (the existing `/app` Icon usage still resolves; new names are valid `IconName`s).

- [ ] **Step 6: Commit**

```bash
git add src/styles/squad/icon-inventory.txt src/lib/ui/icon-names.ts src/styles/squad/fonts/material-symbols-subset.woff2
git commit -m "feat(design): extend icon subset with 9 auth-screen Material icons"
```

---

### Task 2: Auth assets + stylesheet + route-group layout

**Files:**
- Create: `public/auth/{clay_map,logo_stacked,mark_jet}.png`
- Create: `src/app/(auth)/auth.css`
- Create: `src/app/(auth)/layout.tsx`

- [ ] **Step 1: Copy the 3 assets** the screens reference, from the staged reference into `public/auth/`:

```bash
mkdir -p public/auth
cp docs/design-handoff/auth-screens/assets/{clay_map,logo_stacked,mark_jet}.png public/auth/
ls -la public/auth/   # → clay_map.png (≈549K), logo_stacked.png (≈389K), mark_jet.png (≈165K)
```

(Note for the Deferred list: these PNGs are unoptimized exports — `mark_jet.png` is 165 KB for a 30 px mark. Fine for this pass; optimize later.)

- [ ] **Step 2: Create `src/app/(auth)/auth.css`** — port the **light** blocks from `docs/design-handoff/auth-screens/auth.css` verbatim: `.au-kicker/.au-eyebrow`, `.au-field-label/.au-input-row/.au-input-fake/.au-input-icon`, the `.au-field-light` block, `.au-placeholder`, `.au-caret` + `@keyframes au-blink`, `.au-btn/.au-btn-primary(.is-clay)/.au-btn-social(.au-btn-social-light)`, `.au-link/.au-foot(.au-foot-light)/.au-divider(.au-divider-light)`, `.au-icon-btn(.au-icon-btn-light)`, `.au-legal-light`, `.au-pager(.au-pager-light)`, `.au-toggle`, the `.boot-*` (keep `.boot-mat`, `.boot-clay`, `boot-rise/breathe`; drop the grid/sweep variants the final boot doesn't use), `.onb-*` (visual, hero, chip, center, tag, ph-flag) + clay keyframes, `.au-next(.is-clay)`, `.role-vendor` + children, `.chip*` group, `.au-phone-cc`, `.otp-*`, `.method-*`. **Skip** every `.ph-*`, `.au-field-dark`, `*-dark` rule, and the unused `.role-card`/`.role-list` block (the intent screen uses chips, not role cards). Prefix the file with a header comment noting it's a light-only port of the handoff and references `docs/design-handoff/auth-screens/auth.css`.

- [ ] **Step 3: Create `src/app/(auth)/layout.tsx`** — the auth shell. Server component; imports the stylesheet; centers a mobile-width column on a warm-linen surface; re-asserts light role tokens so the screens never flip under app dark mode:

```tsx
import "./auth.css";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="auth-root"
      // Light-only (Direction B). Re-assert the role tokens the screens consume
      // so they stay light even when the app theme is dark (no [data-theme="light"]
      // selector exists; raw ramps don't flip, these aliases do).
      style={
        {
          colorScheme: "light",
          ["--bg-page" as string]: "var(--linen-200)",
          ["--bg-card" as string]: "var(--linen-100)",
          ["--bg-surface" as string]: "var(--linen-100)",
          minHeight: "100dvh",
          background: "var(--linen-200)",
          display: "flex",
          justifyContent: "center",
        } as React.CSSProperties
      }
    >
      <div style={{ width: "100%", maxWidth: 480, position: "relative", minHeight: "100dvh", background: "var(--linen-100)" }}>
        {children}
      </div>
    </div>
  );
}
```

(The `460–480px` cap reproduces the 414px artboard comfortably on phones and centers it on desktop. Screens own their internal padding, matching the artboard's `64px 26px 30px` etc.)

- [ ] **Step 4: Verify** — `pnpm typecheck && pnpm build` green (the route group compiles even before pages exist? Next requires at least one page; if build complains about an empty group, proceed — Task 4 adds pages. Otherwise add a temporary `welcome` placeholder and replace in Task 4). Prettier-write the new files.

- [ ] **Step 5: Commit**

```bash
git add public/auth "src/app/(auth)/auth.css" "src/app/(auth)/layout.tsx"
git commit -m "feat(auth): auth route-group shell, light-only token re-assertion, ported styles + assets"
```

---

### Task 3: Shared auth primitives

**Files:**
- Create: `src/components/auth/{auth-field,auth-button,social-row,method-tabs,pager,back-button,divider,phone-field,otp-input,intent-chip,vendor-launch,remember-toggle,auth-screen,brand-marks}.tsx`
- Test: `src/components/auth/{auth-field,method-tabs,otp-input,intent-chip}.test.tsx`

Build the reusable pieces the screens compose. Each maps to a `screens-b.jsx`/`phone.jsx` source; port the matching `auth.css` chrome (already in `(auth)/auth.css`). Mark client components (`"use client"`) when they own state/handlers. Use `Icon` for all glyphs.

- [ ] **Step 1: `AuField`** (`auth-field.tsx`, from `phone.jsx` `Field` light variant) — props `{ label, icon?: IconName, type?, value, onChange, placeholder?, trailing? }`. Renders `.au-field-light` → `.au-field-label` + `.au-input-row` (leading `<Icon>`, real `<input>`, optional trailing button). Focus styling is CSS (`:focus-within` on `.au-input-row` — adapt the design's `.is-focus` to `:focus-within` so it's real). Write `auth-field.test.tsx` first (renders label, accepts typing, calls onChange), run → fail → implement → pass.

- [ ] **Step 2: `AuButton` + `SocialButton`** (`auth-button.tsx`) — `AuButton`: `.au-btn .au-btn-primary.is-clay`, props `{ children, onClick, type }`, trailing `<Icon name="arrow_forward">` optional via a `trailingArrow` prop. `SocialButton`: `.au-btn .au-btn-social .au-btn-social-light`, takes a mark + label.

- [ ] **Step 3: `MethodTabs`** (`method-tabs.tsx`, client) — props `{ value: "email"|"phone", onChange }`. Two `.method-btn` (mail/Email, smartphone/Phone); active gets `.is-active`. `aria-pressed`. Test: clicking Phone calls `onChange("phone")` and applies `.is-active` (write test first).

- [ ] **Step 4: `Pager`** (`pager.tsx`) — `{ count=3, active }` → `.au-pager.au-pager-light` with `<i>`/`<i class="on">`. `aria-hidden` (decorative).

- [ ] **Step 5: `BackButton`** (`back-button.tsx`, client) — `.au-icon-btn.au-icon-btn-light` with `<Icon name="arrow_back" label="Back">`; `onClick` defaults to `router.back()`.

- [ ] **Step 6: `Divider`** (`divider.tsx`) — `.au-divider.au-divider-light` with the "or" text.

- [ ] **Step 7: `brand-marks.tsx`** — `GoogleMark`, `AppleMark` as inline SVG (copy the exact paths from `phone.jsx` `GoogleG`/`AppleMark`). These are the only SVGs. `aria-hidden` (labels live on the button). `SocialRow` (`social-row.tsx`) = the two `SocialButton`s (Google, Apple).

- [ ] **Step 8: `PhoneField`** (`phone-field.tsx`, client) — `.au-field-light` with `.au-input-row` containing `.au-phone-cc` ("+994" + `<Icon name="expand_more">`) and a real tel `<input>`. From `screens-b.jsx` `PhoneField`.

- [ ] **Step 9: `OtpInput`** (`otp-input.tsx`, client) — 6 `.otp-box` cells backed by real inputs (or one hidden input + rendered boxes). Typing fills left-to-right, auto-advances focus, backspace retreats; the active box shows `.is-focus`. From `B_OTP`/`.otp-row`. Test first: typing "529" fills the first three boxes and focuses the fourth.

- [ ] **Step 10: `IntentChip` + `ChipGroup`** (`intent-chip.tsx`, client) — `IntentChip`: `.chip`/`.chip.is-on`, toggles on click, shows a leading `<Icon name="check" size={15}>` when on; `aria-pressed`. `ChipGroup`: `.chip-group` → `.chip-grouplabel` + `.chip-wrap`. Test: clicking toggles `is-on`/`aria-pressed`.

- [ ] **Step 11: `VendorLaunch`** (`vendor-launch.tsx`) — `.role-vendor` row (stadium icon, "Own or run a venue?" / "List pitches in the SQUAD Venues app", trailing `open_in_new`). Renders an `<a>` to a placeholder vendor URL (`/venue` for now, or `#`) — note it's a cross-app entry point, reserved.

- [ ] **Step 12: `RememberToggle`** (`remember-toggle.tsx`, client) — `.au-toggle`/`.au-toggle.on` switch with `<b>`, `role="switch"` + `aria-checked`; controlled.

- [ ] **Step 13: `AuthScreen`** (`auth-screen.tsx`) — DRY the shared screen frame: an absolutely-positioned flex column with the artboard padding (`64px 26px 30px` default, overridable), so each screen passes a header slot + body + footer. Optional — if it complicates the per-screen px, screens may inline the column instead. Keep whichever yields cleaner pixel parity.

- [ ] **Step 14: Verify + commit** — `pnpm vitest run src/components/auth`, `pnpm typecheck`, prettier-write. Then:

```bash
git add src/components/auth
git commit -m "feat(auth): shared auth primitives (field, buttons, method tabs, otp, chips, …)"
```

---

### Task 4: Boot + Onboarding

**Files:**
- Create: `src/app/(auth)/boot/page.tsx`, `src/app/(auth)/welcome/page.tsx`
- Test: `src/app/(auth)/welcome/welcome.test.tsx` (render smoke)

- [ ] **Step 1: `boot/page.tsx`** (client) — port `B_Boot`: centered `logo_stacked.png` (`.boot-mark`/`.boot-clay`), `.boot-mat` indeterminate bar, `.au-eyebrow` "Warming up the pitch". On mount, `setTimeout(() => router.push("/welcome"), ~1600ms)` (respect reduced-motion: still advance). Use `next/image` or `<img>` with explicit width.

- [ ] **Step 2: `welcome/page.tsx`** (client) — port `OnbSlide` + `B_Onb1..3` as ONE carousel with `useState(slide)` (0–2). Header: `mark_jet.png` + "Skip" (→ `/signup`) on non-final slides. Slide 0 renders the `clay_map.png` hero (`.onb-hero`/`.clay-float`/`.clay-ground`); slides 1–2 render the placeholder visual (`.onb-visual` block with `<Icon>` chip + caption + tag — exactly as `OnbSlide` does when `image` is absent). Eyebrow/title/sub copy per `B_Onb1..3`. Footer: non-final → `Pager` + circular `.au-next` `<Icon name="arrow_forward">` (advances slide); final (slide 2) → `Pager active={2}` + `AuButton` "Get started" (→ `/signup`) + footer "Already have an account? Log in" (→ `/signin`). Swipe is optional; buttons are required.

- [ ] **Step 3: Test** — `welcome.test.tsx`: renders slide-1 title text ("Games on a map near you"); clicking Next advances to slide 2 title. (jsdom; mock `next/navigation` `useRouter`.)

- [ ] **Step 4: Verify + commit** — `pnpm vitest run src/app/(auth)`, `pnpm typecheck && pnpm build` (routes render), prettier-write.

```bash
git add "src/app/(auth)/boot" "src/app/(auth)/welcome"
git commit -m "feat(auth): boot splash + 3-slide onboarding carousel"
```

---

### Task 5: Sign up (email + phone)

**Files:** Create `src/app/(auth)/signup/page.tsx`; Test `src/app/(auth)/signup/signup.test.tsx`

- [ ] **Step 1: `signup/page.tsx`** (client) — port `B_SignUp` (email) + `B_SignUpPhone` (phone) as one screen with `useState<"email"|"phone">`. Header: `BackButton` (→ `/welcome`) + `.au-pager` (step 1 of 2: `<i class="on"></i><i></i>`). Title "Create your account" + sub "Join games in Baku in under a minute." `MethodTabs`. Email body: `AuField` Full name (`person`), Email (`mail`), Password (`lock`, trailing `visibility` reveal toggle). Phone body: `AuField` Full name + `PhoneField` + the "We'll text a 6-digit code…" note. CTA: email "Create account" → `/intent`; phone "Send code" → `/verify?flow=signup`. `Divider` + `SocialRow`. Footer "Already have an account? Log in" → `/signin`.

- [ ] **Step 2: Test** — renders "Create your account"; toggling to Phone shows the phone field / hides password; submit (email) pushes `/intent`. Write first → fail → implement → pass.

- [ ] **Step 3: Verify + commit** (`pnpm vitest run`, typecheck, prettier):

```bash
git add "src/app/(auth)/signup"
git commit -m "feat(auth): sign-up screen (email + phone method toggle)"
```

---

### Task 6: Verify code (OTP)

**Files:** Create `src/app/(auth)/verify/page.tsx`; Test `src/app/(auth)/verify/verify.test.tsx`

- [ ] **Step 1: `verify/page.tsx`** (client) — port `B_OTP`: `BackButton`; title "Enter the code"; sub "Sent to +994 50 123 45 67 · Edit" (Edit → `router.back()`); `OtpInput`; `.au-resend` "Resend code in 0:28" (a real countdown from 28→0, then a "Resend" button — keep simple: a `useState` timer); CTA "Verify" → on complete, read `?flow` (via `useSearchParams`): `signup` → `/intent`, else `/app`. Footer "Didn't get a code? Resend".

- [ ] **Step 2: Test** — renders "Enter the code"; filling 6 digits enables Verify; Verify with `?flow=signup` pushes `/intent`. (Mock router + searchParams.)

- [ ] **Step 3: Verify + commit**

```bash
git add "src/app/(auth)/verify"
git commit -m "feat(auth): OTP verify screen (flow-aware next step)"
```

---

### Task 7: Intent (optional personalization)

**Files:** Create `src/app/(auth)/intent/page.tsx`; Test `src/app/(auth)/intent/intent.test.tsx`

- [ ] **Step 1: `intent/page.tsx`** (client) — port `B_Intent`: `BackButton` (→ `/signup`) + `.chip-skip` "Skip" (→ `/app`). Title "How will you use SQUAD?" + sub "Pick anything that fits — it just tailors your home. Optional." Three `ChipGroup`s with `IntentChip`s exactly as `B_Intent` (What you're here for / Your pace / Sports), multi-select client state (seed the same defaults shown on). `VendorLaunch` row. `AuButton` "Continue" → `/app`. **Writes nothing** (no data model) — selection is local-only; document that with a comment.

- [ ] **Step 2: Test** — renders the title; a chip toggles `aria-pressed` on click; Continue pushes `/app`.

- [ ] **Step 3: Verify + commit**

```bash
git add "src/app/(auth)/intent"
git commit -m "feat(auth): optional 'how you'll use SQUAD' intent screen (local-only)"
```

---

### Task 8: Sign in (email + phone)

**Files:** Create `src/app/(auth)/signin/page.tsx`; Test `src/app/(auth)/signin/signin.test.tsx`

- [ ] **Step 1: `signin/page.tsx`** (client) — port `B_LogIn` (email) + `B_Phone` (phone) as one screen with method state. Header: `BackButton` (→ `/welcome`). Title "Welcome back" + sub "Sign in with email or phone." `MethodTabs`. Email body: `AuField` Email (`mail`) + Password (`lock` + reveal); row with `RememberToggle` "Stay signed in" + "Forgot?" link. Phone body: `PhoneField` + "We'll text you a 6-digit code…" note. CTA: email "Log in" → `/app`; phone "Send code" → `/verify?flow=signin`. `Divider` + `SocialRow`. Footer "New here? Create account" → `/signup`.

- [ ] **Step 2: Test** — renders "Welcome back"; toggling Phone shows phone field; email submit pushes `/app`.

- [ ] **Step 3: Verify + commit**

```bash
git add "src/app/(auth)/signin"
git commit -m "feat(auth): sign-in screen (email + phone method toggle)"
```

---

### Task 9: a11y + e2e smoke + full verification

**Files:** Create `e2e/auth.spec.ts`; possibly Modify `src/app/(auth)/auth.css` (contrast fixes)

- [ ] **Step 1: `e2e/auth.spec.ts`** — for each of `/boot`, `/welcome`, `/signup`, `/signin`, `/verify`, `/intent`: assert a key heading/text renders. Assert `/signup` method toggle swaps email↔phone fields. Run an `AxeBuilder` scan on `/welcome`, `/signup`, `/signin`, `/intent` and assert **zero serious/critical** violations (these screens are light; no theme loop needed).

- [ ] **Step 2: Run it locally** (Playwright boots `pnpm start` against `.env.local`): `pnpm exec playwright test e2e/auth.spec.ts`. **If axe flags color-contrast** (likely candidates: terracotta `--terra-500` text on linen, or `--steel-400` captions at small sizes — the same class of issue as the Plan 06 tabbar), fix in `(auth)/auth.css` by promoting the offending **text** to an AA-passing token (e.g. caption `--steel-400`→`--steel-500`; terracotta link/eyebrow text → keep terracotta only where it clears 4.5:1, else `--terra-600`/`--terra-700`), keeping terracotta on non-text accents. Re-run until green. Document any override with a comment.

- [ ] **Step 3: Full DoD gauntlet** — all green:

```bash
pnpm format:check && pnpm lint && pnpm typecheck && pnpm check:design && pnpm test && pnpm build
pnpm exec playwright test         # existing /app theme+smoke AND the new auth specs
```

- [ ] **Step 4: Commit**

```bash
git add e2e/auth.spec.ts "src/app/(auth)/auth.css"
git commit -m "test(auth): e2e smoke + axe gate for auth screens (+ contrast fixes)"
```

---

### Task 10: Docs + PR

**Files:** Modify `CLAUDE.md`, `docs/context/architecture.md`

- [ ] **Step 1: `CLAUDE.md`** — under Conventions, note: "Auth/first-run screens live in `app/(auth)/` (light-only Direction B), composed from `src/components/auth/` on the SQUAD tokens; they are UI-only (not wired to Supabase yet). Adding an auth icon follows the same two-step icon workflow." Under the route-group description, add `/boot /welcome /signup /verify /intent /signin`.

- [ ] **Step 2: `docs/context/architecture.md`** — append a short "Auth screens (Plan 07)" note: handoff-sourced, light-only via `.auth-root` token re-assertion, no phone-frame, Material-icon ligatures, real client interactions, deferred auth wiring.

- [ ] **Step 3: Commit + push + PR**

```bash
git add CLAUDE.md docs/context/architecture.md
git commit -m "docs: auth-screens conventions (Plan 07)"
git push -u origin feat/auth-screens
gh pr create --title "Plan 07: auth & first-run screens (UI)" --body "Implements docs/plans/07-auth-screens.md from the Claude Design handoff. 10 Direction-B screens across 6 routes under app/(auth)/, UI-only (no Supabase wiring). Light-only; Material-icon ligatures; +9 icons in the subset. CI: format/lint/typecheck/check:design/test/build + auth e2e (smoke + axe). 🤖 Generated with [Claude Code](https://claude.com/claude-code)"
```

---

## Definition of Done (Plan 07)

- `pnpm format:check && pnpm lint && pnpm typecheck && pnpm check:design && pnpm test && pnpm build && pnpm exec playwright test` all green locally and in CI.
- All 10 artboards exist as navigable routes under `/boot /welcome /signup /verify /intent /signin`, matching the handoff visually (light "Warm Linen", Montserrat titles, soft rounded fields, one terracotta spike, clay hero on onboarding slide 1).
- Real interactions: method toggle, password reveal, carousel, OTP entry, chip multi-select, remember toggle, and screen-to-screen navigation per the route map. No network/auth calls.
- Screens stay **light** even when the app `data-theme="dark"` (auth-root re-assertion); no `sq-*` literal in any `.tsx` (`check:design` green); icons are Material ligatures (no SVG except brand marks).
- Zero serious/critical axe violations on the auth screens.
- `+9` Material icons in the subset (parity-tested); subset font still < 100 KB.
- `CLAUDE.md` + `architecture.md` document the `(auth)` group and the light-only rule.

**Deferred (not this plan):** wiring email auth to `lib/auth`; phone OTP via a Supabase SMS provider; Google/Apple OAuth; an auth guard/redirect for `/app`; persisting the intent selection (needs a data model); image optimization of the PNG assets; the games/home screens from the same handoff bundle.
