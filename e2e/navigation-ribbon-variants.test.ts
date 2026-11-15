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
    const navigation = document.querySelector<HTMLElement>('nav[aria-label="Barre de navigation principale"], nav[aria-label="Main navigation bar"]');
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
  test("keeps one five-block dock centered between preferences and feedback", async ({ page }, testInfo) => {
    test.setTimeout(120_000);
    mkdirSync(SCREENSHOT_DIRECTORY, { recursive: true });

    for (const width of [390, 768, 1024, 1279, 1280, 1440, 1600, 1920] as const) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/methodologie", { waitUntil: "domcontentloaded" });
      await dismissCookies(page);
      await assertNoRibbonOverflow(page, width);

      await expect(page.locator('[data-navigation-utility-menu="preferences"]')).toBeVisible();
      await expect(page.locator('[data-navigation-utility-menu="feedback"]')).toBeVisible();
      await expect(page.getByRole("button", { name: "Découvrir le ruban" })).toHaveCount(0);
      await expect(page.locator('[data-navigation-block-trigger][title]')).toHaveCount(0);
      if (width >= 1280) {
        const firstBlock = page.locator('[data-navigation-block-trigger]').first();
        await firstBlock.hover();
        await page.waitForTimeout(350);
        await expect(page.locator(".cmm-navigation-block-label")).toHaveCount(0);
        await expect(page.locator("#cmm-global-tooltip")).toHaveCount(0);
        await expect(firstBlock).toHaveAttribute("aria-label", /.+/);
      }
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
        if (!dock || !active) throw new Error("Missing classic ribbon controls");
        const activeIcon = active.querySelector<HTMLElement>(".cmm-navigation-block-icon");
        if (!activeIcon) throw new Error("Missing active navigation block icon");
        const preferences = document.querySelector<HTMLElement>('button[data-navigation-tutorial-target="preferences"]');
        const feedback = document.querySelector<HTMLElement>('button[data-navigation-tutorial-target="feedback"]');
        if (!preferences || !feedback) throw new Error("Missing utility controls");
        const activeIconStyle = getComputedStyle(activeIcon);
        const activeIconBeforeStyle = getComputedStyle(activeIcon, "::before");
        const activeIconAfterStyle = getComputedStyle(activeIcon, "::after");
        const preferencesStyle = getComputedStyle(preferences);
        const feedbackStyle = getComputedStyle(feedback);
        return {
          dockCenter: dock.getBoundingClientRect().left + dock.getBoundingClientRect().width / 2,
          availableCenter: (preferences.getBoundingClientRect().right + feedback.getBoundingClientRect().left) / 2,
          activeBackground: getComputedStyle(active).backgroundColor,
          activeIconColor: activeIconStyle.color,
          activeIconBackground: activeIconStyle.backgroundColor,
          activeIconBackgroundImage: activeIconStyle.backgroundImage,
          activeIconBoxShadow: activeIconStyle.boxShadow,
          activeIconBeforeBackground: activeIconBeforeStyle.backgroundColor,
          activeIconAfterBackground: activeIconAfterStyle.backgroundColor,
          dockBorder: getComputedStyle(dock).borderTopColor,
          feedbackTone: feedback.getAttribute("data-cmm-button-tone"),
          feedbackBackground: feedbackStyle.backgroundColor,
          feedbackColor: feedbackStyle.color,
          feedbackBorder: feedbackStyle.borderColor,
          preferencesBackground: preferencesStyle.backgroundColor,
          preferencesColor: preferencesStyle.color,
          preferencesBorder: preferencesStyle.borderColor,
        };
      });
      expect(Math.abs(geometry.dockCenter - geometry.availableCenter), `${width}px dock center in preferences/feedback interval`).toBeLessThanOrEqual(8);
      const search = page.locator('button[data-navigation-tutorial-target="search"]');
      await expect(search).toBeVisible();
      await expect(search.locator("kbd")).toHaveCount(0);
      const searchLabelStyles = await search.locator(".cmm-ribbon-text").evaluate((element) => {
        const style = getComputedStyle(element);
        return { display: style.display, fontWeight: style.fontWeight, textTransform: style.textTransform };
      });
      expect(searchLabelStyles.display).not.toBe("none");
      expect(searchLabelStyles.fontWeight).toBe("400");
      expect(searchLabelStyles.textTransform).toBe("uppercase");
      expect(geometry.activeBackground).not.toBe("rgba(0, 0, 0, 0)");
      expect(geometry.activeIconColor).not.toBe("rgb(255, 255, 255)");
      expect(geometry.activeIconBackground, `${width}px active icon background`).toBe("rgba(0, 0, 0, 0)");
      expect(geometry.activeIconBackgroundImage, `${width}px active icon background image`).toBe("none");
      expect(geometry.activeIconBoxShadow, `${width}px active icon box shadow`).toBe("none");
      expect(geometry.activeIconBeforeBackground, `${width}px active icon ::before background`).toBe("rgba(0, 0, 0, 0)");
      expect(geometry.activeIconAfterBackground, `${width}px active icon ::after background`).toBe("rgba(0, 0, 0, 0)");
      expect(geometry.dockBorder).not.toBe("rgba(0, 0, 0, 0)");
      expect(geometry.feedbackTone).toBe("secondary");
      expect(geometry.feedbackBackground).not.toBe("rgba(0, 0, 0, 0)");
      expect(geometry.feedbackBackground).toBe(geometry.preferencesBackground);
      expect(geometry.feedbackColor).toBe(geometry.preferencesColor);
      expect(geometry.feedbackBorder).toBe(geometry.preferencesBorder);

      const inactive = ribbon.locator('[data-navigation-block-active="false"]').first();
      await inactive.hover();
      await expect(page.locator(".cmm-navigation-block-label")).toHaveCount(0);
      await expect(page.locator("#cmm-global-tooltip")).toHaveCount(0);
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

    const search = page.locator('button[data-navigation-tutorial-target="search"]');
    await page.keyboard.press("Control+k");
    await expect(page.locator("#global-search-popover")).toBeVisible();
    await expect(page.locator('input[aria-label="Rechercher une rubrique, un outil ou une aide"]')).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(page.locator("#global-search-popover")).toHaveCount(0);
    await expect(search).toBeFocused();

    const activeTrigger = ribbon.locator('[data-navigation-block-active="true"]');
    await activeTrigger.press("Enter");
    await expect(activeTrigger).toHaveAttribute("aria-expanded", "true");
    const panelId = await activeTrigger.getAttribute("aria-controls");
    await expect(page.locator(`#${panelId}`)).toBeVisible();
    await expect(page.locator(`#${panelId} h3`)).toContainText("Bloc :");
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

  test("keeps the tooltip-free dock across the three display modes", async ({ page }) => {
    for (const displayMode of ["exhaustif", "minimaliste", "sobre"] as const) {
      await page.goto("/methodologie", { waitUntil: "domcontentloaded" });
      await page.evaluate((mode) => localStorage.setItem("cleanmymap.display_mode", mode), displayMode);
      await page.reload({ waitUntil: "domcontentloaded" });
      await page.setViewportSize({ width: 1440, height: 900 });
      const ribbon = await waitForRibbon(page);
      const trigger = ribbon.locator("[data-navigation-block-trigger]").first();
      await trigger.focus();
      await page.waitForTimeout(350);
      await expect(page.locator(".cmm-navigation-block-label")).toHaveCount(0);
      await expect(page.locator("#cmm-global-tooltip")).toHaveCount(0);
      await expect(trigger).toHaveAttribute("aria-label", /.+/);
    }
  });

  test("shows visitor authentication labels from 640px in French and English", async ({ page }, testInfo) => {
    test.setTimeout(180_000);
    const widths = [390, 639, 640, 768, 1024, 1279, 1280, 1440, 1920] as const;
    const locales = [
      { code: "fr", signIn: "Se connecter à CleanMyMap", signUp: "Créer un compte CleanMyMap" },
      { code: "en", signIn: "Sign in to CleanMyMap", signUp: "Sign up for CleanMyMap" },
    ] as const;

    for (const locale of locales) {
      await page.goto("/methodologie", { waitUntil: "domcontentloaded" });
      await page.evaluate((value) => localStorage.setItem("cleanmymap.locale", value), locale.code);
      await page.reload({ waitUntil: "domcontentloaded" });
      await expect(page.locator("html")).toHaveAttribute("lang", locale.code);

      for (const width of widths) {
        await page.setViewportSize({ width, height: 900 });
        await page.reload({ waitUntil: "domcontentloaded" });
        await dismissCookies(page);
        await assertNoRibbonOverflow(page, width);

        const geometry = await page.evaluate(({ signInLabel, signUpLabel }) => {
          const find = (label: string) => [...document.querySelectorAll<HTMLElement>("a[aria-label]")].find((element) => element.getAttribute("aria-label") === label);
          const measure = (element: HTMLElement | undefined) => {
            if (!element) return null;
            const label = element.querySelector<HTMLElement>("span");
            const icon = element.querySelector<SVGElement>("svg");
            const labelStyle = label ? getComputedStyle(label) : null;
            const iconStyle = icon ? getComputedStyle(icon) : null;
            const rect = element.getBoundingClientRect();
            return {
              href: element.getAttribute("href"),
              width: rect.width,
              height: rect.height,
              labelDisplay: labelStyle?.display ?? null,
              labelWidth: label?.getBoundingClientRect().width ?? 0,
              iconDisplay: iconStyle?.display ?? null,
              whiteSpace: getComputedStyle(element).whiteSpace,
            };
          };
          return { signIn: measure(find(signInLabel)), signUp: measure(find(signUpLabel)) };
        }, { signInLabel: locale.signIn, signUpLabel: locale.signUp });

        expect(geometry.signIn, `${locale.code} ${width}px sign-in link`).not.toBeNull();
        expect(geometry.signUp, `${locale.code} ${width}px sign-up link`).not.toBeNull();
        expect(geometry.signIn?.href).toContain("/sign-in");
        expect(geometry.signUp?.href).toContain("/sign-up");
        expect(geometry.signIn?.width).toBeGreaterThanOrEqual(40);
        expect(geometry.signUp?.width).toBeGreaterThanOrEqual(40);
        expect(geometry.signIn?.whiteSpace).toBe("nowrap");
        expect(geometry.signUp?.whiteSpace).toBe("nowrap");

        if (width < 640) {
          expect(geometry.signIn?.labelDisplay).toBe("none");
          expect(geometry.signUp?.labelDisplay).toBe("none");
          expect(geometry.signIn?.iconDisplay).not.toBe("none");
          expect(geometry.signUp?.iconDisplay).not.toBe("none");
        } else {
          expect(geometry.signIn?.labelDisplay).not.toBe("none");
          expect(geometry.signUp?.labelDisplay).not.toBe("none");
          expect(geometry.signIn?.labelWidth).toBeGreaterThan(0);
          expect(geometry.signUp?.labelWidth).toBeGreaterThan(0);
          expect(geometry.signIn?.iconDisplay).toBe("none");
          expect(geometry.signUp?.iconDisplay).toBe("none");
        }

        if (locale.code === "fr" && [390, 768, 1440].includes(width)) {
          await testInfo.attach(`visitor-auth-${width}`, {
            body: await page.screenshot({ fullPage: false }),
            contentType: "image/png",
          });
        }
      }
    }

    for (const zoom of [1.25, 1.5] as const) {
      const effectiveWidth = Math.floor(1440 / zoom);
      await page.setViewportSize({ width: effectiveWidth, height: 900 });
      await page.reload({ waitUntil: "domcontentloaded" });
      await dismissCookies(page);
      await assertNoRibbonOverflow(page, effectiveWidth);
      const labels = await page.locator('a[aria-label="Sign in to CleanMyMap"] span, a[aria-label="Sign up for CleanMyMap"] span').evaluateAll((elements) => elements.map((element) => ({ display: getComputedStyle(element).display, width: element.getBoundingClientRect().width })));
      expect(labels).toHaveLength(2);
      expect(labels.every((label) => label.display !== "none" && label.width > 0), `English labels at ${Math.round(zoom * 100)}% proxy`).toBe(true);
    }
  });

  test("keeps the responsive product entry and utility controls reachable", async ({ page }) => {
    test.setTimeout(120_000);
    for (const width of [390, 768, 1024, 1279, 1280, 1440, 1600, 1920] as const) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/methodologie", { waitUntil: "domcontentloaded" });
      await dismissCookies(page);
      const responsiveGroup = page.locator('[data-navigation-group-visibility="responsive"]');
      const summary = responsiveGroup.getByRole("button", { name: "Sommaire" });
      const desktopDock = page.locator('nav[aria-label="Navigation par blocs"]');

      if (width < 1280) {
        await expect(responsiveGroup).toBeVisible();
        await expect(summary).toBeVisible();
        await expect(desktopDock).toBeHidden();
        await page.getByRole("button", { name: "Menu Feedback" }).click();
        await expect(page.locator("#feedback-menu-panel")).toBeVisible();
        await page.keyboard.press("Escape");
      } else {
        await expect(responsiveGroup).toBeHidden();
        await expect(desktopDock).toBeVisible();
        await assertNoRibbonOverflow(page, width);
      }
    }
  });
});
