import { test, expect } from "@playwright/test";

test("health endpoint reports ok when the database is reachable", async ({ request }) => {
  const res = await request.get("/api/health");
  expect(res.status()).toBe(200);
  await expect(res.json()).resolves.toEqual({ status: "ok", db: "up" });
});

// The client surface lives at /app (route group app/(client)/app), not /. There is no
// root page in v1, so we assert against the path the page actually renders at.
test("client surface renders", async ({ page }) => {
  await page.goto("/app");
  await expect(page.getByText("Client surface (player / organizer)")).toBeVisible();
});

test("venue surface renders", async ({ page }) => {
  await page.goto("/venue");
  await expect(page.getByText("Venue owner surface")).toBeVisible();
});

// PLACEHOLDER (feature work): the full core loop signup -> create game -> request -> approve
// is added here once those routes exist and a real preview deploy is available.
