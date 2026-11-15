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
  await refuse.waitFor({ state: "visible", timeout: 3_000 }).catch(() => undefined);
  if (await refuse.isVisible().catch(() => false)) {
    await refuse.click();
    await expect(refuse).toHaveCount(0);
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

async function assertRibbonHierarchy(page: Page, width: number): Promise<void> {
  const metrics = await page.evaluate(() => {
    const navigation = document.querySelector<HTMLElement>('nav[aria-label="Barre de navigation principale"]');
    if (!navigation) throw new Error("Missing global navigation ribbon");

    const visible = (element: HTMLElement) => {
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return style.display !== "none" && style.visibility !== "hidden" && rect.width > 0 && rect.height > 0;
    };
    const overlap = (first: DOMRect, second: DOMRect) =>
      Math.min(first.right, second.right) - Math.max(first.left, second.left) > 1
      && Math.min(first.bottom, second.bottom) - Math.max(first.top, second.top) > 1;

    const groups = [...navigation.querySelectorAll<HTMLElement>("[data-navigation-group]")]
      .filter(visible)
      .map((element) => ({
        name: element.dataset.navigationGroup ?? "",
        rect: element.getBoundingClientRect().toJSON(),
      }));
    const groupCollisions = groups.flatMap((first, firstIndex) =>
      groups.slice(firstIndex + 1).filter((second) => overlap(first.rect, second.rect)).map((second) => [first.name, second.name]),
    );

    const controls = [...navigation.querySelectorAll<HTMLElement>("a, button")]
      .filter(visible)
      .filter((element) => !element.getAttribute("aria-label")?.startsWith("Statut :"))
      .map((element) => ({
        label: element.getAttribute("aria-label") ?? element.textContent?.trim() ?? element.tagName,
        rect: element.getBoundingClientRect().toJSON(),
      }));
    const controlCollisions = controls.flatMap((first, firstIndex) =>
      controls.slice(firstIndex + 1).filter((second) => overlap(first.rect, second.rect)).map((second) => [first.label, second.label]),
    );

    return {
      groups,
      groupCollisions,
      controlCollisions,
      scrollWidth: document.documentElement.scrollWidth,
      viewportWidth: document.documentElement.getBoundingClientRect().width,
    };
  });

  expect(metrics.groupCollisions, `visible ribbon groups overlap at ${width}px: ${JSON.stringify(metrics)}`).toEqual([]);
  expect(metrics.controlCollisions, `visible ribbon controls overlap at ${width}px: ${JSON.stringify(metrics)}`).toEqual([]);
  expect(metrics.scrollWidth, `horizontal overflow at ${width}px`).toBeLessThanOrEqual(metrics.viewportWidth + 1);
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
    const bead = ribbon?.querySelector<HTMLElement>(".cmm-navigation-meniscus-bead");
    const surface = ribbon?.querySelector<SVGPathElement>(".cmm-navigation-meniscus-surface");
    if (!ribbon || !indicator || !active || !bead || !surface) {
      throw new Error("Missing ribbon indicator geometry");
    }

    const indicatorRect = indicator.getBoundingClientRect();
    const activeRect = active.getBoundingClientRect();
    const beadRect = bead.getBoundingClientRect();
    const iconRect = bead.querySelector<HTMLElement>(".cmm-navigation-meniscus-bead-icon")?.getBoundingClientRect();
    const indicatorStyle = getComputedStyle(indicator);
    const activeStyle = getComputedStyle(active);
    const hitPoint = document.elementFromPoint(
      beadRect.left + beadRect.width / 2,
      beadRect.top + 4,
    );
    return {
      activeCenter: activeRect.left + activeRect.width / 2,
      indicatorCenter: indicatorRect.left + indicatorRect.width / 2,
      beadCenter: beadRect.left + beadRect.width / 2,
      circleTop: beadRect.top,
      circleBottom: beadRect.bottom,
      circleWidth: beadRect.width,
      circleHeight: beadRect.height,
      activeTop: activeRect.top,
      activeBottom: activeRect.bottom,
      activeWidth: activeRect.width,
      activeHeight: activeRect.height,
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
      elevatedPointStack: document.elementsFromPoint(
        beadRect.left + beadRect.width / 2,
        beadRect.top + 4,
      ).slice(0, 6).map((element) => `${element.tagName.toLowerCase()}.${element.className}`),
      indicatorPointerEvents: indicatorStyle.pointerEvents,
      indicatorTransitionProperty: indicatorStyle.transitionProperty,
      indicatorTransitionDuration: indicatorStyle.transitionDuration,
      activeIconTransform: getComputedStyle(bead.querySelector(".cmm-navigation-meniscus-bead-icon")!).transform,
      scrollWidth: document.documentElement.scrollWidth,
      viewportWidth: document.documentElement.getBoundingClientRect().width,
    };
  }, displayMode);
}

async function waitForMeniscusAlignment(page: Page): Promise<void> {
  await expect
    .poll(
      async () => {
        const geometry = await meniscusGeometry(page);
        return Math.max(
          Math.abs(geometry.indicatorCenter - geometry.beadCenter),
          Math.abs(geometry.beadCenter - geometry.activeCenter),
        );
      },
      {
        intervals: [50, 100, 200],
        timeout: 1_000,
        message: "the meniscus indicator must converge to the route-active trigger",
      },
    )
    .toBeLessThanOrEqual(1);
}

test.describe("desktop central navigation ribbon variants", () => {
  test("homepage exposes the guided tutorial without competing with the primary actions", async ({ page }) => {
    for (const width of [1440, 390] as const) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/", { waitUntil: "domcontentloaded" });
      await dismissCookies(page);

      const entryPoint = page.locator('[data-navigation-tutorial-entry="homepage"]');
      await expect(entryPoint).toBeVisible();
      await expect(entryPoint).toContainText("Nouveau sur CleanMyMap ?");
      await expect(entryPoint).toContainText("Découvrez le ruban en 1 minute.");
      const homepageScrollWidthBeforeTour = await page.evaluate(() => document.documentElement.scrollWidth);

      const trigger = entryPoint.getByRole("button", { name: "Tutoriel du ruban" });
      await expect(trigger).toBeVisible();
      await trigger.click();

      const dialog = page.getByRole("dialog", { name: "Tutoriel du ruban de navigation" });
      await expect(dialog).toBeVisible();
      await expect(dialog.getByRole("heading", { name: "Accueil" })).toBeVisible();
      await expect(page.locator("[data-navigation-ribbon-tour-spotlight]")).toBeVisible();
      const homepageScrollWidthAfterTour = await page.evaluate(() => document.documentElement.scrollWidth);
      expect(homepageScrollWidthAfterTour).toBeLessThanOrEqual(homepageScrollWidthBeforeTour + 1);
      await expect(page.locator("body")).toHaveCSS("overflow-x", "hidden");

      await dialog.getByRole("button", { name: "Passer" }).click();
      await expect(dialog).toHaveCount(0);
      await expect(trigger).toBeFocused();
    }
  });

  test("opens a short guided tour and restores focus on desktop and mobile", async ({ page }) => {
    for (const width of [1440, 390] as const) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/methodologie", { waitUntil: "domcontentloaded" });
      await dismissCookies(page);

      const trigger = page.getByRole("button", { name: "Découvrir le ruban" });
      await expect(trigger).toBeVisible();
      await trigger.click();

      const dialog = page.getByRole("dialog", { name: "Tutoriel du ruban de navigation" });
      await expect(dialog).toBeVisible();
      await expect(dialog.getByRole("heading", { name: "Accueil" })).toBeVisible();
      await expect(page.locator("[data-navigation-ribbon-tour-spotlight]")).toBeVisible();
      const initialTourGeometry = await page.evaluate(() => {
        const dialog = document.querySelector<HTMLElement>('[role="dialog"]');
        const spotlight = document.querySelector<HTMLElement>("[data-navigation-ribbon-tour-spotlight]");
        if (!dialog || !spotlight) throw new Error("Missing guided tour surface");
        const dialogRect = dialog.getBoundingClientRect();
        const spotlightRect = spotlight.getBoundingClientRect();
        return {
          dialogInsideViewport: dialogRect.left >= 0
            && dialogRect.top >= 0
            && dialogRect.right <= window.innerWidth + 1
            && dialogRect.bottom <= window.innerHeight + 1,
          spotlightVisible: spotlightRect.width > 0 && spotlightRect.height > 0,
          horizontalOverflow: document.documentElement.scrollWidth > window.innerWidth + 1,
        };
      });
      expect(initialTourGeometry.dialogInsideViewport).toBe(true);
      expect(initialTourGeometry.spotlightVisible).toBe(true);
      expect(initialTourGeometry.horizontalOverflow).toBe(false);
      await expect(dialog.getByRole("button", { name: "Précédent" })).toBeDisabled();
      await dialog.getByRole("button", { name: "Suivant" }).click();
      await expect(dialog.getByRole("heading", { name: "Rechercher" })).toBeVisible();
      await dialog.getByRole("button", { name: "Précédent" }).click();
      await expect(dialog.getByRole("heading", { name: "Accueil" })).toBeVisible();

      for (const title of [
        "Rechercher",
        "Navigation produit",
        "Préférences",
        "Feedback",
        "Profil et espace personnel",
      ]) {
        await dialog.getByRole("button", { name: "Suivant" }).click();
        await expect(dialog.getByRole("heading", { name: title })).toBeVisible();
        await expect(page.locator("[data-navigation-ribbon-tour-spotlight]")).toBeVisible();
      }

      await dialog.getByRole("button", { name: "Terminer" }).click();
      await expect(dialog).toHaveCount(0);
      await expect(trigger).toBeFocused();

      await trigger.click();
      const reopenedDialog = page.getByRole("dialog", { name: "Tutoriel du ruban de navigation" });
      await expect(reopenedDialog).toBeVisible();
      await reopenedDialog.getByRole("button", { name: "Passer" }).click();
      await expect(reopenedDialog).toHaveCount(0);
      await expect(trigger).toBeFocused();

      await trigger.click();
      await expect(page.getByRole("dialog", { name: "Tutoriel du ruban de navigation" })).toBeVisible();
      await page.keyboard.press("Escape");
      await expect(page.getByRole("dialog", { name: "Tutoriel du ruban de navigation" })).toHaveCount(0);
    }
  });

  test("uses the code-selected variant and keeps the meniscus silhouette emergent", async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/methodologie", { waitUntil: "domcontentloaded" });
    await dismissCookies(page);
    await page.evaluate(() => document.documentElement.setAttribute("data-display-mode", "exhaustif"));

    const ribbon = await waitForRibbon(page);
    await assertRibbonHierarchy(page, 1440);
    await expect(page.locator('[data-navigation-group="primary"]')).toBeVisible();
    await expect(page.locator('[data-navigation-group="utilities"]')).toBeVisible();
    await expect(page.locator('[data-navigation-group="account"]')).toBeVisible();
    await expect(page.locator('[data-navigation-group="product"]:visible')).toHaveCount(1);
    await expect(ribbon).toHaveAttribute("data-navigation-ribbon-variant", EXPECTED_VARIANT);
    await expect(ribbon.locator('[data-navigation-block-trigger]').first()).toHaveAttribute("title", /.+/);
    mkdirSync(SCREENSHOT_DIRECTORY, { recursive: true });
    const classicScreenshot = await captureRibbonArea(
      page,
      ribbon,
      path.join(SCREENSHOT_DIRECTORY, `${EXPECTED_VARIANT}-desktop.png`),
    );
    await testInfo.attach(`${EXPECTED_VARIANT}-desktop`, { body: classicScreenshot, contentType: "image/png" });

    if (EXPECTED_VARIANT === "classic") {
      await expect(ribbon.locator(".cmm-navigation-meniscus-indicator")).toHaveCSS("opacity", "0");
      const hoveredTrigger = ribbon.locator('[data-navigation-block-active="false"]').first();
      await hoveredTrigger.hover();
      await expect(hoveredTrigger.locator(".cmm-navigation-block-label")).toBeVisible();
      await expect(hoveredTrigger.locator(".cmm-navigation-block-label")).not.toHaveText("");
      return;
    }

    const meniscusIndicator = ribbon.locator(".cmm-navigation-meniscus-indicator");
    await expect(meniscusIndicator).toHaveCSS("opacity", "1");
    const meniscus = await meniscusGeometry(page);
    expect(Math.abs(meniscus.indicatorCenter - meniscus.activeCenter)).toBeLessThanOrEqual(2);
    expect(Math.abs(meniscus.beadCenter - meniscus.indicatorCenter)).toBeLessThanOrEqual(1);
    expect(Math.abs(meniscus.iconCenter! - meniscus.beadCenter)).toBeLessThanOrEqual(1);
    expect(Math.abs(meniscus.beadCenter - meniscus.activeCenter)).toBeLessThanOrEqual(1);
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
    await expect(ribbon.locator('.cmm-navigation-meniscus-bead-label')).toBeVisible();
    await expect(ribbon.locator('.cmm-navigation-meniscus-bead-label')).not.toHaveText("");
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
    await page.goto("/methodologie", { waitUntil: "domcontentloaded" });
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

  test("moves the bead and concave surface continuously across client navigation", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/methodologie", { waitUntil: "domcontentloaded" });
    await dismissCookies(page);
    const ribbon = await waitForRibbon(page);

    const initialActTrigger = ribbon.getByRole("button", { name: "Agir" });
    await initialActTrigger.press("Enter");
    const panelId = await initialActTrigger.getAttribute("aria-controls");
    const panel = page.locator(`#${panelId}`);
    await expect(panel).toBeVisible();
    await expect(panel.locator('a[href="/actions/new"]')).toBeVisible();

    type RibbonSample = {
      pathname: string;
      indicatorCenter: number | null;
      beadCenter: number | null;
      indicatorLeft: string | null;
      activeIds: string[];
      triggerCenters: number[];
    };
    const collectRibbonSample = () => page.evaluate<RibbonSample>(() => {
      const indicator = document.querySelector<HTMLElement>(".cmm-navigation-meniscus-indicator");
      const bead = document.querySelector<HTMLElement>(".cmm-navigation-meniscus-bead");
      const buttons = [...document.querySelectorAll<HTMLElement>("[data-navigation-block-trigger]")];
      return {
        pathname: window.location.pathname,
        indicatorCenter: indicator ? indicator.getBoundingClientRect().left + indicator.getBoundingClientRect().width / 2 : null,
        beadCenter: bead ? bead.getBoundingClientRect().left + bead.getBoundingClientRect().width / 2 : null,
        indicatorLeft: indicator?.style.left ?? null,
        activeIds: buttons.filter((button) => button.dataset.navigationBlockActive === "true").map((button) => button.getAttribute("aria-label") ?? ""),
        triggerCenters: buttons.map((button) => button.getBoundingClientRect().left + button.getBoundingClientRect().width / 2),
      };
    });
    const samples: RibbonSample[] = [await collectRibbonSample()];
    const clickPromise = panel.locator('a[href="/actions/new"]').click({ noWaitAfter: true });
    const sampleUntil = Date.now() + 420;
    while (Date.now() < sampleUntil) {
      try {
        samples.push(await collectRibbonSample());
      } catch {
        // A document context can be replaced during the client transition.
      }
      await page.waitForTimeout(16);
    }
    await clickPromise;
    await expect(page).toHaveURL(/\/actions\/new$/);
    samples.push(await collectRibbonSample());

    if (EXPECTED_VARIANT === "classic") return;

    const validSamples = samples.filter((sample): sample is typeof sample & { indicatorCenter: number; beadCenter: number; indicatorLeft: string } => sample.indicatorCenter !== null && sample.beadCenter !== null && sample.indicatorLeft !== null);
    const firstCenter = validSamples[0].beadCenter;
    const finalCenter = validSamples.at(-1)!.beadCenter;
    expect(Math.abs(finalCenter - firstCenter), JSON.stringify(samples)).toBeGreaterThan(20);
    expect(validSamples[0].activeIds).not.toEqual(validSamples.at(-1)!.activeIds);
    for (const sample of validSamples) {
      expect(Math.abs(sample.indicatorCenter - sample.beadCenter)).toBeLessThanOrEqual(1.5);
      expect(sample.triggerCenters).toEqual(validSamples[0].triggerCenters);
    }

    await page.waitForTimeout(40);
    const visualizeAgainTrigger = ribbon.getByRole("button", { name: "Cartographie & Impact" });
    await visualizeAgainTrigger.press("Enter");
    const visualizeAgainPanelId = await visualizeAgainTrigger.getAttribute("aria-controls");
    const visualizeAgainPanel = page.locator(`#${visualizeAgainPanelId}`);
    await expect(visualizeAgainPanel.locator('a[href="/methodologie"]')).toBeVisible();
    await visualizeAgainPanel.locator('a[href="/methodologie"]').click({ noWaitAfter: true });
    await expect(page).toHaveURL(/\/methodologie$/);

    await expect(ribbon.locator('[data-navigation-block-active="true"]')).toHaveCount(1);
    await waitForMeniscusAlignment(page);
    const rapidFinal = await meniscusGeometry(page);
    expect(Math.abs(rapidFinal.indicatorCenter - rapidFinal.beadCenter)).toBeLessThanOrEqual(1);
    expect(Math.abs(rapidFinal.beadCenter - rapidFinal.activeCenter)).toBeLessThanOrEqual(1);

    const transitionSamples = await page.evaluate(() => {
      const indicator = document.querySelector<HTMLElement>(".cmm-navigation-meniscus-indicator");
      const bead = document.querySelector<HTMLElement>(".cmm-navigation-meniscus-bead");
      if (!indicator || !bead) throw new Error("Missing transition probe nodes");
      const originalLeft = indicator.style.left;
      const currentLeft = Number.parseFloat(getComputedStyle(indicator).left);
      const captured: number[] = [];
      const startedAt = performance.now();
      indicator.style.left = `${currentLeft + 38}px`;
      return new Promise<number[]>((resolve) => {
        const sample = () => {
          captured.push(bead.getBoundingClientRect().left + bead.getBoundingClientRect().width / 2);
          if (performance.now() - startedAt < 340) {
            requestAnimationFrame(sample);
          } else {
            indicator.style.transition = "none";
            indicator.style.left = originalLeft;
            void indicator.offsetWidth;
            indicator.style.transition = "";
            resolve(captured);
          }
        };
        captured.push(bead.getBoundingClientRect().left + bead.getBoundingClientRect().width / 2);
        requestAnimationFrame(sample);
      });
    });
    expect(Math.abs(transitionSamples.at(-1)! - transitionSamples[0])).toBeGreaterThan(20);
    expect(transitionSamples.some((center) => Math.abs(center - transitionSamples[0]) > 2 && Math.abs(center - transitionSamples.at(-1)!) > 2)).toBe(true);
  });

  test("keeps exactly one product navigation across the responsive boundary", async ({ page }) => {
    test.setTimeout(120_000);
    for (const width of [390, 768, 1024, 1100, 1279, 1280, 1440] as const) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/methodologie", { waitUntil: "domcontentloaded" });
      await dismissCookies(page);
      await assertRibbonHierarchy(page, width);
      await expect(page.locator('[data-navigation-group="primary"]')).toBeVisible();
      await expect(page.locator('[data-navigation-group="utilities"]')).toBeVisible();
      await expect(page.locator('[data-navigation-group="account"]')).toBeVisible();
      await expect(page.getByRole("button", { name: "Découvrir le ruban" })).toBeVisible();
      await expect(page.locator('[data-navigation-group="product"]:visible')).toHaveCount(1);
      const summary = page.getByRole("button", { name: "Sommaire" });
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.getBoundingClientRect().width);

      expect(overflow, `horizontal overflow at ${width}px`).toBeLessThanOrEqual(1);
      if (width < 1280) {
        const desktopRibbon = page.locator('nav[aria-label="Navigation par blocs"]');
        await expect(desktopRibbon).toBeHidden();
        await expect(summary).toBeVisible();

        const exercisesResponsiveBoundary = width >= 1024;
        if (!exercisesResponsiveBoundary) continue;

        await summary.click();
        const panel = page.locator("#mobile-navigation-tree-panel");
        await page.waitForTimeout(250);
        await expect(panel).toBeVisible();
        await expect(panel.getByRole("button", { name: "Fermer le menu de navigation" })).toBeFocused();
        await expect(panel.getByRole("link").first()).toBeVisible();
        await expect(panel.getByRole("link").first()).toHaveAttribute("href", /^\//);
        await page.keyboard.press("Escape");
        await expect(panel).toHaveCount(0);
        await expect(summary).toBeFocused();

        await summary.press("Enter");
        const keyboardPanel = page.locator("#mobile-navigation-tree-panel");
        await page.waitForTimeout(250);
        await expect(keyboardPanel).toBeVisible();
        const destination = keyboardPanel.getByRole("link").first();
        const destinationHref = await destination.getAttribute("href");
        expect(destinationHref, `missing responsive destination at ${width}px`).toMatch(/^\//);
        await destination.focus();
        await expect(destination).toBeFocused();
      } else {
        const desktopRibbon = await waitForRibbon(page);
        await expect(desktopRibbon).toBeVisible();
        await expect(desktopRibbon).toHaveAttribute("data-navigation-ribbon-variant", EXPECTED_VARIANT);
        await expect(summary).toBeHidden();
        const firstDesktopTrigger = desktopRibbon.locator("[data-navigation-block-trigger]").first();
        await firstDesktopTrigger.press("Enter");
        const desktopPanelId = await firstDesktopTrigger.getAttribute("aria-controls");
        await expect(page.locator(`#${desktopPanelId}`)).toBeVisible();
        await page.keyboard.press("Escape");
        await expect(firstDesktopTrigger).toBeFocused();
      }
    }
  });
});
