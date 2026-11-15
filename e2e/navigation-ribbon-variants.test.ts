import { mkdirSync } from "node:fs";
import path from "node:path";
import { expect, test, type Locator, type Page } from "@playwright/test";

const SCREENSHOT_DIRECTORY = path.join(process.cwd(), "artifacts", "playwright", "navigation-ribbon-classic");

async function dismissCookies(page: Page): Promise<void> {
  const refuse = page.getByRole("button", { name: "Tout refuser" });
  await refuse.waitFor({ state: "visible", timeout: 3_000 }).catch(() => undefined);
  if (await refuse.isVisible().catch(() => false)) {
    await refuse.click();
    await expect(refuse).toHaveCount(0);
  }
}

async function waitForRibbon(page: Page): Promise<Locator> {
  await page.waitForLoadState("load");
  const ribbon = page.locator('nav[aria-label="Navigation par blocs"]');
  await expect(ribbon).toBeVisible();
  await expect(ribbon.locator("[data-navigation-block-trigger]")).toHaveCount(5);
  return ribbon;
}

async function assertNoRibbonOverflow(page: Page, width: number): Promise<void> {
  const metrics = await page.evaluate(() => {
    const navigation = document.querySelector<HTMLElement>('nav[aria-label="Barre de navigation principale"]');
    if (!navigation) throw new Error("Missing global navigation ribbon");

    const visible = (element: HTMLElement) => {
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return style.display !== "none" && style.visibility !== "hidden" && rect.width > 0 && rect.height > 0;
    };
    const overlaps = (first: DOMRect, second: DOMRect) =>
      Math.min(first.right, second.right) - Math.max(first.left, second.left) > 1
      && Math.min(first.bottom, second.bottom) - Math.max(first.top, second.top) > 1;
    const controls = [...navigation.querySelectorAll<HTMLElement>("a, button")].filter(visible);
    const controlCollisions = controls.flatMap((first, firstIndex) =>
      controls.slice(firstIndex + 1).filter((second) => overlaps(first.getBoundingClientRect(), second.getBoundingClientRect())).map((second) => [first.getAttribute("aria-label"), second.getAttribute("aria-label")]),
    );

    return {
      controlCollisions,
      scrollWidth: document.documentElement.scrollWidth,
      viewportWidth: window.innerWidth,
    };
  });

  expect(metrics.controlCollisions, `ribbon controls overlap at ${width}px`).toEqual([]);
  expect(metrics.scrollWidth, `horizontal overflow at ${width}px`).toBeLessThanOrEqual(metrics.viewportWidth + 1);
}

async function captureRibbonArea(page: Page, ribbon: Locator, outputPath: string): Promise<Buffer> {
  const box = await ribbon.boundingBox();
  if (!box) throw new Error("Missing ribbon screenshot bounds");
  return page.screenshot({
    path: outputPath,
    clip: { x: Math.max(0, box.x - 8), y: Math.max(0, box.y - 20), width: box.width + 16, height: box.height + 20 },
  });
}

test.describe("canonical classic navigation ribbon", () => {
  test("keeps one centered five-block dock with active and hover accents", async ({ page }, testInfo) => {
    test.setTimeout(120_000);
    mkdirSync(SCREENSHOT_DIRECTORY, { recursive: true });

    for (const width of [390, 768, 1024, 1280, 1440] as const) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/methodologie", { waitUntil: "domcontentloaded" });
      await dismissCookies(page);
      await assertNoRibbonOverflow(page, width);

      await expect(page.locator('[data-navigation-utility-menu="preferences"]')).toBeVisible();
      await expect(page.locator('[data-navigation-utility-menu="feedback"]')).toBeVisible();
      await expect(page.getByRole("button", { name: "Découvrir le ruban" })).toHaveCount(0);
      await expect(page.locator('[data-navigation-block-trigger][title]')).toHaveCount(0);
      await expect(page.locator("[data-navigation-ribbon][data-navigation-ribbon-variant]")).toHaveCount(0);
      await expect(page.locator('[data-navigation-ribbon] > svg')).toHaveCount(0);

      if (width < 1280) {
        await expect(page.locator('nav[aria-label="Navigation par blocs"]')).toBeHidden();
        await expect(page.getByRole("button", { name: "Sommaire" })).toBeVisible();
        await testInfo.attach(`classic-ribbon-${width}`, {
          body: await page.screenshot({ path: path.join(SCREENSHOT_DIRECTORY, `classic-${width}.png`) }),
          contentType: "image/png",
        });
        continue;
      }

      const ribbon = await waitForRibbon(page);
      const geometry = await page.evaluate(() => {
        const dock = document.querySelector<HTMLElement>('nav[aria-label="Navigation par blocs"]');
        const active = dock?.querySelector<HTMLElement>('[data-navigation-block-active="true"]');
        const feedback = document.querySelector<HTMLElement>('[data-navigation-tutorial-target="feedback"]');
        if (!dock || !active || !feedback) throw new Error("Missing classic ribbon controls");
        const activeIcon = active.querySelector<HTMLElement>(".cmm-navigation-block-icon");
        if (!activeIcon) throw new Error("Missing active navigation block icon");
        const activeIconStyle = getComputedStyle(activeIcon);
        const activeIconBeforeStyle = getComputedStyle(activeIcon, "::before");
        const activeIconAfterStyle = getComputedStyle(activeIcon, "::after");
        return {
          dockCenter: dock.getBoundingClientRect().left + dock.getBoundingClientRect().width / 2,
          viewportCenter: window.innerWidth / 2,
          activeBackground: getComputedStyle(active).backgroundColor,
          activeIconColor: activeIconStyle.color,
          activeIconBackground: activeIconStyle.backgroundColor,
          activeIconBackgroundImage: activeIconStyle.backgroundImage,
          activeIconBoxShadow: activeIconStyle.boxShadow,
          activeIconBeforeBackground: activeIconBeforeStyle.backgroundColor,
          activeIconAfterBackground: activeIconAfterStyle.backgroundColor,
          dockBorder: getComputedStyle(dock).borderTopColor,
          feedbackTone: feedback.getAttribute("data-cmm-button-tone"),
          feedbackBackground: getComputedStyle(feedback).backgroundColor,
        };
      });
      expect(Math.abs(geometry.dockCenter - geometry.viewportCenter), `${width}px dock center`).toBeLessThanOrEqual(8);
      expect(geometry.activeBackground).not.toBe("rgba(0, 0, 0, 0)");
      expect(geometry.activeIconColor).not.toBe("rgb(255, 255, 255)");
      expect(geometry.activeIconBackground, `${width}px active icon background`).toBe("rgba(0, 0, 0, 0)");
      expect(geometry.activeIconBackgroundImage, `${width}px active icon background image`).toBe("none");
      expect(geometry.activeIconBoxShadow, `${width}px active icon box shadow`).toBe("none");
      expect(geometry.activeIconBeforeBackground, `${width}px active icon ::before background`).toBe("rgba(0, 0, 0, 0)");
      expect(geometry.activeIconAfterBackground, `${width}px active icon ::after background`).toBe("rgba(0, 0, 0, 0)");
      expect(geometry.dockBorder).not.toBe("rgba(0, 0, 0, 0)");
      expect(geometry.feedbackTone).toBe("primary");
      expect(geometry.feedbackBackground).not.toBe("rgba(0, 0, 0, 0)");

      const inactive = ribbon.locator('[data-navigation-block-active="false"]').first();
      await inactive.hover();
      await expect(inactive.locator(".cmm-navigation-block-label")).toBeVisible();
      const hoverIconStyle = await inactive.locator(".cmm-navigation-block-icon").evaluate((element) => {
        const style = getComputedStyle(element);
        return { color: style.color, background: style.backgroundColor, backgroundImage: style.backgroundImage, boxShadow: style.boxShadow };
      });
      expect(hoverIconStyle.color).not.toBe("rgb(255, 255, 255)");
      expect(hoverIconStyle.background, `${width}px hover icon background`).toBe("rgba(0, 0, 0, 0)");
      expect(hoverIconStyle.backgroundImage, `${width}px hover icon background image`).toBe("none");
      expect(hoverIconStyle.boxShadow, `${width}px hover icon box shadow`).toBe("none");

      await testInfo.attach(`classic-ribbon-${width}`, {
        body: await captureRibbonArea(page, ribbon, path.join(SCREENSHOT_DIRECTORY, `classic-${width}.png`)),
        contentType: "image/png",
      });
    }
  });

  test("preserves dropdown activation, real destinations and keyboard focus", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/methodologie", { waitUntil: "domcontentloaded" });
    await dismissCookies(page);
    const ribbon = await waitForRibbon(page);

    const activeTrigger = ribbon.locator('[data-navigation-block-active="true"]');
    await activeTrigger.press("Enter");
    await expect(activeTrigger).toHaveAttribute("aria-expanded", "true");
    const panelId = await activeTrigger.getAttribute("aria-controls");
    await expect(page.locator(`#${panelId}`)).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(activeTrigger).toHaveAttribute("aria-expanded", "false");
    await expect(activeTrigger).toBeFocused();

    const feedback = page.getByRole("button", { name: "Menu Feedback" });
    await feedback.press("Enter");
    await expect(page.locator("#feedback-menu-panel")).toBeVisible();
    await expect(page.locator('#feedback-menu-panel a[href="/sections/feedback#bug"]')).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.locator("#feedback-menu-panel")).toHaveCount(0);

    const preferences = page.getByRole("button", { name: "Menu des préférences d'affichage et langue" });
    await preferences.click();
    await expect(page.locator("#preferences-menu-panel")).toBeVisible();
    await feedback.click();
    await expect(page.locator("#preferences-menu-panel")).toHaveCount(0);
    await expect(page.locator("#feedback-menu-panel")).toBeVisible();
    await page.keyboard.press("Escape");
  });

  test("keeps the responsive product entry and utility controls reachable", async ({ page }) => {
    for (const width of [390, 768, 1024, 1280, 1440] as const) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/methodologie", { waitUntil: "domcontentloaded" });
      await dismissCookies(page);
      const summary = page.getByRole("button", { name: "Sommaire" });
      const desktopDock = page.locator('nav[aria-label="Navigation par blocs"]');

      if (width < 1280) {
        await expect(summary).toBeVisible();
        await expect(desktopDock).toBeHidden();
        await page.getByRole("button", { name: "Menu Feedback" }).click();
        await expect(page.locator("#feedback-menu-panel")).toBeVisible();
        await page.keyboard.press("Escape");
      } else {
        await expect(summary).toBeHidden();
        await expect(desktopDock).toBeVisible();
        await assertNoRibbonOverflow(page, width);
      }
    }
  });
});
