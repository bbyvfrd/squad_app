import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

// Integration tests hit a REAL Postgres, so the caller must supply DATABASE_URL
// (and the other config vars) at run time: locally via
// `pnpm dotenv -e .env.local -- pnpm test:integration`, and in CI via the job's
// env/secrets (Plan 2). Intentionally no dummy `env` block here — a placeholder
// URL would point the tests at a database that does not exist.
export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: "node",
    include: ["src/**/*.integration.test.ts"],
  },
});
