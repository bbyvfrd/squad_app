# Foundation Plan 1 — App Skeleton & Portable Seams Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up the new sport-app repository as a running Next.js app with vendor-agnostic seams (config, database, auth), a local Supabase data layer with migrations, a health endpoint, and a portable Dockerfile — all test-covered.

**Architecture:** One Next.js (App Router, TypeScript) app with two route groups (`(client)`, `(venue)`). Every vendor touchpoint lives behind a `lib/` adapter implementing our own interface. Drizzle ORM over Postgres with SQL migrations as the schema source of truth. Config is a single Zod-validated, fail-fast module.

**Tech Stack:** Next.js 15, TypeScript, Drizzle ORM, postgres.js, Supabase (local via CLI), Zod, Vitest, Docker, pnpm.

---

## Plan Series Context

This is **Plan 1 of 4** in the foundation series derived from `output/2026-05-29-app-foundation-portable-seams-design.md`:

1. **Plan 1 (this doc):** App skeleton + portable seams + local data layer → spec §2, §3, §4, §7, and the substrate for §5/§6.
2. Plan 2: CI pipeline (`ci.yml`) → spec §5.
3. Plan 3: IaC (Terraform modules + envs + state) → spec §6.
4. Plan 4: Deploy + rollback (`deploy.yml`, `rollback.yml`, health gate) → spec §5, §8. *(The config parity-check job actually lands in Plan 3.)*

## Boundary & Prerequisites

- **This plan runs in a NEW repository — the separate app repo — not in the brainstorm vault.** Task 1 creates it.
- Required local tooling: **Node 20+**, **pnpm 9+**, **Docker**, **Supabase CLI** (`supabase`), **git**.
- Verify before starting:
  - Run: `node -v && pnpm -v && docker --version && supabase --version`
  - Expected: each prints a version with no "command not found".

## File Structure (created by this plan)

| File | Responsibility |
|---|---|
| `next.config.ts` | Next config; enables `output: 'standalone'` for the portable container |
| `vitest.config.ts` | Test runner config (node environment, path aliases) |
| `src/lib/config/index.ts` | The ONLY place env vars are read; Zod schema + `parseEnv` + `config` |
| `src/lib/config/config.test.ts` | Tests for env parsing + fail-fast behavior |
| `src/lib/config/env-parity.test.ts` | Asserts `.env.example` keys == Zod schema keys |
| `.env.example` | The documented env-var contract (committed) |
| `src/lib/db/schema.ts` | Drizzle schema for User, Venue, Game, GameParticipant |
| `src/lib/db/client.ts` | Postgres connection + Drizzle `db` instance (only module that knows it's Supabase/PG) |
| `src/lib/db/ping.ts` | `pingDb()` connectivity check (used by health endpoint; mockable) |
| `src/lib/db/db.integration.test.ts` | Migration-applies + insert/select integration test |
| `drizzle.config.ts` | drizzle-kit config (migration generation) |
| `migrations/` | Generated SQL migrations = schema source of truth |
| `src/lib/auth/types.ts` | `AuthUser` type + `AuthProvider` interface |
| `src/lib/auth/fake.ts` | `InMemoryAuthProvider` for tests |
| `src/lib/auth/supabase.ts` | `SupabaseAuthProvider` (wraps `@supabase/supabase-js`) |
| `src/lib/auth/index.ts` | `getAuthProvider()` factory |
| `src/lib/auth/auth.contract.test.ts` | Contract test run against the in-memory provider |
| `src/app/api/health/route.ts` | `GET /api/health` — returns ok/503 based on `pingDb()` |
| `src/app/api/health/health.test.ts` | Health handler tests (db up → 200, db down → 503) |
| `src/app/(client)/page.tsx` | Client-surface placeholder route |
| `src/app/(venue)/venue/page.tsx` | Venue-surface placeholder route |
| `Dockerfile` | Multi-stage build producing a standalone runnable image |
| `.dockerignore` | Keeps build context small |
| `README.md` | Local-dev runbook for the app repo |

**Canonical names used across tasks (do not rename):** `parseEnv`, `config`, `db`, `client`, `pingDb`, `AuthUser`, `AuthProvider`, `InMemoryAuthProvider`, `SupabaseAuthProvider`, `getAuthProvider`, tables `users`/`venues`/`games`/`gameParticipants`.

---

## Task 1: Initialize the app repo and Next.js skeleton

**Files:**
- Create: whole repo, `next.config.ts`, `src/app/(client)/page.tsx`, `src/app/(venue)/venue/page.tsx`

- [ ] **Step 1: Scaffold the Next.js app**

Run (in the parent directory where the new repo should live):
```bash
pnpm create next-app@latest sport-app \
  --ts --app --src-dir --eslint --tailwind --use-pnpm \
  --import-alias "@/*"
cd sport-app
```
Expected: a `sport-app/` directory with a Next.js + TypeScript + Tailwind project; `pnpm` used as package manager. If prompted for any unset option, accept the default.

- [ ] **Step 2: Verify the baseline build passes**

Run: `pnpm build`
Expected: "Compiled successfully" with a route list, exit code 0.

- [ ] **Step 3: Enable standalone output for the portable container**

Replace `next.config.ts` with:
```ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
};

export default nextConfig;
```

- [ ] **Step 4: Create the two route-group placeholder pages**

Create `src/app/(client)/page.tsx`:
```tsx
export default function ClientHome() {
  return <main>Client surface (player / organizer)</main>;
}
```

Create `src/app/(venue)/venue/page.tsx`:
```tsx
export default function VenueHome() {
  return <main>Venue owner surface</main>;
}
```

Delete the default `src/app/page.tsx` if it conflicts with the `(client)` group root:
```bash
rm -f src/app/page.tsx
```

- [ ] **Step 5: Verify build still passes with the new structure**

Run: `pnpm build`
Expected: "Compiled successfully"; routes include `/` and `/venue`.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "chore: scaffold Next.js app with two route groups and standalone output"
```

---

## Task 2: Test runner and quality baseline

**Files:**
- Create: `vitest.config.ts`, `src/lib/sanity.test.ts`
- Modify: `package.json` (scripts)

- [ ] **Step 1: Install test dependencies**

Run:
```bash
pnpm add -D vitest vite-tsconfig-paths @types/node
```
Expected: packages added to `devDependencies`.

- [ ] **Step 2: Create the Vitest config**

Create `vitest.config.ts`:
```ts
import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    exclude: ["src/**/*.integration.test.ts"],
  },
});
```

- [ ] **Step 3: Add scripts to `package.json`**

In the `"scripts"` block add:
```json
"test": "vitest run",
"test:watch": "vitest",
"test:integration": "vitest run --config vitest.integration.config.ts",
"typecheck": "tsc --noEmit"
```

- [ ] **Step 4: Write a sanity test (proves the runner works)**

Create `src/lib/sanity.test.ts`:
```ts
import { describe, it, expect } from "vitest";

describe("test runner", () => {
  it("runs", () => {
    expect(1 + 1).toBe(2);
  });
});
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `pnpm test`
Expected: 1 passed; exit code 0.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "test: add vitest with node environment and path aliases"
```

---

## Task 3: Typed config seam (`lib/config`)

**Files:**
- Create: `src/lib/config/index.ts`, `src/lib/config/config.test.ts`

- [ ] **Step 1: Install Zod**

Run: `pnpm add zod`
Expected: `zod` added to `dependencies`.

- [ ] **Step 2: Write the failing test**

Create `src/lib/config/config.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { parseEnv } from "./index";

const valid = {
  NODE_ENV: "test",
  DATABASE_URL: "postgresql://postgres:postgres@127.0.0.1:54322/postgres",
  NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
  NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-key",
};

describe("parseEnv", () => {
  it("parses a valid environment into typed config", () => {
    const cfg = parseEnv(valid);
    expect(cfg.databaseUrl).toBe(valid.DATABASE_URL);
    expect(cfg.supabaseUrl).toBe(valid.NEXT_PUBLIC_SUPABASE_URL);
  });

  it("throws a descriptive error when a required var is missing", () => {
    const { DATABASE_URL, ...missing } = valid;
    expect(() => parseEnv(missing)).toThrow(/DATABASE_URL/);
  });

  it("throws when a URL var is malformed", () => {
    expect(() => parseEnv({ ...valid, DATABASE_URL: "not-a-url" })).toThrow();
  });
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `pnpm test src/lib/config`
Expected: FAIL — "Cannot find module './index'" / `parseEnv` is not a function.

- [ ] **Step 4: Implement the config module**

Create `src/lib/config/index.ts`:
```ts
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
});

export type Config = {
  nodeEnv: "development" | "test" | "production";
  databaseUrl: string;
  supabaseUrl: string;
  supabaseAnonKey: string;
  supabaseServiceRoleKey?: string;
};

export function parseEnv(env: Record<string, string | undefined>): Config {
  const parsed = envSchema.safeParse(env);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `${i.path.join(".")}: ${i.message}`)
      .join("; ");
    throw new Error(`Invalid environment configuration: ${issues}`);
  }
  const e = parsed.data;
  return {
    nodeEnv: e.NODE_ENV,
    databaseUrl: e.DATABASE_URL,
    supabaseUrl: e.NEXT_PUBLIC_SUPABASE_URL,
    supabaseAnonKey: e.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    supabaseServiceRoleKey: e.SUPABASE_SERVICE_ROLE_KEY,
  };
}

// App-wide singleton. Importing this in app code triggers fail-fast validation.
export const config: Config = parseEnv(process.env);
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `pnpm test src/lib/config`
Expected: 3 passed.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: add fail-fast Zod config seam"
```

---

## Task 4: Env-var contract and parity test

**Files:**
- Create: `.env.example`, `src/lib/config/env-parity.test.ts`

- [ ] **Step 1: Create the `.env.example` contract**

Create `.env.example`:
```bash
# NODE_ENV — runtime mode. secret: no. envs: all
NODE_ENV=development
# DATABASE_URL — Postgres connection string. secret: YES. envs: all
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres
# NEXT_PUBLIC_SUPABASE_URL — Supabase API URL. secret: no. envs: all
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
# NEXT_PUBLIC_SUPABASE_ANON_KEY — Supabase anon key (client-safe). secret: no. envs: all
NEXT_PUBLIC_SUPABASE_ANON_KEY=replace-me
# SUPABASE_SERVICE_ROLE_KEY — server-only admin key. secret: YES. envs: server runtime only
SUPABASE_SERVICE_ROLE_KEY=replace-me
```

- [ ] **Step 2: Guarantee `.env.example` is tracked but `.env*.local` is ignored**

`create-next-app` ignore patterns vary by version. Make the intent explicit and robust:
```bash
grep -qxF '.env*.local' .gitignore || echo '.env*.local' >> .gitignore
grep -qxF '!.env.example' .gitignore || echo '!.env.example' >> .gitignore
```
Verify: `git check-ignore .env.example || echo "tracked-ok"`
Expected: prints `tracked-ok` (the example is NOT ignored). The `!.env.example` negation guarantees this even if a blanket `.env*` rule exists.

- [ ] **Step 3: Write the failing parity test**

Create `src/lib/config/env-parity.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function exampleKeys(): string[] {
  const text = readFileSync(resolve(process.cwd(), ".env.example"), "utf8");
  return text
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith("#"))
    .map((l) => l.split("=")[0]);
}

// Keys the Zod schema knows about — keep in sync with src/lib/config/index.ts.
const SCHEMA_KEYS = [
  "NODE_ENV",
  "DATABASE_URL",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
];

describe(".env.example parity", () => {
  it("documents exactly the keys the config schema declares", () => {
    expect(exampleKeys().sort()).toEqual([...SCHEMA_KEYS].sort());
  });
});
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm test src/lib/config/env-parity`
Expected: 1 passed. (If it fails, a key is missing from `.env.example` or the schema — fix the mismatch, which is exactly the drift this test prevents.)

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add .env.example contract with schema parity test"
```

---

## Task 5: Local Supabase data platform

**Files:**
- Create: `supabase/config.toml` (generated), `.env.local` (gitignored, NOT committed)

- [ ] **Step 1: Initialize Supabase**

Run: `supabase init`
Expected: creates `supabase/` with `config.toml`; prints "Finished supabase init".

- [ ] **Step 2: Start the local stack**

Run: `supabase start`
Expected: pulls/starts containers, then prints local credentials including `API URL` (`http://127.0.0.1:54321`), `DB URL` (`postgresql://postgres:postgres@127.0.0.1:54322/postgres`), and `anon key`.

- [ ] **Step 3: Create `.env.local` from the example and fill in the printed values**

Run: `cp .env.example .env.local`
Then edit `.env.local`: set `NEXT_PUBLIC_SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY` to the keys printed by `supabase start`. Leave `DATABASE_URL` and `NEXT_PUBLIC_SUPABASE_URL` as the local defaults.

- [ ] **Step 4: Verify the stack is healthy and `.env.local` is ignored**

Run: `supabase status && git check-ignore .env.local`
Expected: status lists running services; `git check-ignore` prints `.env.local` (confirming it will NOT be committed).

- [ ] **Step 5: Commit (Supabase config only)**

```bash
git add supabase/config.toml
git commit -m "chore: add local Supabase configuration"
```

---

## Task 6: Database seam — Drizzle schema, client, and migration

**Files:**
- Create: `src/lib/db/schema.ts`, `src/lib/db/client.ts`, `src/lib/db/ping.ts`, `drizzle.config.ts`, `vitest.integration.config.ts`, `src/lib/db/db.integration.test.ts`, `migrations/` (generated)

- [ ] **Step 1: Install database dependencies**

Run:
```bash
pnpm add drizzle-orm postgres
pnpm add -D drizzle-kit dotenv-cli
```
Expected: `drizzle-orm` + `postgres` in dependencies; `drizzle-kit` + `dotenv-cli` in devDependencies. (`dotenv-cli` provides the `dotenv` binary used in later steps to load `.env.local`.)

- [ ] **Step 2: Define the schema (the 4 product objects)**

Create `src/lib/db/schema.ts`:
```ts
import {
  pgTable,
  uuid,
  text,
  integer,
  timestamp,
  pgEnum,
} from "drizzle-orm/pg-core";

export const participantStatus = pgEnum("participant_status", [
  "requested",
  "approved",
  "declined",
  "cancelled",
]);

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const venues = pgTable("venues", {
  id: uuid("id").defaultRandom().primaryKey(),
  ownerUserId: uuid("owner_user_id").references(() => users.id).notNull(),
  name: text("name").notNull(),
  locationText: text("location_text").notNull(),
  contactInfo: text("contact_info"),
  description: text("description"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const games = pgTable("games", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizerUserId: uuid("organizer_user_id").references(() => users.id).notNull(),
  venueId: uuid("venue_id").references(() => venues.id),
  sport: text("sport").notNull(),
  title: text("title").notNull(),
  startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
  maxPlayers: integer("max_players").notNull(),
  locationText: text("location_text").notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const gameParticipants = pgTable("game_participants", {
  id: uuid("id").defaultRandom().primaryKey(),
  gameId: uuid("game_id").references(() => games.id).notNull(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  status: participantStatus("status").default("requested").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
```

- [ ] **Step 3: Create the database client**

Create `src/lib/db/client.ts`:
```ts
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { config } from "@/lib/config";
import * as schema from "./schema";

export const client = postgres(config.databaseUrl, { max: 5 });
export const db = drizzle(client, { schema });
```

- [ ] **Step 4: Create the connectivity check**

Create `src/lib/db/ping.ts`:
```ts
import { sql } from "drizzle-orm";
import { db } from "./client";

export async function pingDb(): Promise<boolean> {
  try {
    await db.execute(sql`select 1`);
    return true;
  } catch {
    return false;
  }
}
```

- [ ] **Step 5: Configure drizzle-kit**

Create `drizzle.config.ts`:
```ts
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/lib/db/schema.ts",
  out: "./migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "",
  },
});
```

- [ ] **Step 6: Generate the first migration**

Run: `pnpm dotenv -e .env.local -- drizzle-kit generate`
Expected: a new SQL file under `migrations/` containing `CREATE TABLE` statements for all four tables and the enum.

- [ ] **Step 7: Apply the migration to local Supabase**

Run: `pnpm dotenv -e .env.local -- drizzle-kit migrate`
Expected: "migrations applied" with no error.

- [ ] **Step 8: Write the integration config and failing integration test**

Create `vitest.integration.config.ts`:
```ts
import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: "node",
    include: ["src/**/*.integration.test.ts"],
  },
});
```

Create `src/lib/db/db.integration.test.ts`:
```ts
import { describe, it, expect, afterAll } from "vitest";
import { db, client } from "./client";
import { users } from "./schema";
import { eq } from "drizzle-orm";

describe("database integration", () => {
  afterAll(async () => {
    await client.end();
  });

  it("inserts and reads back a user", async () => {
    const email = `it-${Date.now()}@example.com`;
    const [created] = await db
      .insert(users)
      .values({ name: "Integration User", email })
      .returning();
    expect(created.id).toBeTruthy();

    const [found] = await db.select().from(users).where(eq(users.email, email));
    expect(found.name).toBe("Integration User");

    await db.delete(users).where(eq(users.id, created.id));
  });
});
```

- [ ] **Step 9: Run the integration test to verify it passes**

Run: `pnpm dotenv -e .env.local -- pnpm test:integration`
Expected: 1 passed (requires `supabase start` running and the migration applied).

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "feat: add Drizzle db seam, schema, migration, and integration test"
```

---

## Task 7: Auth seam (`lib/auth`)

**Files:**
- Create: `src/lib/auth/types.ts`, `src/lib/auth/fake.ts`, `src/lib/auth/supabase.ts`, `src/lib/auth/index.ts`, `src/lib/auth/auth.contract.test.ts`

- [ ] **Step 1: Define the auth interface**

Create `src/lib/auth/types.ts`:
```ts
export type AuthUser = {
  id: string;
  email: string;
};

export interface AuthProvider {
  signUp(email: string, password: string): Promise<AuthUser>;
  signIn(email: string, password: string): Promise<{ user: AuthUser; token: string }>;
  verify(token: string): Promise<AuthUser | null>;
}
```

- [ ] **Step 2: Write the failing contract test against an in-memory provider**

Create `src/lib/auth/auth.contract.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { InMemoryAuthProvider } from "./fake";
import type { AuthProvider } from "./types";

function runContract(name: string, make: () => AuthProvider) {
  describe(name, () => {
    it("signs up, signs in, and verifies the issued token", async () => {
      const auth = make();
      const created = await auth.signUp("a@example.com", "pw");
      expect(created.email).toBe("a@example.com");

      const { user, token } = await auth.signIn("a@example.com", "pw");
      expect(user.id).toBe(created.id);

      const verified = await auth.verify(token);
      expect(verified?.id).toBe(created.id);
    });

    it("returns null when verifying an unknown token", async () => {
      const auth = make();
      expect(await auth.verify("bogus")).toBeNull();
    });
  });
}

runContract("InMemoryAuthProvider", () => new InMemoryAuthProvider());
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `pnpm test src/lib/auth`
Expected: FAIL — "Cannot find module './fake'".

- [ ] **Step 4: Implement the in-memory provider**

Create `src/lib/auth/fake.ts`:
```ts
import type { AuthProvider, AuthUser } from "./types";

export class InMemoryAuthProvider implements AuthProvider {
  private users = new Map<string, { user: AuthUser; password: string }>();
  private tokens = new Map<string, string>(); // token -> userId
  private seq = 0;

  async signUp(email: string, password: string): Promise<AuthUser> {
    const id = `user_${++this.seq}`;
    const user: AuthUser = { id, email };
    this.users.set(email, { user, password });
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
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `pnpm test src/lib/auth`
Expected: 2 passed.

- [ ] **Step 6: Implement the Supabase adapter and factory**

Run: `pnpm add @supabase/supabase-js`

Create `src/lib/auth/supabase.ts`:
```ts
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { AuthProvider, AuthUser } from "./types";

export class SupabaseAuthProvider implements AuthProvider {
  constructor(private readonly sb: SupabaseClient) {}

  static fromConfig(url: string, anonKey: string): SupabaseAuthProvider {
    return new SupabaseAuthProvider(createClient(url, anonKey));
  }

  async signUp(email: string, password: string): Promise<AuthUser> {
    const { data, error } = await this.sb.auth.signUp({ email, password });
    if (error || !data.user) throw new Error(error?.message ?? "signUp failed");
    return { id: data.user.id, email: data.user.email ?? email };
  }

  async signIn(email: string, password: string) {
    const { data, error } = await this.sb.auth.signInWithPassword({ email, password });
    if (error || !data.user || !data.session) {
      throw new Error(error?.message ?? "signIn failed");
    }
    return {
      user: { id: data.user.id, email: data.user.email ?? email },
      token: data.session.access_token,
    };
  }

  async verify(token: string): Promise<AuthUser | null> {
    const { data, error } = await this.sb.auth.getUser(token);
    if (error || !data.user) return null;
    return { id: data.user.id, email: data.user.email ?? "" };
  }
}
```

Create `src/lib/auth/index.ts`:
```ts
import { config } from "@/lib/config";
import type { AuthProvider } from "./types";
import { SupabaseAuthProvider } from "./supabase";

export type { AuthProvider, AuthUser } from "./types";

export function getAuthProvider(): AuthProvider {
  return SupabaseAuthProvider.fromConfig(config.supabaseUrl, config.supabaseAnonKey);
}
```

- [ ] **Step 7: Verify typecheck and tests pass**

Run: `pnpm typecheck && pnpm test src/lib/auth`
Expected: typecheck clean; 2 passed.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: add auth seam with in-memory and Supabase providers"
```

---

## Task 8: Health endpoint

**Files:**
- Create: `src/app/api/health/route.ts`, `src/app/api/health/health.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/app/api/health/health.test.ts`:
```ts
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/db/ping", () => ({ pingDb: vi.fn() }));
import { pingDb } from "@/lib/db/ping";
import { GET } from "./route";

describe("GET /api/health", () => {
  beforeEach(() => vi.resetAllMocks());

  it("returns 200 and ok when the database is reachable", async () => {
    vi.mocked(pingDb).mockResolvedValue(true);
    const res = await GET();
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ status: "ok", db: "up" });
  });

  it("returns 503 when the database is unreachable", async () => {
    vi.mocked(pingDb).mockResolvedValue(false);
    const res = await GET();
    expect(res.status).toBe(503);
    await expect(res.json()).resolves.toEqual({ status: "degraded", db: "down" });
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm test src/app/api/health`
Expected: FAIL — "Cannot find module './route'".

- [ ] **Step 3: Implement the route**

Create `src/app/api/health/route.ts`:
```ts
import { NextResponse } from "next/server";
import { pingDb } from "@/lib/db/ping";

// Never prerender/cache — this route checks live DB connectivity per request.
export const dynamic = "force-dynamic";

export async function GET() {
  const up = await pingDb();
  return NextResponse.json(
    up ? { status: "ok", db: "up" } : { status: "degraded", db: "down" },
    { status: up ? 200 : 503 },
  );
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm test src/app/api/health`
Expected: 2 passed.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add /api/health endpoint backed by db ping"
```

---

## Task 9: Portable container

**Files:**
- Create: `Dockerfile`, `.dockerignore`

- [ ] **Step 1: Create `.dockerignore`**

Create `.dockerignore`:
```
node_modules
.next
.git
.env*.local
supabase
*.md
```

- [ ] **Step 2: Create the multi-stage Dockerfile**

Create `Dockerfile`:
```dockerfile
# syntax=docker/dockerfile:1
FROM node:20-alpine AS deps
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

FROM node:20-alpine AS builder
WORKDIR /app
RUN corepack enable
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Build-time placeholders so the fail-fast `config` singleton can evaluate during
# `next build` — Next imports the health route's module graph (config + db client)
# when it collects routes. These are NOT runtime values: the real env is supplied
# at run time via --env-file / the platform, and `postgres()` is lazy so the
# placeholder DB URL is never dialed at build. (No client component reads
# NEXT_PUBLIC_* in v1, so nothing wrong is baked into a shipped client bundle.)
ENV NODE_ENV=production \
    DATABASE_URL="postgresql://placeholder:placeholder@127.0.0.1:5432/placeholder" \
    NEXT_PUBLIC_SUPABASE_URL="https://placeholder.supabase.co" \
    NEXT_PUBLIC_SUPABASE_ANON_KEY="placeholder-anon-key"
RUN pnpm build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
EXPOSE 3000
CMD ["node", "server.js"]
```

- [ ] **Step 3: Build the image**

Run: `docker build -t sport-app:dev .`
Expected: build completes with "naming to docker.io/library/sport-app:dev"; exit code 0.

- [ ] **Step 4: Run the container and verify it serves the health endpoint**

Run (Supabase must be running; `--network host` lets the container reach local Supabase on 127.0.0.1):
```bash
docker run --rm -d --name sport-app-test --network host --env-file .env.local sport-app:dev
sleep 3
curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3000/api/health
docker stop sport-app-test
```
Expected: prints `200` (the containerized app booted, validated config, and reached the database). On Docker Desktop (macOS/Windows) where `--network host` is limited, instead map the port with `-p 3000:3000` and set `DATABASE_URL`/`NEXT_PUBLIC_SUPABASE_URL` to `host.docker.internal`; expect `200` the same way.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add multi-stage Dockerfile for portable standalone image"
```

---

## Task 10: App-repo README (local-dev runbook)

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Replace `README.md` with the runbook**

Create/replace `README.md`:
```markdown
# sport-app

Multi-sport recreational coordination app. One Next.js app, two route groups
(`(client)` for players/organizers, `(venue)` for venue owners). Foundation
follows the "portable seams" design: vendor touchpoints live behind `src/lib/`
adapters so the managed stack (Vercel + Supabase) can be swapped without an
app rewrite.

## Prerequisites
- Node 20+, pnpm 9+, Docker, Supabase CLI

## Local development
1. `pnpm install`
2. `supabase start` — starts local Postgres + auth
3. `cp .env.example .env.local` and fill keys from `supabase start` output
4. `pnpm dotenv -e .env.local -- drizzle-kit migrate` — apply schema
5. `pnpm dev` — run the app at http://localhost:3000

## Testing
- `pnpm test` — unit/contract tests
- `pnpm dotenv -e .env.local -- pnpm test:integration` — DB integration tests (needs `supabase start`)
- `pnpm typecheck` — TypeScript

## Layout
- `src/lib/config` — typed, fail-fast env (only place env vars are read)
- `src/lib/db` — Drizzle schema + client; `migrations/` is the schema source of truth
- `src/lib/auth` — `AuthProvider` interface + Supabase adapter + in-memory fake
- `src/app/api/health` — health endpoint used by deploy gates
```

- [ ] **Step 2: Verify the full check suite passes**

Run: `pnpm typecheck && pnpm test && pnpm build`
Expected: typecheck clean; all unit/contract tests pass; build succeeds.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "docs: add local-dev runbook README"
```

---

## Definition of Done (Plan 1)

- `pnpm typecheck && pnpm test && pnpm build` all pass.
- `pnpm dotenv -e .env.local -- pnpm test:integration` passes with local Supabase running.
- `docker build` produces an image that serves `GET /api/health` → `200`.
- All vendor access is behind `src/lib/{config,db,auth}` — no `@supabase/*` import outside `src/lib/`.
- Schema lives in `migrations/`; `.env.example` and the Zod schema are parity-tested.

**Next:** Plan 2 (CI pipeline) wires these checks into `.github/workflows/ci.yml` (gitleaks, lint, the unit + integration tests, Semgrep/Trivy, container build, Playwright smoke E2E — health + the two route-group surfaces; the full core loop arrives with feature work).
