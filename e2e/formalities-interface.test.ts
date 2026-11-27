import { expect, test } from "@playwright/test";

const VIEWPORTS = [320, 390, 768, 1024, 1440, 1920];

async function dismissCookies(page: import("@playwright/test").Page) {
  const refuse = page.getByRole("button", { name: "Tout refuser" });
  try {
    await refuse.waitFor({ state: "visible", timeout: 3_000 });
    await refuse.click();
    await expect(refuse).toHaveCount(0);
  } catch {
    // The consent choice can already be stored for this browser context.
  }
}

test.describe("formalités de préparation — surface publique", () => {
  test("reste lisible et sans débordement aux largeurs contractuelles", async ({ page }, testInfo) => {
    test.setTimeout(120_000);
    await page.goto("/actions/new?section=preparer");
    await dismissCookies(page);
    await expect(page.getByTestId("action-formalities-workflow")).toBeVisible({ timeout: 20_000 });
    for (const width of VIEWPORTS) {
      await page.setViewportSize({ width, height: 900 });
      const dimensions = await page.evaluate(() => ({
        viewport: document.documentElement.clientWidth,
        content: document.documentElement.scrollWidth,
      }));
      expect(dimensions.content, `horizontal overflow at ${width}px`).toBeLessThanOrEqual(dimensions.viewport + 1);
      await page.screenshot({ path: testInfo.outputPath(`formalities-${width}.png`), fullPage: true });
    }
  });

  test("permet d'ouvrir les détails au clavier avec une divulgation native", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/actions/new?section=preparer");
    await dismissCookies(page);

    const details = page.locator("summary").filter({ hasText: "Questions détaillées de qualification" }).first();
    await expect(details).toBeVisible();
    await details.focus();
    await expect(details).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(details.locator("xpath=..")).toHaveAttribute("open", "");
    await expect(page.getByLabel("Espace concerné")).toBeVisible();
  });
});
