# SQUAD Auth Backend — Design Spec

> Status: design-for-review · Date: 2026-06-14 · Author: Claude Code (brainstormed + verified + adversarially hardened)
> Scope: **the auth backend only** — signup / signin / signout / session / route guards / lazy profile bootstrap, plus wiring the existing `(auth)` screens. Games `/api/v1`, `lib/booking`, venue onboarding, phone OTP, OAuth, and the password-reset email round-trip are **out of scope** (seams reserved, not wired).

This spec was produced by verifying the current `@supabase/ssr`, Supabase Auth, and Next.js 16 APIs against live docs (Context7 + Supabase docs), grounding in the existing repo, then hardening the draft through five adversarial reviews (security/CSRF, seam-rule, client-agnosticism, RLS-over-Drizzle, demo-correctness). Every "Fix" from the critical/high findings is folded into the sections below.

## 0. Locked decisions (from brainstorming — do not re-open)

1. **Session model** = web httpOnly cookies now + a native-ready `Authorization: Bearer <jwt>` seam. One server-side resolver reads either, verifies the Supabase JWT, resolves `auth.uid()` → profile. The Bearer path is built and unit-tested now (the native seam), but only the web/cookie path is exercised by the demo UI.
2. **Auth methods** = email + password only for the demo. Phone OTP and Google/Apple OAuth are deferred behind the seam.
3. **Session plumbing** = hybrid: `@supabase/ssr` is imported **only** inside `src/lib/auth/`; the browser never imports supabase-js. The app exposes its own `/api/v1/auth/*` endpoints + the `getCurrentUser` resolver used by the proxy and route guards.

**Doc reconciliation note (flagged during brainstorming):** `docs/context/decisions.md` still reads "Responsive web for v1 (native mobile is a v1 non-goal)," which contradicts the current multi-client pivot this spec is built around. That is a one-way vault edit, not something to change in this repo — flag it for vault re-sync; this spec deliberately designs client-agnostic per the pivot.

## 1. Session seam — `src/lib/auth/`

`@supabase/ssr` is added (`pnpm add @supabase/ssr`) and `server-only` is added as a dependency. The vendor SDK is imported in **exactly three** new files, all under `src/lib/auth/` and each beginning with `import "server-only";` (so a stray client import fails the build — the Seam Rule is mechanically enforced, not just documented): `server-client.ts`, `update-session.ts`, `session.ts`. URL + key come from `@/lib/config`, never `process.env`.

### Shared cookie options (the load-bearing fix)

`@supabase/ssr`'s `DEFAULT_COOKIE_OPTIONS` is `{ httpOnly: false, sameSite: 'lax', maxAge: 400 days }`. We must **never** rely on that default. A single shared options object is passed as `cookieOptions` to **every** `createServerClient` that can write, and merged onto each cookie inside `setAll` so the per-cookie array from supabase-js can't silently drop a flag:

```ts
// src/lib/auth/cookie-options.ts
import { config } from "@/lib/config";
export const SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: config.nodeEnv === "production",
  sameSite: "lax" as const,
  path: "/",
  domain: config.authCookieDomain, // undefined → host-only for the demo
  // maxAge is decided per-call (remember toggle): added for persistent, omitted
  // for a session cookie. When added, it is scoped to the refresh-token lifetime
  // (§9), NOT the @supabase/ssr 400-day default.
};
export const REMEMBER_MAX_AGE = 60 * 60 * 24 * 30; // 30d persistent (≈ refresh lifetime; tune in §9)
```

A route-handler test asserts the `Set-Cookie` on signin/signup contains `HttpOnly` and (in prod env) `Secure`. **This is the load-bearing assertion of the whole cookie session model.**

### `server-client.ts` — the cookie-bound factory (route handlers / server actions)

```ts
import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { config } from "@/lib/config";
import { SESSION_COOKIE_OPTIONS, REMEMBER_MAX_AGE } from "./cookie-options";

export async function createSupabaseServerClient(remember = true) {
  const cookieStore = await cookies(); // async in Next 16
  // remember=true → persistent cookie (maxAge); remember=false → session cookie (no maxAge).
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
            // Force the SECURITY flags (so supabase-js can never drop httpOnly), but
            // PRESERVE its maxAge/expires — it uses maxAge:0 to delete stale chunks,
            // and the persistent-vs-session maxAge already comes from cookieOptions above.
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

### `session.ts` — the single resolver (cookie OR Bearer)

`getCurrentUser` returns **our** `AuthUser` only. The Bearer branch delegates to the contract-tested `AuthProvider.verify(token)` (one seam, not two parallel vendor paths); the cookie branch uses the ssr client read-only.

```ts
import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { config } from "@/lib/config";
import { getAuthProvider } from "./index";
import type { AuthUser } from "./types";

// One resolver, two transports. `req` is optional: route handlers pass it (to read
// the Bearer header); server components / layouts call it with no arg (cookie only).
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
  return { id: data.claims.sub, email: data.claims.email ?? "" };
}
```

Notes:
- **`getClaims()` verifies locally** via cached JWKS (confirmed: staging + prod publish ES256 — no per-request network call). Never `getSession()` (spoofable).
- `readClaims` reads only `data.claims` (the real SDK return shape is `{ claims, header, signature }` — the speculative `data.user` fallback from the draft is dropped; fail loud on shape change so an upgrade is caught by a test).
- Created per request; never cached in a module global (Vercel Fluid compute).
- **`requireUser(req)` helper** (returns `AuthUser` or throws a 401-mapped `AuthError`) is added as the single ownership entry point for route handlers — and a forward guardrail: once games `/api/v1` lands, every resource query must filter by `requireUser(req).id` because RLS provides zero backstop (§8).

### `AuthProvider` — the portable primitive (`types.ts`)

```ts
export type AuthUser = { id: string; email: string };
export type SignUpMeta = { fullName: string; displayName?: string | null };

export interface AuthProvider {
  signUp(email: string, password: string, meta: SignUpMeta): Promise<AuthUser>;
  signIn(email: string, password: string): Promise<{ user: AuthUser; token: string }>;
  verify(token: string): Promise<AuthUser | null>; // getClaims(token) — local JWKS verify
  signOut(token: string): Promise<void>;
}
```

- **Verification is local everywhere.** `verify` uses `getClaims(token)` (local JWKS, no network), as do the proxy and `getCurrentUser`. This is the performant, standard choice for per-request resolution; the cost is that a server-side revocation isn't seen until the short-lived access token expires (§9). `getUser()` (network, revocation-aware) is reserved for high-value mutations (e.g. a future change-password / delete-account) and called inline there — never on the hot path.
- This `AuthProvider` is the **portable seam**: contract-tested (fake + real adapter) and the interface a vendor swap or a future native-issuance path builds against. It is plain supabase-js (no cookies). The **web cookie session** is a separate, cohesive adapter in the same `lib/auth` folder (the three ssr files + the web-session functions below); together they are the one "Supabase boundary," enumerated by a swap-checklist comment in `lib/auth/index.ts`.
- The in-memory `fake.ts` implements all four methods (deletes its token on signOut) so the shared `runContract` suite proves both the fake and — in an integration test — the real `SupabaseAuthProvider`.
- Contract test: existing cases + signUp-with-meta + signOut-resolves. **No "verify null immediately after signOut"** assertion — local verification can't honor it and shouldn't pretend to; access-token invalidation is bounded by TTL + refresh-token rotation (§9), documented rather than asserted.

### Web cookie-session functions (`web-session.ts`)

Route handlers must not hold a Supabase client or see a vendor error (Seam Rule). `lib/auth/web-session.ts` wraps the cookie path: `signUpWeb`, `signInWeb`, `signOutWeb` each create the cookie-bound client (`createSupabaseServerClient`), call the supabase-js method (which writes/clears cookies via `setAll`), translate vendor errors to our `AuthError`, and return our `AuthUser`. Handlers call these and never import `@supabase/*`.

## 2. Config — `src/lib/config` (sole env reader)

Add to `envSchema` / `Config` / the return map. **Four** new keys land in the schema, so `.env.example` gets four lines (the parity test asserts `exampleKeys === Object.keys(envSchema.shape)` exactly):

| Env var | Zod | Purpose |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | `z.string().min(1).optional()` | Preferred publishable key for `@supabase/ssr`. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `z.string().min(1).optional()` | Legacy; kept. A `.refine()` requires **at least one** of publishable/anon. |
| `AUTH_COOKIE_DOMAIN` | `z.string().optional()` | Cookie `Domain`; unset → host-only (demo). |
| `AUTH_ALLOWED_ORIGINS` | `z.string().optional()` | Comma-separated CSRF allowlist; **defaults to host-equality only** (never a `*.vercel.app` suffix match). |

`config.supabasePublishableKey = publishable ?? anon`. Existing `config.supabaseAnonKey` keeps pointing at the resolved value so current consumers don't churn. `ENV_KEYS` still reads `Object.keys(envSchema.shape)` (refine wraps the object; `.shape` stays reachable). `vitest.config.ts` env gets `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` mirrored alongside the anon key.

## 3. API surface — `/api/v1/auth/*`

App-owned handlers; the browser calls these, never supabase-js. Repo idiom: `export const dynamic = "force-dynamic"`, lean async fn, `NextResponse.json(body, { status })`, Zod-parsed bodies (`schemas.ts`).

**The vendor SDK never reaches a handler.** signup/signin/signout logic lives in `lib/auth/web-session.ts` functions that (1) create the cookie-bound ssr client, (2) call supabase-js (which writes/clears cookies via `setAll`), and (3) translate vendor errors to **our** typed `AuthError { code }`. Handlers catch only `AuthError` and map `code → HTTP`. `isAuthApiError` / the mapper live entirely in `lib/auth/errors.ts`. A vendor swap touches one folder (`lib/auth`).

**Error envelope:** `{ error: { code, message } }` (machine code + safe message; never the raw Supabase error, never logged in full).

| Cause | HTTP | `code` |
|---|---|---|
| invalid credentials (incl. the known `code===undefined` token-endpoint bug → fall back to status 400) | 401 | `INVALID_CREDENTIALS` |
| `email_exists` / `user_already_exists` | 409 | `EMAIL_TAKEN` (generic message) |
| `weak_password` | 422 | `WEAK_PASSWORD` |
| `validation_failed` / `email_address_invalid` | 400 | `INVALID_INPUT` |
| `over_*_rate_limit` | 429 | `RATE_LIMITED` |
| CSRF check fails | 403 | `CSRF` |
| default AuthApiError | `status ?? 400` | `AUTH_ERROR` |
| non-AuthApiError | 500 | `UNEXPECTED` |

**Transport split:** the mutation endpoints (signup/signin/signout) are the **web cookie path** — they always run `assertBrowserMutation` (§7), set the session in httpOnly cookies, and **never** put a token in the response body. Native clients do **not** call these — they obtain and refresh their own Supabase session out-of-band (§10). The Bearer transport applies only to **read / resource** endpoints resolved by `getCurrentUser`, where a cryptographically-verified Bearer carrying no cookie skips the cookie-CSRF gate. A request presenting both a cookie and a Bearer is treated as the cookie path.

- **`POST /signup`** — body `{ email, password, fullName, displayName? }` (`fullName: z.string().trim().min(1)` — the app guarantees the name; the trigger's `''` fallback is a silent foot-gun). `assertBrowserMutation` → `signUpWeb(...)` → `signUp` with `options.data: { full_name, display_name }` (feeds `handle_new_user`). Confirmations off (§9) → session returned → cookies set. Response `{ user }` + Set-Cookie. **No token in the body.**
- **`POST /signin`** — `{ email, password, remember }`. CSRF → `signInWeb(...)` → `signInWithPassword`; clears any stale `sb-*` chunks before writing (anti session-fixation); `remember` selects persistent vs session cookie. Response `{ user }` + Set-Cookie.
- **`POST /signout`** — CSRF → `signOutWeb()` → `supabase.auth.signOut({ scope: "local" })` (single-device; the default is **global**, which we deliberately override) and clears cookie chunks. Response `{ ok: true }`.
- **`GET /session`** — whoami; **pure read** (no writes). `getCurrentUser(req)` → `200 { user: { id, email }, profile } | { user: null }` (200, not 401 — it's a status probe).

There is **no `/refresh` endpoint** and **no token issuance for native** in this plan — that is a deferred seam (§10). The web session refreshes server-side in the proxy (§4); native refreshes its own session via its SDK.

**Logging policy:** for `/api/v1/auth/*`, log only `error.code` + a request id — never the full error object, never request/response bodies (they hold passwords and tokens). A CI grep/Semgrep rule forbids `console.*` of caught auth errors and body logging under `api/v1/auth`. The service-role key is **not** imported anywhere in the auth request path (email/password needs only the publishable key).

## 4. Proxy + guards — `src/proxy.ts`

Next 16 renames middleware → **proxy** (`src/proxy.ts`, runtime nodejs). It delegates to `lib/auth/update-session.ts` so the ssr import + config read stay inside `lib/auth`.

`update-session.ts` is the **one place cookies are refreshed/written** for the web path. It passes the same `cookieOptions: SESSION_COOKIE_OPTIONS` to `createServerClient` and applies the same security-flag-forcing merge in its `setAll` (preserving supabase-js `maxAge`/`expires`), so refreshed cookies carry `httpOnly`/`secure`/`sameSite` identically to the route-handler writer. Per the hard rule: **no code between `createServerClient` and the auth call**, and it returns the exact `supabaseResponse` (cookies mirrored onto both `request.cookies` and a freshly-rebuilt response, plus the cache headers from `setAll`'s second arg so a CDN can't cache a `Set-Cookie`):

```ts
const { data } = await supabase.auth.getClaims(); // triggers refresh; local JWKS verify
return { userId: data?.claims?.sub ?? null, response };
```

`proxy.ts`:
- `userId` null + path under `/api` → `401 { error: { code: "UNAUTHORIZED" } }`.
- `userId` null + page route → `redirect("/signin?next=<path>")`.
- else return the refreshed `response` (so cookies stay in sync).

**Matcher** — narrowed to what actually needs guarding now: `/app/*` (and future `/api/v1/*` resource routes), **excluding** static assets, the public auth screens (`/boot /welcome /signup /verify /intent /signin /forgot`), the root `/`, and the specific public auth/health endpoints (`/api/v1/auth/{signup,signin,signout,session}`, `/api/health`) — listed individually, **not** the whole `/api/v1/auth` prefix, so a future authed endpoint isn't accidentally guard-exempt. `/venue` is **not** matched yet (no venue auth this plan). `missing` prefetch headers stop the proxy firing on router hover-prefetch.

**Refresh happens once, in the proxy**; `getCurrentUser` in handlers uses read-only `setAll`. Caveat (documented): the matcher-excluded auth endpoints and direct server-component callers don't get a proxy refresh, so on an expired-but-refreshable cookie `getClaims()` returns null. Mitigation: the `/boot` probe and `/app` guard are proxy-covered for page loads; `GET /session` may report `user:null` on access-token expiry and the client re-probes after a refresh. Stated explicitly so web/native don't silently diverge.

## 5. Profile + surface bootstrapping — `src/lib/auth/bootstrap.ts`

The `private.handle_new_user()` trigger already creates the base `profiles` row from `raw_user_meta_data`. **Signup never inserts `profiles` directly.** What's missing is the client-surface marker (`client_profiles`):

```ts
import "server-only";
import { db } from "@/lib/db/client";
import { clientProfiles } from "@/lib/db/schema";

// Idempotent. profileId MUST come from getCurrentUser().id — NEVER from request input;
// RLS does not enforce auth.uid()=profile_id over the owner connection (§8).
export async function ensureClientProfile(profileId: string) {
  await db.insert(clientProfiles).values({ profileId }).onConflictDoNothing(); // PK = profile_id
}
```

- Called from **exactly one place**: the `app/(client)/app/layout.tsx` server-component guard (not the GET probe — no side-effecting GET, no DB write in a read path). Idempotent via the PK + `onConflictDoNothing`; race-safe; mirrors the repo's idempotent-write convention.
- The `/intent` screen still writes nothing (role-orientation UI only; `client_profiles` is a surface marker, not a role record).
- **Venue path is a reserved stub** (`ensureVenueOwnerProfile`) — venue-owner profiles need business fields and an explicit `/venue` onboarding action; not lazy, not wired (and gated on the open vault question of separate vs unified accounts).

## 6. Wiring the existing `(auth)` screens

Screens stay SQUAD-styled; only their submit handlers change from `router.push`-only to `fetch` against `/api/v1/auth/*` via a browser-safe helper `src/lib/auth/client.ts` (`authClient`, no vendor import, sets `content-type` + `x-squad-csrf: 1`).

- **`signup/page.tsx`** (email branch): `authClient.signUp({ email, password, fullName, displayName: null })` → `router.push("/intent")`. Phone tab + `SocialRow` stay inert. Map error `code` to inline message.
- **`signin/page.tsx`** (email branch): `authClient.signIn({ email, password, remember })` → `router.push("/app")`. **"Stay signed in" toggle is wired** to cookie `maxAge` (persistent vs session cookie) rather than shipping a dead control. "Forgot?" → `/forgot` (the href changes from the current `/signin`). Phone/social inert.
- **`boot/page.tsx`**: replace the 1600ms timeout with a real session check — `authClient.session()` → `user` present → `router.replace("/app")`, else `/welcome`. The single cold-start decision.
- **`/app` guard**: (a) proxy redirects unauthenticated `/app/*` → `/signin?next=…` (primary); (b) `app/(client)/app/layout.tsx` server component calls `getCurrentUser()` + `ensureClientProfile()`, redirecting if null (defense-in-depth + where lazy bootstrap fires).
- **In-app sign-out control** added to the client Topbar → `authClient.signOut()` → `router.replace("/welcome")`.
- `/verify` and `/intent` remain UI-only this plan.

## 7. CSRF + cookie security — `src/lib/auth/csrf.ts`

Cookie flags: explicit `cookieOptions` (§1) — `httpOnly: true`, `secure` in prod, `sameSite: "lax"`, `path: "/"`, `domain` from config. `maxAge` per remember-toggle.

`assertBrowserMutation(req)` — **fail-closed, mandatory** on every cookie-auth POST:
1. **Origin check (primary):** a state-changing POST must present an `Origin` that exactly matches the request host or an entry in `config.authAllowedOrigins` (parsed origin compare — scheme+host+port — never substring). If `Origin` absent, fall to `Referer` and require its origin to match. **If both absent → 403.** Never treat missing headers as same-origin.
2. **Custom-header check (hard, not optional):** require `x-squad-csrf` (set by `authClient`). A cross-site `<form>` can't set it; a cross-origin `fetch` with it triggers a preflight we don't answer permissively.

Both gates are mandatory; a request missing either is 403. Centralized in one helper; a CI check fails if any `/api/v1` POST handler doesn't call it.

**Bearer/native is immune** — CSRF is an ambient-credential attack; browsers auto-attach cookies but never a Bearer header. The CSRF gate is skipped **only** when the request authenticated via a cryptographically-verified Bearer **and** carried no auth cookie (tie the exemption to verified auth, never to mere header presence). If both a Bearer and a cookie are present, treat as the cookie path and enforce CSRF.

## 8. RLS honesty

Stated plainly, and corrected in the schema doc: **RLS does not constrain this app's queries and provides zero backstop on the `/api/v1` path.**

- `lib/db/client.ts` connects via `postgres(config.databaseUrl)` as the **owning `postgres` role**; an owner **bypasses RLS** unless `FORCE ROW LEVEL SECURITY` is set, and migrations only `ENABLE` (verified: no `FORCE` anywhere). Even ignoring ownership, `auth.uid()` reads `request.jwt.claims`, a GUC the postgres-js session never sets → `NULL`. The existing `rls.integration.test.ts` is the executable proof (policies bite only inside the `asUser` txn that sets role + claims; plain writes bypass them).
- **The app layer is the sole real enforcement:** `getCurrentUser`/`requireUser` + explicit ownership checks in handlers (and, next plan, `lib/booking`). For `/api/v1`, a missing ownership check is an open door — there is no "RLS holds even if app code has a bug."
- **v1 verdict: do NOT make RLS load-bearing.** Making it real needs a non-owner `authenticated` role + per-txn `SET LOCAL request.jwt.claims`, which would couple the portable DB seam to Supabase's `auth.uid()` convention (violating "vendor features never load-bearing") and tax every query. Keep RLS enabled as cheap insurance against an accidental PostgREST/Data-API exposure only.
- **Deliverable:** amend `docs/context/db-schema-and-backend-design.md` (the "RLS holds even if app code has a bug" overstatement) to: *RLS backstops only the PostgREST/Data-API/Storage/Realtime path; it is inert over the Drizzle/postgres-js owner connection used by `/api/v1`, where app-layer ownership checks are the only enforcement.* Cross-reference `rls.integration.test.ts` so doc + test tell one story.

## 9. Token lifecycle + Supabase Auth config

Settings to apply (dashboard now; codify via Terraform/Management API flagged as follow-up, §14):
- **Email confirmations: OFF for the demo** — `signUp` returns a session immediately, so signup → `/intent` → `/app` works with no verify step. Tradeoff: unverified emails can register; **must be re-enabled before public launch**. (Also dodges the free-tier ~2 emails/hour SMTP cap.)
- **Refresh-token rotation + reuse detection: ON** — a stolen refresh token should invalidate the family.
- **Access-token TTL ~1h**; cookie `maxAge` scoped to the refresh-token lifetime, **not** 400 days.
- **Verification is local everywhere** (`getClaims`, JWKS, no network) for per-request speed — proxy, `getCurrentUser`, and `verify()`. The accepted tradeoff: a server-side revocation (signout, ban) isn't seen until the short access token expires, so keep the access TTL short and rely on refresh-token rotation to kill the long-lived side immediately. `getUser()` (network, revocation-aware) is reserved for high-value mutations and called inline there only. This is the standard stateless-JWT posture; it is documented, not hidden.

## 10. Deferred items (seams reserved)

- **Password reset** — `/forgot` is a UI-only stub; `resetPassword`/`updatePassword` are seam comments in `lib/auth`; no email round-trip wired.
- **OTP (phone)** + **OAuth (Google/Apple)** — `MethodTabs` phone tab + `SocialRow` stay inert; `AuthProvider` leaves room for `signInWithOtp`/`signInWithOAuth`. Phone, when added, lives in `auth.users` only.
- **Native token issuance / refresh** — native obtains and refreshes its own Supabase session out-of-band (the native Supabase SDK handles secure storage + auto-refresh) and calls our resource endpoints with a Bearer; our backend's native responsibility is **verification only** (`getCurrentUser`, already built + tested). We do **not** return tokens in JSON or run a `/refresh` endpoint now — native therefore sustains a session with **zero backend change**. The eventual choice — **(A)** native uses the Supabase SDK directly, vs **(B)** native talks only to our API and we add token-issuing endpoints — is a native-build-time decision; the verify-Bearer seam supports both. Left open per the brainstorm.

## 11. Testing strategy

Mirrors the existing dual-config setup (unit with dummy env; `.integration.test.ts` against real Postgres) + the `runContract` pattern.

1. **AuthProvider contract** (`auth.contract.test.ts`): existing cases + signUp-with-meta + signOut-resolves (no immediate-revocation assertion — §9). Runs against `InMemoryAuthProvider` (unit) and `SupabaseAuthProvider` (integration, real Auth/Postgres with ES256 keys).
2. **`getCurrentUser` unit test** (`session.test.ts`) — the native-seam proof. Mock `createServerClient`/provider. Assert: valid Bearer → resolves (native works); invalid Bearer → null, no cookie fall-through; no Bearer + valid cookie → resolves; **no-session-no-error** cookie state → null (the most common branch).
3. **Integration** (`bootstrap.integration.test.ts`): trigger creates a `profiles` row from metadata; `ensureClientProfile` idempotency (call twice → one row).
4. **Route handlers** (`vi.mock` DI like `health.test.ts`): success bodies/status; error-envelope mapping (incl. `code===undefined` → `INVALID_CREDENTIALS`); CSRF rejection (missing Origin / missing header → 403, no Set-Cookie); **web mutation responses contain no `token` field** (tokens live only in cookies); `session` → `200 {user:null}` when anon; cookie `HttpOnly`/`Secure` assertion (the load-bearing check).
5. **Proxy test** (`proxy.test.ts`): anon `/api/...` → 401 envelope; anon `/app` → redirect `/signin?next=/app`; anon `/forgot` and `/` → **not** redirected; authed → refreshed response.
6. **E2E** (Playwright): signup with email/password **lands in `/app`** (the auth half of the golden path), signin, signout; verify/social controls + the (inert) remember toggle asserted non-navigating.

## 12. File map

**New:** `src/lib/auth/{cookie-options,server-client,update-session,session,web-session,errors,csrf,schemas,bootstrap,client}.ts`; `src/proxy.ts`; `src/app/api/v1/auth/{signup,signin,signout,session}/route.ts`; `src/app/(client)/app/layout.tsx` (guard + bootstrap, if not present); `src/app/(auth)/forgot/page.tsx` (stub); tests: `session.test.ts`, `bootstrap.integration.test.ts`, `supabase.contract.integration.test.ts`, `src/app/api/v1/auth/*/route.test.ts`, `proxy.test.ts`; migration `migrations/0005_*` (§13).

**Modified:** `src/lib/auth/{types,supabase,fake,index,auth.contract.test}.ts`; `src/lib/config/index.ts`; `src/app/(auth)/{signup,signin,boot}/page.tsx`; an in-app Topbar (sign-out control); `.env.example` (4 keys); `vitest.config.ts` (publishable key); `package.json` (`@supabase/ssr`, `server-only`); `docs/context/db-schema-and-backend-design.md` (RLS correction).

## 13. Hardening migration `0005`

Make `private.handle_new_user()` idempotent and resilient: add `ON CONFLICT (id) DO NOTHING` (Supabase can re-fire `on_auth_user_created` on identity-link edge cases; a plain INSERT would surface as an opaque 500). Pair with `fullName` required at the app layer (§3) so the trigger's `COALESCE(..., '')` empty-string fallback never silently ships a nameless profile. Follows drizzle-kit RLS-ordering caveat noted in project memory — author the SQL by hand if needed.

## 14. Open questions / risks

1. **Email-confirmation + token-lifetime config is dashboard/Management-API, not yet IaC** → reproducibility drift. Recommended: document the exact settings now, codify in Terraform when prod-bound.
2. **`client_profiles` required columns:** `ensureClientProfile` assumes `profile_id` suffices. If the schema later adds required client fields, lazy bootstrap must supply them or move to explicit onboarding — re-check `schema.ts` before implementing.
3. **`@supabase/ssr` / supabase-js version pinning:** `getClaims` return shape and the `invalid_credentials` `code===undefined` behavior are version-sensitive — pin and re-verify on upgrade.
4. **Vault questions (do not decide here):** venue accounts separate vs unified (gates whether `ensureVenueOwnerProfile` can ever be lazy); `/intent` exact role semantics (writes nothing now); `displayName` mandatory-vs-optional at signup (treated optional/null). These are upstream vault brainstorms.
5. **`signOut` scope** pinned to `local` (single-device) for the demo; multi-device semantics is a later decision.
