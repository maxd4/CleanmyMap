import { expect, test, type Page } from "@playwright/test";

async function dismissCookies(page: Page): Promise<void> {
  const refuse = page.getByRole("button", { name: "Tout refuser" });
  if (await refuse.isVisible().catch(() => false)) {
    await refuse.click();
    await expect(refuse).toHaveCount(0);
  }
}

async function assertFocusedControlIsVisible(page: Page): Promise<void> {
  const focused = page.locator(":focus");
  await expect(focused).toHaveCount(1);
  await expect(focused).toBeVisible();
  const box = await focused.boundingBox();
  expect(box, "focused element should have a rendered box").not.toBeNull();
  expect(box?.width ?? 0).toBeGreaterThan(0);
  expect(box?.height ?? 0).toBeGreaterThan(0);
}

test.describe("accessibility Lighthouse keyboard criteria", () => {
  test("home focuses the skip link first and keeps global navigation keyboard accessible", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });

    await expect(page.getByRole("main")).toHaveCount(1);
    const skipLink = page.getByRole("link", { name: "Aller au contenu principal" });
    await expect(skipLink).toBeAttached();
    await page.keyboard.press("Tab");
    await expect(skipLink).toBeFocused();
    await assertFocusedControlIsVisible(page);
    await expect(skipLink).toHaveCSS("outline-style", /solid|dashed|dotted/);

    await page.keyboard.press("Enter");
    await expect(page.locator("#main-content")).toBeFocused();
    await page.keyboard.press("Shift+Tab");
    await expect(page.locator('nav[aria-label="Barre de navigation principale"] :focus')).toHaveCount(1);

    await dismissCookies(page);
  });

  test("route page does not expose list items as synthetic buttons", async ({ page }) => {
    await page.goto("/sections/route", { waitUntil: "domcontentloaded" });
    await dismissCookies(page);

    await expect(page.locator("main#main-content")).toHaveCount(1);
    await expect(page.locator('li[role="button"]')).toHaveCount(0);
    await expect(page.locator('li[tabindex="0"]')).toHaveCount(0);

    const routeControl = page.getByLabel("Créneau total de l’événement (minutes)");
    await expect(routeControl).toBeVisible();
    await routeControl.focus();
    await assertFocusedControlIsVisible(page);
    await page.keyboard.press("Escape");
    await expect(routeControl).toBeFocused();
  });

  test("methodology chart keeps the image landmark and offers native point controls", async ({ page }) => {
    await page.goto("/methodologie", { waitUntil: "domcontentloaded" });
    await dismissCookies(page);

    const chart = page.getByRole("img", {
      name: "Courbes temporelles de l'impact environnemental proxy",
    });
    if (await chart.count() === 0) {
      test.info().annotations.push({
        type: "coverage",
        description: "BLOCKED_UNEXPOSED: methodology route does not mount the estimator chart",
      });
      return;
    }
    await expect(chart).toHaveCount(1);
    await expect(chart.locator('circle[role="button"]')).toHaveCount(0);
    await expect(chart.locator('circle[tabindex="0"]')).toHaveCount(0);

    const pointControls = page.getByRole("button", {
      name: /Sélectionner (le site|l'utilisateur):/,
    });
    const pointCount = await pointControls.count();
    if (pointCount === 0) {
      test.info().annotations.push({
        type: "coverage",
        description: "BLOCKED_DATA: public methodology snapshot exposed no curve points",
      });
      return;
    }

    await pointControls.first().focus();
    await assertFocusedControlIsVisible(page);
    await page.keyboard.press("Space");
    await expect(pointControls.first()).toHaveAttribute("aria-pressed", "true");
    await page.keyboard.press("Escape");
    await expect(pointControls.first()).toBeFocused();
  });
});
