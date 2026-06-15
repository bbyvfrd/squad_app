// e2e/helpers/auth.ts
// Shared e2e auth fixture. The /app proxy guard bounces anonymous visitors to /signin,
// so any spec that renders an in-app surface needs a real session first. We mint one
// the cheap way: POST /api/v1/auth/signup, which writes the httpOnly session cookie into
// the page's BrowserContext (shared cookie jar between page.request and page navigations).
// Email confirmations are OFF for the demo (§9), so signup returns a usable session
// immediately. The CSRF gate (§7) needs both the x-squad-csrf custom header and a
// same-origin Origin — so we resolve the origin from the configured baseURL and send both.
import { expect, type Page } from "@playwright/test";

export async function authenticate(page: Page, baseURL: string | undefined) {
  const origin = new URL(baseURL ?? "http://127.0.0.1:3000").origin;
  const email = `e2e-${Date.now()}-${Math.floor(Math.random() * 1e6)}@example.com`;
  const res = await page.request.post("/api/v1/auth/signup", {
    headers: { "content-type": "application/json", "x-squad-csrf": "1", origin },
    data: { email, password: "password1", fullName: "E2E Tester", displayName: null },
  });
  expect(res.status(), await res.text()).toBe(201);
}
