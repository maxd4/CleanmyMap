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

  for (const scenario of [
    { name: "normal", reducedMotion: "no-preference" as const, displayMode: "exhaustif" },
    { name: "reduced motion", reducedMotion: "reduce" as const, displayMode: "exhaustif" },
    { name: "sobre", reducedMotion: "no-preference" as const, displayMode: "sobre" },
  ]) {
    test(`messagerie hydrate sans divergence en mode ${scenario.name}`, async ({ page }) => {
      const hydrationErrors: string[] = [];
      page.on("pageerror", (error) => {
        if (/hydration|hydration failed|mismatch/i.test(String(error))) {
          hydrationErrors.push(String(error));
        }
      });
      page.on("console", (message) => {
        if (message.type() === "error" && /hydration|mismatch/i.test(message.text())) {
          hydrationErrors.push(message.text());
        }
      });
      await page.emulateMedia({ reducedMotion: scenario.reducedMotion });
      await page.addInitScript((displayMode) => {
        window.localStorage.setItem("cleanmymap.display_mode", displayMode);
      }, scenario.displayMode);

      const response = await page.goto("/sections/messagerie?tab=discussions");

      expect(response?.status()).toBe(200);
      await expect(page.locator('[role="tablist"][aria-label="Sections de la messagerie"]')).toBeVisible();
      await expect(page.locator('#connect-tab-discussions[role="tab"]')).toHaveAttribute(
        "aria-selected",
        "true",
      );
      expect(hydrationErrors).toEqual([]);
    });
  }
});
