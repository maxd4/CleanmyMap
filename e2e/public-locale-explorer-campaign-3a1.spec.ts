import { test, expect, type Page } from "@playwright/test";

async function openPreferences(page: Page) {
  const trigger = page.locator('summary[aria-controls="preferences-menu-panel"]').last();
  await expect(trigger).toBeVisible();
  await trigger.hover();
  const panel = page.locator("#preferences-menu-panel:visible");
  await expect(panel).toBeVisible();
  return panel;
}

async function assertNoPageErrors(errors: string[], surface: string): Promise<void> {
  expect(errors, `${surface} page errors`).toEqual([]);
}

test.describe("campaign 3a1 — locale and Explorer", () => {
  test("persists locale selection and keeps the server locale stable", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.stack ?? error.message));
    await page.context().clearCookies();

    await page.goto("/methodologie", { waitUntil: "domcontentloaded" });
    await page.evaluate(() => localStorage.clear());
    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page.locator("html")).toHaveAttribute("lang", "fr");

    const panel = await openPreferences(page);
    await panel.locator("#locale-switch").selectOption("en");
    await expect.poll(
      () => page.evaluate(() => localStorage.getItem("cleanmymap.locale")).catch(() => null),
      { timeout: 15_000 },
    ).toBe("en");
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    await expect.poll(
      () => page.evaluate(() => document.cookie.includes("cleanmymap.locale=en")),
      { timeout: 5_000 },
    ).toBe(true);

    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    await expect.poll(
      () => page.evaluate(() => localStorage.getItem("cleanmymap.locale")),
      { timeout: 5_000 },
    ).toBe("en");
    await assertNoPageErrors(errors, "locale persistence");
  });

  test("migrates legacy localStorage en over a fr server default without a loop", async ({ page }) => {
    const errors: string[] = [];
    let mainFrameNavigations = 0;
    page.on("pageerror", (error) => errors.push(error.stack ?? error.message));
    page.on("framenavigated", (frame) => {
      if (frame === page.mainFrame()) mainFrameNavigations += 1;
    });

    await page.context().clearCookies();
    await page.goto("/methodologie", { waitUntil: "domcontentloaded" });
    await page.evaluate(() => {
      localStorage.clear();
      localStorage.setItem("cleanmymap.locale", "en");
    });
    await page.context().addCookies([
      { name: "cleanmymap.locale", value: "fr", url: "http://127.0.0.1:3000" },
    ]);
    await page.reload({ waitUntil: "domcontentloaded" });
    await expect.poll(
      () => page.evaluate(() => localStorage.getItem("cleanmymap.locale")),
      { timeout: 10_000 },
    ).toBe("en");
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    await expect.poll(
      () => page.evaluate(() => document.cookie.includes("cleanmymap.locale=en")),
      { timeout: 5_000 },
    ).toBe(true);
    const stableNavigationCount = mainFrameNavigations;
    await page.waitForTimeout(1_500);
    expect(mainFrameNavigations).toBe(stableNavigationCount);
    await assertNoPageErrors(errors, "legacy locale migration");
  });

  test("renders the public Explorer and reaches a real target link", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.stack ?? error.message));
    await page.context().clearCookies();

    const response = await page.goto("/explorer", { waitUntil: "domcontentloaded" });
    expect(response?.status()).toBe(200);
    await expect(page.getByRole("heading", { name: "Sommaire" })).toBeVisible();
    await expect(page.locator("article")).not.toHaveCount(0);

    const actionLink = page.locator('article a[href="/actions/new"]').first();
    await expect(actionLink).toBeVisible();
    await actionLink.click();
    await expect(page).toHaveURL(/\/actions\/new(?:[?#].*)?$/);
    await assertNoPageErrors(errors, "Explorer");
  });
});
