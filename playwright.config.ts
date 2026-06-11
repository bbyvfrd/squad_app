import { defineConfig, devices } from "@playwright/test";

// When PLAYWRIGHT_BASE_URL is set (deploy.yml smoke), target that deployment
// and skip the local webServer. Unset (local dev / ci.yml), boot `pnpm start`.
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3000";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: "html",
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: process.env.PLAYWRIGHT_BASE_URL
    ? undefined
    : {
        command: "pnpm start",
        // Probe the health route, not `/`: there is no root page in v1 (only /app and /venue),
        // so `/` returns 404 and Playwright would never see a ready (2xx/3xx) response. `pnpm start`
        // (next start) auto-loads .env.local, so the health route reports db-up.
        url: "http://127.0.0.1:3000/api/health",
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
});
