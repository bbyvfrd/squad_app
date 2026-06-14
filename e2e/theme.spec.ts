// e2e/theme.spec.ts
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const LIGHT_BG = "rgb(235, 231, 219)"; // --linen-200 Warm Linen
const DARK_BG = "rgb(12, 24, 32)"; // --steel-800

// The /app proxy guard now bounces anonymous visitors to /signin, so the theme
// proofs (which render the in-app Topbar/ThemeToggle) need a real session first.
// We mint one the cheap way: POST /api/v1/auth/signup, which writes the httpOnly
// session cookie into the page's BrowserContext (shared cookie jar between
// page.request and page navigations). Email confirmations are OFF for the demo
// (§9), so signup returns a usable session immediately. The CSRF gate (§7) needs
// both the x-squad-csrf custom header and a same-origin Origin — so we resolve the
// origin from the configured baseURL and send both.
async function authenticate(page: Page, baseURL: string | undefined) {
  const origin = new URL(baseURL ?? "http://127.0.0.1:3000").origin;
  const email = `theme-${Date.now()}-${Math.floor(Math.random() * 1e6)}@example.com`;
  const res = await page.request.post("/api/v1/auth/signup", {
    headers: { "content-type": "application/json", "x-squad-csrf": "1", origin },
    data: { email, password: "password1", fullName: "Theme Tester", displayName: null },
  });
  expect(res.status(), await res.text()).toBe(201);
}

test("light is the default and uses the warm linen page", async ({ page, baseURL }) => {
  await authenticate(page, baseURL);
  await page.goto("/app");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await expect(page.locator("body")).toHaveCSS("background-color", LIGHT_BG);
  const font = await page.locator("h1").evaluate((el) => getComputedStyle(el).fontFamily);
  expect(font).toMatch(/Montserrat/i);
  await page.screenshot({ path: "test-results/proof-light.png", fullPage: true });
});

test("dark theme applies without a light flash", async ({ page, baseURL }) => {
  await authenticate(page, baseURL);
  await page.addInitScript(() => localStorage.setItem("theme", "dark"));
  await page.goto("/app", { waitUntil: "domcontentloaded" });
  // next-themes' pre-hydration script must have set the attribute already.
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(page.locator("body")).toHaveCSS("background-color", DARK_BG);
  await page.screenshot({ path: "test-results/proof-dark.png", fullPage: true });
});

test("toggle switches theme from the topbar", async ({ page, baseURL }) => {
  await authenticate(page, baseURL);
  await page.goto("/app");
  await page.getByRole("button", { name: "Switch to dark mode" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
});

test("proof page has no serious a11y violations in either theme", async ({ page, baseURL }) => {
  await authenticate(page, baseURL);
  for (const theme of ["light", "dark"]) {
    await page.addInitScript((t) => localStorage.setItem("theme", t as string), theme);
    await page.goto("/app");
    const results = await new AxeBuilder({ page }).analyze();
    const serious = results.violations.filter(
      (v) => v.impact === "serious" || v.impact === "critical",
    );
    expect(serious, JSON.stringify(serious, null, 2)).toEqual([]);
  }
});
