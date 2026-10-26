import { expect, test, type Page } from "@playwright/test";

async function dismissCookies(page: Page): Promise<void> {
  const refuse = page.getByRole("button", { name: "Tout refuser" });
  if (await refuse.isVisible().catch(() => false)) {
    await refuse.click();
  }
}

async function waitForRibbon(page: Page) {
  await page.waitForLoadState("load");
  const ribbon = page.locator('nav[aria-label="Navigation par blocs"]');
  await expect(ribbon).toBeVisible();
  await expect(ribbon.locator("[data-navigation-block-trigger]")).toHaveCount(5);
  await page.waitForTimeout(150);
  return ribbon;
}

async function indicatorGeometry(page: Page, displayMode?: "exhaustif" | "minimaliste" | "sobre") {
  return page.evaluate((nextDisplayMode) => {
    if (nextDisplayMode) {
      document.documentElement.setAttribute("data-display-mode", nextDisplayMode);
    }

    const ribbon = document.querySelector<HTMLElement>("[data-navigation-ribbon]");
    const indicator = ribbon?.querySelector<HTMLElement>(".cmm-navigation-meniscus-indicator");
    const circle = ribbon?.querySelector<HTMLElement>(".cmm-navigation-meniscus-circle");
    const active = ribbon?.querySelector<HTMLElement>('[data-navigation-block-active="true"]');
    if (!ribbon || !indicator || !active) {
      throw new Error("Missing ribbon indicator geometry");
    }

    const indicatorRect = indicator.getBoundingClientRect();
    const circleRect = circle?.getBoundingClientRect();
    const activeRect = active.getBoundingClientRect();
    const indicatorStyle = getComputedStyle(indicator);
    return {
      activeCenter: activeRect.left + activeRect.width / 2,
      indicatorCenter: indicatorRect.left + indicatorRect.width / 2,
      circleCenter: circleRect ? circleRect.left + circleRect.width / 2 : null,
      circleTop: circleRect?.top ?? null,
      ribbonTop: ribbon.getBoundingClientRect().top,
      circleHeight: circleRect?.height ?? null,
      bridgeCount: ribbon.querySelectorAll(".cmm-navigation-meniscus-bridge").length,
      indicatorPointerEvents: indicatorStyle.pointerEvents,
      indicatorTransitionProperty: indicatorStyle.transitionProperty,
      indicatorTransitionDuration: indicatorStyle.transitionDuration,
      activeIconTransform: getComputedStyle(active.querySelector(".cmm-navigation-block-icon")!).transform,
      scrollWidth: document.documentElement.scrollWidth,
      viewportWidth: document.documentElement.getBoundingClientRect().width,
    };
  }, displayMode);
}

test.describe("desktop central navigation ribbon variants", () => {
  test("keeps classic unchanged and moves one meniscus indicator with route activity", async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/sections/route", { waitUntil: "domcontentloaded" });
    await dismissCookies(page);
    await page.evaluate(() => document.documentElement.setAttribute("data-display-mode", "exhaustif"));

    const ribbon = await waitForRibbon(page);
    await expect(ribbon).toHaveAttribute("data-navigation-ribbon-variant", "classic");
    await expect(ribbon.locator(".cmm-navigation-meniscus-indicator")).toHaveCSS("opacity", "0");
    const classicScreenshot = await ribbon.screenshot();
    await testInfo.attach("classic-desktop", { body: classicScreenshot, contentType: "image/png" });

    await ribbon.evaluate((element) => element.setAttribute("data-navigation-ribbon-variant", "meniscus"));
    const meniscusIndicator = ribbon.locator(".cmm-navigation-meniscus-indicator");
    await expect(meniscusIndicator).toHaveCSS("opacity", "1");
    const meniscus = await indicatorGeometry(page);
    expect(Math.abs(meniscus.indicatorCenter - meniscus.activeCenter)).toBeLessThanOrEqual(2);
    expect(Math.abs(meniscus.circleCenter! - meniscus.activeCenter)).toBeLessThanOrEqual(2);
    expect(meniscus.circleHeight).toBe(44);
    expect(meniscus.circleTop!).toBeLessThan(meniscus.ribbonTop);
    expect(meniscus.bridgeCount).toBe(1);
    expect(meniscus.indicatorPointerEvents).toBe("none");
    expect(meniscus.indicatorTransitionProperty).toContain("left");
    expect(meniscus.activeIconTransform).not.toBe("none");
    expect(meniscus.scrollWidth).toBeLessThanOrEqual(meniscus.viewportWidth + 1);
    await testInfo.attach("meniscus-desktop", { body: await ribbon.screenshot(), contentType: "image/png" });

    await page.goto("/contact", { waitUntil: "domcontentloaded" });
    const noActiveRibbon = await waitForRibbon(page);
    await expect(noActiveRibbon.locator('[data-navigation-block-active="true"]')).toHaveCount(0);
    await expect(noActiveRibbon.locator(".cmm-navigation-meniscus-indicator")).toHaveCount(0);

    await page.goto("/methodologie", { waitUntil: "domcontentloaded" });
    const routeRibbon = await waitForRibbon(page);
    await routeRibbon.evaluate((element) => element.setAttribute("data-navigation-ribbon-variant", "meniscus"));
    const routeActive = routeRibbon.locator('[data-navigation-block-active="true"]');
    await expect(routeActive).toHaveCount(1);
    const routeMeniscus = await indicatorGeometry(page);
    expect(Math.abs(routeMeniscus.indicatorCenter - routeMeniscus.activeCenter)).toBeLessThanOrEqual(2);
  });

  test("preserves dropdown activation, route links, keyboard focus and display-mode motion", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/sections/route", { waitUntil: "domcontentloaded" });
    await dismissCookies(page);
    const ribbon = await waitForRibbon(page);
    await ribbon.evaluate((element) => element.setAttribute("data-navigation-ribbon-variant", "meniscus"));
    await page.waitForTimeout(350);

    const nonActiveTrigger = ribbon.getByRole("button", { name: "Cartographie & Impact" });
    await nonActiveTrigger.press("Enter");
    await expect(nonActiveTrigger).toHaveAttribute("aria-expanded", "true");
    const panelId = await nonActiveTrigger.getAttribute("aria-controls");
    const panel = page.locator(`#${panelId}`);
    await expect(panel).toBeVisible();

    const routeLink = panel.getByRole("link", { name: "Méthodologie" });
    await expect(routeLink).toHaveAttribute("href", "/methodologie");
    await Promise.all([
      page.waitForURL((url) => url.pathname === "/methodologie"),
      routeLink.click(),
    ]);

    const keyboardRibbon = await waitForRibbon(page);
    await keyboardRibbon.evaluate((element) => element.setAttribute("data-navigation-ribbon-variant", "meniscus"));
    const keyboardTrigger = keyboardRibbon.getByRole("button", { name: "Cartographie & Impact" });
    await keyboardTrigger.press("Enter");
    await expect(keyboardTrigger).toHaveAttribute("aria-expanded", "true");
    await page.keyboard.press("Escape");
    await expect(keyboardTrigger).toHaveAttribute("aria-expanded", "false");
    await expect(keyboardTrigger).toBeFocused();

    for (const mode of ["exhaustif", "minimaliste", "sobre"] as const) {
      const geometry = await indicatorGeometry(page, mode);
      if (mode === "exhaustif") {
        expect(geometry.indicatorTransitionDuration).toContain("0.26s");
      } else if (mode === "minimaliste") {
        expect(geometry.indicatorTransitionDuration).toContain("0.18s");
      } else {
        expect(geometry.indicatorTransitionDuration).toBe("0s");
      }
    }

    await page.emulateMedia({ reducedMotion: "reduce" });
    const reducedMotion = await indicatorGeometry(page);
    expect(reducedMotion.indicatorTransitionDuration).toBe("0s");
  });

  test("keeps the desktop-only variant out of mobile and tablet layouts", async ({ page }) => {
    for (const width of [390, 768, 1440] as const) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/sections/route", { waitUntil: "domcontentloaded" });
      await dismissCookies(page);
      const desktopRibbon = page.locator('nav[aria-label="Navigation par blocs"]');
      const summary = page.getByRole("button", { name: "Sommaire" });
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.getBoundingClientRect().width);

      expect(overflow, `horizontal overflow at ${width}px`).toBeLessThanOrEqual(1);
      if (width < 1280) {
        await expect(desktopRibbon).toBeHidden();
        await expect(summary).toBeVisible();
      } else {
        await expect(desktopRibbon).toBeVisible();
        await expect(summary).toBeHidden();
      }
    }
  });
});
