// e2e/auth.spec.ts
// Smoke + axe gate for the Plan 07 auth/first-run screens (app/(auth)/, light-only
// Direction B). These routes are static (no DB), so they render under `pnpm start`
// without Supabase. Mirrors the zero-serious/critical axe bar from theme.spec.ts;
// the auth screens are light-only, so there is no theme loop here.
import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

// Each route + a stable bit of copy that proves the screen rendered. `/boot`
// auto-redirects to `/welcome` after ~1.6s, so assert its eyebrow before the push
// lands (waitUntil "commit" returns as soon as the response starts, beating the timer).
test.describe("auth screens render", () => {
  test("boot shows the warming-up eyebrow before it redirects", async ({ page }) => {
    await page.goto("/boot", { waitUntil: "commit" });
    await expect(page.getByText("Warming up the pitch")).toBeVisible();
  });

  test("welcome shows the first onboarding slide", async ({ page }) => {
    await page.goto("/welcome");
    await expect(page.getByRole("heading", { name: "Games on a map near you" })).toBeVisible();
  });

  test("signup shows the create-account title", async ({ page }) => {
    await page.goto("/signup");
    await expect(page.getByRole("heading", { name: "Create your account" })).toBeVisible();
  });

  test("signin shows the welcome-back title", async ({ page }) => {
    await page.goto("/signin");
    await expect(page.getByRole("heading", { name: "Welcome back" })).toBeVisible();
  });

  test("verify shows the enter-the-code title", async ({ page }) => {
    await page.goto("/verify");
    await expect(page.getByRole("heading", { name: "Enter the code" })).toBeVisible();
  });

  test("intent shows the how-you-use-SQUAD title", async ({ page }) => {
    await page.goto("/intent");
    // The title splits "SQUAD?" into a terracotta <span>, so match the lead text.
    await expect(page.getByRole("heading", { name: /How will you use SQUAD\?/ })).toBeVisible();
  });
});

test("signup method toggle swaps email <-> phone fields", async ({ page }) => {
  await page.goto("/signup");
  // Email is the default method: the email field is present, no phone field yet.
  await expect(page.getByLabel("Email")).toBeVisible();
  await expect(page.getByLabel("Phone number")).toHaveCount(0);

  // Toggle to Phone: the phone-number field appears and the email field is gone.
  await page.getByRole("button", { name: "Phone" }).click();
  await expect(page.getByLabel("Phone number")).toBeVisible();
  await expect(page.getByLabel("Email")).toHaveCount(0);
});

// Same zero-serious/critical contract as the /app proof page (theme.spec.ts), run on
// the four content-heavy auth screens. Light-only, so no theme loop. /boot is excluded
// (it self-redirects); /verify is covered by the render smoke above.
for (const path of ["/welcome", "/signup", "/signin", "/intent"]) {
  test(`no serious a11y violations on ${path}`, async ({ page }) => {
    await page.goto(path);
    const results = await new AxeBuilder({ page }).analyze();
    const serious = results.violations.filter(
      (v) => v.impact === "serious" || v.impact === "critical",
    );
    expect(serious, JSON.stringify(serious, null, 2)).toEqual([]);
  });
}
