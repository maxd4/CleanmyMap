import { test, expect, type Page } from "@playwright/test";

async function openPreferences(page: Page) {
  const trigger = page.getByRole("button", { name: /Menu des préférences d['’]affichage et langue/i });
  await expect(trigger).toBeVisible();
  await trigger.click();
  const panel = page.locator("#preferences-menu-panel:visible");
  await expect(panel).toBeVisible();
  return panel;
}

async function assertNoPageErrors(errors: string[], surface: string): Promise<void> {
  expect(errors, `${surface} page errors`).toEqual([]);
}

test.describe("campaign 3a1 — locale and Explorer", () => {
  test("switches the homepage hero locale without overlap or persistence loss", async ({ page }, testInfo) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.stack ?? error.message));
    await page.context().clearCookies();
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.evaluate(() => localStorage.clear());
    await page.reload({ waitUntil: "domcontentloaded" });

    const switcher = page.getByRole("group", { name: "Choisir la langue" });
    const english = switcher.getByRole("button", { name: "Anglais", exact: true });
    const french = switcher.getByRole("button", { name: "Français", exact: true });
    await expect(switcher).toBeVisible();
    await expect(french).toHaveAttribute("aria-pressed", "true");
    await french.focus();
    await expect(french).toBeFocused();

    for (const width of [390, 768, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      const geometry = await page.evaluate(() => {
        const title = document.querySelector<HTMLElement>("[data-homepage-hero-title-row]");
        const heading = title?.querySelector<HTMLElement>("h1");
        const localeSwitcher = title?.querySelector<HTMLElement>("[data-homepage-locale-switcher]");
        if (!title || !heading || !localeSwitcher) return null;
        const titleRect = heading.getBoundingClientRect();
        const switcherRect = localeSwitcher.getBoundingClientRect();
        return {
          titleRight: titleRect.right,
          switcherLeft: switcherRect.left,
          switcherRight: switcherRect.right,
          viewportWidth: window.innerWidth,
          titleTop: titleRect.top,
          titleBottom: titleRect.bottom,
          switcherTop: switcherRect.top,
          overflow: document.documentElement.scrollWidth - window.innerWidth,
        };
      });
      expect(geometry).not.toBeNull();
      expect(geometry?.switcherRight).toBeLessThanOrEqual(geometry?.viewportWidth ?? 0);
      expect(geometry?.switcherLeft).toBeGreaterThanOrEqual(0);
      // Chromium may report a 1–2 px fractional rounding remainder for the
      // full-page map/canvas; the hero row itself is checked by its bounds.
      expect(geometry?.overflow ?? 3).toBeLessThanOrEqual(2);
      const isSeparated =
        (geometry?.switcherLeft ?? 0) >= (geometry?.titleRight ?? 0) - 1 ||
        (geometry?.switcherTop ?? 0) >= (geometry?.titleBottom ?? 0) - 1;
      expect(isSeparated).toBe(true);
      await testInfo.attach(`homepage-hero-${width}`, {
        body: await page.screenshot({ fullPage: true }),
        contentType: "image/png",
      });
    }

    await english.press("Enter");
    await expect.poll(() => page.evaluate(() => localStorage.getItem("cleanmymap.locale"))).toBe("en");
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    await expect(page.getByText("Cleaner places, together", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Ribbon tutorial", exact: true })).toBeVisible();
    await expect(page.getByRole("group", { name: "Choose language" }).getByRole("button", { name: "English", exact: true })).toHaveAttribute("aria-pressed", "true");

    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    await expect(page.getByText("Cleaner places, together", { exact: true })).toBeVisible();

    const englishSwitcher = page.getByRole("group", { name: "Choose language" });
    await englishSwitcher.getByRole("button", { name: "French", exact: true }).click();
    await expect.poll(() => page.evaluate(() => localStorage.getItem("cleanmymap.locale"))).toBe("fr");
    await expect(page.locator("html")).toHaveAttribute("lang", "fr");
    await expect(page.getByText("Des territoires plus propres, ensemble", { exact: true })).toBeVisible();
    await assertNoPageErrors(errors, "homepage locale switcher");
  });

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
      { name: "cleanmymap.locale", value: "fr", url: "http://localhost:3000" },
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
    await page.waitForTimeout(500);
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
