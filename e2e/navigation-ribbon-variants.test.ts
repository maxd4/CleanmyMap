import { mkdirSync } from "node:fs";
import path from "node:path";
import { expect, test, type Locator, type Page } from "@playwright/test";

const EXPECTED_VARIANT =
  process.env.NEXT_PUBLIC_CMM_NAVIGATION_RIBBON_VARIANT === "meniscus"
    ? "meniscus"
    : "classic";
const SCREENSHOT_DIRECTORY = path.join(
  process.cwd(),
  "artifacts",
  "playwright",
  "navigation-ribbon-variants",
);

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

async function captureRibbonArea(
  page: Page,
  ribbon: Locator,
  outputPath?: string,
) {
  const box = await ribbon.boundingBox();
  if (!box) throw new Error("Missing ribbon screenshot bounds");

  return page.screenshot({
    path: outputPath,
    clip: {
      x: Math.max(0, box.x - 8),
      y: Math.max(0, box.y - 20),
      width: box.width + 16,
      height: box.height + 20,
    },
  });
}

async function meniscusGeometry(page: Page, displayMode?: "exhaustif" | "minimaliste" | "sobre") {
  return page.evaluate((nextDisplayMode) => {
    if (nextDisplayMode) {
      document.documentElement.setAttribute("data-display-mode", nextDisplayMode);
    }

    const ribbon = document.querySelector<HTMLElement>("[data-navigation-ribbon]");
    const indicator = ribbon?.querySelector<HTMLElement>(".cmm-navigation-meniscus-indicator");
    const active = ribbon?.querySelector<HTMLElement>('[data-navigation-block-active="true"]');
    const surface = ribbon?.querySelector<SVGPathElement>(".cmm-navigation-meniscus-surface");
    if (!ribbon || !indicator || !active || !surface) {
      throw new Error("Missing ribbon indicator geometry");
    }

    const indicatorRect = indicator.getBoundingClientRect();
    const activeRect = active.getBoundingClientRect();
    const iconRect = active.querySelector<HTMLElement>(".cmm-navigation-block-icon")?.getBoundingClientRect();
    const indicatorStyle = getComputedStyle(indicator);
    const activeStyle = getComputedStyle(active);
    const hitPoint = document.elementFromPoint(
      activeRect.left + activeRect.width / 2,
      activeRect.top + 4,
    );
    return {
      activeCenter: activeRect.left + activeRect.width / 2,
      indicatorCenter: indicatorRect.left + indicatorRect.width / 2,
      circleTop: activeRect.top,
      circleBottom: activeRect.bottom,
      circleWidth: activeRect.width,
      circleHeight: activeRect.height,
      iconCenter: iconRect ? iconRect.left + iconRect.width / 2 : null,
      iconVerticalCenter: iconRect ? iconRect.top + iconRect.height / 2 : null,
      ribbonTop: ribbon.getBoundingClientRect().top,
      ribbonBottom: ribbon.getBoundingClientRect().bottom,
      surfaceCount: ribbon.querySelectorAll(".cmm-navigation-meniscus-surface").length,
      surfacePath: surface.getAttribute("d"),
      topBorderColor: getComputedStyle(ribbon).borderTopColor,
      activePointerEvents: activeStyle.pointerEvents,
      elevatedPointHitsActive: hitPoint instanceof Element && active.contains(hitPoint),
      elevatedPointElement: hitPoint instanceof Element
        ? `${hitPoint.tagName.toLowerCase()}.${hitPoint.className}`
        : null,
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
  test("uses the code-selected variant and keeps the meniscus silhouette emergent", async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/sections/route", { waitUntil: "domcontentloaded" });
    await dismissCookies(page);
    await page.evaluate(() => document.documentElement.setAttribute("data-display-mode", "exhaustif"));

    const ribbon = await waitForRibbon(page);
    await expect(ribbon).toHaveAttribute("data-navigation-ribbon-variant", EXPECTED_VARIANT);
    mkdirSync(SCREENSHOT_DIRECTORY, { recursive: true });
    const classicScreenshot = await captureRibbonArea(
      page,
      ribbon,
      path.join(SCREENSHOT_DIRECTORY, `${EXPECTED_VARIANT}-desktop.png`),
    );
    await testInfo.attach(`${EXPECTED_VARIANT}-desktop`, { body: classicScreenshot, contentType: "image/png" });

    if (EXPECTED_VARIANT === "classic") {
      await expect(ribbon.locator(".cmm-navigation-meniscus-indicator")).toHaveCSS("opacity", "0");
      return;
    }

    const meniscusIndicator = ribbon.locator(".cmm-navigation-meniscus-indicator");
    await expect(meniscusIndicator).toHaveCSS("opacity", "1");
    const meniscus = await meniscusGeometry(page);
    expect(Math.abs(meniscus.indicatorCenter - meniscus.activeCenter)).toBeLessThanOrEqual(2);
    expect(Math.abs(meniscus.iconCenter! - meniscus.activeCenter)).toBeLessThanOrEqual(1);
    expect(Math.abs(meniscus.iconVerticalCenter! - (meniscus.circleTop! + meniscus.circleHeight! / 2))).toBeLessThanOrEqual(1);
    expect(meniscus.circleTop!).toBeLessThan(meniscus.ribbonTop - 8);
    expect(meniscus.circleBottom!).toBeGreaterThan(meniscus.ribbonTop);
    expect(meniscus.circleWidth).toBe(44);
    expect(meniscus.circleHeight).toBe(44);
    expect(meniscus.surfaceCount).toBe(1);
    expect(meniscus.surfacePath).toContain("C25 30 24 22 30 19");
    expect(meniscus.topBorderColor).toBe("rgba(0, 0, 0, 0)");
    expect(meniscus.activePointerEvents).toBe("auto");
    expect(meniscus.elevatedPointHitsActive, JSON.stringify(meniscus)).toBe(true);
    expect(meniscus.indicatorPointerEvents).toBe("none");
    expect(meniscus.indicatorTransitionProperty).toContain("left");
    expect(meniscus.activeIconTransform).not.toBe("none");
    expect(meniscus.scrollWidth).toBeLessThanOrEqual(meniscus.viewportWidth + 1);
    await expect(ribbon.locator('[data-navigation-block-active="true"] .cmm-navigation-block-label')).toBeVisible();
    await expect(ribbon.locator('[data-navigation-block-active="true"] .cmm-navigation-block-label')).not.toHaveText("");
    const hoveredTrigger = ribbon.locator('[data-navigation-block-active="false"]').first();
    await hoveredTrigger.hover();
    await expect(hoveredTrigger.locator(".cmm-navigation-block-label")).toBeVisible();
    await expect(hoveredTrigger.locator(".cmm-navigation-block-label")).not.toHaveText("");
    await testInfo.attach("meniscus-desktop", {
      body: await captureRibbonArea(page, ribbon),
      contentType: "image/png",
    });

    await page.goto("/contact", { waitUntil: "domcontentloaded" });
    const noActiveRibbon = await waitForRibbon(page);
    await expect(noActiveRibbon).toHaveAttribute("data-navigation-ribbon-variant", EXPECTED_VARIANT);
    await expect(noActiveRibbon.locator('[data-navigation-block-active="true"]')).toHaveCount(0);
    await expect(noActiveRibbon.locator(".cmm-navigation-meniscus-indicator")).toHaveCount(0);

    await page.goto("/methodologie", { waitUntil: "domcontentloaded" });
    const routeRibbon = await waitForRibbon(page);
    await expect(routeRibbon).toHaveAttribute("data-navigation-ribbon-variant", EXPECTED_VARIANT);
    const routeActive = routeRibbon.locator('[data-navigation-block-active="true"]');
    await expect(routeActive).toHaveCount(1);
    if (EXPECTED_VARIANT === "meniscus") {
      const routeMeniscus = await meniscusGeometry(page);
      expect(Math.abs(routeMeniscus.indicatorCenter - routeMeniscus.activeCenter)).toBeLessThanOrEqual(2);
    }
  });

  test("preserves dropdown activation, route links, keyboard focus and display-mode motion", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/sections/route", { waitUntil: "domcontentloaded" });
    await dismissCookies(page);
    const ribbon = await waitForRibbon(page);
    await page.waitForTimeout(350);

    if (EXPECTED_VARIANT === "meniscus") {
      const activeTrigger = ribbon.locator('[data-navigation-block-active="true"]');
      const activeBox = await activeTrigger.boundingBox();
      expect(activeBox).not.toBeNull();
      await page.mouse.click(activeBox!.x + activeBox!.width / 2, activeBox!.y + 4);
      await expect(activeTrigger).toHaveAttribute("aria-expanded", "true");
      await page.keyboard.press("Escape");
      await expect(activeTrigger).toHaveAttribute("aria-expanded", "false");
    }

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
    const keyboardTrigger = keyboardRibbon.getByRole("button", { name: "Cartographie & Impact" });
    await keyboardTrigger.press("Enter");
    await expect(keyboardTrigger).toHaveAttribute("aria-expanded", "true");
    await page.keyboard.press("Escape");
    await expect(keyboardTrigger).toHaveAttribute("aria-expanded", "false");
    await expect(keyboardTrigger).toBeFocused();

    for (const mode of ["exhaustif", "minimaliste", "sobre"] as const) {
      if (EXPECTED_VARIANT !== "meniscus") continue;
      const geometry = await meniscusGeometry(page, mode);
      if (mode === "exhaustif") {
        expect(geometry.indicatorTransitionDuration).toContain("0.26s");
      } else if (mode === "minimaliste") {
        expect(geometry.indicatorTransitionDuration).toContain("0.18s");
      } else {
        expect(geometry.indicatorTransitionDuration).toBe("0s");
      }
    }

    await page.emulateMedia({ reducedMotion: "reduce" });
    if (EXPECTED_VARIANT === "meniscus") {
      const reducedMotion = await meniscusGeometry(page);
      expect(reducedMotion.indicatorTransitionDuration).toBe("0s");
    }
  });

  test("keeps the desktop-only variant out of mobile and tablet layouts", async ({ page }) => {
    for (const width of [390, 768, 1440] as const) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/sections/route", { waitUntil: "domcontentloaded" });
      await dismissCookies(page);
      const summary = page.getByRole("button", { name: "Sommaire" });
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.getBoundingClientRect().width);

      expect(overflow, `horizontal overflow at ${width}px`).toBeLessThanOrEqual(1);
      if (width < 1280) {
        const desktopRibbon = page.locator('nav[aria-label="Navigation par blocs"]');
        await expect(desktopRibbon).toBeHidden();
        await expect(summary).toBeVisible();
      } else {
        const desktopRibbon = await waitForRibbon(page);
        await expect(desktopRibbon).toBeVisible();
        await expect(desktopRibbon).toHaveAttribute("data-navigation-ribbon-variant", EXPECTED_VARIANT);
        await expect(summary).toBeHidden();
      }
    }
  });
});
