import { expect, test } from "@playwright/test";

test.describe("public smoke", () => {
  test("homepage renders without a server error", async ({ page }) => {
    const response = await page.goto("/");

    expect(response).not.toBeNull();
    expect(response?.status()).toBeLessThan(500);
    await expect(page.locator("body")).toBeVisible();
  });

  test("sign-in renders without a server error", async ({ page }) => {
    const response = await page.goto("/sign-in");

    expect(response).not.toBeNull();
    expect(response?.status()).toBeLessThan(500);
    await expect(page.locator("body")).toBeVisible();
  });

  test("health endpoint returns a non-server-error response", async ({
    request,
  }) => {
    const response = await request.get("/api/health");

    expect(response.status()).toBeLessThan(500);
  });

  test("uptime endpoint returns a non-server-error response", async ({
    request,
  }) => {
    const response = await request.get("/api/uptime");

    expect(response.status()).toBeLessThan(500);
  });
});
