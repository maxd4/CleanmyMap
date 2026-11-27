import { expect, test } from "@playwright/test";

test("classic pages use available width while homepage and summary retain their dedicated cap", async ({ page }) => {
  await page.setViewportSize({ width: 2560, height: 1080 });
  await page.goto("/sections/annuaire");
  const layout = page.locator("#annuaire .cmm-page-layout").first();
  await expect(layout).toBeVisible();
  const classic = await layout.evaluate(el => ({
    width: el.getBoundingClientRect().width,
    parent: el.parentElement!.clientWidth,
    cap: getComputedStyle(el).getPropertyValue("--cmm-page-max-width").trim(),
  }));
  expect(classic.cap).toBe("100%");
  expect(classic.width).toBeGreaterThan(1792);
  expect(Math.abs(classic.parent - classic.width)).toBeLessThanOrEqual(2);

  for (const width of [390, 768, 1440, 1920, 2560]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await layout.evaluate(el => el.scrollWidth <= el.clientWidth + 2)).toBe(true);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 2)).toBe(true);
  }

  for (const [route, selector] of [
    ["/", "[data-homepage-canvas] .cmm-page-width"],
    ["/explorer", '[data-cmm-page-width-exception="sommaire"] .cmm-page-width'],
  ]) {
    await page.goto(route);
    const special = page.locator(selector).first();
    await expect(special).toBeVisible();
    expect(await special.evaluate(el => el.getBoundingClientRect().width)).toBeLessThanOrEqual(1794);
  }
});
