# Foundation Plan 2 — CI Pipeline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a 100% portable `.github/workflows/ci.yml` that gates every PR and push with secret scanning, lint+typecheck, tests against an ephemeral Postgres service container (proving migrations apply), SAST + dependency/IaC scanning, a built-and-scanned container image pushed to GHCR, and a Playwright E2E smoke — plus Dependabot to keep dependencies and the pipeline itself current.

**Architecture:** One GitHub Actions workflow with seven jobs (`secret-scan`, `lint`, `test`, `sast`, `vuln-scan`, `build-image`, `e2e`). The five check jobs run in parallel; `build-image` and `e2e` run after they pass. The workflow knows nothing about Vercel (that lands in Plan 4's `deploy.yml`) — it carries to any platform unchanged. Tooling is free and CI-agnostic: gitleaks, ESLint/Prettier/`tsc`, Vitest, Semgrep OSS, Trivy, Docker→GHCR, Playwright.

**Tech Stack:** GitHub Actions, gitleaks, ESLint + Prettier, Vitest, Semgrep OSS, Trivy, Docker Buildx + GHCR, Playwright, Dependabot, pnpm.

---

## Plan Series Context

This is **Plan 2 of 4** in the foundation series derived from `output/2026-05-29-app-foundation-portable-seams-design.md`:

1. Plan 1 (done): App skeleton + portable seams + local data layer → spec §2, §3, §4, §7.
2. **Plan 2 (this doc):** CI pipeline (`ci.yml`) → spec §5 (and Dependabot, part of §5 stage 4).
3. Plan 3: IaC (Terraform modules + per-env vars + state) → spec §6. **Picks up:** branch protection + required-status-checks wiring these CI jobs as merge gates, the cross-environment config **parity-check** job (§7), and the `compute/` seam module.
4. Plan 4: Deploy + rollback (`deploy.yml`, `rollback.yml`, post-deploy health gate) → spec §5, §8. **Picks up:** the full core-loop E2E run against a real Vercel preview URL.

## Two Refinements From The Source Design (read before starting)

The design's §5 table describes the end-state pipeline. Two items are deliberately re-scoped here so this plan produces a **working, self-contained CI** with **no references to things that do not exist yet**. Both are documented seams, not cut features.

1. **E2E runs against the app booted _inside_ the CI job — not a "PR preview URL."** Preview URLs come from Vercel via `deploy.yml`, which is Plan 4. Pointing CI at a Vercel URL would make `ci.yml` vendor-aware, violating the design's own rule that "`ci.yml` is 100% portable; only `deploy.yml` knows about Vercel" (§5). So the `e2e` job builds the app and starts it via Playwright's `webServer`. Plan 4 adds a second, post-deploy core-loop check against the live preview.
2. **The E2E smoke covers what Plan 1 actually built — not the full core loop.** Plan 1 shipped the health endpoint and two route-group placeholder pages. The `signup → create game → request → approve` routes do **not exist yet** (they are application-feature work, after the foundation series). So the smoke asserts: `/api/health` → `200 {status:"ok"}`, `/` renders the client placeholder, `/venue` renders the venue placeholder. The full-core-loop spec is left as a documented placeholder in the E2E job so it is added in one obvious place when those features ship.

## Staying Current With Context7 (per project directive)

Action and tool versions move fast. **Before pinning any `uses:` line below, re-verify the current major via Context7** (`resolve-library-id` → `query-docs`) or the action's releases page, and bump if newer. This plan was authored on 2026-05-29 and the following were verified via Context7 at that time:

- **Playwright** (`/websites/playwright_dev`) — CI pattern confirmed: `npx/pnpm exec playwright install --with-deps`, `webServer` block to boot the app, upload `playwright-report/` artifact. Upstream CI docs currently show `actions/checkout@v5` and `actions/setup-node@v5`.
- **Trivy** (`/aquasecurity/trivy`) — CI semantics confirmed: `--severity HIGH,CRITICAL --exit-code 1` fails the build; `fs`, `config`, and `image` scan types.
- **Semgrep** (`/semgrep/semgrep-docs`) — OSS-without-account pattern confirmed: run job in `container: image: semgrep/semgrep` and call `semgrep scan --config auto` (no `SEMGREP_APP_TOKEN` needed).

Pins **not** independently version-checked here (re-verify before use): `pnpm/action-setup`, `docker/setup-buildx-action`, `docker/login-action`, `docker/build-push-action`, `gitleaks/gitleaks-action`, `aquasecurity/trivy-action`. **Task 8's Dependabot config includes the `github-actions` ecosystem**, so once merged the pipeline keeps its own action pins current automatically — this is the durable mechanism behind the "stay up to date" directive.

## Boundary & Prerequisites

- **This plan runs in the app repo created by Plan 1 (the separate `sport-app` repo) — not in the brainstorm vault.** Do not add CI to the vault.
- **Plan 1 must be complete and pushed to GitHub.** Verify before starting:
  - Run: `git remote -v && ls .github 2>/dev/null; pnpm typecheck && pnpm test && pnpm build`
  - Expected: an `origin` on GitHub; Plan 1's checks pass. (`.github` may not exist yet — this plan creates it.)
- Required local tooling: **Node 20+**, **pnpm 9+**, **Docker** (used to run gitleaks/semgrep/trivy locally exactly as CI does), **git**, **Supabase CLI** (for the local DB when verifying the test/e2e jobs).
- **No external CI secrets are required.** GHCR auth uses the built-in `GITHUB_TOKEN`. gitleaks/Semgrep/Trivy/Playwright need no tokens for this OSS setup.
- One-time repo settings (Task 8 documents these; they cannot live in `ci.yml`): enable **Secret scanning + Push protection** (Settings → Code security). Branch protection / required checks are codified in Plan 3 (Terraform `repo/` module).

## File Structure (created/modified by this plan)

| File                       | Responsibility                                                                 |
| -------------------------- | ------------------------------------------------------------------------------ |
| `.github/workflows/ci.yml` | The entire portable CI pipeline (7 jobs); built up across Tasks 2–7            |
| `.github/dependabot.yml`   | Weekly update PRs for npm deps, GitHub Actions pins, and the Docker base image |
| `.prettierrc.json`         | Prettier config (formatting is gated in `lint`)                                |
| `.prettierignore`          | Paths Prettier must not touch (generated/vendored)                             |
| `playwright.config.ts`     | Playwright config: `testDir: e2e`, chromium, `webServer` boots `pnpm start`    |
| `e2e/smoke.spec.ts`        | E2E smoke: health 200 + both placeholder surfaces render                       |
| `package.json`             | Add `format`, `format:check`, `test:e2e` scripts (modify)                      |
| `README.md`                | Add a "Continuous Integration" section (modify)                                |

**Canonical names used across tasks (do not rename):**

- Workflow file: `.github/workflows/ci.yml`; jobs: `secret-scan`, `lint`, `test`, `sast`, `vuln-scan`, `build-image`, `e2e`.
- Scripts: `format`, `format:check`, `test:e2e` (added here); `lint`, `typecheck`, `test`, `test:integration` (exist from Plan 1 / create-next-app).
- CI env keys (must match Plan 1's Zod schema in `src/lib/config/index.ts`): `NODE_ENV`, `DATABASE_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- The Postgres service block is **identical** in the `test` and `e2e` jobs — keep them in sync. The env block is the same **except** `e2e` omits `NODE_ENV` on purpose (Next sets it during `build`/`start`; see Task 7).

> **Why CI must set those env keys:** Plan 1's `src/lib/config/index.ts` ends with `export const config = parseEnv(process.env)` — a fail-fast singleton evaluated the moment any app module is imported. Vitest, `next build`, and `next start` all import app code, so every job that runs them must export the four keys or the process throws "Invalid environment configuration". `DATABASE_URL` points at the service container; the two `NEXT_PUBLIC_*` values are valid-but-dummy in CI (no real Supabase project is contacted — auth tests use Plan 1's in-memory provider).

---

## Task 1: Add Prettier (lint stage, formatting half)

Plan 1 already has ESLint (from create-next-app) and `typecheck` (`tsc --noEmit`). Design §5 stage 2 is "ESLint + Prettier + tsc", so add Prettier as a check.

**Files:**

- Create: `.prettierrc.json`, `.prettierignore`
- Modify: `package.json` (scripts)

- [ ] **Step 1: Install Prettier**

Run: `pnpm add -D prettier`
Expected: `prettier` added to `devDependencies`; `pnpm-lock.yaml` updated.

- [ ] **Step 2: Create the Prettier config**

Create `.prettierrc.json`:

```json
{
  "semi": true,
  "singleQuote": false,
  "trailingComma": "all",
  "printWidth": 100
}
```

- [ ] **Step 3: Create `.prettierignore`**

Create `.prettierignore`:

```
node_modules
.next
migrations
pnpm-lock.yaml
playwright-report
coverage
```

- [ ] **Step 4: Add format scripts to `package.json`**

In the `"scripts"` block add:

```json
"format": "prettier --write .",
"format:check": "prettier --check ."
```

- [ ] **Step 5: Normalize existing files, then verify the check passes**

Run: `pnpm format && pnpm format:check`
Expected: `format` rewrites any unformatted files; `format:check` then prints "All matched files use Prettier code style!" and exits 0.

- [ ] **Step 6: Confirm lint and typecheck still pass**

Run: `pnpm lint && pnpm typecheck`
Expected: ESLint reports no errors; `tsc` exits 0. (If `pnpm lint` errors with "missing script", add `"lint": "next lint"` to `package.json` scripts — create-next-app normally adds it.)

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "chore: add Prettier formatting check"
```

---

## Task 2: Workflow skeleton + secret-scan job (stage 1)

**Files:**

- Create: `.github/workflows/ci.yml`

- [ ] **Step 1: Create `ci.yml` with the workflow header and the first job**

Create `.github/workflows/ci.yml`:

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:

# Least privilege by default; build-image widens this for GHCR.
permissions:
  contents: read

# Cancel superseded runs on the same ref to save minutes.
concurrency:
  group: ci-${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

jobs:
  # Stage 1 — block any committed secret.
  secret-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
        with:
          fetch-depth: 0 # full history so gitleaks scans every commit on push
      - name: gitleaks
        uses: gitleaks/gitleaks-action@v2
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

- [ ] **Step 2: Validate the YAML parses**

Run: `pnpm dlx js-yaml .github/workflows/ci.yml > /dev/null && echo "yaml-ok"`
Expected: prints `yaml-ok` (no parse error). If `js-yaml` is unavailable offline, instead run `python3 -c "import yaml,sys; yaml.safe_load(open('.github/workflows/ci.yml')); print('yaml-ok')"`.

- [ ] **Step 3: Run gitleaks locally exactly as CI will (via Docker)**

Run:

```bash
docker run --rm -v "$PWD:/repo" zricethezav/gitleaks:latest detect --source=/repo --no-banner --redact
```

Expected: "no leaks found" and exit code 0. (If it flags Plan 1's `.env.example`, that file contains only placeholders like `replace-me`; confirm no real secret is present. Add a `.gitleaks.toml` allowlist only for confirmed false positives.)

- [ ] **Step 4: Commit**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: add workflow skeleton and gitleaks secret scan"
```

---

## Task 3: Lint job (stage 2)

**Files:**

- Modify: `.github/workflows/ci.yml`

- [ ] **Step 1: Add the `lint` job under `jobs:` in `.github/workflows/ci.yml`**

Append this job (a new top-level entry under `jobs:`, sibling to `secret-scan`):

```yaml
# Stage 2 — formatting, lint, and types. No app code is executed, so no env/DB needed.
lint:
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v5
    - uses: pnpm/action-setup@v4
    - uses: actions/setup-node@v5
      with:
        node-version: 20
        cache: pnpm
    - run: pnpm install --frozen-lockfile
    - name: Prettier
      run: pnpm format:check
    - name: ESLint
      run: pnpm lint
    - name: Typecheck
      run: pnpm typecheck
```

- [ ] **Step 2: Verify all three checks pass locally (this is exactly what the job runs)**

Run: `pnpm install --frozen-lockfile && pnpm format:check && pnpm lint && pnpm typecheck`
Expected: install succeeds against the committed lockfile; Prettier reports all files styled; ESLint reports no errors; `tsc` exits 0.

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: add lint job (prettier, eslint, typecheck)"
```

---

## Task 4: Test job — ephemeral Postgres + migrations (stage 3)

This job stands up a throwaway Postgres service container, applies the Drizzle migrations against it (proving they apply), then runs Vitest unit/contract tests and the DB integration test.

**Files:**

- Modify: `.github/workflows/ci.yml`

- [ ] **Step 1: Add the `test` job under `jobs:`**

Append:

```yaml
# Stage 3 — unit/contract + integration tests against a real, ephemeral Postgres.
test:
  runs-on: ubuntu-latest
  services:
    postgres:
      image: postgres:16-alpine
      env:
        POSTGRES_USER: postgres
        POSTGRES_PASSWORD: postgres
        POSTGRES_DB: postgres
      ports:
        - 5432:5432
      options: >-
        --health-cmd "pg_isready -U postgres"
        --health-interval 10s
        --health-timeout 5s
        --health-retries 5
  env:
    NODE_ENV: test
    DATABASE_URL: postgresql://postgres:postgres@localhost:5432/postgres
    NEXT_PUBLIC_SUPABASE_URL: http://127.0.0.1:54321
    NEXT_PUBLIC_SUPABASE_ANON_KEY: ci-anon-key
  steps:
    - uses: actions/checkout@v5
    - uses: pnpm/action-setup@v4
    - uses: actions/setup-node@v5
      with:
        node-version: 20
        cache: pnpm
    - run: pnpm install --frozen-lockfile
    - name: Apply migrations (proves migrations apply cleanly)
      run: pnpm exec drizzle-kit migrate
    - name: Unit + contract tests
      run: pnpm test
    - name: Integration tests
      run: pnpm test:integration
```

- [ ] **Step 2: Reproduce the job locally against a throwaway Postgres**

Run (mirrors the service container without touching your local Supabase):

```bash
docker run --rm -d --name ci-pg -e POSTGRES_PASSWORD=postgres -e POSTGRES_USER=postgres -e POSTGRES_DB=postgres -p 5432:5432 postgres:16-alpine
sleep 4
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/postgres \
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321 \
NEXT_PUBLIC_SUPABASE_ANON_KEY=ci-anon-key \
NODE_ENV=test \
  sh -c 'pnpm exec drizzle-kit migrate && pnpm test && pnpm test:integration'
docker stop ci-pg
```

Expected: migrations apply ("migrations applied"); `pnpm test` passes all unit/contract tests; `pnpm test:integration` passes the insert/select integration test. Exit code 0.

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: add test job against ephemeral Postgres with migrations"
```

---

## Task 5: Security scan jobs — Semgrep + Trivy (stage 4)

Two jobs: `sast` (Semgrep OSS, in its official container) and `vuln-scan` (Trivy filesystem scan for vulnerable/secret-bearing deps, plus Trivy config scan for IaC/Dockerfile misconfigurations). Dependabot — the third item in stage 4 — is added in Task 8.

**Files:**

- Modify: `.github/workflows/ci.yml`

- [ ] **Step 1: Add the `sast` job under `jobs:`**

Append (the whole job runs inside the Semgrep image — the Context7-verified OSS pattern; `--error` makes findings fail the job; no token required):

```yaml
# Stage 4a — SAST with Semgrep OSS (no account/token needed).
sast:
  runs-on: ubuntu-latest
  container:
    image: semgrep/semgrep
  steps:
    - uses: actions/checkout@v5
    - name: Semgrep scan
      run: semgrep scan --config auto --error
```

- [ ] **Step 2: Add the `vuln-scan` job under `jobs:`**

Append:

```yaml
# Stage 4b — dependency/secret scan (fs) + IaC/Dockerfile misconfig scan (config).
vuln-scan:
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v5
    - name: Trivy filesystem scan (deps & secrets)
      uses: aquasecurity/trivy-action@0.28.0
      with:
        scan-type: fs
        scan-ref: .
        severity: HIGH,CRITICAL
        exit-code: "1"
        ignore-unfixed: true
    - name: Trivy config scan (IaC / Dockerfile)
      uses: aquasecurity/trivy-action@0.28.0
      with:
        scan-type: config
        scan-ref: .
        severity: HIGH,CRITICAL
        exit-code: "1"
```

- [ ] **Step 3: Run both scanners locally exactly as CI will (via Docker)**

Run:

```bash
docker run --rm -v "$PWD:/src" semgrep/semgrep semgrep scan --config auto --error
docker run --rm -v "$PWD:/work" -w /work aquasec/trivy:latest fs --severity HIGH,CRITICAL --exit-code 1 --ignore-unfixed .
docker run --rm -v "$PWD:/work" -w /work aquasec/trivy:latest config --severity HIGH,CRITICAL --exit-code 1 .
```

Expected: Semgrep finds no blocking issues (exit 0); both Trivy scans exit 0. If Trivy `config` flags the Dockerfile (e.g., "last USER should not be root"), fix the Dockerfile to add a non-root `USER` rather than suppressing — that is a real finding the design's §5 intends to catch.

- [ ] **Step 4: Commit**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: add Semgrep SAST and Trivy fs/config scans"
```

---

## Task 6: Build + containerize + push to GHCR (stage 5)

Build the Plan 1 Dockerfile with Buildx, scan the resulting image with Trivy, and push to GHCR tagged by commit SHA — but only on pushes to `main` (PRs build + scan but do not publish, keeping the registry clean). Gated on the five check jobs.

**Files:**

- Modify: `.github/workflows/ci.yml`

- [ ] **Step 1: Add the `build-image` job under `jobs:`**

Append:

```yaml
# Stage 5 — build the portable image, scan it, publish to GHCR on main.
build-image:
  needs: [secret-scan, lint, test, sast, vuln-scan]
  runs-on: ubuntu-latest
  permissions:
    contents: read
    packages: write
  steps:
    - uses: actions/checkout@v5
    - name: Compute lowercase image ref
      run: echo "IMAGE=ghcr.io/$(echo '${{ github.repository }}' | tr '[:upper:]' '[:lower:]')" >> "$GITHUB_ENV"
    - uses: docker/setup-buildx-action@v3
    - name: Build image (load into local daemon for scanning)
      uses: docker/build-push-action@v6
      with:
        context: .
        load: true
        tags: ${{ env.IMAGE }}:${{ github.sha }}
    - name: Scan image with Trivy
      uses: aquasecurity/trivy-action@0.28.0
      with:
        scan-type: image
        image-ref: ${{ env.IMAGE }}:${{ github.sha }}
        severity: HIGH,CRITICAL
        exit-code: "1"
        ignore-unfixed: true
    - name: Log in to GHCR
      if: github.event_name == 'push' && github.ref == 'refs/heads/main'
      uses: docker/login-action@v3
      with:
        registry: ghcr.io
        username: ${{ github.actor }}
        password: ${{ secrets.GITHUB_TOKEN }}
    - name: Push image to GHCR
      if: github.event_name == 'push' && github.ref == 'refs/heads/main'
      run: |
        docker tag ${{ env.IMAGE }}:${{ github.sha }} ${{ env.IMAGE }}:latest
        docker push ${{ env.IMAGE }}:${{ github.sha }}
        docker push ${{ env.IMAGE }}:latest
```

- [ ] **Step 2: Build and scan the image locally (the publish step only runs in CI on main)**

Run:

```bash
docker build -t sport-app:ci-test .
docker run --rm -v "$PWD:/work" aquasec/trivy:latest image --severity HIGH,CRITICAL --exit-code 1 --ignore-unfixed sport-app:ci-test
```

Expected: image builds successfully; Trivy image scan exits 0. (Plan 1's Dockerfile builder stage sets build-time placeholder env for the four config keys precisely so `next build` can evaluate the fail-fast `config` singleton inside Docker. If you ever see "Invalid environment configuration" here, that `ENV` block is missing from the builder stage — restore it.)

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: build, Trivy-scan, and push image to GHCR by SHA on main"
```

---

## Task 7: E2E smoke with Playwright (stage 6)

Add Playwright, a config that boots the built app via `webServer`, a smoke spec covering what Plan 1 shipped, and the `e2e` CI job (same Postgres service + env as `test`).

**Files:**

- Create: `playwright.config.ts`, `e2e/smoke.spec.ts`
- Modify: `package.json` (script), `.github/workflows/ci.yml`

- [ ] **Step 1: Install Playwright**

Run: `pnpm add -D @playwright/test`
Expected: `@playwright/test` added to `devDependencies`.

- [ ] **Step 2: Add the `test:e2e` script to `package.json`**

In the `"scripts"` block add:

```json
"test:e2e": "playwright test"
```

- [ ] **Step 3: Create the Playwright config**

Create `playwright.config.ts` (the `webServer` block is the Context7-verified pattern for booting the app under test):

```ts
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: "html",
  use: {
    baseURL: "http://127.0.0.1:3000",
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "pnpm start",
    url: "http://127.0.0.1:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
```

- [ ] **Step 4: Write the smoke spec (covers exactly what Plan 1 built)**

Create `e2e/smoke.spec.ts`:

```ts
import { test, expect } from "@playwright/test";

test("health endpoint reports ok when the database is reachable", async ({ request }) => {
  const res = await request.get("/api/health");
  expect(res.status()).toBe(200);
  await expect(res.json()).resolves.toEqual({ status: "ok", db: "up" });
});

test("client surface renders", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("Client surface (player / organizer)")).toBeVisible();
});

test("venue surface renders", async ({ page }) => {
  await page.goto("/venue");
  await expect(page.getByText("Venue owner surface")).toBeVisible();
});

// PLACEHOLDER (Plan 4 + feature work): the full core loop
// signup -> create game -> request -> approve is added here once those
// routes exist and a real preview deploy is available to test against.
```

- [ ] **Step 5: Run the E2E smoke locally**

Run (needs local Supabase running + schema applied, so `/api/health` returns 200):

```bash
supabase start
pnpm dotenv -e .env.local -- drizzle-kit migrate
pnpm exec playwright install --with-deps chromium
pnpm build
pnpm test:e2e
```

Expected: 3 passed. (`webServer` starts `pnpm start`; Next auto-loads `.env.local` for both `build` and `start`, so no `dotenv` wrapper is needed here — only `drizzle-kit migrate` above needs it since it is not a Next process. The health test confirms DB connectivity; both page tests confirm the route groups render.)

- [ ] **Step 6: Add the `e2e` job under `jobs:` in `.github/workflows/ci.yml`**

Append:

```yaml
# Stage 6 — Playwright E2E smoke against the app booted inside CI.
e2e:
  needs: [secret-scan, lint, test, sast, vuln-scan]
  runs-on: ubuntu-latest
  services:
    postgres:
      image: postgres:16-alpine
      env:
        POSTGRES_USER: postgres
        POSTGRES_PASSWORD: postgres
        POSTGRES_DB: postgres
      ports:
        - 5432:5432
      options: >-
        --health-cmd "pg_isready -U postgres"
        --health-interval 10s
        --health-timeout 5s
        --health-retries 5
  env:
    DATABASE_URL: postgresql://postgres:postgres@localhost:5432/postgres
    NEXT_PUBLIC_SUPABASE_URL: http://127.0.0.1:54321
    NEXT_PUBLIC_SUPABASE_ANON_KEY: ci-anon-key
  steps:
    - uses: actions/checkout@v5
    - uses: pnpm/action-setup@v4
    - uses: actions/setup-node@v5
      with:
        node-version: 20
        cache: pnpm
    - run: pnpm install --frozen-lockfile
    - name: Apply migrations
      run: pnpm exec drizzle-kit migrate
    - name: Install Playwright chromium
      run: pnpm exec playwright install --with-deps chromium
    - name: Build app
      run: pnpm build
    - name: Run E2E smoke
      run: pnpm test:e2e
    - uses: actions/upload-artifact@v4
      if: ${{ !cancelled() }}
      with:
        name: playwright-report
        path: playwright-report/
        retention-days: 7
```

> **Note:** `NODE_ENV` is intentionally omitted here — `next build`/`next start` set it to `production` themselves, and Plan 1's Zod schema defaults `NODE_ENV` to `development` if unset. Forcing `test` would fight Next's production build.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "ci: add Playwright E2E smoke (health + route-group surfaces)"
```

---

## Task 8: Dependabot + repo security settings

**Files:**

- Create: `.github/dependabot.yml`

- [ ] **Step 1: Create the Dependabot config**

Create `.github/dependabot.yml` (covers npm deps, the CI action pins — directly serving the "stay up to date" directive — and the Docker base image):

```yaml
version: 2
updates:
  - package-ecosystem: npm
    directory: "/"
    schedule:
      interval: weekly
    open-pull-requests-limit: 10
    groups:
      all-npm:
        patterns: ["*"]
  - package-ecosystem: github-actions
    directory: "/"
    schedule:
      interval: weekly
  - package-ecosystem: docker
    directory: "/"
    schedule:
      interval: weekly
```

- [ ] **Step 2: Validate the YAML parses**

Run: `python3 -c "import yaml; yaml.safe_load(open('.github/dependabot.yml')); print('yaml-ok')"`
Expected: prints `yaml-ok`.

- [ ] **Step 3: Document/enable repo-level secret scanning (cannot live in `ci.yml`)**

This is a one-time GitHub UI setting, recorded here so it is not forgotten and so Plan 3 can codify it via the Terraform `repo/` module:

- Go to the repo → **Settings → Code security** → enable **Secret scanning** and **Push protection**.
- Verify: the "Secret scanning" and "Push protection" toggles read **Enabled**.
- (Branch protection + required status checks — making `secret-scan`, `lint`, `test`, `sast`, `vuln-scan`, `build-image`, `e2e` mandatory before merge — are codified in **Plan 3**, not clicked here.)

- [ ] **Step 4: Commit**

```bash
git add .github/dependabot.yml
git commit -m "ci: add Dependabot for npm, actions, and docker"
```

---

## Task 9: README CI section + full-pipeline verification

**Files:**

- Modify: `README.md`

- [ ] **Step 1: Add a "Continuous Integration" section to `README.md`**

Append to `README.md`:

```markdown
## Continuous Integration

`.github/workflows/ci.yml` runs on every PR and push to `main` (portable — no
Vercel/vendor specifics; that lives in `deploy.yml`, Plan 4):

| Job           | What it gates                                                                               |
| ------------- | ------------------------------------------------------------------------------------------- |
| `secret-scan` | gitleaks — blocks any committed secret                                                      |
| `lint`        | Prettier + ESLint + `tsc`                                                                   |
| `test`        | Vitest unit/contract + integration against an ephemeral Postgres (migrations applied first) |
| `sast`        | Semgrep OSS (SAST)                                                                          |
| `vuln-scan`   | Trivy filesystem (deps/secrets) + config (IaC/Dockerfile)                                   |
| `build-image` | Build → Trivy-scan image → push to GHCR by commit SHA (push to `main` only)                 |
| `e2e`         | Playwright smoke (health 200 + both route-group surfaces) against the app booted in CI      |

No external secrets are required; GHCR uses the built-in `GITHUB_TOKEN`.
Dependabot (`.github/dependabot.yml`) keeps npm deps, action pins, and the
Docker base image current.

Reproduce any job locally with Docker (gitleaks/semgrep/trivy) or the matching
`pnpm` script (`format:check`, `lint`, `typecheck`, `test`, `test:integration`,
`test:e2e`).
```

- [ ] **Step 2: Sanity-check the assembled workflow has all seven jobs**

Run:

```bash
python3 -c "import yaml; d=yaml.safe_load(open('.github/workflows/ci.yml')); print(sorted(d['jobs']))"
```

Expected: `['build-image', 'e2e', 'lint', 'sast', 'secret-scan', 'test', 'vuln-scan']`

- [ ] **Step 3: Push a branch, open a PR, and confirm every job is green**

Run:

```bash
git add -A
git commit -m "docs: document CI pipeline in README"
git checkout -b ci/foundation-plan-2
git push -u origin ci/foundation-plan-2
gh pr create --fill --title "Foundation Plan 2: CI pipeline" --body "Adds ci.yml (7 jobs) + Dependabot per the portable-seams design §5."
gh pr checks --watch
```

Expected: `gh pr checks --watch` shows all seven jobs complete with **pass**. If a job fails, fix it before merging — this PR is the real verification that the pipeline works end-to-end, not just that the YAML parses.

- [ ] **Step 4: Merge once green**

```bash
gh pr merge --squash --delete-branch
```

Expected: PR merges to `main`; the post-merge run's `build-image` job publishes `ghcr.io/<owner>/<repo>:<sha>` and `:latest`.

---

## Definition of Done (Plan 2)

- `.github/workflows/ci.yml` exists with all seven jobs and runs on PR + push to `main`.
- A PR shows **all seven jobs green**; `gh pr checks` reports pass.
- `secret-scan` blocks committed secrets; `sast` + `vuln-scan` block HIGH/CRITICAL; `test` applies migrations to an ephemeral Postgres and runs unit + integration; `build-image` builds, Trivy-scans, and (on `main`) pushes the image to GHCR by SHA; `e2e` smoke passes (health 200 + both surfaces).
- `.github/dependabot.yml` covers npm, `github-actions`, and `docker`.
- **No external CI secret is required** (GHCR auth via `GITHUB_TOKEN`).
- `ci.yml` contains **no Vercel/vendor specifics** — it is portable.
- Repo **Secret scanning + Push protection** enabled (Task 8 Step 3).

**Next:** Plan 3 (IaC / Terraform) codifies branch protection + required status checks (wiring these seven jobs as merge gates), provisions per-env Supabase + GitHub config from one module (parity by construction), adds the cross-environment config **parity-check** job (§7), and scaffolds the `compute/` seam module + ADR. Plan 4 (deploy/rollback) adds the staging→approval→prod flow, the post-deploy health gate, and the full core-loop E2E against a live Vercel preview URL.
