// e2e/auth-backend.spec.ts
// The auth half of the golden path against the live backend (design §11.6):
// signup with email/password lands in /app, then signin and signout work, and the
// inert controls (social, phone tab, remember toggle) never call auth. Unlike
// e2e/auth.spec.ts (static screens), this hits /api/v1/auth/* + real Supabase, so
// it runs under `pnpm start` with .env.local loaded (same webServer as the smoke).
//
// Precondition (§9): email confirmations must be OFF in the live Supabase project,
// so signUp returns a session immediately and the /intent -> /app step is reachable.
// Locally that is set in supabase/config.toml ([auth.email] enable_confirmations =
// false). If confirmations are ON, signup never returns a session and these specs
// hang at /intent — that's the documented demo precondition, not a test bug.
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
  await page.getByLabel("Password", { exact: true }).fill(PASSWORD);
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
  await page.getByLabel("Password", { exact: true }).fill(PASSWORD);
  await page.getByRole("button", { name: /create account/i }).click();
  await expect(page).toHaveURL(/\/intent$/);
  await page.getByRole("button", { name: /continue/i }).click();
  await expect(page).toHaveURL(/\/app$/);
  await page.getByRole("button", { name: /sign out/i }).click();
  await expect(page).toHaveURL(/\/welcome$/);

  // Now sign in fresh.
  await page.goto("/signin");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(PASSWORD);
  await page.getByRole("button", { name: /log in/i }).click();
  await expect(page).toHaveURL(/\/app$/);
});

test("bad credentials show an inline error and stay on /signin", async ({ page }) => {
  await page.goto("/signin");
  await page.getByLabel("Email").fill(freshEmail());
  await page.getByLabel("Password", { exact: true }).fill("wrong-password");
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
