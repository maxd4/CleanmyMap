import { expect, test, type Page } from "@playwright/test";

async function waitForRenderCycles(page: Page, count = 2) {
  await page.evaluate(async (cycles) => {
    for (let index = 0; index < cycles; index += 1) {
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    }
  }, count);
}

test.describe("homepage community credibility reveal", () => {
  test("keeps the third section visible through hydration, revalidation and scroll", async ({
    page,
  }) => {
    const activityResponse = page.waitForResponse(
      (response) => response.url().includes("/api/homepage/activity"),
      { timeout: 15_000 },
    );
    await page.goto("/", { waitUntil: "domcontentloaded" });

    const section = page.locator('[data-homepage-section="community-credibility"]');
    const revealedContent = section.locator("[data-gsap-reveal]").first();
    await expect(section).toBeVisible();
    await expect(revealedContent).toBeVisible();
    await activityResponse;

    await waitForRenderCycles(page, 2);
    await expect(section).toBeVisible();
    await expect(revealedContent).toBeVisible();

    await section.scrollIntoViewIfNeeded();
    await waitForRenderCycles(page, 2);
    await expect(section).toBeVisible();
    await expect(revealedContent).toBeVisible();
  });

  test("keeps the third section visible with reduced motion", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/", { waitUntil: "domcontentloaded" });

    const section = page.locator('[data-homepage-section="community-credibility"]');
    await expect(section.locator("[data-gsap-reveal]").first()).toBeVisible();
    await waitForRenderCycles(page, 2);
    await expect(section).toBeVisible();
  });
});
