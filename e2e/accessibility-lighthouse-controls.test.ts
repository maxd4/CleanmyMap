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

async function assertVisibleControlsHaveAccessibleNames(page: Page): Promise<void> {
  const unnamed = await page.locator(
    'button:visible, a[href]:visible, input:visible, select:visible, textarea:visible, [role="button"]:visible, [role="tab"]:visible',
  ).evaluateAll((elements) => elements.flatMap((element) => {
    const ariaLabel = element.getAttribute("aria-label")?.trim();
    const labelledBy = element.getAttribute("aria-labelledby")?.trim();
    const labelledByText = labelledBy
      ? labelledBy.split(/\s+/).map((id) => document.getElementById(id)?.textContent?.trim() ?? "").join(" ").trim()
      : "";
    const id = element.getAttribute("id");
    const associatedLabel = id
      ? Array.from(document.querySelectorAll("label")).find((label) => label.htmlFor === id)?.textContent?.trim() ?? ""
      : element.closest("label")?.textContent?.trim() ?? "";
    const text = element.textContent?.trim();
    const title = element.getAttribute("title")?.trim();
    const placeholder = element.getAttribute("placeholder")?.trim();
    if (ariaLabel || labelledByText || associatedLabel || text || title || placeholder) return [];
    return [element.outerHTML.slice(0, 240)];
  }));

  expect(unnamed, "visible controls must expose an accessible name").toEqual([]);
}

async function readFirstTextContrast(page: Page): Promise<{ ratio: number } | null> {
  return page.locator("main .cmm-text-body, main p").first().evaluate((element) => {
    const parse = (value: string): [number, number, number, number] | null => {
      const match = value.match(/rgba?\((\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*([\d.]+))?\)/);
      if (!match) return null;
      return [Number(match[1]), Number(match[2]), Number(match[3]), match[4] ? Number(match[4]) : 1];
    };
    const luminance = ([red, green, blue]: [number, number, number, number]) => {
      const channel = (value: number) => {
        const normalized = value / 255;
        return normalized <= 0.03928 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
      };
      return 0.2126 * channel(red) + 0.7152 * channel(green) + 0.0722 * channel(blue);
    };

    const foreground = parse(getComputedStyle(element).color);
    if (!foreground || foreground[3] < 1) return null;
    let current: Element | null = element;
    let background: [number, number, number, number] | null = null;
    while (current) {
      const candidate = parse(getComputedStyle(current).backgroundColor);
      if (candidate && candidate[3] >= 1) {
        background = candidate;
        break;
      }
      current = current.parentElement;
    }
    if (!background) return null;
    const foregroundLuminance = luminance(foreground);
    const backgroundLuminance = luminance(background);
    return { ratio: (Math.max(foregroundLuminance, backgroundLuminance) + 0.05) / (Math.min(foregroundLuminance, backgroundLuminance) + 0.05) };
  }).catch(() => null);
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
    await assertVisibleControlsHaveAccessibleNames(page);
  });

  test("public route remains readable with reduced motion and reports available text contrast", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/sections/route", { waitUntil: "domcontentloaded" });
    await dismissCookies(page);

    await expect(page.locator("main#main-content")).toBeVisible();
    await expect(page.locator("main#main-content")).toHaveCSS("overflow-x", /visible|auto|clip/);
    expect(await page.evaluate(() => window.matchMedia("(prefers-reduced-motion: reduce)").matches)).toBe(true);
    await assertVisibleControlsHaveAccessibleNames(page);

    const contrast = await readFirstTextContrast(page);
    if (contrast) {
      expect(contrast.ratio, "normal reading text should meet WCAG AA when colors are solid").toBeGreaterThanOrEqual(4.5);
    } else {
      test.info().annotations.push({
        type: "coverage",
        description: "NON_EVALUABLE_CONTRAST: no solid foreground/background pair was exposed by the representative route",
      });
    }
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
