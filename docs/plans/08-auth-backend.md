# Auth Backend Implementation Plan

> For agentic workers: REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (- [ ]) syntax for tracking.

**Goal:** Wire the existing `(auth)` screens to a real, client-agnostic Supabase email/password auth backend behind the `lib/auth` seam.

**Architecture:** The web session is an httpOnly cookie session via `@supabase/ssr`, confined to `lib/auth` (exactly three files import the vendor SSR SDK, each behind `import "server-only"`). One `getCurrentUser` resolver reads either the cookie (web) or an `Authorization: Bearer` token (native seam, locally verified via JWKS), and the app owns its `/api/v1/auth/*` endpoints. Authorization is enforced at the app layer because RLS is inert over the Drizzle owner connection.

**Tech Stack:** Next.js 16, `@supabase/ssr` + `supabase-js`, Drizzle/postgres-js, Zod, Vitest + Playwright, pnpm.

**Plan Series Context:** This is Plan 08, following Plan 07 (auth & first-run screens, UI-only — merged to `main`). It is the first plan to give those screens a real backend.

## Boundary & Prerequisites

- Runs on branch `feat/auth-backend`.
- Plan 06 (design-system foundation) and Plan 07 (auth screens) are already on `main`.
- The design spec at `/Users/faridbabayev/projects/personal/squad_app/docs/superpowers/specs/2026-06-14-auth-backend-design.md` is the source of truth; section references (e.g. §3, §8, §11.4) point into it.

---

## Task 0 — Branch + dependencies + green baseline

Establishes the working branch and the two new runtime dependencies (`@supabase/ssr`, `server-only`), then proves the tree is green before any auth-backend code lands. Nothing here is TDD — it is the clean slate the rest of the plan builds on.

- [ ] **Step 1: Branch off `main`.**
  ```bash
  git checkout main && git pull --ff-only origin main && git checkout -b feat/auth-backend
  ```
  Expected: `Switched to a new branch 'feat/auth-backend'`.

- [ ] **Step 2: Verify the pre-add baseline is already green.** Confirm we start from a clean tree (so any later red is ours, not pre-existing).
  ```bash
  pnpm install --frozen-lockfile && pnpm typecheck && pnpm test
  ```
  Expected: install completes with no lockfile changes; `tsc --noEmit` exits 0 with no output; Vitest run is all-green (existing config/auth/db suites pass).

- [ ] **Step 3: Add the two runtime dependencies.** `@supabase/ssr` is the cookie-session SDK (imported only in `src/lib/auth/`); `server-only` is the build-time guard that makes a stray client import of a server module fail the build.
  ```bash
  pnpm add @supabase/ssr server-only
  ```
  Expected: both land in `dependencies` in `package.json`; `pnpm-lock.yaml` updates. Do not pin from memory — pnpm resolves the current published versions (verify against the Context7 MCP / Supabase docs if a `getClaims` shape question arises later, per §14.3 of the spec).

- [ ] **Step 4: Confirm the install is consistent and the tree still builds + tests green.**
  ```bash
  pnpm install --frozen-lockfile && pnpm typecheck && pnpm test && pnpm build
  ```
  Expected: `--frozen-lockfile` succeeds (lockfile already matches the `pnpm add`); typecheck exits 0; Vitest green; `next build` completes with no errors. This is the load-bearing proof that adding `@supabase/ssr` + `server-only` did not perturb the existing app before we write any auth code.

- [ ] **Step 5: Commit.**
  ```bash
  git add package.json pnpm-lock.yaml
  git commit -m "build(auth): add @supabase/ssr + server-only for the auth backend seam"
  ```

---

## Task 1 — Config additions (four new env keys) + `.env.example` parity + vitest env

Adds the four auth env keys to the sole env reader (`src/lib/config/index.ts`), exposes the three new config fields (`supabasePublishableKey`, `authCookieDomain`, `authAllowedOrigins`), and keeps `.env.example` in lockstep (the parity test asserts exact key-set equality). TDD: the parity test and a new `parseEnv` case go red first.

- [ ] **Step 1: Red — extend the parity expectation by adding the four keys to `.env.example`.** The parity test (`env-parity.test.ts`) compares `.env.example` keys to `Object.keys(envSchema.shape)`. Adding the example lines first makes it red (schema doesn't declare them yet), which is the failing test that drives the schema change. Replace the whole file `/Users/faridbabayev/projects/personal/squad_app/.env.example`:
  ```bash
  # NODE_ENV — runtime mode. secret: no. envs: all
  NODE_ENV=development
  # DATABASE_URL — Postgres connection string. secret: YES. envs: all
  DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres
  # NEXT_PUBLIC_SUPABASE_URL — Supabase API URL. secret: no. envs: all
  NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
  # NEXT_PUBLIC_SUPABASE_ANON_KEY — Supabase anon key (client-safe, legacy). secret: no. envs: all
  NEXT_PUBLIC_SUPABASE_ANON_KEY=replace-me
  # NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY — Supabase publishable key (client-safe, preferred). secret: no. envs: all
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=replace-me
  # SUPABASE_SERVICE_ROLE_KEY — server-only admin key. secret: YES. envs: server runtime only
  SUPABASE_SERVICE_ROLE_KEY=replace-me
  # AUTH_COOKIE_DOMAIN — cookie Domain for the session cookie; unset → host-only. secret: no. envs: all
  AUTH_COOKIE_DOMAIN=
  # AUTH_ALLOWED_ORIGINS — comma-separated CSRF origin allowlist; unset → host-equality only. secret: no. envs: all
  AUTH_ALLOWED_ORIGINS=
  ```

- [ ] **Step 2: Run the parity test — watch it fail.**
  ```bash
  pnpm vitest run src/lib/config/env-parity.test.ts
  ```
  Expected: FAIL — the example now has four keys (`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `AUTH_COOKIE_DOMAIN`, `AUTH_ALLOWED_ORIGINS`) the schema does not declare, so the `toEqual` set comparison reports extras. This is the red that step 4 turns green.

- [ ] **Step 3: Red — add a `parseEnv` case for the new fields.** Append to `/Users/faridbabayev/projects/personal/squad_app/src/lib/config/config.test.ts` (inside the existing `describe("parseEnv", …)` block, after the last `it`). It asserts the publishable-key fallback and the two optional fields; it fails to compile/run until the schema + return map exist.
  ```ts
  it("prefers the publishable key but falls back to the anon key", () => {
    const withPublishable = parseEnv({
      ...valid,
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "publishable-key",
    });
    expect(withPublishable.supabasePublishableKey).toBe("publishable-key");

    const anonOnly = parseEnv(valid); // no publishable key present
    expect(anonOnly.supabasePublishableKey).toBe(valid.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  });

  it("exposes optional cookie domain and allowed origins", () => {
    const cfg = parseEnv({
      ...valid,
      AUTH_COOKIE_DOMAIN: ".squad.example",
      AUTH_ALLOWED_ORIGINS: "https://squad.example,https://app.squad.example",
    });
    expect(cfg.authCookieDomain).toBe(".squad.example");
    expect(cfg.authAllowedOrigins).toBe("https://squad.example,https://app.squad.example");
  });

  it("requires at least one of publishable or anon key", () => {
    const { NEXT_PUBLIC_SUPABASE_ANON_KEY, ...noKeys } = valid;
    expect(() => parseEnv(noKeys)).toThrow();
  });
  ```

- [ ] **Step 4: Run the config test — watch it fail.**
  ```bash
  pnpm vitest run src/lib/config/config.test.ts
  ```
  Expected: FAIL — `supabasePublishableKey`, `authCookieDomain`, `authAllowedOrigins` don't exist on `Config` yet (TS error or undefined assertions), and the at-least-one refine isn't enforced.

- [ ] **Step 5: Green — implement the schema, refine, type, and return map.** Replace the whole file `/Users/faridbabayev/projects/personal/squad_app/src/lib/config/index.ts`:
  ```ts
  import { z } from "zod";

  const envSchema = z
    .object({
      NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
      DATABASE_URL: z.url(),
      NEXT_PUBLIC_SUPABASE_URL: z.url(),
      // At least one client key must be present (see .refine below). Both optional
      // individually: publishable is preferred for @supabase/ssr, anon is kept for
      // current consumers that haven't migrated.
      NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1).optional(),
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1).optional(),
      SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
      // Cookie Domain for the session cookie; unset → host-only (the demo default).
      AUTH_COOKIE_DOMAIN: z.string().optional(),
      // Comma-separated CSRF origin allowlist; unset → host-equality only.
      // Never a *.vercel.app suffix match (CSRF gate parses + compares origins).
      AUTH_ALLOWED_ORIGINS: z.string().optional(),
    })
    .refine((e) => Boolean(e.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? e.NEXT_PUBLIC_SUPABASE_ANON_KEY), {
      message: "one of NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY is required",
      path: ["NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"],
    });

  // The exact env keys the schema declares — the single source of truth for the
  // .env.example parity check (see env-parity.test.ts). Avoids a hand-copied list.
  // In zod 4 `.refine()` returns a schema that still exposes `.shape` directly, so
  // we read it the same way the pre-Plan-08 config did — no `.innerType()` needed.
  export const ENV_KEYS = Object.keys(envSchema.shape);

  export type Config = {
    nodeEnv: "development" | "test" | "production";
    databaseUrl: string;
    supabaseUrl: string;
    // Resolved client key: publishable ?? anon. supabaseAnonKey points at the same
    // resolved value so current consumers don't churn; @supabase/ssr reads the
    // publishable field. Both are non-empty because the refine guarantees one source.
    supabaseAnonKey: string;
    supabasePublishableKey: string;
    supabaseServiceRoleKey?: string;
    authCookieDomain?: string;
    authAllowedOrigins?: string;
  };

  export function parseEnv(env: Record<string, string | undefined>): Config {
    const parsed = envSchema.safeParse(env);
    if (!parsed.success) {
      // Surface only path + message — never i.input, which may hold secret
      // values (DATABASE_URL, service-role key) that must not leak into logs.
      const issues = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
      throw new Error(`Invalid environment configuration: ${issues}`);
    }
    const e = parsed.data;
    // refine guarantees at least one is present; ! is safe.
    const clientKey = (e.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? e.NEXT_PUBLIC_SUPABASE_ANON_KEY)!;
    return {
      nodeEnv: e.NODE_ENV,
      databaseUrl: e.DATABASE_URL,
      supabaseUrl: e.NEXT_PUBLIC_SUPABASE_URL,
      supabaseAnonKey: clientKey,
      supabasePublishableKey: clientKey,
      supabaseServiceRoleKey: e.SUPABASE_SERVICE_ROLE_KEY,
      authCookieDomain: e.AUTH_COOKIE_DOMAIN,
      authAllowedOrigins: e.AUTH_ALLOWED_ORIGINS,
    };
  }

  // App-wide singleton. Importing this in app code triggers fail-fast validation.
  export const config: Config = parseEnv(process.env);
  ```
  > Note: `ENV_KEYS` keeps reading `Object.keys(envSchema.shape)` exactly as the pre-Plan-08 config did. In the installed zod (4.4.3) `.refine()` leaves `.shape` reachable on the returned schema (verified empirically: `Object.keys(envSchema.shape)` yields the declared keys, while `.innerType()` does **not** exist and throws if called). So the parity source-of-truth still derives from the schema, not a hand-copied list — and adding the `.refine()` does not require any change to this line.

- [ ] **Step 6: Mirror the publishable key into the unit vitest env.** So unit tests that import `config` see a publishable key. Edit `/Users/faridbabayev/projects/personal/squad_app/vitest.config.ts`, in the `test.env` block, add the line after `NEXT_PUBLIC_SUPABASE_ANON_KEY`:
  ```ts
      env: {
        DATABASE_URL: "postgresql://postgres:postgres@127.0.0.1:54322/postgres",
        NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
        NEXT_PUBLIC_SUPABASE_ANON_KEY: "test-anon-key",
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "test-publishable-key",
      },
  ```

- [ ] **Step 7: Green — run config tests, parity test, and typecheck.**
  ```bash
  pnpm vitest run src/lib/config && pnpm typecheck
  ```
  Expected: all `src/lib/config/*.test.ts` PASS (parity equal-set, the publishable-fallback case, the optional-fields case, the at-least-one refine throw) and `tsc --noEmit` exits 0.

- [ ] **Step 8: Confirm nothing else regressed.**
  ```bash
  pnpm test
  ```
  Expected: full unit suite green (existing `index.ts` consumers still read `config.supabaseAnonKey`, now the resolved value — no behavior change for them).

- [ ] **Step 9: Commit.**
  ```bash
  git add src/lib/config/index.ts src/lib/config/config.test.ts .env.example vitest.config.ts
  git commit -m "feat(config): add publishable key + cookie-domain + CSRF-origins env, keep parity"
  ```

---

## Task 2 — `cookie-options.ts` + `server-client.ts` (the cookie-bound ssr factory)

Adds the single shared cookie-options object (the load-bearing fix that overrides `@supabase/ssr`'s insecure `DEFAULT_COOKIE_OPTIONS`) and the cookie-bound server client factory used by route handlers. `server-client.ts` begins with `import "server-only"` and is one of exactly three files that import `@supabase/ssr`.

> **Where the HttpOnly/Secure proof lives:** the load-bearing assertion is that signin/signup `Set-Cookie` headers actually carry `HttpOnly` (and `Secure` in prod). That can only be observed end-to-end at the **route-handler** level (a real handler invocation through `web-session.ts` → supabase-js → `setAll` → `cookies().set`). It is therefore proven in the route-handler task (spec §11.4 / §1) — **not here**. This task's tests assert the two things observable in isolation: (1) `SESSION_COOKIE_OPTIONS`/`REMEMBER_MAX_AGE` carry the right flags/values for the current env, and (2) `createSupabaseServerClient` passes the correct `cookieOptions` (with `maxAge` only when `remember`) and its `setAll` force-merges the security flags while preserving supabase-js `maxAge`/`expires`.

- [ ] **Step 1: Red — write the cookie-options test.** Create `/Users/faridbabayev/projects/personal/squad_app/src/lib/auth/cookie-options.test.ts`. Under the unit vitest env, `config.nodeEnv === "test"`, so `secure` is `false`; `domain` is `undefined` (host-only demo default). The test pins those plus the structural flags and the 30-day remember window.
  ```ts
  import { describe, it, expect } from "vitest";
  import { SESSION_COOKIE_OPTIONS, REMEMBER_MAX_AGE } from "./cookie-options";

  describe("SESSION_COOKIE_OPTIONS", () => {
    it("forces the security flags (overriding @supabase/ssr's insecure defaults)", () => {
      expect(SESSION_COOKIE_OPTIONS.httpOnly).toBe(true);
      expect(SESSION_COOKIE_OPTIONS.sameSite).toBe("lax");
      expect(SESSION_COOKIE_OPTIONS.path).toBe("/");
    });

    it("is not secure outside production (test env) and host-only by default", () => {
      // vitest env sets no NODE_ENV=production and no AUTH_COOKIE_DOMAIN.
      expect(SESSION_COOKIE_OPTIONS.secure).toBe(false);
      expect(SESSION_COOKIE_OPTIONS.domain).toBeUndefined();
    });

    it("carries no maxAge — that is decided per-call by the remember toggle", () => {
      expect("maxAge" in SESSION_COOKIE_OPTIONS).toBe(false);
    });

    it("pins the persistent (remember) window to 30 days in seconds", () => {
      expect(REMEMBER_MAX_AGE).toBe(60 * 60 * 24 * 30);
    });
  });
  ```

- [ ] **Step 2: Run it — watch it fail.**
  ```bash
  pnpm vitest run src/lib/auth/cookie-options.test.ts
  ```
  Expected: FAIL — `Cannot find module './cookie-options'` (the module doesn't exist yet).

- [ ] **Step 3: Green — create `cookie-options.ts`.** Create `/Users/faridbabayev/projects/personal/squad_app/src/lib/auth/cookie-options.ts`:
  ```ts
  import { config } from "@/lib/config";

  // The single shared cookie-options object. @supabase/ssr's DEFAULT_COOKIE_OPTIONS
  // is { httpOnly: false, sameSite: "lax", maxAge: 400 days } — we must NEVER rely on
  // that. This is passed as `cookieOptions` to every writeable createServerClient AND
  // re-applied per-cookie inside setAll, so supabase-js can't silently drop a flag.
  // maxAge is intentionally absent here: it is decided per-call by the remember toggle
  // (persistent cookie → REMEMBER_MAX_AGE; session cookie → no maxAge).
  export const SESSION_COOKIE_OPTIONS = {
    httpOnly: true,
    secure: config.nodeEnv === "production",
    sameSite: "lax" as const,
    path: "/",
    domain: config.authCookieDomain, // undefined → host-only for the demo
  };

  // 30-day persistent window (≈ refresh-token lifetime; see token-lifecycle spec §9).
  // Scoped to the refresh-token lifetime, NOT the @supabase/ssr 400-day default.
  export const REMEMBER_MAX_AGE = 60 * 60 * 24 * 30;
  ```

- [ ] **Step 4: Green — run the cookie-options test.**
  ```bash
  pnpm vitest run src/lib/auth/cookie-options.test.ts
  ```
  Expected: PASS — all four cases green.

- [ ] **Step 5: Red — write the server-client test.** Create `/Users/faridbabayev/projects/personal/squad_app/src/lib/auth/server-client.test.ts`. It mocks `@supabase/ssr` and `next/headers` (DI in the `health.test.ts` style: `vi.mock` at top, import after) and captures the options object passed to `createServerClient` so we can (a) assert `maxAge` is present only when `remember`, and (b) drive the captured `setAll` and assert it force-merges the security flags while preserving supabase-js `maxAge`/`expires`.
  ```ts
  import { describe, it, expect, vi, beforeEach } from "vitest";

  const setMock = vi.fn();
  vi.mock("next/headers", () => ({
    cookies: vi.fn(async () => ({ getAll: () => [], set: setMock })),
  }));

  type CapturedOptions = {
    cookieOptions?: Record<string, unknown>;
    cookies: { getAll: () => unknown[]; setAll: (toSet: unknown[]) => void };
  };
  let captured: CapturedOptions | undefined;
  vi.mock("@supabase/ssr", () => ({
    createServerClient: vi.fn((_url: string, _key: string, opts: CapturedOptions) => {
      captured = opts;
      return { __client: true };
    }),
  }));

  import { createServerClient } from "@supabase/ssr";
  import { createSupabaseServerClient } from "./server-client";
  import { SESSION_COOKIE_OPTIONS, REMEMBER_MAX_AGE } from "./cookie-options";

  describe("createSupabaseServerClient", () => {
    beforeEach(() => {
      vi.clearAllMocks();
      captured = undefined;
    });

    it("passes the shared cookieOptions with maxAge when remember=true", async () => {
      await createSupabaseServerClient(true);
      expect(captured?.cookieOptions).toMatchObject({
        ...SESSION_COOKIE_OPTIONS,
        maxAge: REMEMBER_MAX_AGE,
      });
    });

    it("omits maxAge for a session cookie when remember=false", async () => {
      await createSupabaseServerClient(false);
      expect(captured?.cookieOptions).toEqual(SESSION_COOKIE_OPTIONS);
      expect("maxAge" in (captured?.cookieOptions ?? {})).toBe(false);
    });

    it("defaults remember to true", async () => {
      await createSupabaseServerClient();
      expect(captured?.cookieOptions).toMatchObject({ maxAge: REMEMBER_MAX_AGE });
    });

    it("setAll forces the security flags but preserves supabase-js maxAge/expires", async () => {
      await createSupabaseServerClient(false);
      const expires = new Date("2030-01-01T00:00:00Z");
      // supabase-js hands us a per-cookie array; simulate it trying to set
      // httpOnly:false and a delete (maxAge:0) plus an expires we must keep.
      captured?.cookies.setAll([
        { name: "sb-access", value: "v1", options: { httpOnly: false, maxAge: 0 } },
        { name: "sb-refresh", value: "v2", options: { httpOnly: false, expires } },
      ]);
      expect(setMock).toHaveBeenCalledTimes(2);
      const [name1, value1, opts1] = setMock.mock.calls[0];
      expect(name1).toBe("sb-access");
      expect(value1).toBe("v1");
      expect(opts1.httpOnly).toBe(true); // forced — never the supabase-js false
      expect(opts1.sameSite).toBe("lax");
      expect(opts1.path).toBe("/");
      expect(opts1.maxAge).toBe(0); // preserved (delete of a stale chunk)
      const [, , opts2] = setMock.mock.calls[1];
      expect(opts2.httpOnly).toBe(true);
      expect(opts2.expires).toBe(expires); // preserved
    });

    it("setAll swallows the Server-Component write error (cannot set cookies there)", async () => {
      setMock.mockImplementationOnce(() => {
        throw new Error("Cookies can only be modified in a Server Action or Route Handler");
      });
      await createSupabaseServerClient(true);
      expect(() =>
        captured?.cookies.setAll([{ name: "sb-access", value: "v", options: {} }]),
      ).not.toThrow();
    });

    it("calls supabase-js createServerClient with the resolved url + publishable key", async () => {
      await createSupabaseServerClient();
      expect(vi.mocked(createServerClient)).toHaveBeenCalledTimes(1);
    });
  });
  ```

- [ ] **Step 6: Run it — watch it fail.**
  ```bash
  pnpm vitest run src/lib/auth/server-client.test.ts
  ```
  Expected: FAIL — `Cannot find module './server-client'`.

- [ ] **Step 7: Green — create `server-client.ts`.** Create `/Users/faridbabayev/projects/personal/squad_app/src/lib/auth/server-client.ts`. This is one of the three files allowed to import `@supabase/ssr`; the leading `import "server-only"` makes any client import a build error.
  ```ts
  import "server-only";
  import { createServerClient } from "@supabase/ssr";
  import { cookies } from "next/headers";
  import { config } from "@/lib/config";
  import { SESSION_COOKIE_OPTIONS, REMEMBER_MAX_AGE } from "./cookie-options";

  // Cookie-bound Supabase client for route handlers / server actions (the WRITE path).
  // remember=true → persistent cookie (maxAge = REMEMBER_MAX_AGE); remember=false →
  // a session cookie (no maxAge). The cookie session model lives entirely behind this
  // factory + web-session.ts; the browser never imports @supabase/*.
  export async function createSupabaseServerClient(remember = true) {
    const cookieStore = await cookies(); // async in Next 16
    const cookieOptions = remember
      ? { ...SESSION_COOKIE_OPTIONS, maxAge: REMEMBER_MAX_AGE }
      : SESSION_COOKIE_OPTIONS;
    return createServerClient(config.supabaseUrl, config.supabasePublishableKey, {
      cookieOptions,
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll(toSet) {
          try {
            for (const { name, value, options } of toSet) {
              // Force the SECURITY flags (so supabase-js can never drop httpOnly),
              // but PRESERVE its maxAge/expires — it uses maxAge:0 to delete stale
              // chunks, and the persistent-vs-session maxAge already comes from
              // cookieOptions above.
              cookieStore.set(name, value, {
                ...options,
                httpOnly: SESSION_COOKIE_OPTIONS.httpOnly,
                secure: SESSION_COOKIE_OPTIONS.secure,
                sameSite: SESSION_COOKIE_OPTIONS.sameSite,
                path: SESSION_COOKIE_OPTIONS.path,
                domain: SESSION_COOKIE_OPTIONS.domain,
              });
            }
          } catch {
            // Server Components cannot write cookies; the proxy refreshes the session.
          }
        },
      },
    });
  }
  ```

- [ ] **Step 8: Green — run the server-client test + the auth suite.**
  ```bash
  pnpm vitest run src/lib/auth
  ```
  Expected: PASS — `cookie-options.test.ts` and `server-client.test.ts` green; existing auth contract/fake/supabase suites still green.

- [ ] **Step 9: Typecheck + lint + format-check the new files.**
  ```bash
  pnpm typecheck && pnpm lint && pnpm format:check
  ```
  Expected: `tsc --noEmit` exits 0; ESLint clean; Prettier reports no formatting diffs (printWidth 100 respected). If `format:check` flags the new files, run `pnpm format` and re-run.

- [ ] **Step 10: Commit.**
  ```bash
  git add src/lib/auth/cookie-options.ts src/lib/auth/cookie-options.test.ts src/lib/auth/server-client.ts src/lib/auth/server-client.test.ts
  git commit -m "feat(auth): shared httpOnly cookie options + cookie-bound ssr server client"
  ```

---

## Task 3 — AuthProvider evolution: `SignUpMeta`, `signOut`, local `verify`

The `AuthProvider` interface (`src/lib/auth/types.ts`) is the portable seam. This task evolves it to the locked contract: `signUp` carries `SignUpMeta`, a new `signOut(token)` method lands, and `verify(token)` becomes a **local** `getClaims(token)` JWKS check (no network `getUser`). The fake and the contract suite move in lockstep. Per §9 of the design spec, there is **no** "verify-null-immediately-after-signOut" assertion — local verification cannot honor it.

> Depends on: `src/lib/auth/errors.ts` (`mapSupabaseError`, authored in Task 5). Task 3 imports it in `supabase.ts`.

- [ ] **Step 1: RED — author the shared contract suite (the single source of truth for both runs).** Replace the body of `src/lib/auth/auth.contract.test.ts` with the version below. This is authored **once, here** — Task 12 only _imports_ `runContract`, it must NOT redefine this file. `runContract` is `export`ed and takes an optional `email` so the integration run (Task 12) can pass a unique address; the case set is the locked final set (existing cases + signUp-with-meta + the displayName-omitted case + signOut-resolves), with **no** "verify-null-immediately-after-signOut" assertion (local JWKS verification can't honor it — design spec §9). This will fail to typecheck/run until `types.ts` + `fake.ts` are updated (Steps 2–3).

```ts
import { describe, it, expect } from "vitest";
import { InMemoryAuthProvider } from "./fake";
import type { AuthProvider } from "./types";

// Shared across the in-memory unit run (here) and the real-adapter integration run
// (supabase.contract.integration.test.ts, Task 12). `make` returns a fresh provider;
// `emailBase` lets the integration run pass a unique base so reruns don't collide on
// the already-registered check. Each case that signs up derives its OWN address from
// the base (the local part is suffixed per case) so the cases never collide against a
// real Supabase project that persists users across providers. AUTHORED ONCE HERE —
// Task 12 imports it, never redefines it.
export function runContract(name: string, make: () => AuthProvider, emailBase = "a@example.com") {
  // "a@example.com" + "+meta" → "a+meta@example.com" (RFC 5233 sub-addressing).
  const emailFor = (tag: string) => emailBase.replace("@", `+${tag}@`);

  describe(name, () => {
    it("signs up with metadata, signs in, and verifies the issued token", async () => {
      const auth = make();
      const email = emailFor("meta");
      const created = await auth.signUp(email, "password1", {
        fullName: "Ada Lovelace",
        displayName: "ada",
      });
      expect(created.email).toBe(email);

      const { user, token } = await auth.signIn(email, "password1");
      expect(user.id).toBe(created.id);

      const verified = await auth.verify(token);
      expect(verified?.id).toBe(created.id);
    });

    it("signs up with only the required fullName (displayName omitted)", async () => {
      const auth = make();
      const email = emailFor("nodisplay");
      const created = await auth.signUp(email, "password1", { fullName: "Grace Hopper" });
      expect(created.email).toBe(email);
    });

    it("returns null when verifying an unknown token", async () => {
      const auth = make();
      expect(await auth.verify("bogus")).toBeNull();
    });

    it("signOut resolves (revocation is bounded by token TTL, not asserted here)", async () => {
      const auth = make();
      const email = emailFor("signout");
      await auth.signUp(email, "password1", { fullName: "Alan Turing" });
      const { token } = await auth.signIn(email, "password1");
      // No "verify is null right after signOut" assertion: local JWKS verification
      // cannot honor immediate revocation (see design spec §9). signOut must resolve.
      await expect(auth.signOut(token)).resolves.toBeUndefined();
    });
  });
}

runContract("InMemoryAuthProvider", () => new InMemoryAuthProvider());
```

> Note on emails: each signing-up case derives a distinct sub-addressed email from the base (`a+meta@…`, `a+nodisplay@…`, `a+signout@…`). The in-memory run is fine either way (fresh provider per `make()`), but the real-adapter integration run (Task 12) hits one persistent Supabase project across cases, so distinct addresses keep the cases from colliding on "already registered".

- [ ] **Step 2: Update the seam interface — `SignUpMeta`, `signOut`, local-verify comment.** Replace the entire contents of `src/lib/auth/types.ts` with:

```ts
export type AuthUser = {
  id: string;
  email: string;
};

export type SignUpMeta = {
  fullName: string;
  displayName?: string | null;
};

export interface AuthProvider {
  signUp(email: string, password: string, meta: SignUpMeta): Promise<AuthUser>;
  signIn(email: string, password: string): Promise<{ user: AuthUser; token: string }>;
  // verify === getClaims(token): LOCAL JWKS verification, no network. A server-side
  // revocation is not seen until the short-lived access token expires (design spec §9).
  verify(token: string): Promise<AuthUser | null>;
  signOut(token: string): Promise<void>;
}
```

- [ ] **Step 3: GREEN the fake — meta on signUp, delete token on signOut.** Replace the entire contents of `src/lib/auth/fake.ts` with:

```ts
import type { AuthProvider, AuthUser, SignUpMeta } from "./types";

export class InMemoryAuthProvider implements AuthProvider {
  private users = new Map<string, { user: AuthUser; password: string; meta: SignUpMeta }>();
  private tokens = new Map<string, string>(); // token -> userId
  private seq = 0;

  async signUp(email: string, password: string, meta: SignUpMeta): Promise<AuthUser> {
    const id = `user_${++this.seq}`;
    const user: AuthUser = { id, email };
    this.users.set(email, { user, password, meta });
    return user;
  }

  async signIn(email: string, password: string) {
    const record = this.users.get(email);
    if (!record || record.password !== password) {
      throw new Error("Invalid credentials");
    }
    const token = `token_${record.user.id}_${++this.seq}`;
    this.tokens.set(token, record.user.id);
    return { user: record.user, token };
  }

  async verify(token: string): Promise<AuthUser | null> {
    const userId = this.tokens.get(token);
    if (!userId) return null;
    for (const { user } of this.users.values()) {
      if (user.id === userId) return user;
    }
    return null;
  }

  async signOut(token: string): Promise<void> {
    this.tokens.delete(token);
  }
}
```

- [ ] **Step 4: GREEN the real adapter — `options.data`, local `verify`, `signOut`.** Replace the entire contents of `src/lib/auth/supabase.ts` with the version below. `signUp` now feeds `options.data: { full_name, display_name }` to `private.handle_new_user()`; `verify` uses `getClaims(token)` (local JWKS) and treats both the error state and a thrown decode failure as `null` so a present-but-invalid Bearer never resolves; `signOut` calls `auth.admin`-free local `signOut`. Vendor errors translate through `mapSupabaseError` (the Seam Rule — no raw vendor `Error` escapes the seam).

```ts
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { mapSupabaseError } from "./errors";
import type { AuthProvider, AuthUser, SignUpMeta } from "./types";

export class SupabaseAuthProvider implements AuthProvider {
  constructor(private readonly sb: SupabaseClient) {}

  static fromConfig(url: string, anonKey: string): SupabaseAuthProvider {
    return new SupabaseAuthProvider(createClient(url, anonKey));
  }

  async signUp(email: string, password: string, meta: SignUpMeta): Promise<AuthUser> {
    const { data, error } = await this.sb.auth.signUp({
      email,
      password,
      // Feeds private.handle_new_user(); display_name is nullable (design spec §3).
      options: { data: { full_name: meta.fullName, display_name: meta.displayName ?? null } },
    });
    if (error) throw mapSupabaseError(error);
    if (!data.user) throw mapSupabaseError(new Error("signUp returned no user"));
    return { id: data.user.id, email: data.user.email ?? email };
  }

  async signIn(email: string, password: string) {
    const { data, error } = await this.sb.auth.signInWithPassword({ email, password });
    if (error) throw mapSupabaseError(error);
    if (!data.user || !data.session) throw mapSupabaseError(new Error("signIn returned no session"));
    return {
      user: { id: data.user.id, email: data.user.email ?? email },
      token: data.session.access_token,
    };
  }

  // LOCAL verification: getClaims(token) checks the signature against cached JWKS
  // (ES256, no network). Three result states + a possible throw on a malformed token;
  // a present-but-invalid Bearer must resolve to null (design spec §1, §9).
  async verify(token: string): Promise<AuthUser | null> {
    try {
      const { data, error } = await this.sb.auth.getClaims(token);
      if (error || !data?.claims?.sub) return null;
      return { id: data.claims.sub, email: (data.claims.email as string) ?? "" };
    } catch {
      return null;
    }
  }

  // Single-device sign-out (design spec §3). Bearer-issued sessions are stateless;
  // this clears the local session held by this client instance.
  async signOut(_token: string): Promise<void> {
    const { error } = await this.sb.auth.signOut({ scope: "local" });
    if (error) throw mapSupabaseError(error);
  }
}
```

- [ ] **Step 5: RUN the contract suite (unit).** The fake satisfies the new contract; the real adapter is exercised in the integration contract test (Task 12).

```bash
pnpm vitest run src/lib/auth/auth.contract.test.ts
```

Expected: `InMemoryAuthProvider` block green — 4 passing (`signs up with metadata…`, `signs up with only the required fullName…`, `returns null when verifying an unknown token`, `signOut resolves…`).

- [ ] **Step 6: Typecheck the seam.** Catches any drift in `types.ts` / `index.ts` consumers (`getAuthProvider()` still returns the widened interface unchanged).

```bash
pnpm typecheck
```

Expected: no errors. (`src/lib/auth/index.ts` needs no change — it already returns `AuthProvider`.)

- [ ] **Step 7: Commit.**

```bash
git add src/lib/auth/types.ts src/lib/auth/fake.ts src/lib/auth/supabase.ts src/lib/auth/auth.contract.test.ts
git commit -m "feat(auth): evolve AuthProvider seam — SignUpMeta, signOut, local getClaims verify"
```

---

## Task 4 — `session.ts`: the one resolver (`getCurrentUser` cookie OR Bearer) + `requireUser`

This is the native-seam proof. `getCurrentUser(req?)` reads **one** of two transports: a `Bearer` header (delegated to the contract-tested `AuthProvider.verify`, the native path) or the SSR cookie session (read-only `getClaims()`, the web path). A present-but-invalid Bearer must return `null` and **never** fall through to the cookie branch. `requireUser` is the single ownership entry point for route handlers (throws a 401 `AuthError`). `@supabase/ssr` is imported here — one of the three permitted seam files — behind `import "server-only"`.

> Depends on: Task 3 (`AuthProvider.verify` is now local), Task 5 `errors.ts` (`AuthError`), and `@supabase/ssr` + `server-only` installed (Task 0). `config.supabasePublishableKey` exists (Task 1).

- [ ] **Step 1: Write the resolver `src/lib/auth/session.ts`.** Exact contents below. The Bearer branch returns **before** any cookie read (no fall-through). The cookie branch builds a read-only SSR client (`setAll` is a no-op — the proxy owns refresh writes) and guards all three `getClaims()` states on `data.claims.sub`.

```ts
import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { config } from "@/lib/config";
import { AuthError } from "./errors";
import { getAuthProvider } from "./index";
import type { AuthUser } from "./types";

// One resolver, two transports. `req` is optional: route handlers pass it (to read
// the Bearer header); server components / layouts call with no arg (cookie only).
export async function getCurrentUser(req?: Request): Promise<AuthUser | null> {
  // 1) NATIVE seam — a present-but-invalid Bearer must NOT fall through to cookie.
  const authz = req?.headers.get("authorization");
  const bearer = authz?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (bearer) return getAuthProvider().verify(bearer); // verify() === getClaims(token), local JWKS

  // 2) WEB path — verify the SSR cookie session, read-only (proxy owns refresh writes).
  const store = await cookies();
  const sb = createServerClient(config.supabaseUrl, config.supabasePublishableKey, {
    cookies: { getAll: () => store.getAll(), setAll: () => {} },
  });
  const { data, error } = await sb.auth.getClaims();
  // getClaims has THREE states: {data,error:null}=valid, {data:null,error}=invalid,
  // {data:null,error:null}=no session. Guard all three on data.claims.sub.
  if (error || !data?.claims?.sub) return null;
  return { id: data.claims.sub, email: (data.claims.email as string) ?? "" };
}

// The single ownership entry point for route handlers. Once games /api/v1 lands,
// every resource query filters by requireUser(req).id — RLS is no backstop (§8).
export async function requireUser(req?: Request): Promise<AuthUser> {
  const user = await getCurrentUser(req);
  if (!user) throw new AuthError("UNAUTHORIZED", 401);
  return user;
}
```

- [ ] **Step 2: RED — write the native-seam proof `src/lib/auth/session.test.ts`.** DI via `vi.mock` mirroring `health.test.ts`: mock `@supabase/ssr` (`createServerClient` → a stub whose `auth.getClaims` we drive per case), `next/headers` (`cookies`), and `./index` (`getAuthProvider` → a fake `verify`). Four assertions cover the contract exactly.

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";

const getClaims = vi.fn();
const verify = vi.fn();

vi.mock("@supabase/ssr", () => ({
  createServerClient: vi.fn(() => ({ auth: { getClaims } })),
}));
vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({ getAll: () => [], set: () => {} })),
}));
vi.mock("./index", () => ({ getAuthProvider: () => ({ verify }) }));

import { getCurrentUser, requireUser } from "./session";
import { AuthError } from "./errors";

function bearerReq(token: string): Request {
  return new Request("http://localhost/api/v1/x", {
    headers: { authorization: `Bearer ${token}` },
  });
}

describe("getCurrentUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("resolves a valid Bearer via the provider (the native seam works)", async () => {
    verify.mockResolvedValue({ id: "u_native", email: "n@example.com" });
    const user = await getCurrentUser(bearerReq("good.jwt.token"));
    expect(user).toEqual({ id: "u_native", email: "n@example.com" });
    expect(verify).toHaveBeenCalledWith("good.jwt.token");
    // No fall-through to the cookie transport when a Bearer is present.
    expect(getClaims).not.toHaveBeenCalled();
  });

  it("returns null for an invalid Bearer and does NOT fall through to the cookie", async () => {
    verify.mockResolvedValue(null);
    const user = await getCurrentUser(bearerReq("bad.jwt.token"));
    expect(user).toBeNull();
    expect(getClaims).not.toHaveBeenCalled(); // critical: invalid Bearer is final
  });

  it("resolves a valid cookie session when no Bearer is present", async () => {
    getClaims.mockResolvedValue({
      data: { claims: { sub: "u_web", email: "w@example.com" } },
      error: null,
    });
    const user = await getCurrentUser(); // no req → cookie-only
    expect(user).toEqual({ id: "u_web", email: "w@example.com" });
    expect(verify).not.toHaveBeenCalled();
  });

  it("returns null for the no-session-no-error cookie state (the common branch)", async () => {
    getClaims.mockResolvedValue({ data: null, error: null });
    expect(await getCurrentUser()).toBeNull();
  });

  it("returns null for the invalid cookie state (data null, error present)", async () => {
    getClaims.mockResolvedValue({ data: null, error: new Error("invalid") });
    expect(await getCurrentUser()).toBeNull();
  });
});

describe("requireUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns the user when a session resolves", async () => {
    verify.mockResolvedValue({ id: "u_native", email: "n@example.com" });
    await expect(requireUser(bearerReq("good.jwt.token"))).resolves.toEqual({
      id: "u_native",
      email: "n@example.com",
    });
  });

  it("throws AuthError UNAUTHORIZED (401) when there is no session", async () => {
    getClaims.mockResolvedValue({ data: null, error: null });
    await expect(requireUser()).rejects.toMatchObject({
      constructor: AuthError,
      code: "UNAUTHORIZED",
      status: 401,
    });
  });
});
```

- [ ] **Step 3: RUN the session unit test (still proves no-req path).** With `session.ts` and the mocks in place this goes green; if it fails, the failure pinpoints a fall-through bug (the invalid-Bearer case calling `getClaims`).

```bash
pnpm vitest run src/lib/auth/session.test.ts
```

Expected: 7 passing — the four core native-seam assertions (valid Bearer, invalid Bearer no fall-through, valid cookie, no-session-no-error), the invalid-cookie guard, and the two `requireUser` cases.

- [ ] **Step 4: Typecheck.** Confirms `import "server-only"` resolves, the `@supabase/ssr` `createServerClient` shape matches, and `config.supabasePublishableKey` is typed.

```bash
pnpm typecheck
```

Expected: no errors.

- [ ] **Step 5: Run the full unit suite — no seam regression.** `server-only` throws if imported from a client bundle; running the node-env unit suite confirms `session.ts` stays server-side and the auth contract is still green.

```bash
pnpm test
```

Expected: all unit tests pass, including `auth.contract.test.ts` (Task 3) and `session.test.ts`.

- [ ] **Step 6: Commit.**

```bash
git add src/lib/auth/session.ts src/lib/auth/session.test.ts
git commit -m "feat(auth): add getCurrentUser cookie/Bearer resolver + requireUser guard"
```

---

## Task 5 — Error mapper, CSRF guard, and request schemas

Three pure, vendor-thin modules that the route handlers (Task 7) and `web-session.ts` (Task 6) depend on: `errors.ts` (the `AuthError` class + `mapSupabaseError`), `csrf.ts` (`assertBrowserMutation`, fail-closed), and `schemas.ts` (Zod request bodies). All three are unit-tested with no DB and no network. `errors.ts` is the only one that touches a vendor symbol — it imports `isAuthApiError` from `@supabase/supabase-js` (a pure type-guard, not a client), which is allowed because error translation is part of the auth seam.

> Note: this task also exports `isAuthError(e): e is AuthError` from `errors.ts` — the pure type guard Task 7's `http.ts` relies on. It is included in the implementation below.

- [ ] **Step 1: Write the failing test for `errors.ts`.**

  Create `src/lib/auth/errors.test.ts`:

  ```ts
  import { describe, it, expect } from "vitest";
  import { AuthApiError, isAuthApiError } from "@supabase/supabase-js";
  import { AuthError, mapSupabaseError } from "./errors";

  // A REAL supabase-js AuthApiError — `isAuthApiError` is an `instanceof` check
  // (verified against the installed @supabase/supabase-js), so a hand-rolled Error
  // with `name = "AuthApiError"` would fail the guard and every mapper case would
  // fall through to UNEXPECTED(500). The verified constructor is
  // `new AuthApiError(message, status, code)`.
  function authApiError(opts: { status: number; code?: string; message?: string }) {
    return new AuthApiError(opts.message ?? "boom", opts.status, opts.code);
  }

  describe("AuthError", () => {
    it("carries a code and an HTTP status", () => {
      const err = new AuthError("WEAK_PASSWORD", 422);
      expect(err).toBeInstanceOf(Error);
      expect(err.code).toBe("WEAK_PASSWORD");
      expect(err.status).toBe(422);
      expect(err.message).toBe("WEAK_PASSWORD");
    });
  });

  describe("mapSupabaseError — keyed on error.code when present", () => {
    it("the test fixture is a REAL AuthApiError (guards the instanceof check)", () => {
      // Fails fast if the fixture ever regresses to a fake error: a wrong fixture
      // would make isAuthApiError return false and silently route every case to
      // UNEXPECTED(500), turning the rest of this suite into false greens.
      expect(isAuthApiError(authApiError({ status: 400, code: "invalid_credentials" }))).toBe(true);
    });

    it("maps invalid_credentials → INVALID_CREDENTIALS (401)", () => {
      const out = mapSupabaseError(authApiError({ status: 400, code: "invalid_credentials" }));
      expect(out.code).toBe("INVALID_CREDENTIALS");
      expect(out.status).toBe(401);
    });

    it("maps email_exists → EMAIL_TAKEN (409)", () => {
      const out = mapSupabaseError(authApiError({ status: 422, code: "email_exists" }));
      expect(out.code).toBe("EMAIL_TAKEN");
      expect(out.status).toBe(409);
    });

    it("maps user_already_exists → EMAIL_TAKEN (409)", () => {
      const out = mapSupabaseError(authApiError({ status: 422, code: "user_already_exists" }));
      expect(out.code).toBe("EMAIL_TAKEN");
      expect(out.status).toBe(409);
    });

    it("maps weak_password → WEAK_PASSWORD (422)", () => {
      const out = mapSupabaseError(authApiError({ status: 422, code: "weak_password" }));
      expect(out.code).toBe("WEAK_PASSWORD");
      expect(out.status).toBe(422);
    });

    it("maps validation_failed → INVALID_INPUT (400)", () => {
      const out = mapSupabaseError(authApiError({ status: 400, code: "validation_failed" }));
      expect(out.code).toBe("INVALID_INPUT");
      expect(out.status).toBe(400);
    });

    it("maps email_address_invalid → INVALID_INPUT (400)", () => {
      const out = mapSupabaseError(authApiError({ status: 400, code: "email_address_invalid" }));
      expect(out.code).toBe("INVALID_INPUT");
      expect(out.status).toBe(400);
    });

    it("maps an over_*_rate_limit code → RATE_LIMITED (429)", () => {
      const out = mapSupabaseError(authApiError({ status: 429, code: "over_request_rate_limit" }));
      expect(out.code).toBe("RATE_LIMITED");
      expect(out.status).toBe(429);
    });
  });

  describe("mapSupabaseError — status fallback when code is absent", () => {
    it("maps the token-endpoint 400 with undefined code → INVALID_CREDENTIALS (401)", () => {
      // The known supabase-js bug: bad password at the token endpoint returns
      // status 400 with code === undefined. Must not become a generic 400.
      const out = mapSupabaseError(authApiError({ status: 400, code: undefined }));
      expect(out.code).toBe("INVALID_CREDENTIALS");
      expect(out.status).toBe(401);
    });

    it("maps a 429 with no code → RATE_LIMITED (429)", () => {
      const out = mapSupabaseError(authApiError({ status: 429, code: undefined }));
      expect(out.code).toBe("RATE_LIMITED");
      expect(out.status).toBe(429);
    });

    it("maps an unrecognized AuthApiError → AUTH_ERROR with its status", () => {
      const out = mapSupabaseError(authApiError({ status: 418, code: "some_new_code" }));
      expect(out.code).toBe("AUTH_ERROR");
      expect(out.status).toBe(418);
    });

    it("falls back to status 400 for an AuthApiError reporting no status", () => {
      const e = authApiError({ status: 0, code: "some_new_code" });
      // simulate a missing status defensively
      (e as { status?: number }).status = undefined;
      const out = mapSupabaseError(e);
      expect(out.code).toBe("AUTH_ERROR");
      expect(out.status).toBe(400);
    });
  });

  describe("mapSupabaseError — non-AuthApiError", () => {
    it("passes through an existing AuthError unchanged", () => {
      const existing = new AuthError("CSRF", 403);
      expect(mapSupabaseError(existing)).toBe(existing);
    });

    it("maps a plain Error → UNEXPECTED (500)", () => {
      const out = mapSupabaseError(new Error("network down"));
      expect(out.code).toBe("UNEXPECTED");
      expect(out.status).toBe(500);
    });

    it("maps a non-error value → UNEXPECTED (500)", () => {
      const out = mapSupabaseError("nope");
      expect(out.code).toBe("UNEXPECTED");
      expect(out.status).toBe(500);
    });
  });
  ```

  Run it; it fails because the module does not exist yet:

  ```bash
  pnpm vitest run src/lib/auth/errors.test.ts
  ```

  Expected: `Failed to resolve import "./errors"` (RED).

- [ ] **Step 2: Implement `errors.ts` to make the test green.**

  Create `src/lib/auth/errors.ts`:

  ```ts
  import { isAuthApiError } from "@supabase/supabase-js";

  /**
   * The single typed error the auth seam throws. Route handlers catch ONLY this and
   * map `code` → HTTP `status` for the `{ error: { code, message } }` envelope. The
   * raw Supabase error never escapes `lib/auth` (Seam Rule + logging policy, §3).
   */
  export class AuthError extends Error {
    constructor(
      public readonly code: string,
      public readonly status: number,
    ) {
      super(code);
      this.name = "AuthError";
    }
  }

  // Pure type guard — used by http.ts (Task 7) to translate a thrown value into the
  // error envelope without importing the vendor SDK.
  export function isAuthError(e: unknown): e is AuthError {
    return e instanceof AuthError;
  }

  /**
   * The ONLY logging permitted in the auth request path (spec §3 logging policy).
   * Logs strictly { code, requestId } — NEVER the raw error object, the request, the
   * response, or any body (they hold passwords + tokens). Route handlers call this
   * (via http.ts) in their catch blocks; check-auth-logging.mjs forbids any other
   * console.* of a caught error / req / body under src/app/api/v1/auth.
   */
  export function logAuthError(code: string, requestId?: string): void {
    console.warn(JSON.stringify({ event: "auth_error", code, requestId }));
  }

  // Supabase error.code → (our code, HTTP status). Keyed on `code` WHEN PRESENT.
  const CODE_MAP: Record<string, { code: string; status: number }> = {
    invalid_credentials: { code: "INVALID_CREDENTIALS", status: 401 },
    email_exists: { code: "EMAIL_TAKEN", status: 409 },
    user_already_exists: { code: "EMAIL_TAKEN", status: 409 },
    weak_password: { code: "WEAK_PASSWORD", status: 422 },
    validation_failed: { code: "INVALID_INPUT", status: 400 },
    email_address_invalid: { code: "INVALID_INPUT", status: 400 },
  };

  /**
   * Translate any thrown value into our `AuthError`. Precedence:
   *  1. Already an `AuthError` → pass through (e.g. a CSRF 403 raised upstream).
   *  2. supabase-js `AuthApiError`:
   *     a. exact `error.code` match in CODE_MAP,
   *     b. `over_*_rate_limit` family → RATE_LIMITED (429),
   *     c. the token-endpoint bug: status 400 with `code === undefined` →
   *        INVALID_CREDENTIALS (401) — a bad password, NOT a generic 400,
   *     d. otherwise AUTH_ERROR with the vendor status (?? 400).
   *  3. Anything else → UNEXPECTED (500).
   */
  export function mapSupabaseError(error: unknown): AuthError {
    if (error instanceof AuthError) return error;

    if (isAuthApiError(error)) {
      const code = error.code;
      const status = error.status;

      if (code) {
        const known = CODE_MAP[code];
        if (known) return new AuthError(known.code, known.status);
        if (code.startsWith("over_") && code.endsWith("_rate_limit")) {
          return new AuthError("RATE_LIMITED", 429);
        }
        return new AuthError("AUTH_ERROR", status ?? 400);
      }

      // No code — fall back to status. The token endpoint returns 400 for a bad
      // password with an undefined code; treat that as invalid credentials.
      if (status === 400) return new AuthError("INVALID_CREDENTIALS", 401);
      if (status === 429) return new AuthError("RATE_LIMITED", 429);
      return new AuthError("AUTH_ERROR", status ?? 400);
    }

    return new AuthError("UNEXPECTED", 500);
  }
  ```

  Run again:

  ```bash
  pnpm vitest run src/lib/auth/errors.test.ts
  ```

  Expected: all tests pass (green).

- [ ] **Step 3: Write the failing test for `csrf.ts`.**

  `assertBrowserMutation` reads `config.authAllowedOrigins`, so the test mocks `@/lib/config` (vi.mock DI, same shape as `health.test.ts`). Each case builds a `Request` with the relevant headers.

  Create `src/lib/auth/csrf.test.ts`:

  ```ts
  import { describe, it, expect, vi, beforeEach } from "vitest";

  vi.mock("@/lib/config", () => ({
    config: {
      nodeEnv: "test",
      authCookieDomain: undefined,
      authAllowedOrigins: undefined as string | undefined,
    },
  }));

  import { config } from "@/lib/config";
  import { assertBrowserMutation } from "./csrf";
  import { AuthError } from "./errors";

  const HOST = "squad.example.com";

  function req(headers: Record<string, string>): Request {
    return new Request(`https://${HOST}/api/v1/auth/signin`, {
      method: "POST",
      headers: { host: HOST, ...headers },
    });
  }

  // The mutable mock lets a single case widen the allowlist.
  const mockedConfig = config as { authAllowedOrigins: string | undefined };

  describe("assertBrowserMutation", () => {
    beforeEach(() => {
      mockedConfig.authAllowedOrigins = undefined;
    });

    it("passes a same-origin POST that carries both Origin and the csrf header", () => {
      const r = req({ origin: `https://${HOST}`, "x-squad-csrf": "1", cookie: "sb-x=y" });
      expect(() => assertBrowserMutation(r)).not.toThrow();
    });

    it("passes when Origin is absent but a same-origin Referer is present", () => {
      const r = req({ referer: `https://${HOST}/signin`, "x-squad-csrf": "1", cookie: "sb-x=y" });
      expect(() => assertBrowserMutation(r)).not.toThrow();
    });

    it("rejects with CSRF (403) when both Origin and Referer are missing", () => {
      const r = req({ "x-squad-csrf": "1", cookie: "sb-x=y" });
      expect(() => assertBrowserMutation(r)).toThrow(
        expect.objectContaining({ code: "CSRF", status: 403 }),
      );
    });

    it("rejects with CSRF (403) on a cross-site Origin (evil.com)", () => {
      const r = req({ origin: "https://evil.com", "x-squad-csrf": "1", cookie: "sb-x=y" });
      expect(() => assertBrowserMutation(r)).toThrow(
        expect.objectContaining({ code: "CSRF", status: 403 }),
      );
    });

    it("rejects an Origin that substring-matches the host but is a different origin", () => {
      // host-suffix attacks: "squad.example.com.evil.com" must NOT pass.
      const r = req({
        origin: `https://${HOST}.evil.com`,
        "x-squad-csrf": "1",
        cookie: "sb-x=y",
      });
      expect(() => assertBrowserMutation(r)).toThrow(AuthError);
    });

    it("rejects with CSRF (403) when the x-squad-csrf header is missing", () => {
      const r = req({ origin: `https://${HOST}`, cookie: "sb-x=y" });
      expect(() => assertBrowserMutation(r)).toThrow(
        expect.objectContaining({ code: "CSRF", status: 403 }),
      );
    });

    it("accepts an Origin listed in config.authAllowedOrigins (parsed origin compare)", () => {
      mockedConfig.authAllowedOrigins = "https://app.squad.dev, https://other.dev";
      const r = req({ origin: "https://app.squad.dev", "x-squad-csrf": "1", cookie: "sb-x=y" });
      expect(() => assertBrowserMutation(r)).not.toThrow();
    });

    it("skips all checks when a verified Bearer is present AND no auth cookie", () => {
      // Native transport: cross-origin, no csrf header, no cookie — still allowed
      // because the caller already verified the Bearer (CSRF is cookie-only).
      const r = req({ authorization: "Bearer abc.def.ghi", origin: "https://evil.com" });
      expect(() => assertBrowserMutation(r, { bearerVerified: true, hasAuthCookie: false })).not.toThrow();
    });

    it("does NOT skip when a Bearer is present but an auth cookie is also present", () => {
      // Both transports → treat as the cookie path and enforce CSRF.
      const r = req({ authorization: "Bearer abc.def.ghi", origin: "https://evil.com" });
      expect(() =>
        assertBrowserMutation(r, { bearerVerified: true, hasAuthCookie: true }),
      ).toThrow(expect.objectContaining({ code: "CSRF", status: 403 }));
    });
  });
  ```

  Run it; it fails (no module yet):

  ```bash
  pnpm vitest run src/lib/auth/csrf.test.ts
  ```

  Expected: `Failed to resolve import "./csrf"` (red).

- [ ] **Step 4: Implement `csrf.ts` to make the test green.**

  Create `src/lib/auth/csrf.ts`:

  ```ts
  import { config } from "@/lib/config";
  import { AuthError } from "./errors";

  /**
   * Whether THIS request is authenticated by a verified Bearer with no auth cookie.
   * The CSRF gate is skipped only in that state — the exemption is tied to verified
   * auth, never to mere `Authorization` header presence (§7). The caller (route
   * handler / `getCurrentUser` path) supplies both facts; `assertBrowserMutation`
   * never re-verifies the token itself.
   */
  type MutationContext = {
    bearerVerified: boolean;
    hasAuthCookie: boolean;
  };

  // Parse a header value into a normalized scheme://host:port origin, or null.
  function parseOrigin(value: string | null | undefined): string | null {
    if (!value) return null;
    try {
      return new URL(value).origin;
    } catch {
      return null;
    }
  }

  // The set of origins this host accepts: its own request origin plus any configured
  // allowlist entry. Comparison is on the parsed origin (scheme+host+port), never a
  // substring — host equality only, never a `*.vercel.app` suffix match (§2).
  function allowedOrigins(req: Request): Set<string> {
    const allowed = new Set<string>();
    const host = req.headers.get("host");
    if (host) {
      const url = new URL(req.url);
      allowed.add(`${url.protocol}//${host}`);
    }
    const configured = config.authAllowedOrigins;
    if (configured) {
      for (const entry of configured.split(",")) {
        const origin = parseOrigin(entry.trim());
        if (origin) allowed.add(origin);
      }
    }
    return allowed;
  }

  /**
   * Fail-closed CSRF guard for every cookie-auth mutation. Two mandatory gates:
   *  1. Origin (or, if absent, Referer) parses to an allowed origin. Both absent → 403.
   *  2. The `x-squad-csrf` custom header is present (only same-origin JS can set it).
   * Either gate failing → `AuthError("CSRF", 403)`. Skipped ONLY for a verified
   * Bearer with no auth cookie (the native transport, immune to CSRF).
   */
  export function assertBrowserMutation(req: Request, ctx?: MutationContext): void {
    if (ctx?.bearerVerified && !ctx.hasAuthCookie) return;

    const allowed = allowedOrigins(req);
    const origin = parseOrigin(req.headers.get("origin"));
    const candidate = origin ?? parseOrigin(req.headers.get("referer"));
    if (!candidate || !allowed.has(candidate)) {
      throw new AuthError("CSRF", 403);
    }

    if (!req.headers.get("x-squad-csrf")) {
      throw new AuthError("CSRF", 403);
    }
  }
  ```

  Run again:

  ```bash
  pnpm vitest run src/lib/auth/csrf.test.ts
  ```

  Expected: all tests pass (green).

- [ ] **Step 5: Write the failing test for `schemas.ts`.**

  Create `src/lib/auth/schemas.test.ts`:

  ```ts
  import { describe, it, expect } from "vitest";
  import { signupSchema, signinSchema } from "./schemas";

  describe("signupSchema", () => {
    it("accepts a valid email-branch signup body", () => {
      const parsed = signupSchema.parse({
        email: "a@example.com",
        password: "longenough",
        fullName: "Ada Lovelace",
        displayName: null,
      });
      expect(parsed.email).toBe("a@example.com");
      expect(parsed.fullName).toBe("Ada Lovelace");
      expect(parsed.displayName).toBeNull();
    });

    it("trims fullName and treats displayName as optional", () => {
      const parsed = signupSchema.parse({
        email: "a@example.com",
        password: "longenough",
        fullName: "  Ada  ",
      });
      expect(parsed.fullName).toBe("Ada");
      expect(parsed.displayName).toBeUndefined();
    });

    it("rejects a password shorter than 8 chars", () => {
      expect(() =>
        signupSchema.parse({
          email: "a@example.com",
          password: "short",
          fullName: "Ada",
        }),
      ).toThrow();
    });

    it("rejects a blank (whitespace-only) fullName", () => {
      expect(() =>
        signupSchema.parse({
          email: "a@example.com",
          password: "longenough",
          fullName: "   ",
        }),
      ).toThrow();
    });

    it("rejects a malformed email", () => {
      expect(() =>
        signupSchema.parse({ email: "not-an-email", password: "longenough", fullName: "Ada" }),
      ).toThrow();
    });
  });

  describe("signinSchema", () => {
    it("accepts a valid signin body with remember", () => {
      const parsed = signinSchema.parse({
        email: "a@example.com",
        password: "longenough",
        remember: true,
      });
      expect(parsed.remember).toBe(true);
    });

    it("treats remember as optional", () => {
      const parsed = signinSchema.parse({ email: "a@example.com", password: "longenough" });
      expect(parsed.remember).toBeUndefined();
    });

    it("rejects a malformed email", () => {
      expect(() => signinSchema.parse({ email: "nope", password: "longenough" })).toThrow();
    });
  });
  ```

  Run it; it fails (no module yet):

  ```bash
  pnpm vitest run src/lib/auth/schemas.test.ts
  ```

  Expected: `Failed to resolve import "./schemas"` (red).

- [ ] **Step 6: Implement `schemas.ts` to make the test green.**

  Create `src/lib/auth/schemas.ts`:

  ```ts
  import { z } from "zod";

  // Request bodies for the cookie-auth mutation endpoints. The app guarantees the
  // name (`fullName` required, trimmed) so the trigger's '' fallback never ships a
  // nameless profile (§3). `displayName` is optional/nullable per the open vault
  // question — treated as a nullable optional handle here.
  export const signupSchema = z.object({
    email: z.email(),
    password: z.string().min(8),
    fullName: z.string().trim().min(1),
    displayName: z.string().trim().min(1).optional().nullable(),
  });

  export const signinSchema = z.object({
    email: z.email(),
    password: z.string().min(8),
    remember: z.boolean().optional(),
  });

  export type SignupInput = z.infer<typeof signupSchema>;
  export type SigninInput = z.infer<typeof signinSchema>;
  ```

  Run again, then typecheck the new modules:

  ```bash
  pnpm vitest run src/lib/auth/schemas.test.ts
  pnpm typecheck
  ```

  Expected: schemas tests pass; `tsc --noEmit` reports no errors.

- [ ] **Step 7: Run all three new suites together and format-check.**

  ```bash
  pnpm vitest run src/lib/auth/errors.test.ts src/lib/auth/csrf.test.ts src/lib/auth/schemas.test.ts
  pnpm format:check
  ```

  Expected: 3 files, all green; Prettier reports the new files are formatted (printWidth 100).

- [ ] **Step 8: Commit.**

  ```bash
  git add src/lib/auth/errors.ts src/lib/auth/errors.test.ts \
    src/lib/auth/csrf.ts src/lib/auth/csrf.test.ts \
    src/lib/auth/schemas.ts src/lib/auth/schemas.test.ts
  git commit -m "feat(auth): error mapper, fail-closed CSRF guard, and request schemas"
  ```

---

## Task 6 — Web cookie-session functions (`web-session.ts`)

`web-session.ts` is the cookie-path adapter the route handlers call so a handler never holds a Supabase client or sees a vendor error (Seam Rule). Each function creates the cookie-bound ssr client via `createSupabaseServerClient` (Task 2, `server-client.ts`), calls the supabase-js method (which writes/clears cookies through `setAll`), translates any vendor error via `mapSupabaseError` (Task 5), and returns **our** `AuthUser`. No token ever leaves these functions in a return value — tokens live only in the httpOnly cookies set by `setAll`.

**Dependency note:** this task imports `createSupabaseServerClient` from Task 2 (`./server-client`) and `mapSupabaseError`/`AuthError` from Task 5 (`./errors`). The unit test mocks `./server-client` so it runs with no network and no real cookies, mirroring the `vi.mock` DI in `health.test.ts`.

- [ ] **Step 1: Write the failing test for `web-session.ts`.**

  The test mocks `./server-client` to hand back a fake supabase client whose `auth` methods are `vi.fn()`s, and asserts: success returns our `AuthUser` (never a token); `remember` is threaded into `createSupabaseServerClient`; signout calls `signOut({ scope: "local" })`; and a vendor error is translated through `mapSupabaseError` into an `AuthError`.

  Create `src/lib/auth/web-session.test.ts`:

  ```ts
  import { describe, it, expect, vi, beforeEach } from "vitest";

  // Fake cookie-bound supabase client whose auth methods are spies.
  const auth = {
    signUp: vi.fn(),
    signInWithPassword: vi.fn(),
    signOut: vi.fn(),
  };
  const createSupabaseServerClient = vi.fn(async () => ({ auth }));

  vi.mock("./server-client", () => ({ createSupabaseServerClient }));

  // Controllable Next cookie store so we can assert the anti session-fixation
  // clear: getAll() returns whatever `cookieJar` holds; delete() records names.
  let cookieJar: { name: string; value: string }[] = [];
  const deleteCookie = vi.fn((name: string) => {
    cookieJar = cookieJar.filter((c) => c.name !== name);
  });
  vi.mock("next/headers", () => ({
    cookies: vi.fn(async () => ({
      getAll: () => cookieJar,
      delete: deleteCookie,
      set: vi.fn(),
    })),
  }));

  import { AuthApiError } from "@supabase/supabase-js";
  import { signUpWeb, signInWeb, signOutWeb } from "./web-session";
  import { AuthError } from "./errors";

  // A REAL supabase-js AuthApiError so mapSupabaseError's instanceof guard
  // (isAuthApiError) recognizes it — a hand-rolled Error would fall through to
  // UNEXPECTED(500) and these translation assertions would silently pass for the
  // wrong reason. Verified signature: new AuthApiError(message, status, code).
  function authApiError(opts: { status: number; code?: string }) {
    return new AuthApiError("vendor boom", opts.status, opts.code);
  }

  describe("web-session", () => {
    beforeEach(() => {
      vi.clearAllMocks();
      createSupabaseServerClient.mockResolvedValue({ auth });
      cookieJar = [];
    });

    describe("signUpWeb", () => {
      it("signs up with metadata and returns our AuthUser (no token)", async () => {
        auth.signUp.mockResolvedValue({
          data: { user: { id: "u1", email: "a@example.com" }, session: { access_token: "tok" } },
          error: null,
        });

        const result = await signUpWeb({
          email: "a@example.com",
          password: "longenough",
          fullName: "Ada Lovelace",
          displayName: null,
        });

        expect(result).toEqual({ id: "u1", email: "a@example.com" });
        expect(result).not.toHaveProperty("token");
        expect(auth.signUp).toHaveBeenCalledWith({
          email: "a@example.com",
          password: "longenough",
          options: { data: { full_name: "Ada Lovelace", display_name: null } },
        });
      });

      it("translates a vendor email_exists error into AuthError(EMAIL_TAKEN, 409)", async () => {
        auth.signUp.mockResolvedValue({
          data: { user: null, session: null },
          error: authApiError({ status: 422, code: "email_exists" }),
        });

        await expect(
          signUpWeb({ email: "a@example.com", password: "longenough", fullName: "Ada" }),
        ).rejects.toMatchObject({ code: "EMAIL_TAKEN", status: 409 });
      });

      it("throws AuthError when no user comes back despite no error", async () => {
        auth.signUp.mockResolvedValue({ data: { user: null, session: null }, error: null });
        await expect(
          signUpWeb({ email: "a@example.com", password: "longenough", fullName: "Ada" }),
        ).rejects.toBeInstanceOf(AuthError);
      });
    });

    describe("signInWeb", () => {
      it("signs in and returns our AuthUser (no token)", async () => {
        auth.signInWithPassword.mockResolvedValue({
          data: { user: { id: "u1", email: "a@example.com" }, session: { access_token: "tok" } },
          error: null,
        });

        const result = await signInWeb({ email: "a@example.com", password: "longenough" });

        expect(result).toEqual({ id: "u1", email: "a@example.com" });
        expect(result).not.toHaveProperty("token");
        expect(auth.signInWithPassword).toHaveBeenCalledWith({
          email: "a@example.com",
          password: "longenough",
        });
      });

      it("threads remember=true into the cookie-bound client (persistent cookie)", async () => {
        auth.signInWithPassword.mockResolvedValue({
          data: { user: { id: "u1", email: "a@example.com" }, session: { access_token: "tok" } },
          error: null,
        });

        await signInWeb({ email: "a@example.com", password: "longenough", remember: true });
        expect(createSupabaseServerClient).toHaveBeenCalledWith(true);
      });

      it("threads remember=false into the cookie-bound client (session cookie)", async () => {
        auth.signInWithPassword.mockResolvedValue({
          data: { user: { id: "u1", email: "a@example.com" }, session: { access_token: "tok" } },
          error: null,
        });

        await signInWeb({ email: "a@example.com", password: "longenough", remember: false });
        expect(createSupabaseServerClient).toHaveBeenCalledWith(false);
      });

      it("clears stale sb-* cookie chunks before writing (anti session-fixation, §3)", async () => {
        auth.signInWithPassword.mockResolvedValue({
          data: { user: { id: "u1", email: "a@example.com" }, session: { access_token: "tok" } },
          error: null,
        });
        cookieJar = [
          { name: "sb-access-token", value: "stale1" },
          { name: "sb-refresh-token", value: "stale2" },
          { name: "other", value: "keep" },
        ];

        await signInWeb({ email: "a@example.com", password: "longenough" });

        // Both sb-* chunks deleted; the unrelated cookie is left untouched.
        expect(deleteCookie).toHaveBeenCalledWith("sb-access-token");
        expect(deleteCookie).toHaveBeenCalledWith("sb-refresh-token");
        expect(deleteCookie).not.toHaveBeenCalledWith("other");
      });

      it("translates the token-endpoint 400/undefined-code bug into INVALID_CREDENTIALS (401)", async () => {
        auth.signInWithPassword.mockResolvedValue({
          data: { user: null, session: null },
          error: authApiError({ status: 400, code: undefined }),
        });

        await expect(
          signInWeb({ email: "a@example.com", password: "wrongpass" }),
        ).rejects.toMatchObject({ code: "INVALID_CREDENTIALS", status: 401 });
      });
    });

    describe("signOutWeb", () => {
      it("signs out single-device (scope local) and resolves", async () => {
        auth.signOut.mockResolvedValue({ error: null });
        await expect(signOutWeb()).resolves.toBeUndefined();
        expect(auth.signOut).toHaveBeenCalledWith({ scope: "local" });
      });

      it("translates a vendor signOut error into an AuthError", async () => {
        auth.signOut.mockResolvedValue({ error: authApiError({ status: 500, code: "unexpected" }) });
        await expect(signOutWeb()).rejects.toBeInstanceOf(AuthError);
      });
    });
  });
  ```

  Run it; it fails (no module yet):

  ```bash
  pnpm vitest run src/lib/auth/web-session.test.ts
  ```

  Expected: `Failed to resolve import "./web-session"` (red).

- [ ] **Step 2: Implement `web-session.ts` to make the test green.**

  Create `src/lib/auth/web-session.ts`:

  ```ts
  import "server-only";
  import { cookies } from "next/headers";
  import { createSupabaseServerClient } from "./server-client";
  import { AuthError, mapSupabaseError } from "./errors";
  import type { AuthUser } from "./types";
  import type { SignupInput, SigninInput } from "./schemas";

  /**
   * The web cookie-session adapter. Route handlers call these (never supabase-js) so
   * no vendor client or vendor error escapes `lib/auth`. Each function creates the
   * cookie-bound ssr client (which writes/clears the httpOnly session cookies via its
   * `setAll`), calls supabase-js, translates errors via `mapSupabaseError`, and returns
   * our `AuthUser`. No token is ever returned — tokens live only in the cookies (§3).
   */

  export async function signUpWeb(input: SignupInput): Promise<AuthUser> {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.signUp({
      email: input.email,
      password: input.password,
      // Feeds private.handle_new_user(): full_name (NOT NULL) + optional display_name.
      options: { data: { full_name: input.fullName, display_name: input.displayName ?? null } },
    });
    if (error) throw mapSupabaseError(error);
    if (!data.user) throw new AuthError("UNEXPECTED", 500);
    return { id: data.user.id, email: data.user.email ?? input.email };
  }

  export async function signInWeb(input: SigninInput): Promise<AuthUser> {
    // Anti session-fixation (§3): drop any stale sb-* chunks BEFORE the write so a
    // pre-seeded cookie can't survive into the new session. supabase-js will write
    // the fresh chunks via setAll; we only clear what's already there. Wrapped in
    // try/catch because cookies() can be read-only in some contexts.
    try {
      const store = await cookies();
      store
        .getAll()
        .filter((c) => c.name.startsWith("sb-"))
        .forEach((c) => store.delete(c.name));
    } catch {
      // No writable cookie store (e.g. server-component render) — the proxy and the
      // subsequent setAll still produce a correct session; clearing is best-effort.
    }
    // remember selects persistent (maxAge) vs session cookie — see server-client.ts.
    const supabase = await createSupabaseServerClient(input.remember ?? true);
    const { data, error } = await supabase.auth.signInWithPassword({
      email: input.email,
      password: input.password,
    });
    if (error) throw mapSupabaseError(error);
    if (!data.user) throw new AuthError("UNEXPECTED", 500);
    return { id: data.user.id, email: data.user.email ?? input.email };
  }

  export async function signOutWeb(): Promise<void> {
    const supabase = await createSupabaseServerClient();
    // scope:"local" = single-device; the supabase-js default is global (§3, §14).
    const { error } = await supabase.auth.signOut({ scope: "local" });
    if (error) throw mapSupabaseError(error);
  }
  ```

  Run again:

  ```bash
  pnpm vitest run src/lib/auth/web-session.test.ts
  ```

  Expected: all tests pass (green).

- [ ] **Step 3: Typecheck and format-check.**

  ```bash
  pnpm typecheck
  pnpm format:check
  ```

  Expected: `tsc --noEmit` clean (the `SigninInput`/`SignupInput` types from Task 5 and `createSupabaseServerClient` from Task 2 resolve); Prettier reports `web-session.ts` + its test formatted.

  > Note: `signInWeb` clears any stale `sb-*` cookie chunks (read from the Next cookie store) **before** calling `signInWithPassword` — the anti session-fixation step required by §3. This lives here (not in the route handler) because `web-session.ts` is the cookie-path adapter that owns the cookie store for the signin write; supabase-js then writes the fresh chunks via `setAll`. The clear is wrapped in try/catch so a read-only cookie context never throws.

- [ ] **Step 4: Run the full auth-seam unit suite (Tasks 5 + 6 together) to confirm no cross-file regression.**

  ```bash
  pnpm vitest run src/lib/auth
  ```

  Expected: the contract test plus `errors`, `csrf`, `schemas`, and `web-session` suites all green (no `.integration.test.ts` files run under the unit config).

- [ ] **Step 5: Commit.**

  ```bash
  git add src/lib/auth/web-session.ts src/lib/auth/web-session.test.ts
  git commit -m "feat(auth): web cookie-session adapter (signUpWeb/signInWeb/signOutWeb)"
  ```

---

## Task 7 — Route handlers: `POST /api/v1/auth/{signup,signin,signout}` + `GET /api/v1/auth/session`

**Goal.** Expose the four app-owned auth endpoints. Each handler is a thin shell that mirrors `src/app/api/health/route.ts` (`export const dynamic = "force-dynamic"`, lean async fn, `NextResponse.json(body, { status })`). All vendor logic stays behind `web-session.ts`; all CSRF behind `csrf.ts`; all error→HTTP mapping behind `errors.ts`. The handlers know nothing about Supabase. Tokens never appear in a response body — the cookie-bound client writes them as `Set-Cookie` inside `signUpWeb`/`signInWeb`.

**Depends on (authored in earlier tasks):**
- `src/lib/auth/errors.ts` → `AuthError`, `mapSupabaseError`, `isAuthError` (Task 5).
- `src/lib/auth/schemas.ts` → `signupSchema`, `signinSchema` (Task 5).
- `src/lib/auth/web-session.ts` → `signUpWeb`, `signInWeb`, `signOutWeb` (Task 6).
- `src/lib/auth/csrf.ts` → `assertBrowserMutation` (Task 5).
- `src/lib/auth/session.ts` → `getCurrentUser` (Task 4).

> **Shared envelope helper first.** Every handler maps a thrown `AuthError` to the locked envelope `{ error: { code, message } }`. To keep the four files DRY and identical, this task adds one tiny shared helper (`src/lib/auth/http.ts`) and all four handlers route their `catch` through it. The helper is pure (no vendor import) and unit-tested implicitly via the route tests.

---

- [ ] **Step 1: Write the shared envelope helper test (RED).**

Create `src/lib/auth/http.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { NextResponse } from "next/server";
import { AuthError } from "./errors";
import { errorResponse, toErrorResponse } from "./http";

describe("errorResponse", () => {
  it("wraps a code + message in the locked envelope at the given status", async () => {
    const res = errorResponse("INVALID_INPUT", "Check your details and try again.", 400);
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({
      error: { code: "INVALID_INPUT", message: "Check your details and try again." },
    });
  });
});

describe("toErrorResponse", () => {
  it("maps an AuthError to its code + status with a safe message", async () => {
    const res = toErrorResponse(new AuthError("EMAIL_TAKEN", 409));
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error.code).toBe("EMAIL_TAKEN");
    expect(typeof body.error.message).toBe("string");
    expect(body.error.message.length).toBeGreaterThan(0);
  });

  it("maps any non-AuthError to UNEXPECTED 500 without leaking the raw error", async () => {
    const res = toErrorResponse(new Error("postgres: connection refused at 10.0.0.1:5432"));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error.code).toBe("UNEXPECTED");
    expect(body.error.message).not.toContain("postgres");
    expect(body.error.message).not.toContain("10.0.0.1");
  });

  it("returns a NextResponse instance", () => {
    expect(toErrorResponse(new AuthError("CSRF", 403))).toBeInstanceOf(NextResponse);
  });
});
```

Run it — it fails because `http.ts` does not exist yet:

```bash
pnpm vitest run src/lib/auth/http.test.ts
```

Expected: `Failed to resolve import "./http"` (RED).

---

- [ ] **Step 2: Implement the shared envelope helper (GREEN).**

Create `src/lib/auth/http.ts`:

```ts
import { NextResponse } from "next/server";
import { AuthError, isAuthError, logAuthError } from "./errors";

// The locked error envelope: { error: { code, message } }. `message` is a
// safe, user-facing string — never the raw vendor/error text (it can carry
// connection strings, addresses, or PII). Per-code copy is centralized here
// so every auth handler returns identical wording.
const MESSAGES: Record<string, string> = {
  INVALID_CREDENTIALS: "Email or password is incorrect.",
  EMAIL_TAKEN: "An account with this email already exists.",
  WEAK_PASSWORD: "Password is too weak.",
  INVALID_INPUT: "Check your details and try again.",
  RATE_LIMITED: "Too many attempts. Try again later.",
  CSRF: "Request blocked.",
  AUTH_ERROR: "Could not complete the request.",
  UNEXPECTED: "Something went wrong. Try again.",
};

function messageFor(code: string): string {
  return MESSAGES[code] ?? MESSAGES.UNEXPECTED;
}

export function errorResponse(code: string, message: string, status: number): NextResponse {
  return NextResponse.json({ error: { code, message } }, { status });
}

// Single catch-translation for every auth route handler. An AuthError carries
// the already-mapped code + HTTP status (errors.ts owns the vendor→AuthError
// translation); anything else is an unexpected 500. The raw error is never
// echoed back — only the safe per-code message. We also log per the §3 policy:
// ONLY { code, requestId } via logAuthError — never the raw error/req/body. The
// optional `req` is read ONLY for its x-request-id header (never logged whole).
export function toErrorResponse(err: unknown, req?: Request): NextResponse {
  const mapped = isAuthError(err) ? err : new AuthError("UNEXPECTED", 500);
  logAuthError(mapped.code, req?.headers.get("x-request-id") ?? undefined);
  return errorResponse(mapped.code, messageFor(mapped.code), mapped.status);
}
```

Run it:

```bash
pnpm vitest run src/lib/auth/http.test.ts
```

Expected: all 4 tests pass (GREEN).

---

- [ ] **Step 3: Write the `POST /api/v1/auth/signup` test (RED).**

Mirrors `health.test.ts`: `vi.mock` the collaborators, then import the handler under test. Create `src/app/api/v1/auth/signup/route.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { AuthError } from "@/lib/auth/errors";

vi.mock("@/lib/auth/web-session", () => ({ signUpWeb: vi.fn() }));
vi.mock("@/lib/auth/csrf", () => ({ assertBrowserMutation: vi.fn() }));

import { signUpWeb } from "@/lib/auth/web-session";
import { assertBrowserMutation } from "@/lib/auth/csrf";
import { POST } from "./route";

function req(body: unknown): Request {
  return new Request("http://localhost/api/v1/auth/signup", {
    method: "POST",
    headers: { "content-type": "application/json", "x-squad-csrf": "1" },
    body: JSON.stringify(body),
  });
}

const VALID = {
  email: "a@example.com",
  password: "password1",
  fullName: "Ada Lovelace",
  displayName: null,
};

describe("POST /api/v1/auth/signup", () => {
  beforeEach(() => vi.resetAllMocks());

  it("returns 201 and { user } on success", async () => {
    vi.mocked(signUpWeb).mockResolvedValue({ id: "u1", email: "a@example.com" });
    const res = await POST(req(VALID));
    expect(res.status).toBe(201);
    await expect(res.json()).resolves.toEqual({ user: { id: "u1", email: "a@example.com" } });
    expect(signUpWeb).toHaveBeenCalledWith({
      email: "a@example.com",
      password: "password1",
      fullName: "Ada Lovelace",
      displayName: null,
    });
  });

  it("never includes a token in the response body", async () => {
    vi.mocked(signUpWeb).mockResolvedValue({ id: "u1", email: "a@example.com" });
    const res = await POST(req(VALID));
    const body = await res.json();
    expect(body).not.toHaveProperty("token");
    expect(JSON.stringify(body)).not.toContain("token");
  });

  it("runs the CSRF gate before touching the vendor", async () => {
    vi.mocked(assertBrowserMutation).mockImplementation(() => {
      throw new AuthError("CSRF", 403);
    });
    const res = await POST(req(VALID));
    expect(res.status).toBe(403);
    await expect(res.json()).resolves.toEqual({
      error: { code: "CSRF", message: "Request blocked." },
    });
    expect(res.headers.get("set-cookie")).toBeNull();
    expect(signUpWeb).not.toHaveBeenCalled();
  });

  it("returns 400 INVALID_INPUT on a malformed body without calling the vendor", async () => {
    const res = await POST(req({ email: "not-an-email", password: "short" }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe("INVALID_INPUT");
    expect(signUpWeb).not.toHaveBeenCalled();
  });

  it("maps a mapped AuthError from the vendor (EMAIL_TAKEN → 409)", async () => {
    vi.mocked(signUpWeb).mockRejectedValue(new AuthError("EMAIL_TAKEN", 409));
    const res = await POST(req(VALID));
    expect(res.status).toBe(409);
    await expect(res.json()).resolves.toEqual({
      error: { code: "EMAIL_TAKEN", message: "An account with this email already exists." },
    });
  });

  it("maps an unexpected (non-AuthError) failure to 500 UNEXPECTED", async () => {
    vi.mocked(signUpWeb).mockRejectedValue(new Error("boom"));
    const res = await POST(req(VALID));
    expect(res.status).toBe(500);
    await expect(res.json()).resolves.toMatchObject({ error: { code: "UNEXPECTED" } });
  });
});
```

Run it:

```bash
pnpm vitest run src/app/api/v1/auth/signup/route.test.ts
```

Expected: `Failed to resolve import "./route"` (RED).

---

- [ ] **Step 4: Implement `POST /api/v1/auth/signup` (GREEN).**

Create `src/app/api/v1/auth/signup/route.ts`:

```ts
import { NextResponse } from "next/server";
import { assertBrowserMutation } from "@/lib/auth/csrf";
import { AuthError } from "@/lib/auth/errors";
import { toErrorResponse } from "@/lib/auth/http";
import { signupSchema } from "@/lib/auth/schemas";
import { signUpWeb } from "@/lib/auth/web-session";

// Mutation endpoint: writes the session into httpOnly cookies (inside
// signUpWeb). Never prerender/cache; never a token in the body.
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    assertBrowserMutation(req);
    const parsed = signupSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) throw new AuthError("INVALID_INPUT", 400);
    const user = await signUpWeb(parsed.data);
    return NextResponse.json({ user }, { status: 201 });
  } catch (err) {
    // Logs only { code, requestId } via toErrorResponse → logAuthError (§3); the
    // raw error/req/body is never logged.
    return toErrorResponse(err, req);
  }
}
```

Run it:

```bash
pnpm vitest run src/app/api/v1/auth/signup/route.test.ts
```

Expected: all 6 tests pass (GREEN).

> Note: `signUpWeb` accepts the validated `{ email, password, fullName, displayName }` object (per the locked `web-session.ts` signature `signUpWeb(input)`); the handler passes `parsed.data` straight through, so the test's `toHaveBeenCalledWith` matches exactly.

---

- [ ] **Step 5: Write the `POST /api/v1/auth/signin` test (RED).**

Create `src/app/api/v1/auth/signin/route.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { AuthError } from "@/lib/auth/errors";

vi.mock("@/lib/auth/web-session", () => ({ signInWeb: vi.fn() }));
vi.mock("@/lib/auth/csrf", () => ({ assertBrowserMutation: vi.fn() }));

import { signInWeb } from "@/lib/auth/web-session";
import { assertBrowserMutation } from "@/lib/auth/csrf";
import { POST } from "./route";

function req(body: unknown): Request {
  return new Request("http://localhost/api/v1/auth/signin", {
    method: "POST",
    headers: { "content-type": "application/json", "x-squad-csrf": "1" },
    body: JSON.stringify(body),
  });
}

const VALID = { email: "a@example.com", password: "password1", remember: true };

describe("POST /api/v1/auth/signin", () => {
  beforeEach(() => vi.resetAllMocks());

  it("returns 200 and { user } on success and passes remember through", async () => {
    vi.mocked(signInWeb).mockResolvedValue({ id: "u1", email: "a@example.com" });
    const res = await POST(req(VALID));
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ user: { id: "u1", email: "a@example.com" } });
    expect(signInWeb).toHaveBeenCalledWith({
      email: "a@example.com",
      password: "password1",
      remember: true,
    });
  });

  it("never includes a token in the response body", async () => {
    vi.mocked(signInWeb).mockResolvedValue({ id: "u1", email: "a@example.com" });
    const res = await POST(req(VALID));
    const body = await res.json();
    expect(body).not.toHaveProperty("token");
    expect(JSON.stringify(body)).not.toContain("token");
  });

  it("rejects with 403 and no Set-Cookie when the CSRF gate throws", async () => {
    vi.mocked(assertBrowserMutation).mockImplementation(() => {
      throw new AuthError("CSRF", 403);
    });
    const res = await POST(req(VALID));
    expect(res.status).toBe(403);
    await expect(res.json()).resolves.toEqual({
      error: { code: "CSRF", message: "Request blocked." },
    });
    expect(res.headers.get("set-cookie")).toBeNull();
    expect(signInWeb).not.toHaveBeenCalled();
  });

  it("maps invalid credentials (the undefined-code token-endpoint case) to 401", async () => {
    // errors.ts maps a 400 token-endpoint AuthApiError with code===undefined to
    // INVALID_CREDENTIALS(401); the handler just relays whatever AuthError it gets.
    vi.mocked(signInWeb).mockRejectedValue(new AuthError("INVALID_CREDENTIALS", 401));
    const res = await POST(req(VALID));
    expect(res.status).toBe(401);
    await expect(res.json()).resolves.toEqual({
      error: { code: "INVALID_CREDENTIALS", message: "Email or password is incorrect." },
    });
  });

  it("returns 400 INVALID_INPUT on a malformed body", async () => {
    const res = await POST(req({ email: "x", password: "" }));
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toMatchObject({ error: { code: "INVALID_INPUT" } });
    expect(signInWeb).not.toHaveBeenCalled();
  });

  it("maps an unexpected failure to 500 UNEXPECTED", async () => {
    vi.mocked(signInWeb).mockRejectedValue(new Error("boom"));
    const res = await POST(req(VALID));
    expect(res.status).toBe(500);
    await expect(res.json()).resolves.toMatchObject({ error: { code: "UNEXPECTED" } });
  });
});
```

Run it:

```bash
pnpm vitest run src/app/api/v1/auth/signin/route.test.ts
```

Expected: `Failed to resolve import "./route"` (RED).

---

- [ ] **Step 6: Implement `POST /api/v1/auth/signin` (GREEN).**

Create `src/app/api/v1/auth/signin/route.ts`:

```ts
import { NextResponse } from "next/server";
import { assertBrowserMutation } from "@/lib/auth/csrf";
import { AuthError } from "@/lib/auth/errors";
import { toErrorResponse } from "@/lib/auth/http";
import { signinSchema } from "@/lib/auth/schemas";
import { signInWeb } from "@/lib/auth/web-session";

// Mutation endpoint: signInWeb writes the session into httpOnly cookies
// (persistent vs session per `remember`). No token in the body.
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    assertBrowserMutation(req);
    const parsed = signinSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) throw new AuthError("INVALID_INPUT", 400);
    const user = await signInWeb(parsed.data);
    return NextResponse.json({ user }, { status: 200 });
  } catch (err) {
    // Logs only { code, requestId } via toErrorResponse → logAuthError (§3); the
    // raw error/req/body is never logged.
    return toErrorResponse(err, req);
  }
}
```

Run it:

```bash
pnpm vitest run src/app/api/v1/auth/signin/route.test.ts
```

Expected: all 6 tests pass (GREEN).

---

- [ ] **Step 7: Write the `POST /api/v1/auth/signout` test (RED).**

Create `src/app/api/v1/auth/signout/route.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { AuthError } from "@/lib/auth/errors";

vi.mock("@/lib/auth/web-session", () => ({ signOutWeb: vi.fn() }));
vi.mock("@/lib/auth/csrf", () => ({ assertBrowserMutation: vi.fn() }));

import { signOutWeb } from "@/lib/auth/web-session";
import { assertBrowserMutation } from "@/lib/auth/csrf";
import { POST } from "./route";

function req(): Request {
  return new Request("http://localhost/api/v1/auth/signout", {
    method: "POST",
    headers: { "x-squad-csrf": "1" },
  });
}

describe("POST /api/v1/auth/signout", () => {
  beforeEach(() => vi.resetAllMocks());

  it("returns 200 { ok: true } and clears the session", async () => {
    vi.mocked(signOutWeb).mockResolvedValue(undefined);
    const res = await POST(req());
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ ok: true });
    expect(signOutWeb).toHaveBeenCalledTimes(1);
  });

  it("rejects with 403 and no Set-Cookie when the CSRF gate throws", async () => {
    vi.mocked(assertBrowserMutation).mockImplementation(() => {
      throw new AuthError("CSRF", 403);
    });
    const res = await POST(req());
    expect(res.status).toBe(403);
    await expect(res.json()).resolves.toEqual({
      error: { code: "CSRF", message: "Request blocked." },
    });
    expect(res.headers.get("set-cookie")).toBeNull();
    expect(signOutWeb).not.toHaveBeenCalled();
  });

  it("maps an unexpected failure to 500 UNEXPECTED", async () => {
    vi.mocked(signOutWeb).mockRejectedValue(new Error("boom"));
    const res = await POST(req());
    expect(res.status).toBe(500);
    await expect(res.json()).resolves.toMatchObject({ error: { code: "UNEXPECTED" } });
  });
});
```

Run it:

```bash
pnpm vitest run src/app/api/v1/auth/signout/route.test.ts
```

Expected: `Failed to resolve import "./route"` (RED).

---

- [ ] **Step 8: Implement `POST /api/v1/auth/signout` (GREEN).**

Create `src/app/api/v1/auth/signout/route.ts`:

```ts
import { NextResponse } from "next/server";
import { assertBrowserMutation } from "@/lib/auth/csrf";
import { toErrorResponse } from "@/lib/auth/http";
import { signOutWeb } from "@/lib/auth/web-session";

// Mutation endpoint: signOutWeb clears the cookie chunks (scope: "local").
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    assertBrowserMutation(req);
    await signOutWeb();
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err) {
    // Logs only { code, requestId } via toErrorResponse → logAuthError (§3); the
    // raw error/req/body is never logged.
    return toErrorResponse(err, req);
  }
}
```

Run it:

```bash
pnpm vitest run src/app/api/v1/auth/signout/route.test.ts
```

Expected: all 3 tests pass (GREEN).

---

- [ ] **Step 9: Write the `GET /api/v1/auth/session` test (RED).**

Create `src/app/api/v1/auth/session/route.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/auth/session", () => ({ getCurrentUser: vi.fn() }));

import { getCurrentUser } from "@/lib/auth/session";
import { GET } from "./route";

function req(): Request {
  return new Request("http://localhost/api/v1/auth/session", { method: "GET" });
}

describe("GET /api/v1/auth/session", () => {
  beforeEach(() => vi.resetAllMocks());

  it("returns 200 and { user } when a session resolves", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({ id: "u1", email: "a@example.com" });
    const res = await GET(req());
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ user: { id: "u1", email: "a@example.com" } });
  });

  it("returns 200 and { user: null } when anonymous (a status probe, not a 401)", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(null);
    const res = await GET(req());
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ user: null });
  });

  it("forwards the request to getCurrentUser (so the Bearer transport works)", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(null);
    const r = req();
    await GET(r);
    expect(getCurrentUser).toHaveBeenCalledWith(r);
  });

  it("never includes a token in the body", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({ id: "u1", email: "a@example.com" });
    const res = await GET(req());
    const body = await res.json();
    expect(JSON.stringify(body)).not.toContain("token");
  });

  it("maps an unexpected failure to 500 UNEXPECTED", async () => {
    vi.mocked(getCurrentUser).mockRejectedValue(new Error("boom"));
    const res = await GET(req());
    expect(res.status).toBe(500);
    await expect(res.json()).resolves.toMatchObject({ error: { code: "UNEXPECTED" } });
  });
});
```

Run it:

```bash
pnpm vitest run src/app/api/v1/auth/session/route.test.ts
```

Expected: `Failed to resolve import "./route"` (RED).

---

- [ ] **Step 10: Implement `GET /api/v1/auth/session` (GREEN).**

Create `src/app/api/v1/auth/session/route.ts`:

```ts
import { NextResponse } from "next/server";
import { toErrorResponse } from "@/lib/auth/http";
import { getCurrentUser } from "@/lib/auth/session";

// Whoami status probe — a PURE READ (no cookie writes, no DB write). Always
// 200; `{ user: null }` signals anonymous (never 401 — this is a probe).
// `req` is forwarded so the native Bearer transport resolves here too.
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const user = await getCurrentUser(req);
    return NextResponse.json({ user }, { status: 200 });
  } catch (err) {
    // Logs only { code, requestId } via toErrorResponse → logAuthError (§3); the
    // raw error/req/body is never logged.
    return toErrorResponse(err, req);
  }
}
```

> Note: the v1 `GET /session` contract is `{ user } | { user: null }` — **no `profile` field**. The probe is a pure whoami; surface bootstrap (creating/reading the client-surface marker) happens in the `/app` layout guard (`ensureClientProfile`, Task 9), never in this read. Attaching a `profile` to the probe response is deferred (see Deferred), so the test asserts exactly `{ user }` / `{ user: null }` and the contract stays stable.

Run it:

```bash
pnpm vitest run src/app/api/v1/auth/session/route.test.ts
```

Expected: all 5 tests pass (GREEN).

---

- [ ] **Step 11: Run the full Task-7 surface + typecheck + lint + format.**

```bash
pnpm vitest run src/lib/auth/http.test.ts src/app/api/v1/auth
pnpm typecheck
pnpm lint
pnpm format:check
```

Expected:
- Vitest: all suites pass (`http` + the four `route.test.ts` files — 4 + 6 + 6 + 3 + 5 = 24 tests green).
- `pnpm typecheck`: no errors (`tsc --noEmit`).
- `pnpm lint`: clean.
- `pnpm format:check`: all files already formatted (printWidth 100, semis, double quotes, trailing commas — matching `.prettierrc`).

---

- [ ] **Step 12: Add the CSRF-guard CI check script (spec §7).**

A static gate that forbids a POST resource route from shipping without `assertBrowserMutation`. It mirrors `scripts/check-design-rules.mjs` (recursive walk, no glob dep): walk `src/app/api/v1/**`, and for every non-test `route.ts` whose source declares a POST handler (`export async function POST` or `export const POST`), require the source to also mention `assertBrowserMutation`; otherwise exit non-zero with the offending paths. This catches a future mutation endpoint that forgets the fail-closed gate.

Create `scripts/check-csrf-guards.mjs`:

```js
// scripts/check-csrf-guards.mjs
// Gate: every POST route handler under src/app/api/v1 must run the fail-closed CSRF
// guard (assertBrowserMutation). A cookie-auth mutation without it is an open door
// (spec §7). Mirrors check-design-rules.mjs: recursive walk, no glob dependency.
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import path from "node:path";

const ROOT = path.normalize("src/app/api/v1");
const offenders = [];

function isPostRoute(src) {
  return /export\s+(?:async\s+function|const)\s+POST\b/.test(src);
}

function walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = path.join(dir, name);
    if (statSync(p).isDirectory()) {
      walk(p);
    } else if (name === "route.ts") {
      const src = readFileSync(p, "utf8");
      if (isPostRoute(src) && !src.includes("assertBrowserMutation")) {
        offenders.push(p);
      }
    }
  }
}

if (existsSync(ROOT)) walk(ROOT);
if (offenders.length) {
  console.error(
    "CSRF-guard violation: POST route handler(s) missing assertBrowserMutation:\n" +
      offenders.map((p) => `  ${p}`).join("\n"),
  );
  process.exit(1);
}
console.log("csrf guards OK");
```

Add the `check:csrf` script to `package.json` — insert it directly after the existing `"check:design"` line:

```json
    "check:design": "node scripts/check-design-rules.mjs",
    "check:csrf": "node scripts/check-csrf-guards.mjs",
```

Run it — it must pass now that all three POST handlers call `assertBrowserMutation` (and the GET session route is exempt because it declares no POST):

```bash
pnpm check:csrf
```

Expected: `csrf guards OK`.

- [ ] **Step 12b: Add the auth-logging CI check script (spec §3 logging policy).**

A static gate that enforces the logging policy: no auth file may `console.*` a caught error, the request, or a body — only `logAuthError(code, requestId)` is allowed. It scans every `.ts` under `src/app/api/v1/auth` for `console.<method>(...)` calls whose argument references a caught-error variable (`err`/`error`/`e`) or `req`/`request`/`body`, and fails with the offending lines. Mirrors the `check-design-rules.mjs` walk style.

Create `scripts/check-auth-logging.mjs`:

```js
// scripts/check-auth-logging.mjs
// Gate: under src/app/api/v1/auth, log only via logAuthError(code, requestId).
// Forbid console.* of a caught error (err/error/e) or of req/request/body — those
// hold passwords + tokens (spec §3 logging policy). Recursive walk, no glob dep.
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import path from "node:path";

const ROOT = path.normalize("src/app/api/v1/auth");
const offenders = [];

// console.<method>( ... ) where the args mention a caught error or req/request/body.
const BAD = /console\.\w+\([^)]*\b(?:err|error|e|req|request|body)\b/;

function walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = path.join(dir, name);
    if (statSync(p).isDirectory()) {
      walk(p);
    } else if (/\.ts$/.test(name)) {
      const lines = readFileSync(p, "utf8").split("\n");
      lines.forEach((line, i) => {
        if (BAD.test(line)) offenders.push(`${p}:${i + 1}  ${line.trim()}`);
      });
    }
  }
}

if (existsSync(ROOT)) walk(ROOT);
if (offenders.length) {
  console.error(
    "Auth-logging violation: log only via logAuthError(code, requestId) — never the\n" +
      "raw error/req/body (spec §3). Offending lines:\n" +
      offenders.join("\n"),
  );
  process.exit(1);
}
console.log("auth logging OK");
```

Add the `check:auth-logging` script to `package.json` — directly after the `check:csrf` line:

```json
    "check:csrf": "node scripts/check-csrf-guards.mjs",
    "check:auth-logging": "node scripts/check-auth-logging.mjs",
```

Run it — the handlers route their catch through `toErrorResponse` (which logs via `logAuthError`) and never `console.*` an error/req/body directly, so it passes:

```bash
pnpm check:auth-logging
```

Expected: `auth logging OK`.

- [ ] **Step 13: Commit.**

```bash
git add src/lib/auth/http.ts src/lib/auth/http.test.ts \
  src/lib/auth/errors.ts src/lib/auth/errors.test.ts \
  src/app/api/v1/auth/signup/route.ts src/app/api/v1/auth/signup/route.test.ts \
  src/app/api/v1/auth/signin/route.ts src/app/api/v1/auth/signin/route.test.ts \
  src/app/api/v1/auth/signout/route.ts src/app/api/v1/auth/signout/route.test.ts \
  src/app/api/v1/auth/session/route.ts src/app/api/v1/auth/session/route.test.ts \
  scripts/check-csrf-guards.mjs scripts/check-auth-logging.mjs package.json
git commit -m "feat(auth): add /api/v1/auth route handlers + CSRF & auth-logging CI gates"
```

---

### Task 7 notes / invariants enforced by the tests

- **Seam Rule:** no handler imports `@supabase/*`. All vendor contact is via `web-session.ts` (signup/signin/signout) or `session.ts` (the GET probe). A vendor swap touches only `lib/auth/`.
- **CSRF fail-closed + no leakage:** `assertBrowserMutation` runs first on every mutation; on a thrown `AuthError("CSRF", 403)` the handler returns 403 and `signUpWeb`/`signInWeb`/`signOutWeb` are never called, so there is **no `Set-Cookie`** (asserted in three suites).
- **No tokens in any body:** signup/signin/signout/session bodies are asserted to contain no `token` field; the session lives only in httpOnly cookies written inside `web-session.ts`.
- **Undefined-code mapping is owned upstream:** the signin test relays an `AuthError("INVALID_CREDENTIALS", 401)` (the `code===undefined` token-endpoint case that `errors.ts` maps); the handler does no mapping of its own beyond `toErrorResponse`.
- **Status codes:** signup `201`, signin `200`, signout `200 { ok: true }`, session `200` with `{ user }` or `{ user: null }` (a probe, never `401`).
- **Idiom parity with `health/route.ts`:** every route declares `export const dynamic = "force-dynamic"`, a lean async fn, and `NextResponse.json(body, { status })`; every test uses `vi.mock` DI + `beforeEach(() => vi.resetAllMocks())` exactly like `health.test.ts`.

---

## Task 8 — Proxy + web session refresh (`update-session.ts`, `src/proxy.ts`)

`update-session.ts` is the one place the web session is refreshed and cookies are written. `src/proxy.ts` is the Next 16 entry point (the renamed middleware): it delegates to `update-session.ts`, then splits on the outcome — page routes redirect to `/signin?next=…`, `/api/*` returns a 401 envelope, authenticated requests get the refreshed response back verbatim. The matcher is narrowed to `/app/*` (plus future `/api/v1/*` resource routes) and excludes static assets, the public auth screens, the root, and the individually-listed public auth/health endpoints. `update-session.ts` is the third (and last) file permitted to import `@supabase/ssr`.

- [ ] **Step 1: Write the failing proxy test.**

Create `src/proxy.test.ts`. It uses `vi.mock` DI exactly like `health.test.ts` — mock `@/lib/auth/update-session` so the proxy is tested in isolation (no real Supabase, no real cookies). `NextRequest` is constructed from a URL; the mock returns a `{ userId, response }` shape and we assert the proxy's routing decision.

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest, NextResponse } from "next/server";

vi.mock("@/lib/auth/update-session", () => ({ updateSession: vi.fn() }));
import { updateSession } from "@/lib/auth/update-session";
import { proxy } from "./proxy";

function req(path: string): NextRequest {
  return new NextRequest(new URL(`https://squad.test${path}`));
}

describe("proxy", () => {
  beforeEach(() => vi.resetAllMocks());

  it("returns a 401 envelope for an anonymous API request", async () => {
    vi.mocked(updateSession).mockResolvedValue({
      userId: null,
      response: NextResponse.next(),
    });
    const res = await proxy(req("/api/v1/games"));
    expect(res.status).toBe(401);
    await expect(res.json()).resolves.toEqual({ error: { code: "UNAUTHORIZED" } });
  });

  it("redirects an anonymous page request to /signin with a next param", async () => {
    vi.mocked(updateSession).mockResolvedValue({
      userId: null,
      response: NextResponse.next(),
    });
    const res = await proxy(req("/app"));
    expect(res.status).toBe(307);
    const location = res.headers.get("location")!;
    const url = new URL(location);
    expect(url.pathname).toBe("/signin");
    expect(url.searchParams.get("next")).toBe("/app");
  });

  it("preserves the original path (with query) in the next param", async () => {
    vi.mocked(updateSession).mockResolvedValue({
      userId: null,
      response: NextResponse.next(),
    });
    const res = await proxy(req("/app/games?sport=football"));
    const url = new URL(res.headers.get("location")!);
    expect(url.searchParams.get("next")).toBe("/app/games?sport=football");
  });

  it("returns the refreshed response untouched for an authenticated request", async () => {
    const refreshed = NextResponse.next();
    refreshed.headers.set("x-test-marker", "refreshed");
    vi.mocked(updateSession).mockResolvedValue({ userId: "user-1", response: refreshed });
    const res = await proxy(req("/app"));
    expect(res).toBe(refreshed);
    expect(res.headers.get("x-test-marker")).toBe("refreshed");
  });
});
```

Run it — it must fail because neither module exists yet:

```bash
pnpm vitest run src/proxy.test.ts
```

Expected: failure resolving `./proxy` / `@/lib/auth/update-session` (module not found).

- [ ] **Step 2: Write `src/lib/auth/update-session.ts`.**

The one place the web session is refreshed/written. It passes `cookieOptions: SESSION_COOKIE_OPTIONS` to `createServerClient`, forces the security flags in `setAll` while preserving supabase-js `maxAge`/`expires`, mirrors cookies onto both `request.cookies` and a freshly-rebuilt response, applies the cache headers from `setAll`'s second arg, and runs **no code** between `createServerClient` and `getClaims()`. Returns the exact response object.

```ts
import "server-only";
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { config } from "@/lib/config";
import { SESSION_COOKIE_OPTIONS } from "./cookie-options";

// The ONE place the web session is refreshed and cookies are (re)written. Runs in
// the proxy on every guarded request. Hard rule: no code between createServerClient
// and getClaims() — getClaims() performs the token refresh; anything in between can
// desync request/response cookies and log users out at random.
export async function updateSession(
  request: NextRequest,
): Promise<{ userId: string | null; response: NextResponse }> {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(config.supabaseUrl, config.supabasePublishableKey, {
    cookieOptions: SESSION_COOKIE_OPTIONS,
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(toSet, headers) {
        // Mirror onto the request so downstream sees the fresh values, then rebuild
        // the response and re-attach every cookie — forcing SECURITY flags while
        // PRESERVING supabase-js maxAge/expires (e.g. maxAge:0 deletes stale chunks).
        for (const { name, value } of toSet) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of toSet) {
          response.cookies.set(name, value, {
            ...options,
            httpOnly: SESSION_COOKIE_OPTIONS.httpOnly,
            secure: SESSION_COOKIE_OPTIONS.secure,
            sameSite: SESSION_COOKIE_OPTIONS.sameSite,
            path: SESSION_COOKIE_OPTIONS.path,
            domain: SESSION_COOKIE_OPTIONS.domain,
          });
        }
        // Cache headers (Cache-Control/Expires/Pragma) so a CDN can't cache a Set-Cookie.
        for (const [key, val] of Object.entries(headers)) response.headers.set(key, val);
      },
    },
  });

  const { data } = await supabase.auth.getClaims(); // triggers refresh; local JWKS verify
  return { userId: data?.claims?.sub ?? null, response };
}
```

- [ ] **Step 3: Write `src/proxy.ts`.**

The Next 16 proxy (renamed from middleware; runtime nodejs, not configurable). Delegates to `updateSession`, then splits: anon API → 401 envelope; anon page → redirect to `/signin?next=…`; otherwise return the refreshed response. The matcher guards `/app/*` and future `/api/v1/*` resource routes, excluding static assets, the public auth screens, the root, and the individually-listed public auth/health endpoints (not the whole `/api/v1/auth` prefix, so a future authed endpoint isn't accidentally exempt).

```ts
import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/auth/update-session";

export async function proxy(request: NextRequest) {
  const { userId, response } = await updateSession(request);

  if (!userId) {
    const { pathname, search } = request.nextUrl;
    // API routes are programmatic — answer with our error envelope, never an HTML redirect.
    if (pathname.startsWith("/api")) {
      return NextResponse.json({ error: { code: "UNAUTHORIZED" } }, { status: 401 });
    }
    // Page routes — bounce to sign-in, preserving where the user was headed.
    const signin = new URL("/signin", request.url);
    signin.searchParams.set("next", `${pathname}${search}`);
    return NextResponse.redirect(signin);
  }

  // Authenticated — return the refreshed response verbatim so cookies stay in sync.
  return response;
}

export const config = {
  // Guard /app/* and future /api/v1/* resource routes only. Excludes static assets,
  // the public auth screens (/boot /welcome /signup /verify /intent /signin /forgot),
  // the root /, and the public auth/health ENDPOINTS — listed INDIVIDUALLY (not the
  // whole /api/v1/auth prefix) so a future authed endpoint isn't accidentally exempt.
  // `missing` prefetch headers stop the proxy firing on router hover-prefetch.
  matcher: [
    {
      source:
        "/((?!_next/static|_next/image|favicon.ico|boot|welcome|signup|verify|intent|signin|forgot|api/v1/auth/signup|api/v1/auth/signin|api/v1/auth/signout|api/v1/auth/session|api/health|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js)$).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
```

> Note: the matcher's negative-lookahead anchors at the path root, so it matches `/app`, `/app/games`, and `/api/v1/games` while letting `/`, the listed auth screens, and the public endpoints through. `/venue` is intentionally not yet guarded (no venue auth this plan).

- [ ] **Step 4: Run the proxy test — it passes now.**

```bash
pnpm vitest run src/proxy.test.ts
```

Expected: 4 passed. (`update-session.ts` is import-mocked, so its `server-only` import never loads here.)

- [ ] **Step 5: Typecheck.**

```bash
pnpm typecheck
```

Expected: no errors. (`@supabase/ssr` is added in Task 0; `config.supabasePublishableKey` and `SESSION_COOKIE_OPTIONS` exist from Tasks 1–2. If `getClaims`'s return type complains, re-verify the pinned `@supabase/ssr` version per spec §14.3.)

- [ ] **Step 6: Lint + format check.**

```bash
pnpm lint && pnpm format:check
```

Expected: clean.

- [ ] **Step 7: Commit.**

```bash
git add src/proxy.ts src/proxy.test.ts src/lib/auth/update-session.ts
git commit -m "feat(auth): proxy + web session refresh with narrowed matcher

updateSession refreshes the cookie session in one place (no code between
createServerClient and getClaims; security flags forced, maxAge/expires
preserved). proxy splits anon API (401 envelope) vs anon page (redirect to
/signin?next=). Matcher guards /app/* + future /api/v1/* only."
```

---

## Task 9 — Lazy profile bootstrap + `/app` guard (`bootstrap.ts`, `app/(client)/app/layout.tsx`)

`ensureClientProfile` writes the client-surface marker idempotently (PK + `onConflictDoNothing`). It is called from exactly one place — the `app/(client)/app/layout.tsx` server-component guard, which resolves the user via `getCurrentUser()` (cookie path, no `req`), redirects to `/signin` if null (defense-in-depth behind the proxy), then bootstraps. The integration test proves the trigger creates the base `profiles` row and that `ensureClientProfile` is idempotent (call twice → one row), reusing the `asUser`/`db` harness idioms.

- [ ] **Step 1: Write the failing bootstrap integration test.**

Create `src/lib/auth/bootstrap.integration.test.ts`. It hits real Postgres (the `.integration.test.ts` config), reuses the harness's `createAuthUser` idiom (direct `auth.users` insert → `handle_new_user` trigger fires), and uses `db`/`client` from `@/lib/db/client`. It asserts (a) the trigger created the `profiles` row, and (b) calling `ensureClientProfile` twice yields exactly one `client_profiles` row.

```ts
import { afterAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { client, db } from "@/lib/db/client";
import { newId } from "@/lib/db/id";
import { clientProfiles, profiles } from "@/lib/db/schema";
import { ensureClientProfile } from "./bootstrap";

// Mirror db.integration.test.ts: create a Supabase auth user by inserting directly
// into auth.users (the integration DB connects as `postgres`). The
// on_auth_user_created trigger then creates the public.profiles row.
async function createAuthUser(fullName: string): Promise<string> {
  const id = newId();
  const email = `boot-${id}@example.com`;
  await client`
    insert into auth.users (instance_id, id, aud, role, email, raw_user_meta_data, created_at, updated_at)
    values ('00000000-0000-0000-0000-000000000000', ${id}, 'authenticated', 'authenticated',
            ${email}, ${JSON.stringify({ full_name: fullName, display_name: fullName })}::jsonb, now(), now())
  `;
  return id;
}

afterAll(async () => {
  await client.end();
});

describe("ensureClientProfile", () => {
  it("relies on the trigger for the base profile, then adds the client marker", async () => {
    const id = await createAuthUser("Bootstrap User");

    // The handle_new_user trigger already created the base profiles row.
    const [profile] = await db.select().from(profiles).where(eq(profiles.id, id));
    expect(profile?.id).toBe(id);

    await ensureClientProfile(id);
    const [marker] = await db
      .select()
      .from(clientProfiles)
      .where(eq(clientProfiles.profileId, id));
    expect(marker?.profileId).toBe(id);
  });

  it("is idempotent: calling twice leaves exactly one client_profiles row", async () => {
    const id = await createAuthUser("Idempotent User");

    await ensureClientProfile(id);
    await ensureClientProfile(id); // double-tap must not throw or duplicate

    const rows = await db
      .select()
      .from(clientProfiles)
      .where(eq(clientProfiles.profileId, id));
    expect(rows).toHaveLength(1);
  });
});
```

Run it — it must fail because `bootstrap.ts` doesn't exist:

```bash
pnpm dotenv -e .env.local -- pnpm test:integration src/lib/auth/bootstrap.integration.test.ts
```

Expected: failure resolving `./bootstrap` (module not found). The dotenv form is required: `vitest.integration.config.ts` has no env block, so `config`'s `parseEnv` throws on a missing `DATABASE_URL` unless `.env.local` is loaded — the bare `pnpm vitest run --config vitest.integration.config.ts …` would fail for the wrong reason. (Requires the local Supabase Postgres running.)

- [ ] **Step 2: Write `src/lib/auth/bootstrap.ts`.**

Idempotent client-surface marker insert. `profileId` MUST come from `getCurrentUser().id`, never request input (RLS does not enforce `auth.uid() = profile_id` over the owner connection — spec §8). `onConflictDoNothing` mirrors the repo's idempotent-write convention.

```ts
import "server-only";
import { db } from "@/lib/db/client";
import { clientProfiles } from "@/lib/db/schema";

// Lazily create the client-surface marker. Idempotent via PK (profile_id) +
// onConflictDoNothing — race-safe, mirrors the repo's idempotent-write convention.
// profileId MUST come from getCurrentUser().id, NEVER from request input: RLS does
// not enforce auth.uid() = profile_id over the Drizzle/postgres-js owner connection
// (spec §8), so the app layer is the sole guard.
export async function ensureClientProfile(profileId: string): Promise<void> {
  await db.insert(clientProfiles).values({ profileId }).onConflictDoNothing();
}
```

- [ ] **Step 3: Run the bootstrap integration test — it passes now.**

```bash
pnpm dotenv -e .env.local -- pnpm test:integration src/lib/auth/bootstrap.integration.test.ts
```

Expected: 2 passed. (Use the dotenv form so `.env.local` supplies `DATABASE_URL` to the integration config, as in Step 1.)

- [ ] **Step 4: Write the `/app` server-component guard `src/app/(client)/app/layout.tsx`.**

Defense-in-depth behind the proxy, and the single place lazy bootstrap fires. It calls `getCurrentUser()` with no arg (cookie path — layouts have no `Request`), redirects to `/signin` if null, then `ensureClientProfile(user.id)`. No `force-dynamic` is needed: `getCurrentUser` reads `cookies()`, which already opts the subtree out of static rendering.

```tsx
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { ensureClientProfile } from "@/lib/auth/bootstrap";

// Server-component guard for /app/*. The proxy (src/proxy.ts) is the primary gate;
// this is defense-in-depth AND the single place the client-surface marker is lazily
// created — never in a GET probe (no side-effecting reads). user.id comes from the
// verified session, never request input (spec §5, §8).
export default async function AppGuardLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/signin");
  await ensureClientProfile(user.id);
  return <>{children}</>;
}
```

> Note: this nested layout sits at `app/(client)/app/layout.tsx` and wraps only `/app/*`; the chrome (Topbar/Tabbar) stays in the route-group layout `app/(client)/layout.tsx`. The fragment keeps the guard transparent to that chrome.

- [ ] **Step 4b: Confirm the shipped `/app` screen doesn't regress under the new guard.** Read the existing screen `src/app/(client)/app/page.tsx` and check for a co-located test (`ls "src/app/(client)/app/"`). As of Plan 07 there is **no** co-located unit test for that page — it is a server component that queries the DB and is proven by the `/app` theme e2e (`e2e/theme.spec.ts`) plus `next build`. So the regression proof is: (1) `next build` still succeeds with the new `layout.tsx` in the subtree (the page renders behind the guard with no static-prerender attempt, since `getCurrentUser` reads `cookies()` and opts the subtree out), and (2) the `/app` theme e2e still passes. If a co-located `page.test.tsx` exists by the time this runs, run it instead/as well.

  ```bash
  pnpm build
  pnpm dotenv -e .env.local -- pnpm exec playwright test e2e/theme.spec.ts
  ```

  Expected: build succeeds; the `/app` theme spec is green — the guard + redirect adds an auth gate without changing the screen's rendered output for an authed session.

- [ ] **Step 5: Typecheck.**

```bash
pnpm typecheck
```

Expected: no errors. (`getCurrentUser` from `session.ts` and `clientProfiles` from schema both exist from earlier tasks.)

- [ ] **Step 6: Lint + format check + design gate.**

```bash
pnpm lint && pnpm format:check && pnpm check:design
```

Expected: clean. (The guard renders no `sq-*` classes, so the design gate is unaffected — but run it since a new file under `app/(client)` landed.)

- [ ] **Step 7: Full unit suite (regression).**

```bash
pnpm test
```

Expected: green — the new `app/(client)/app/layout.tsx` is server-only and not exercised by unit tests; `bootstrap.integration.test.ts` is excluded from the unit config.

- [ ] **Step 8: Commit.**

```bash
git add src/lib/auth/bootstrap.ts src/lib/auth/bootstrap.integration.test.ts "src/app/(client)/app/layout.tsx"
git commit -m "feat(auth): lazy client-profile bootstrap + /app server guard

ensureClientProfile inserts the client-surface marker idempotently
(onConflictDoNothing on the PK). app/(client)/app/layout.tsx resolves the
session via getCurrentUser(), redirects anon to /signin (defense-in-depth
behind the proxy), and is the single place the marker is created. Integration
test proves the trigger seeds profiles and bootstrap is idempotent."
```

---

## Task 10 — Browser auth client + wire the `(auth)` screens

This task adds the vendor-free browser helper `src/lib/auth/client.ts`, swaps the three screens from `router.push`-only to real `/api/v1/auth/*` calls, adds an in-app sign-out control on the client Topbar, adds the `/forgot` stub, and updates the existing screen tests. Phone/social/verify stay inert (§6, §10). The browser **never** imports `@supabase/*`.

> Prereq: Tasks 1-9 have landed `src/lib/auth/{errors,schemas,web-session,session,bootstrap}.ts`, the four `/api/v1/auth/*` route handlers, and `src/proxy.ts`. This task only touches the browser/client surface.

- [ ] **Step 1: Write the failing test for the browser auth client.**

  Create `src/lib/auth/client.test.ts`. It mocks `global.fetch` (no jsdom needed — `authClient` is plain `fetch`), and pins the contract: correct URL/method/body, the `x-squad-csrf: "1"` header, `credentials: "same-origin"`, our typed `AuthClientError(code,status)` on `!ok`, and the parsed `user` on success.

  ```ts
  import { afterEach, describe, expect, it, vi } from "vitest";
  import { AuthClientError, authClient } from "./client";

  const fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);

  function ok(body: unknown) {
    return { ok: true, status: 200, json: async () => body } as Response;
  }
  function fail(status: number, body: unknown) {
    return { ok: false, status, json: async () => body } as Response;
  }

  afterEach(() => {
    fetchMock.mockReset();
  });

  describe("authClient", () => {
    it("POSTs signup with the CSRF header and returns the user", async () => {
      fetchMock.mockResolvedValueOnce(ok({ user: { id: "u1", email: "a@b.co" } }));

      const user = await authClient.signUp({
        email: "a@b.co",
        password: "password1",
        fullName: "Aysel M",
        displayName: null,
      });

      expect(user).toEqual({ id: "u1", email: "a@b.co" });
      const [url, init] = fetchMock.mock.calls[0];
      expect(url).toBe("/api/v1/auth/signup");
      expect(init.method).toBe("POST");
      expect(init.credentials).toBe("same-origin");
      expect(init.headers["content-type"]).toBe("application/json");
      expect(init.headers["x-squad-csrf"]).toBe("1");
      expect(JSON.parse(init.body)).toEqual({
        email: "a@b.co",
        password: "password1",
        fullName: "Aysel M",
        displayName: null,
      });
    });

    it("POSTs signin with the remember flag and returns the user", async () => {
      fetchMock.mockResolvedValueOnce(ok({ user: { id: "u2", email: "c@d.co" } }));

      const user = await authClient.signIn({ email: "c@d.co", password: "password1", remember: false });

      expect(user).toEqual({ id: "u2", email: "c@d.co" });
      const [url, init] = fetchMock.mock.calls[0];
      expect(url).toBe("/api/v1/auth/signin");
      expect(JSON.parse(init.body)).toEqual({ email: "c@d.co", password: "password1", remember: false });
    });

    it("POSTs signout and resolves", async () => {
      fetchMock.mockResolvedValueOnce(ok({ ok: true }));
      await expect(authClient.signOut()).resolves.toBeUndefined();
      expect(fetchMock.mock.calls[0][0]).toBe("/api/v1/auth/signout");
      expect(fetchMock.mock.calls[0][1].method).toBe("POST");
    });

    it("GETs the session (no CSRF header on the read) and returns user|null", async () => {
      fetchMock.mockResolvedValueOnce(ok({ user: { id: "u3", email: "e@f.co" } }));
      const a = await authClient.session();
      expect(a).toEqual({ id: "u3", email: "e@f.co" });

      fetchMock.mockResolvedValueOnce(ok({ user: null }));
      const b = await authClient.session();
      expect(b).toBeNull();

      const [url, init] = fetchMock.mock.calls[1];
      expect(url).toBe("/api/v1/auth/session");
      expect(init.method).toBe("GET");
    });

    it("throws AuthClientError(code,status) on a non-ok response", async () => {
      fetchMock.mockResolvedValueOnce(
        fail(409, { error: { code: "EMAIL_TAKEN", message: "That email is already registered." } }),
      );
      await expect(
        authClient.signUp({ email: "a@b.co", password: "password1", fullName: "X", displayName: null }),
      ).rejects.toMatchObject({ code: "EMAIL_TAKEN", status: 409 });
    });

    it("falls back to UNEXPECTED/status when the error envelope is missing", async () => {
      fetchMock.mockResolvedValueOnce({ ok: false, status: 502, json: async () => ({}) } as Response);
      await expect(authClient.signOut()).rejects.toMatchObject({ code: "UNEXPECTED", status: 502 });
    });
  });
  ```

  Run it and watch it fail (module missing):

  ```bash
  pnpm vitest run src/lib/auth/client.test.ts
  ```

  Expected: `Failed to resolve import "./client"` / suite red.

- [ ] **Step 2: Implement `src/lib/auth/client.ts` (browser, no vendor import).**

  Create `src/lib/auth/client.ts`. Note: **no `import "server-only"`** here — this is the one `lib/auth` file the browser imports. It imports nothing vendor-shaped; it speaks only to our `/api/v1/auth/*` envelope. Types are duplicated locally (a one-line `AuthUser` shape) rather than imported from `./types` so a bundler can never pull a server file into the client graph.

  ```ts
  // Browser-safe auth client. The ONLY lib/auth module the browser imports.
  // It speaks to OUR /api/v1/auth/* endpoints over fetch — never @supabase/*.
  // Every mutation carries x-squad-csrf:"1" (the custom-header half of the CSRF
  // gate, §7) and same-origin credentials so the httpOnly session cookie rides along.

  export type AuthUser = { id: string; email: string };

  export class AuthClientError extends Error {
    constructor(
      public code: string,
      public status: number,
    ) {
      super(code);
      this.name = "AuthClientError";
    }
  }

  type SignUpInput = { email: string; password: string; fullName: string; displayName?: string | null };
  type SignInInput = { email: string; password: string; remember: boolean };

  async function post<T>(path: string, body: unknown): Promise<T> {
    const res = await fetch(path, {
      method: "POST",
      credentials: "same-origin",
      headers: { "content-type": "application/json", "x-squad-csrf": "1" },
      body: JSON.stringify(body),
    });
    return parse<T>(res);
  }

  async function parse<T>(res: Response): Promise<T> {
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      const code = (data as { error?: { code?: string } } | null)?.error?.code ?? "UNEXPECTED";
      throw new AuthClientError(code, res.status);
    }
    return data as T;
  }

  export const authClient = {
    async signUp(input: SignUpInput): Promise<AuthUser> {
      const { user } = await post<{ user: AuthUser }>("/api/v1/auth/signup", input);
      return user;
    },
    async signIn(input: SignInInput): Promise<AuthUser> {
      const { user } = await post<{ user: AuthUser }>("/api/v1/auth/signin", input);
      return user;
    },
    async signOut(): Promise<void> {
      await post<{ ok: true }>("/api/v1/auth/signout", {});
    },
    async session(): Promise<AuthUser | null> {
      const res = await fetch("/api/v1/auth/session", {
        method: "GET",
        credentials: "same-origin",
      });
      const { user } = await parse<{ user: AuthUser | null }>(res);
      return user;
    },
  };
  ```

  Run the test green:

  ```bash
  pnpm vitest run src/lib/auth/client.test.ts
  ```

  Expected: all 6 cases pass.

- [ ] **Step 3: Update the signup screen test for the new async submit + error path.**

  The screen now calls `authClient.signUp` and pushes `/intent` only on success; on failure it renders an inline error. Replace the submit assertion in `src/app/(auth)/signup/signup.test.tsx`. Mock `authClient` (the screen imports it). Keep the title + phone-toggle cases unchanged; keep phone/social inert.

  Replace the imports/mocks block and the submit `it(...)` with:

  ```ts
  // @vitest-environment jsdom
  import "@testing-library/jest-dom/vitest";
  import { fireEvent, render, screen, waitFor } from "@testing-library/react";
  import { beforeEach, describe, expect, it, vi } from "vitest";

  const push = vi.fn();
  vi.mock("next/navigation", () => ({
    useRouter: () => ({ push, back: vi.fn() }),
  }));
  vi.mock("next/link", () => ({
    default: ({ children, href }: { children: React.ReactNode; href: string }) => (
      <a href={href}>{children}</a>
    ),
  }));

  const signUp = vi.fn();
  vi.mock("@/lib/auth/client", () => ({
    AuthClientError: class AuthClientError extends Error {
      constructor(
        public code: string,
        public status: number,
      ) {
        super(code);
      }
    },
    authClient: { signUp: (...a: unknown[]) => signUp(...a) },
  }));

  import { AuthClientError } from "@/lib/auth/client";
  import SignUpPage from "./page";

  describe("SignUpPage", () => {
    beforeEach(() => {
      push.mockClear();
      signUp.mockReset();
    });

    it("renders the title", () => {
      render(<SignUpPage />);
      expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Create your account");
    });

    it("swaps the email body for the phone field when Phone is selected", () => {
      render(<SignUpPage />);
      expect(screen.getByLabelText("Password")).toBeInTheDocument();
      expect(screen.queryByLabelText("Phone number")).not.toBeInTheDocument();

      fireEvent.click(screen.getByRole("button", { name: /phone/i }));

      expect(screen.getByLabelText("Phone number")).toBeInTheDocument();
      expect(screen.queryByLabelText("Password")).not.toBeInTheDocument();
    });

    it("calls authClient.signUp and pushes /intent on success", async () => {
      signUp.mockResolvedValueOnce({ id: "u1", email: "a@b.co" });
      render(<SignUpPage />);

      fireEvent.change(screen.getByLabelText("Full name"), { target: { value: "Aysel M" } });
      fireEvent.change(screen.getByLabelText("Email"), { target: { value: "a@b.co" } });
      fireEvent.change(screen.getByLabelText("Password"), { target: { value: "password1" } });
      fireEvent.click(screen.getByRole("button", { name: /create account/i }));

      await waitFor(() => expect(push).toHaveBeenCalledWith("/intent"));
      expect(signUp).toHaveBeenCalledWith({
        email: "a@b.co",
        password: "password1",
        fullName: "Aysel M",
        displayName: null,
      });
    });

    it("shows an inline error and does not navigate when signUp fails", async () => {
      signUp.mockRejectedValueOnce(new AuthClientError("EMAIL_TAKEN", 409));
      render(<SignUpPage />);

      fireEvent.change(screen.getByLabelText("Full name"), { target: { value: "Aysel M" } });
      fireEvent.change(screen.getByLabelText("Email"), { target: { value: "a@b.co" } });
      fireEvent.change(screen.getByLabelText("Password"), { target: { value: "password1" } });
      fireEvent.click(screen.getByRole("button", { name: /create account/i }));

      expect(await screen.findByRole("alert")).toHaveTextContent(/already registered/i);
      expect(push).not.toHaveBeenCalled();
    });

    it("the phone tab submit stays inert (navigates to /verify, no auth call)", () => {
      render(<SignUpPage />);
      fireEvent.click(screen.getByRole("button", { name: /phone/i }));
      fireEvent.click(screen.getByRole("button", { name: /send code/i }));
      expect(signUp).not.toHaveBeenCalled();
      expect(push).toHaveBeenCalledWith("/verify?flow=signup");
    });
  });
  ```

  Run it red (page not wired yet):

  ```bash
  pnpm vitest run src/app/(auth)/signup/signup.test.tsx
  ```

  Expected: the two new cases fail (no `authClient` call, no `alert`).

- [ ] **Step 4: Wire `src/app/(auth)/signup/page.tsx` email submit to `authClient.signUp`.**

  Add an inline error map + `submitting` state; keep the phone branch navigation-only. Edit only the import block, the component state/handler, and the error/button region. Replace lines around the imports first:

  ```ts
  import { useState, type CSSProperties } from "react";
  import { useRouter } from "next/navigation";
  import Link from "next/link";
  import { Icon } from "@/components/ui/icon";
  import { AuField } from "@/components/auth/auth-field";
  import { AuButton } from "@/components/auth/auth-button";
  import { AuthScreen } from "@/components/auth/auth-screen";
  import { PhoneField } from "@/components/auth/phone-field";
  import { MethodTabs, type AuthMethod } from "@/components/auth/method-tabs";
  import { BackButton } from "@/components/auth/back-button";
  import { Divider } from "@/components/auth/divider";
  import { SocialRow } from "@/components/auth/social-row";
  import { AuthClientError, authClient } from "@/lib/auth/client";
  ```

  Add the shared error-copy map just below the `revealBtnStyle` const (above `export default function`):

  ```ts
  // Inline, non-leaky messages keyed on our error envelope `code` (§3). Default is
  // generic so a vendor message never reaches the UI.
  const SIGNUP_ERRORS: Record<string, string> = {
    EMAIL_TAKEN: "That email is already registered. Try signing in.",
    WEAK_PASSWORD: "Use at least 8 characters for your password.",
    INVALID_INPUT: "Check your details and try again.",
    RATE_LIMITED: "Too many attempts. Wait a moment and try again.",
  };
  ```

  Replace the component's state + `submit` with the async version:

  ```ts
  export default function SignUpPage() {
    const router = useRouter();
    const [method, setMethod] = useState<AuthMethod>("email");
    const [fullName, setFullName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [phone, setPhone] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function submit() {
      if (method !== "email") {
        router.push("/verify?flow=signup"); // phone tab stays inert this plan
        return;
      }
      setError(null);
      setSubmitting(true);
      try {
        await authClient.signUp({ email, password, fullName, displayName: null });
        router.push("/intent");
      } catch (e) {
        const code = e instanceof AuthClientError ? e.code : "UNEXPECTED";
        setError(SIGNUP_ERRORS[code] ?? "Something went wrong. Try again.");
        setSubmitting(false);
      }
    }
  ```

  Then add the error region + wire the button. Replace the existing CTA block:

  ```tsx
        <div style={{ flex: 1, minHeight: 16 }} />

        {error && (
          <p
            role="alert"
            style={{
              margin: "0 0 12px",
              fontFamily: "var(--font-body)",
              fontSize: 13,
              color: "var(--error-text)",
            }}
          >
            {error}
          </p>
        )}

        <div style={{ marginBottom: 16 }}>
          <AuButton trailingArrow onClick={submit} disabled={submitting}>
            {method === "email" ? "Create account" : "Send code"}
          </AuButton>
        </div>
  ```

  > If `AuButton` does not yet accept a `disabled` prop, add `disabled?: boolean` to its props and forward it to the underlying `<button disabled={disabled}>` in `src/components/auth/auth-button.tsx` (a one-line passthrough; mirror the existing prop spread).

  Run the test green:

  ```bash
  pnpm vitest run src/app/(auth)/signup/signup.test.tsx
  ```

  Expected: all 5 cases pass.

- [ ] **Step 5: Update the signin screen test (remember wired, Forgot href, error path).**

  Rewrite `src/app/(auth)/signin/signin.test.tsx`: success pushes `/app` and forwards `remember`; failure renders `role="alert"`; the "Forgot?" link points at `/forgot`; phone/social inert.

  ```ts
  // @vitest-environment jsdom
  import "@testing-library/jest-dom/vitest";
  import { fireEvent, render, screen, waitFor } from "@testing-library/react";
  import { beforeEach, describe, expect, it, vi } from "vitest";

  const push = vi.fn();
  vi.mock("next/navigation", () => ({
    useRouter: () => ({ push, back: vi.fn() }),
  }));
  vi.mock("next/link", () => ({
    default: ({ children, href }: { children: React.ReactNode; href: string }) => (
      <a href={href}>{children}</a>
    ),
  }));

  const signIn = vi.fn();
  vi.mock("@/lib/auth/client", () => ({
    AuthClientError: class AuthClientError extends Error {
      constructor(
        public code: string,
        public status: number,
      ) {
        super(code);
      }
    },
    authClient: { signIn: (...a: unknown[]) => signIn(...a) },
  }));

  import { AuthClientError } from "@/lib/auth/client";
  import SignInPage from "./page";

  describe("SignInPage", () => {
    beforeEach(() => {
      push.mockClear();
      signIn.mockReset();
    });

    it("renders the title", () => {
      render(<SignInPage />);
      expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Welcome back");
    });

    it("swaps the email body for the phone field when Phone is selected", () => {
      render(<SignInPage />);
      expect(screen.getByLabelText("Password")).toBeInTheDocument();
      expect(screen.queryByLabelText("Phone number")).not.toBeInTheDocument();

      fireEvent.click(screen.getByRole("button", { name: /phone/i }));

      expect(screen.getByLabelText("Phone number")).toBeInTheDocument();
      expect(screen.queryByLabelText("Password")).not.toBeInTheDocument();
    });

    it("the Forgot link points at /forgot", () => {
      render(<SignInPage />);
      expect(screen.getByRole("link", { name: /forgot/i })).toHaveAttribute("href", "/forgot");
    });

    it("calls authClient.signIn with remember and pushes /app on success", async () => {
      signIn.mockResolvedValueOnce({ id: "u2", email: "c@d.co" });
      render(<SignInPage />);

      fireEvent.change(screen.getByLabelText("Email"), { target: { value: "c@d.co" } });
      fireEvent.change(screen.getByLabelText("Password"), { target: { value: "password1" } });
      fireEvent.click(screen.getByRole("button", { name: /log in/i }));

      await waitFor(() => expect(push).toHaveBeenCalledWith("/app"));
      // "Stay signed in" defaults checked → remember:true forwarded.
      expect(signIn).toHaveBeenCalledWith({ email: "c@d.co", password: "password1", remember: true });
    });

    it("forwards remember:false when the toggle is turned off", async () => {
      signIn.mockResolvedValueOnce({ id: "u2", email: "c@d.co" });
      render(<SignInPage />);

      fireEvent.click(screen.getByRole("switch", { name: /stay signed in/i }));
      fireEvent.change(screen.getByLabelText("Email"), { target: { value: "c@d.co" } });
      fireEvent.change(screen.getByLabelText("Password"), { target: { value: "password1" } });
      fireEvent.click(screen.getByRole("button", { name: /log in/i }));

      await waitFor(() => expect(signIn).toHaveBeenCalledWith({
        email: "c@d.co",
        password: "password1",
        remember: false,
      }));
    });

    it("shows an inline error and does not navigate on bad credentials", async () => {
      signIn.mockRejectedValueOnce(new AuthClientError("INVALID_CREDENTIALS", 401));
      render(<SignInPage />);

      fireEvent.change(screen.getByLabelText("Email"), { target: { value: "c@d.co" } });
      fireEvent.change(screen.getByLabelText("Password"), { target: { value: "wrong" } });
      fireEvent.click(screen.getByRole("button", { name: /log in/i }));

      expect(await screen.findByRole("alert")).toHaveTextContent(/email or password/i);
      expect(push).not.toHaveBeenCalled();
    });
  });
  ```

  > Verified against `src/components/auth/remember-toggle.tsx`: it renders `<button role="switch" aria-labelledby={labelledBy}>` and the signin page passes `labelledBy="remember-label"` for the visible "Stay signed in" span, so `getByRole("switch", { name: /stay signed in/i })` resolves it (the accessible name comes from `#remember-label`). The signin page initializes `const [remember, setRemember] = useState(true)`, so the toggle defaults **checked** (`aria-checked="true"`) → the success case forwards `remember: true`, and clicking the switch once flips it to `remember: false` (the "turned off" case). This query/state pairing is pinned to the actual component — no runtime adjustment needed.

  Run red:

  ```bash
  pnpm vitest run src/app/(auth)/signin/signin.test.tsx
  ```

  Expected: the four new cases fail.

- [ ] **Step 6: Wire `src/app/(auth)/signin/page.tsx`.**

  Add the client import, error map, async submit forwarding `remember`, the error region, and fix the "Forgot?" href. Replace the import block:

  ```ts
  import { useState, type CSSProperties } from "react";
  import { useRouter } from "next/navigation";
  import Link from "next/link";
  import { Icon } from "@/components/ui/icon";
  import { AuField } from "@/components/auth/auth-field";
  import { AuButton } from "@/components/auth/auth-button";
  import { AuthScreen } from "@/components/auth/auth-screen";
  import { PhoneField } from "@/components/auth/phone-field";
  import { MethodTabs, type AuthMethod } from "@/components/auth/method-tabs";
  import { BackButton } from "@/components/auth/back-button";
  import { RememberToggle } from "@/components/auth/remember-toggle";
  import { Divider } from "@/components/auth/divider";
  import { SocialRow } from "@/components/auth/social-row";
  import { AuthClientError, authClient } from "@/lib/auth/client";
  ```

  Add the error map below `revealBtnStyle`:

  ```ts
  // Generic on the credential path: never reveal whether the email exists (§3).
  const SIGNIN_ERRORS: Record<string, string> = {
    INVALID_CREDENTIALS: "That email or password doesn't match our records.",
    INVALID_INPUT: "Check your details and try again.",
    RATE_LIMITED: "Too many attempts. Wait a moment and try again.",
  };
  ```

  Replace the state + `submit`:

  ```ts
  export default function SignInPage() {
    const router = useRouter();
    const [method, setMethod] = useState<AuthMethod>("email");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [phone, setPhone] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [remember, setRemember] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function submit() {
      if (method !== "email") {
        router.push("/verify?flow=signin"); // phone tab stays inert this plan
        return;
      }
      setError(null);
      setSubmitting(true);
      try {
        await authClient.signIn({ email, password, remember });
        router.push("/app");
      } catch (e) {
        const code = e instanceof AuthClientError ? e.code : "UNEXPECTED";
        setError(SIGNIN_ERRORS[code] ?? "Something went wrong. Try again.");
        setSubmitting(false);
      }
    }
  ```

  Fix the "Forgot?" link target (`/signin` → `/forgot`):

  ```tsx
              <Link className="au-link" href="/forgot" style={{ fontSize: 13 }}>
                Forgot?
              </Link>
  ```

  Replace the CTA block to add the error region + disabled state:

  ```tsx
        <div style={{ flex: 1, minHeight: 24 }} />

        {error && (
          <p
            role="alert"
            style={{
              margin: "0 0 12px",
              fontFamily: "var(--font-body)",
              fontSize: 13,
              color: "var(--error-text)",
            }}
          >
            {error}
          </p>
        )}

        <div style={{ marginBottom: 16 }}>
          <AuButton trailingArrow onClick={submit} disabled={submitting}>
            {method === "email" ? "Log in" : "Send code"}
          </AuButton>
        </div>
  ```

  Run green:

  ```bash
  pnpm vitest run src/app/(auth)/signin/signin.test.tsx
  ```

  Expected: all 6 cases pass.

- [ ] **Step 7: Write the failing boot-page test (session probe replaces the timer).**

  Boot now calls `authClient.session()`: a present user → `router.replace("/app")`, else `/welcome`. Create `src/app/(auth)/boot/boot.test.tsx`.

  ```ts
  // @vitest-environment jsdom
  import "@testing-library/jest-dom/vitest";
  import { render, screen, waitFor } from "@testing-library/react";
  import { beforeEach, describe, expect, it, vi } from "vitest";

  const replace = vi.fn();
  vi.mock("next/navigation", () => ({
    useRouter: () => ({ replace, push: vi.fn() }),
  }));

  const session = vi.fn();
  vi.mock("@/lib/auth/client", () => ({
    authClient: { session: () => session() },
  }));

  import BootPage from "./page";

  describe("BootPage", () => {
    beforeEach(() => {
      replace.mockClear();
      session.mockReset();
    });

    it("shows the warming-up eyebrow while probing", () => {
      session.mockReturnValue(new Promise(() => {})); // never resolves
      render(<BootPage />);
      expect(screen.getByText("Warming up the pitch")).toBeInTheDocument();
    });

    it("replaces to /app when a session is present", async () => {
      session.mockResolvedValueOnce({ id: "u1", email: "a@b.co" });
      render(<BootPage />);
      await waitFor(() => expect(replace).toHaveBeenCalledWith("/app"));
    });

    it("replaces to /welcome when there is no session", async () => {
      session.mockResolvedValueOnce(null);
      render(<BootPage />);
      await waitFor(() => expect(replace).toHaveBeenCalledWith("/welcome"));
    });

    it("falls back to /welcome if the probe throws", async () => {
      session.mockRejectedValueOnce(new Error("network"));
      render(<BootPage />);
      await waitFor(() => expect(replace).toHaveBeenCalledWith("/welcome"));
    });
  });
  ```

  Run red:

  ```bash
  pnpm vitest run src/app/(auth)/boot/boot.test.tsx
  ```

  Expected: the navigation cases fail (still on the timer).

- [ ] **Step 8: Wire `src/app/(auth)/boot/page.tsx` to the real session check.**

  Replace the timeout effect with the probe; keep the visual block untouched. Replace the top of the file (imports + component start through the effect):

  ```ts
  "use client";

  import { useEffect } from "react";
  import { useRouter } from "next/navigation";
  import { authClient } from "@/lib/auth/client";

  // Boot / splash (artboard 01). Ports `B_Boot`: a centered stacked logo with the
  // clay drop-shadow, an indeterminate `.boot-mat` shuttle, and the "Warming up the
  // pitch" eyebrow. The phone-frame wrapper is dropped — the `(auth)` layout owns the
  // mobile column and the warm-linen surface. The single cold-start decision: probe
  // the session and replace() to /app (authed) or /welcome (anon). On any probe
  // failure we fall to /welcome — boot must never strand the user on the splash.
  export default function BootPage() {
    const router = useRouter();

    useEffect(() => {
      let cancelled = false;
      authClient
        .session()
        .then((user) => {
          if (cancelled) return;
          router.replace(user ? "/app" : "/welcome");
        })
        .catch(() => {
          if (!cancelled) router.replace("/welcome");
        });
      return () => {
        cancelled = true;
      };
    }, [router]);
  ```

  (The returned JSX block stays exactly as-is.)

  Run green:

  ```bash
  pnpm vitest run src/app/(auth)/boot/boot.test.tsx
  ```

  Expected: all 4 cases pass.

- [ ] **Step 8b: Update the existing boot e2e case for the new redirect behavior.**

  Boot no longer waits on a ~1600ms timer — it probes the session and `router.replace`s immediately. The existing `e2e/auth.spec.ts` boot case asserts the "Warming up the pitch" eyebrow under `waitUntil: "commit"`, which races the now-immediate anon redirect to `/welcome` and will flake/fail. Replace that single case to assert the redirect outcome instead. In `e2e/auth.spec.ts`, replace:

  ```ts
  test("boot shows the warming-up eyebrow before it redirects", async ({ page }) => {
    await page.goto("/boot", { waitUntil: "commit" });
    await expect(page.getByText("Warming up the pitch")).toBeVisible();
  });
  ```

  with:

  ```ts
  test("boot redirects an anonymous visitor to /welcome", async ({ page }) => {
    // Boot probes the session (authClient.session()) and replace()s immediately —
    // anon → /welcome. The old eyebrow-before-timer assertion raced this redirect.
    await page.goto("/boot");
    await expect(page).toHaveURL(/\/welcome$/);
  });
  ```

  Also update the file's header comment that still describes the timer — replace the lines:

  ```ts
  // Each route + a stable bit of copy that proves the screen rendered. `/boot`
  // auto-redirects to `/welcome` after ~1.6s, so assert its eyebrow before the push
  // lands (waitUntil "commit" returns as soon as the response starts, beating the timer).
  ```

  with:

  ```ts
  // Each route + a stable bit of copy that proves the screen rendered. `/boot` now
  // probes the session on mount and redirects immediately (anon → /welcome), so its
  // case asserts the redirect outcome rather than racing a timer for the eyebrow.
  ```

  This must land in Task 10 (before the Definition-of-Done full Playwright run), so the existing screen e2e stays green once boot is rewired.

- [ ] **Step 9: Add the `/forgot` UI-only stub.**

  Create `src/app/(auth)/forgot/page.tsx` — a SQUAD-styled placeholder (password reset is a deferred seam, §10). Mirrors the signin header/title idiom; the submit does nothing live (no email round-trip wired). Reuses `AuField`/`AuButton`/`AuthScreen`/`BackButton`.

  ```tsx
  "use client";

  import { useState, type CSSProperties } from "react";
  import { useRouter } from "next/navigation";
  import Link from "next/link";
  import { AuField } from "@/components/auth/auth-field";
  import { AuButton } from "@/components/auth/auth-button";
  import { AuthScreen } from "@/components/auth/auth-screen";
  import { BackButton } from "@/components/auth/back-button";

  // Forgot password — UI-only stub (deferred seam, §10). No email round-trip is
  // wired this plan; the CTA shows a static confirmation so the screen reads as
  // complete without sending anything. Reset will land with its own plan.
  const titleStyle: CSSProperties = {
    margin: 0,
    fontFamily: "var(--font-sans)",
    fontWeight: 800,
    fontSize: 34,
    lineHeight: 1.04,
    letterSpacing: "-0.02em",
    color: "var(--steel-700)",
  };

  const subStyle: CSSProperties = {
    margin: "0 0 22px",
    fontFamily: "var(--font-body)",
    fontSize: 15,
    color: "var(--steel-500)",
  };

  export default function ForgotPage() {
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [sent, setSent] = useState(false);

    return (
      <AuthScreen padding="64px 26px 30px">
        <BackButton onClick={() => router.push("/signin")} />

        <h1 style={{ ...titleStyle, marginTop: 26, marginBottom: 6 }}>Reset your password</h1>
        <p style={subStyle}>Enter your email and we&apos;ll send reset steps.</p>

        <AuField
          label="Email"
          icon="mail"
          type="email"
          value={email}
          onChange={setEmail}
          placeholder="you@email.com"
          autoComplete="email"
        />

        <div style={{ flex: 1, minHeight: 24 }} />

        {sent && (
          <p
            role="status"
            style={{
              margin: "0 0 12px",
              fontFamily: "var(--font-body)",
              fontSize: 13,
              color: "var(--steel-500)",
            }}
          >
            If that email exists, reset steps are on the way.
          </p>
        )}

        <div style={{ marginBottom: 16 }}>
          <AuButton trailingArrow onClick={() => setSent(true)}>
            Send reset link
          </AuButton>
        </div>
        <div className="au-foot au-foot-light">
          Remembered it?{" "}
          <Link className="au-link" href="/signin">
            Log in
          </Link>
        </div>
      </AuthScreen>
    );
  }
  ```

  Smoke-check it compiles via typecheck (run at the end of the task).

- [ ] **Step 10: Add the in-app sign-out control on the client Topbar.**

  The client layout's Topbar `actions` currently holds only `<ThemeToggle />`. Add a small client-component sign-out button beside it: `authClient.signOut()` → `router.replace("/welcome")`. Because `ClientLayout` is a server component, the button must be its own `"use client"` file.

  Create `src/components/auth/sign-out-button.tsx`:

  ```tsx
  "use client";

  import { useState } from "react";
  import { useRouter } from "next/navigation";
  import { Icon } from "@/components/ui/icon";
  import { authClient } from "@/lib/auth/client";

  // In-app sign-out (§6). Lives in the client Topbar actions. Clears the session
  // cookie via /api/v1/auth/signout, then replaces to /welcome so back-nav can't
  // return to an authed screen.
  export function SignOutButton() {
    const router = useRouter();
    const [busy, setBusy] = useState(false);

    async function signOut() {
      setBusy(true);
      try {
        await authClient.signOut();
      } finally {
        router.replace("/welcome");
      }
    }

    return (
      <button
        type="button"
        onClick={signOut}
        disabled={busy}
        aria-label="Sign out"
        className="sq-icon-btn"
      >
        <Icon name="logout" size={22} />
      </button>
    );
  }
  ```

  > `logout` is a new icon. Per the two-step icon workflow (CLAUDE.md): add `logout` to `src/styles/squad/icon-inventory.txt` **and** `src/lib/ui/icon-names.ts` (`ICON_NAMES`), then run `pnpm sync:design --icons`. Do that before relying on it; the parity test gates this. If `sq-icon-btn` is not an existing utility, mirror `ThemeToggle`'s wrapper/classNames instead (read `src/components/ui/theme-toggle.tsx`).

  Wire it into `src/app/(client)/layout.tsx` — extend the import and the Topbar `actions`:

  ```tsx
  import Image from "next/image";
  import { Tabbar, type TabItem } from "@/components/ui/tabbar";
  import { ThemeToggle } from "@/components/ui/theme-toggle";
  import { Topbar } from "@/components/ui/topbar";
  import { SignOutButton } from "@/components/auth/sign-out-button";
  ```

  ```tsx
        <Topbar
          rule
          leading={
            <Image src="/squad_logo_horizontal.png" alt="SQUAD" width={96} height={24} priority />
          }
          actions={
            <div className="flex items-center gap-s1">
              <ThemeToggle />
              <SignOutButton />
            </div>
          }
        />
  ```

- [ ] **Step 11: Add the icon to the inventory + names (two-step) and re-sync.**

  ```bash
  pnpm sync:design --icons
  pnpm vitest run src/lib/ui/icon-names.test.ts
  ```

  Expected: icon parity test passes (`logout` present in both inventory and `ICON_NAMES`). Skip the `sync` step only if `logout` already exists in the inventory.

- [ ] **Step 12: Typecheck, lint, format, design-gate the whole change.**

  ```bash
  pnpm typecheck
  pnpm lint
  pnpm format:check
  pnpm check:design
  pnpm vitest run src/lib/auth/client.test.ts "src/app/(auth)"
  ```

  Expected: typecheck clean; lint clean; prettier reports no changes; `check:design` passes (no hand-written `sq-*` in screen code — the Topbar action uses `SignOutButton`, the screens use `var(--…)` tokens already established by Plan 07); all screen + client tests green.

- [ ] **Step 13: Commit.**

  ```bash
  git add -A && git commit -m "feat(auth): wire (auth) screens + browser authClient to /api/v1/auth/*

  - add src/lib/auth/client.ts (browser, no vendor import; x-squad-csrf header)
  - signup -> authClient.signUp -> /intent; inline error map
  - signin -> authClient.signIn(remember) -> /app; Forgot -> /forgot; remember wired
  - boot -> authClient.session() -> /app | /welcome (replaces the timer)
  - in-app SignOutButton on the client Topbar
  - /forgot UI-only stub (reset deferred)
  - phone/social/verify stay inert

  Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
  ```

---

## Task 11 — Migration 0005: idempotent `handle_new_user` + trigger-idempotency integration test

Make `private.handle_new_user()` re-fire-safe with `ON CONFLICT (id) DO NOTHING` (§13). Hand-author the SQL (drizzle-kit RLS-ordering caveat in project memory). Prove it with an integration test that fires the trigger twice for the same auth user and asserts exactly one `profiles` row.

- [ ] **Step 1: Write the failing trigger-idempotency integration test.**

  Create `src/lib/auth/trigger.integration.test.ts`. It inserts into `auth.users` (firing `on_auth_user_created` → the real `private.handle_new_user`), then replays the trigger body's insert **inline** a second time for the same row — the spec-sanctioned "re-run the literal insert inline" path — so **no** test-only function lands in the migration. Two assertions encode the contract: (1) replaying the insert **without** `ON CONFLICT` raises a duplicate-key error (this is the pre-0005 behavior — the proof the conflict is real), and (2) replaying it **with** `ON CONFLICT (id) DO NOTHING` (the 0005 body) leaves exactly one `profiles` row with the original `full_name` preserved. Mirrors the `createAuthUser`/`client` idioms from `rls.integration.test.ts`.

  ```ts
  import { afterAll, describe, expect, it } from "vitest";
  import { client } from "@/lib/db/client";
  import { newId } from "@/lib/db/id";

  afterAll(async () => {
    await client.end();
  });

  // Insert an auth user (fires on_auth_user_created → private.handle_new_user).
  async function insertAuthUser(id: string, fullName: string): Promise<void> {
    const email = `trig-${id}@example.com`;
    await client`
      insert into auth.users (instance_id, id, aud, role, email, raw_user_meta_data, created_at, updated_at)
      values ('00000000-0000-0000-0000-000000000000', ${id}, 'authenticated', 'authenticated',
              ${email}, ${JSON.stringify({ full_name: fullName, display_name: fullName })}::jsonb, now(), now())
    `;
  }

  describe("private.handle_new_user is idempotent on re-fire", () => {
    it("a re-fire WITHOUT on-conflict would 500 (the conflict is real)", async () => {
      const id = newId();
      await insertAuthUser(id, "Conflict Proof");

      // Replay the trigger body's insert verbatim but WITHOUT ON CONFLICT — this is
      // exactly what the pre-0005 function did on a re-fire. It must raise a
      // duplicate-key error, proving the idempotency clause is load-bearing.
      await expect(
        client`
          insert into public.profiles (id, full_name, display_name)
          select u.id,
                 coalesce(u.raw_user_meta_data ->> 'full_name', ''),
                 nullif(u.raw_user_meta_data ->> 'display_name', '')
          from auth.users u
          where u.id = ${id}
        `,
      ).rejects.toThrow();
    });

    it("a re-fire WITH on-conflict leaves exactly one profile, name preserved", async () => {
      const id = newId();
      await insertAuthUser(id, "Trigger Tester");

      // Replay the EXACT statement the 0005 function body runs (ON CONFLICT (id) DO
      // NOTHING) for the same row — the identity-link re-fire path (§13). It must be a
      // no-op that preserves the original profile.
      await client`
        insert into public.profiles (id, full_name, display_name)
        select u.id,
               coalesce(u.raw_user_meta_data ->> 'full_name', ''),
               nullif(u.raw_user_meta_data ->> 'display_name', '')
        from auth.users u
        where u.id = ${id}
        on conflict (id) do nothing
      `;

      const rows = await client<{ id: string; full_name: string }[]>`
        select id, full_name from public.profiles where id = ${id}
      `;
      expect(rows).toHaveLength(1);
      expect(rows[0].full_name).toBe("Trigger Tester");
    });
  });
  ```

  > The migration ships **no** test-only function (FIX 15). The test reproduces the trigger body's insert inline against the existing `auth.users` row: the first case proves a plain re-fire conflicts (the pre-0005 failure mode), the second proves the `ON CONFLICT (id) DO NOTHING` clause (the 0005 body) is idempotent. This mirrors the migration body verbatim — if the trigger body ever changes, update both, but no test-only DDL leaks into production.

  Run red (needs `.env.local` for the real DB):

  ```bash
  pnpm dotenv -e .env.local -- pnpm test:integration src/lib/auth/trigger.integration.test.ts
  ```

  Expected: the second case is **red before 0005** — until the migrated function (and the `profiles` PK it relies on) is in place the conflict path isn't asserting one stable row the way the shipped function will; it goes green once 0005 is applied (Step 3). The first case (plain re-fire 500s) passes immediately and stays green as the conflict proof.

- [ ] **Step 2: Hand-author migration `0005`.**

  Create `migrations/0005_handle_new_user_idempotent.sql`. It is **strictly** the `CREATE OR REPLACE` of the real function adding `ON CONFLICT (id) DO NOTHING`; keep `SECURITY DEFINER` + `SET search_path = ''`; keep the existing `on_auth_user_created` trigger (`CREATE OR REPLACE` re-points it automatically — no `DROP TRIGGER` needed). **No test-only function ships here** (FIX 15) — the trigger-idempotency test replays the insert inline (Step 1).

  ```sql
  -- Make private.handle_new_user() re-fire safe (design §13). Supabase can fire
  -- on_auth_user_created more than once on identity-link edge cases; a plain INSERT
  -- would surface as an opaque duplicate-key 500. ON CONFLICT (id) DO NOTHING makes
  -- the re-fire a no-op while preserving the original profile. The app guarantees a
  -- non-empty full_name (§3), so the COALESCE('') fallback never silently ships a
  -- nameless profile. SECURITY DEFINER + empty search_path are kept verbatim.
  --
  -- Hand-authored: drizzle-kit can't express this SECURITY DEFINER function, and its
  -- RLS-ordering pass is unreliable for trigger DDL (see project memory). CREATE OR
  -- REPLACE keeps the existing on_auth_user_created trigger pointed here. This file is
  -- ONLY the production function — no test-only helpers (the integration test replays
  -- the insert inline instead).
  CREATE OR REPLACE FUNCTION private.handle_new_user()
    RETURNS trigger
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = ''
  AS $$
  BEGIN
    INSERT INTO public.profiles (id, full_name, display_name)
    VALUES (NEW.id,
            COALESCE(NEW.raw_user_meta_data ->> 'full_name', ''),
            NULLIF(NEW.raw_user_meta_data ->> 'display_name', ''))
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
  END;
  $$;
  ```

- [ ] **Step 3: Apply the migration locally.**

  ```bash
  pnpm dotenv -e .env.local -- pnpm drizzle-kit migrate
  ```

  > `db:migrate` is not a real `package.json` script — drizzle-kit is invoked directly. Secondary fallback: `psql "$DATABASE_URL" -f migrations/0005_handle_new_user_idempotent.sql`.

  Expected: `0005_handle_new_user_idempotent.sql` reported applied.

- [ ] **Step 4: Run the integration test green.**

  ```bash
  pnpm dotenv -e .env.local -- pnpm test:integration src/lib/auth/trigger.integration.test.ts
  ```

  Expected: 2 passing — the plain re-fire 500s (conflict is real), and the `ON CONFLICT` re-fire leaves one `profiles` row with `full_name` preserved.

- [ ] **Step 5: Commit.**

  ```bash
  git add -A && git commit -m "feat(db): migration 0005 — handle_new_user ON CONFLICT (id) DO NOTHING

  - re-fire-safe signup trigger (identity-link edge case no longer 500s)
  - keeps SECURITY DEFINER + empty search_path; production function only (no test-only DDL)
  - trigger.integration.test replays the insert inline: plain re-fire 500s, ON CONFLICT leaves one row

  Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
  ```

---

## Task 12 — E2E golden-path auth + real-adapter contract integration test

Two proofs (§11.1, §11.6): a Playwright `e2e/auth-backend.spec.ts` that drives signup → `/app`, signin, signout, with the inert controls asserted non-navigating; and `src/lib/auth/supabase.contract.integration.test.ts` running the shared `runContract` against the real `SupabaseAuthProvider`.

- [ ] **Step 1: Write the real-adapter contract integration test (imports the shared `runContract`).**

  `runContract` was already authored and exported in Task 3 (`src/lib/auth/auth.contract.test.ts`) as the single source of truth — **do NOT redefine, replace, or re-author that file here.** This step only ADDS the integration file, which imports `runContract` and runs it against the real `SupabaseAuthProvider` with a unique email per run. Email confirmations are OFF for the demo (§9), so `signUp` returns a usable session and `signIn` works immediately.

  > Depends on Task 3 having landed `auth.contract.test.ts` with `export function runContract(name, make, email?)` (existing cases + signUp-with-meta + displayName-omitted + signOut-resolves, no immediate-revocation assertion) and `fake.ts`/`types.ts` carrying the locked `signUp(email,password,meta)` / `signOut(token)` signatures. If any of that is missing, that's a Task-3/4 gap — flag it, don't re-author the contract file here.

  Create `src/lib/auth/supabase.contract.integration.test.ts`:

  ```ts
  import { describe } from "vitest";
  import { config } from "@/lib/config";
  import { SupabaseAuthProvider } from "./supabase";
  import { runContract } from "./auth.contract.test";

  // Real Auth/Postgres run of the shared contract (§11.1). Needs the integration env
  // (real SUPABASE_URL + publishable/anon key, email confirmations OFF per §9). A
  // unique email BASE per run keeps reruns from colliding; runContract sub-addresses
  // it per case (a@… → contract-<ts>+meta@…) so the cases don't collide either.
  const emailBase = `contract-${Date.now()}@example.com`;

  describe("SupabaseAuthProvider (integration)", () => {
    runContract(
      "SupabaseAuthProvider",
      () => SupabaseAuthProvider.fromConfig(config.supabaseUrl, config.supabasePublishableKey),
      emailBase,
    );
  });
  ```

  Confirm the in-memory unit contract still passes (it is unchanged from Task 3 — this step adds no edits to it):

  ```bash
  pnpm vitest run src/lib/auth/auth.contract.test.ts
  ```

  Expected: the 4 in-memory cases green (signUp-with-meta, displayName-omitted, unknown-token-null, signOut-resolves).

- [ ] **Step 2: Run the real-adapter contract integration test.**

  ```bash
  pnpm dotenv -e .env.local -- pnpm test:integration src/lib/auth/supabase.contract.integration.test.ts
  ```

  Expected: 4 cases green against real Supabase Auth (signup-with-meta, displayName-omitted, unknown-token-null, signout-resolves). If signup 500s on duplicate, the email base collided — the `Date.now()` suffix plus per-case sub-addressing should prevent that; rerun.

- [ ] **Step 3: Write the E2E golden-path auth spec.**

  Create `e2e/auth-backend.spec.ts`. Unlike `e2e/auth.spec.ts` (static screens, no DB), this drives the live backend: it needs a fresh email per run, fills the signup form, and asserts a landing on `/app`. Mirrors the `@playwright/test` import idiom and `pnpm start` webServer already configured.

  ```ts
  // e2e/auth-backend.spec.ts
  // The auth half of the golden path against the live backend (design §11.6):
  // signup with email/password lands in /app, then signin and signout work, and the
  // inert controls (social, phone tab, remember toggle) never call auth. Unlike
  // e2e/auth.spec.ts (static screens), this hits /api/v1/auth/* + real Supabase, so
  // it runs under `pnpm start` with .env.local loaded (same webServer as the smoke).
  import { expect, test } from "@playwright/test";

  // Unique credentials per run so reruns don't collide on "email already registered".
  function freshEmail() {
    return `e2e-${Date.now()}-${Math.floor(Math.random() * 1e6)}@example.com`;
  }
  const PASSWORD = "password1";

  test("signup with email/password lands in /app, then signout returns to /welcome", async ({
    page,
  }) => {
    const email = freshEmail();

    await page.goto("/signup");
    await page.getByLabel("Full name").fill("E2E Tester");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill(PASSWORD);
    await page.getByRole("button", { name: /create account/i }).click();

    // Confirmations are OFF for the demo (§9): signup returns a session, so the
    // /intent step is reachable and /app loads behind the proxy guard.
    await expect(page).toHaveURL(/\/intent$/);
    await page.getByRole("button", { name: /continue/i }).click();
    await expect(page).toHaveURL(/\/app$/);
    await expect(page.getByText("FIND YOUR GAME")).toBeVisible();

    // In-app sign-out clears the session and replaces to /welcome.
    await page.getByRole("button", { name: /sign out/i }).click();
    await expect(page).toHaveURL(/\/welcome$/);

    // The /app guard now redirects an anon visit back to signin.
    await page.goto("/app");
    await expect(page).toHaveURL(/\/signin/);
  });

  test("an existing account can sign in to /app", async ({ page }) => {
    const email = freshEmail();

    // Register first (same path as above), then sign out to test a clean sign-in.
    await page.goto("/signup");
    await page.getByLabel("Full name").fill("E2E Returning");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill(PASSWORD);
    await page.getByRole("button", { name: /create account/i }).click();
    await expect(page).toHaveURL(/\/intent$/);
    await page.getByRole("button", { name: /continue/i }).click();
    await expect(page).toHaveURL(/\/app$/);
    await page.getByRole("button", { name: /sign out/i }).click();
    await expect(page).toHaveURL(/\/welcome$/);

    // Now sign in fresh.
    await page.goto("/signin");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill(PASSWORD);
    await page.getByRole("button", { name: /log in/i }).click();
    await expect(page).toHaveURL(/\/app$/);
  });

  test("bad credentials show an inline error and stay on /signin", async ({ page }) => {
    await page.goto("/signin");
    await page.getByLabel("Email").fill(freshEmail());
    await page.getByLabel("Password").fill("wrong-password");
    await page.getByRole("button", { name: /log in/i }).click();

    await expect(page.getByRole("alert")).toBeVisible();
    await expect(page).toHaveURL(/\/signin$/);
  });

  test("inert controls do not authenticate (social, phone tab, forgot)", async ({ page }) => {
    await page.goto("/signin");

    // Social row is present but inert: clicking it must not navigate to /app.
    const social = page.getByRole("button", { name: /google|apple|continue with/i }).first();
    if (await social.count()) {
      await social.click();
      await expect(page).not.toHaveURL(/\/app$/);
    }

    // Phone tab swaps to the OTP body and routes to /verify, not /app.
    await page.getByRole("button", { name: /phone/i }).click();
    await expect(page.getByLabel("Phone number")).toBeVisible();
    await page.getByRole("button", { name: /send code/i }).click();
    await expect(page).toHaveURL(/\/verify/);

    // Forgot is a UI-only stub.
    await page.goto("/signin");
    await page.getByRole("link", { name: /forgot/i }).click();
    await expect(page).toHaveURL(/\/forgot$/);
  });
  ```

  > The `/intent` "Continue" button writes nothing (§5) and just routes to `/app`; the proxy + `app/(client)/app/layout.tsx` guard let the authed session through and fire `ensureClientProfile`. If the intent CTA label differs, match it against the actual `intent/page.tsx` copy (it's `Continue` per `e2e/auth.spec.ts`). Note: the second test's "Continue" click must use `page.getByRole("button", { name: /continue/i })` — fix any casing typo when transcribing.

- [ ] **Step 4: Run the E2E spec.**

  Precondition: email confirmations must be **OFF** in the live Supabase project (§9) — otherwise signup does not return a session and this spec hangs at `/intent`. Optional fast preflight (signs up via the API and asserts an immediate session before the slow browser run): `pnpm dotenv -e .env.local -- node -e 'const{config}=require("./src/lib/config");fetch(config.supabaseUrl+"/auth/v1/signup",{method:"POST",headers:{apikey:config.supabasePublishableKey,"content-type":"application/json"},body:JSON.stringify({email:`preflight-${Date.now()}@example.com`,password:"password1"})}).then(r=>r.json()).then(d=>{if(!d.access_token&&!d.session)throw new Error("no session — confirmations are ON");console.log("confirmations OFF: session returned")})'`.

  ```bash
  pnpm dotenv -e .env.local -- pnpm exec playwright test e2e/auth-backend.spec.ts
  ```

  Expected: 4 passing. `pnpm start` boots with `.env.local`, so `/api/v1/auth/*` reaches real Supabase. If signup hangs on `/intent`, confirm email confirmations are OFF in the Supabase dashboard (§9) — that's the documented demo precondition, not a test bug.

- [ ] **Step 5: Confirm the existing auth screen e2e still passes (no regressions).**

  ```bash
  pnpm dotenv -e .env.local -- pnpm exec playwright test e2e/auth.spec.ts
  ```

  Expected: still green. The `/boot` case in `auth.spec.ts` was already rewired in Task 10, Step 8b (boot now probes the session and redirects immediately, so the case asserts `toHaveURL(/\/welcome$/)` for the anon load instead of racing the old timer for the eyebrow). No further edit to `auth.spec.ts` is needed here — just confirm it passes.

- [ ] **Step 6: Commit.**

  ```bash
  git add -A && git commit -m "test(auth): golden-path e2e + real-adapter contract integration

  - e2e/auth-backend.spec.ts: signup -> /app, signin, signout, inert controls asserted
  - supabase.contract.integration.test.ts runs runContract on the real provider
  - export shared runContract from auth.contract.test (signUp-with-meta, signOut-resolves)

  Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
  ```

---

## Task 13 — Docs: correct the RLS overstatement, note the auth backend, flag the vault discrepancy

Three doc edits (§8 deliverable, plus the CLAUDE.md auth note and the §0 vault-reconciliation flag). No code; these align the written record with what the code actually does and surface the one-way vault edits the repo must not decide.

- [ ] **Step 1: Correct the RLS "holds even if app code has a bug" overstatement.**

  In `docs/context/db-schema-and-backend-design.md`, the §5 lede (line 214) currently reads: *"RLS is a second layer that holds even if app code has a bug or PostgREST is exposed."* The `/api/v1` path reaches Postgres as the owning `postgres` role over Drizzle/postgres-js, which **bypasses RLS** (no `FORCE ROW LEVEL SECURITY`), and `auth.uid()` reads a GUC the postgres-js session never sets → `NULL`. RLS is inert there. Make the doc tell one story with `rls.integration.test.ts`.

  Replace line 214:

  ```
  **Two independent layers.** The app `lib/booking` module + route-group middleware is the **primary** authorization guard. **RLS is a second layer** that holds even if app code has a bug or PostgREST is exposed — never load-bearing, per the foundation seam rule. `auth.uid()` = `profiles.id`.
  ```

  with:

  ```
  **Authorization is enforced in the app layer; RLS is not a backstop on the `/api/v1` path.** The app `lib/booking` module + route guards (`getCurrentUser`/`requireUser` + explicit ownership checks) are the **sole real authorization guard** for `/api/v1`. RLS backstops only the **PostgREST / Data-API / Storage / Realtime** path — it is **inert over the Drizzle/postgres-js owner connection** used by `/api/v1`: `lib/db/client.ts` connects as the owning `postgres` role (which bypasses RLS unless `FORCE ROW LEVEL SECURITY` is set — migrations only `ENABLE`), and even ignoring ownership, `auth.uid()` reads `request.jwt.claims`, a GUC the postgres-js session never sets (→ `NULL`). So there is **no** "RLS holds even if app code has a bug" on this path: a missing ownership check is an open door. The executable proof is `src/lib/db/rls.integration.test.ts` — policies bite only inside the `asUser` transaction that sets `role` + `request.jwt.claims`; plain Drizzle writes bypass them. `auth.uid()` = `profiles.id` (used by the policies that *do* run, i.e. the Data-API path). Keep RLS enabled as cheap insurance against an accidental Data-API exposure only — do **not** make it load-bearing (making it real needs a non-owner `authenticated` role + per-txn `SET LOCAL request.jwt.claims`, which would couple the portable DB seam to Supabase's `auth.uid()` convention — a deliberate non-goal in v1).
  ```

- [ ] **Step 2: Add the auth-backend note to CLAUDE.md.**

  Append a new Conventions bullet directly after the existing "Auth/first-run screens live in `app/(auth)/`" bullet (CLAUDE.md line 100). This records that the screens are now wired and pins the load-bearing rules a future contributor must not break.

  Insert after the auth-screens bullet:

  ```
  - **Auth backend is wired (Plan 08).** Email+password only for the demo; phone OTP / OAuth / password-reset are reserved seams (inert UI). `@supabase/ssr` is imported in **exactly three** files — `src/lib/auth/{server-client,update-session,session}.ts` — each starting `import "server-only"`; **the browser never imports `@supabase/*`** (screens call `src/lib/auth/client.ts` → `/api/v1/auth/*`). One resolver `getCurrentUser(req?)` reads either an httpOnly cookie (web) or an `Authorization: Bearer` (native seam, verified locally via JWKS). Endpoints: `POST /api/v1/auth/{signup,signin,signout}` + `GET /api/v1/auth/session`; **no token is ever returned in a response body** (web = cookies only), **no `/refresh`**. Every cookie-auth POST runs `assertBrowserMutation` (fail-closed Origin/Referer + `x-squad-csrf` header). Route guarding lives in `src/proxy.ts` (Next 16 middleware→proxy rename). **RLS is inert over the Drizzle owner connection** — app-layer ownership checks (`requireUser` + per-query filters) are the only enforcement on `/api/v1`; see `docs/context/db-schema-and-backend-design.md` §5 + `rls.integration.test.ts`. Email confirmations are **OFF for the demo** (must be re-enabled before public launch). Lazy client-surface bootstrap (`ensureClientProfile`) fires once in the `/app` layout guard, never from a GET.
  ```

- [ ] **Step 3: Flag the decisions.md web-only-vs-pivot discrepancy for vault re-sync.**

  `docs/context/decisions.md` line 17 still reads *"Responsive **web** for v1 (native mobile is a v1 non-goal)."* That contradicts the recorded multi-client pivot (native is the real goal; web/PWA MVP first — per project memory + the spec §0). **Direction is one-way:** the repo must not re-decide product scope here; it flags the stale slice so the vault gets re-synced. Do **not** silently rewrite the decision — annotate it inline as needing reconciliation.

  Replace line 17:

  ```
  - Responsive **web** for v1 (native mobile is a v1 non-goal).
  ```

  with:

  ```
  - Responsive **web** for v1 (native mobile is a v1 non-goal). <!-- STALE — needs vault re-sync. Contradicts the 2026-06 multi-client pivot (native is the real goal; web/PWA MVP ships first for the investor demo, backend kept client-agnostic). The auth backend (Plan 08) is already built client-agnostic per that pivot. This line is upstream product scope — fix it in the brainstorm vault, then re-sync this file; do not re-decide it in this repo. -->
  ```

- [ ] **Step 4: Verify the docs render and nothing else drifted.**

  ```bash
  pnpm format:check
  git diff --stat
  ```

  Expected: prettier reports no changes (markdown unaffected, or run `pnpm format` if it reformats); `git diff --stat` shows exactly three files touched — `docs/context/db-schema-and-backend-design.md`, `CLAUDE.md`, `docs/context/decisions.md`.

- [ ] **Step 5: Commit.**

  ```bash
  git add -A && git commit -m "docs(auth): correct RLS scope, note the wired auth backend, flag vault drift

  - schema doc §5: RLS is inert over the Drizzle owner connection (cross-ref rls.integration.test)
  - CLAUDE.md: auth-backend conventions (seam, endpoints, no-token-in-body, CSRF, RLS honesty)
  - decisions.md: flag the web-only line as stale vs the multi-client pivot (vault re-sync, not a repo decision)

  Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
  ```

---

## Definition of Done

The plan is complete only when the full gauntlet passes from a clean `feat/auth-backend` tree:

- [ ] **Email confirmations are OFF in the live Supabase project** (spec §9) — verified before the integration + live-e2e runs below. Quick dashboard check: Authentication → Providers → Email → "Confirm email" is **off** (so `signUp` returns a session immediately and signup → `/intent` → `/app` works). This is the documented demo precondition; if it is on, the live e2e will hang at `/intent` and the real-adapter contract `signIn` will fail — that is a config gap, not a test bug. Must be re-enabled before public launch.
- [ ] **Full local gauntlet green, in order:**
  ```bash
  pnpm format:check && pnpm lint && pnpm typecheck && pnpm check:design && pnpm check:csrf && pnpm check:auth-logging && pnpm test && pnpm build && pnpm dotenv -e .env.local -- pnpm test:integration && pnpm dotenv -e .env.local -- pnpm exec playwright test
  ```
  Every command exits 0: Prettier clean, ESLint clean, `tsc --noEmit` clean, the design-vocabulary gate passes, the CSRF-guard gate passes (`csrf guards OK` — every POST resource route runs `assertBrowserMutation`), the auth-logging gate passes (`auth logging OK` — no `console.*` of a caught error/req/body under `api/v1/auth`), the full Vitest unit suite is green, `next build` succeeds, every `.integration.test.ts` (config parity, RLS, bootstrap, trigger idempotency, real-adapter contract) passes against the local Supabase Postgres, and the whole Playwright suite (existing screens + `auth-backend.spec.ts`) passes.
- [ ] **The golden path works end-to-end:** signup with email/password lands on `/app`; signin lands on `/app`; in-app signout returns to `/welcome` and a subsequent anon visit to `/app` redirects to `/signin`.
- [ ] **The session cookie is httpOnly** — asserted at the route-handler level (signin/signup `Set-Cookie` carries `HttpOnly`, and `Secure` in production).
- [ ] **No token appears in any response body** — signup/signin/signout/session bodies contain no token field; the session lives only in the httpOnly cookies.
- [ ] **CSRF fails closed** — a cookie-auth mutation with a missing/mismatched Origin (or missing `x-squad-csrf` header) returns `403 { error: { code: "CSRF" } }` and writes no `Set-Cookie`. The `check:csrf` gate proves every POST resource route runs `assertBrowserMutation`.
- [ ] **The logging policy holds** — auth handlers log only `{ code, requestId }` via `logAuthError` (never the raw error, request, or body); the `check:auth-logging` gate fails on any `console.*` of a caught error / `req` / `request` / `body` under `src/app/api/v1/auth`.
- [ ] **Session fixation is closed** — `signInWeb` deletes every stale `sb-*` cookie chunk before the signin write (unit-tested in `web-session.test.ts`).
- [ ] **The native seam is proven** — the `getCurrentUser` Bearer unit test passes: a valid Bearer resolves via `AuthProvider.verify`, and a present-but-invalid Bearer returns `null` without falling through to the cookie branch.
- [ ] **`@supabase/ssr` is imported in exactly three files** (`server-client.ts`, `update-session.ts`, `session.ts`), each behind `import "server-only"`; the browser imports only `src/lib/auth/client.ts`.

## Deferred

Out of scope for this plan; reserved seams left inert:

- **Phone OTP** — the phone tab + `/verify` screen stay UI-only and navigation-only (no OTP send/verify wired).
- **OAuth / social sign-in** — the social row renders but does not authenticate.
- **Password-reset email** — `/forgot` is a UI-only stub; no email round-trip.
- **Native token issuance (A/B)** — the Bearer transport is verified and accepted, but the app issues no native-session tokens itself yet; the issuance strategy (A vs B from the spec) is a later decision.
- **`profile` on `GET /session`** — the v1 probe returns `{ user } | { user: null }` only. Attaching a `profile` object (display name, city, surface markers) to the probe response is deferred; surface bootstrap currently lives in the `/app` layout guard (`ensureClientProfile`), not the probe.
- **Terraform codification of the auth config** — the Supabase auth settings for this plan (email confirmations OFF for the demo, JWT/JWKS config, redirect URLs) are set in the dashboard for now; codifying them in Terraform (alongside branch protection + required checks) is deferred. Email confirmations must be re-enabled before public launch.
