import { expect, test, type Page } from "@playwright/test";

const zoomEquivalentViewports = [
  { label: "67%", width: 2149 },
  { label: "80%", width: 1800 },
  { label: "100%", width: 1440 },
  { label: "125%", width: 1152 },
  { label: "150%", width: 960 },
  { label: "200%", width: 720 },
] as const;

const additionalViewports = [
  { label: "mobile", width: 390 },
  { label: "tablet", width: 768 },
] as const;

async function dismissCookies(page: Page): Promise<void> {
  const refuse = page.getByRole("button", { name: "Tout refuser" });
  try {
    await refuse.waitFor({ state: "visible", timeout: 3_000 });
    await refuse.click();
    await expect(refuse).toHaveCount(0);
  } catch {
    // The banner may already be persisted for this browser context.
  }
}

async function readFooterLayout(page: Page) {
  return page.evaluate(() => {
    const footer = document.querySelector<HTMLElement>('footer[aria-label="Pied de page"]');
    if (!footer) {
      throw new Error("Missing global footer landmark");
    }

    const footerRect = footer.getBoundingClientRect();
    const row = footer.querySelector<HTMLElement>(".cmm-footer-row");
    const rowRect = row?.getBoundingClientRect();
    const rowItems = row && rowRect
      ? Array.from(row.children)
          .map((element) => element.getBoundingClientRect())
          .filter((rect) => rect.width > 0 && rect.height > 0)
          .map((rect) => ({
            left: rect.left,
            right: rect.right,
            top: rect.top,
            bottom: rect.bottom,
            insideRow: rect.left >= rowRect.left - 1 && rect.right <= rowRect.right + 1,
          }))
      : [];
    const links = Array.from(footer.querySelectorAll<HTMLElement>("a, button, summary"))
      .map((element) => ({ element, rect: element.getBoundingClientRect() }))
      .filter(({ rect }) => rect.width > 0 && rect.height > 0)
      .map(({ element, rect }) => ({
        name: element.textContent?.trim() ?? "",
        width: rect.width,
        height: rect.height,
        insideFooter: rect.left >= footerRect.left - 1 && rect.right <= footerRect.right + 1,
      }));
    const signature = footer.querySelector<HTMLElement>(".cmm-footer-signature")?.getBoundingClientRect();

    return {
      documentClientWidth: document.documentElement.clientWidth,
      documentScrollWidth: document.documentElement.scrollWidth,
      footerClientWidth: footer.clientWidth,
      footerScrollWidth: footer.scrollWidth,
      footerRightGap: signature ? footerRect.right - signature.right : null,
      rowItems,
      links,
    };
  });
}

test.describe("public global footer responsive layout", () => {
  test("reflows without horizontal overflow at browser-zoom equivalent widths", async ({ page }, testInfo) => {
    test.setTimeout(120_000);
    testInfo.annotations.push({
      type: "coverage",
      description:
        "ZOOM_PROXY: browser zoom is exercised through equivalent CSS viewport widths, the repository-supported Playwright approximation.",
    });

    for (const viewport of [...zoomEquivalentViewports, ...additionalViewports]) {
      await page.setViewportSize({ width: viewport.width, height: 900 });
      await page.goto("/mentions-legales", { waitUntil: "domcontentloaded" });
      await dismissCookies(page);

      const footer = page.locator('footer[aria-label="Pied de page"]');
      await expect(footer).toBeVisible();
      await expect(footer.locator("a, button, summary")).toHaveCount(15);

      const layout = await readFooterLayout(page);
      expect(
        layout.documentScrollWidth,
        `page overflow at ${viewport.label} (${viewport.width}px)`,
      ).toBeLessThanOrEqual(layout.documentClientWidth + 1);
      expect(
        layout.footerScrollWidth,
        `footer overflow at ${viewport.label} (${viewport.width}px)`,
      ).toBeLessThanOrEqual(layout.footerClientWidth + 1);
      expect(layout.links.every((link) => link.width > 0 && link.height > 0 && link.insideFooter)).toBe(true);

      if (viewport.width >= 640) {
        expect(
          layout.rowItems.every(
            (item, index, items) =>
              item.insideRow &&
              (index === 0 || items[index - 1].right <= item.left + 1) &&
              item.bottom >= items[0].top - 1,
          ),
          `desktop/tablet footer groups overlap or escape the single row at ${viewport.label}`,
        ).toBe(true);
      }

      if (viewport.width > 1100) {
        expect(layout.footerRightGap).not.toBeNull();
        expect(layout.footerRightGap!).toBeLessThanOrEqual(32);
      }

      if (viewport.label === "100%") {
        const contact = footer.getByRole("link", { name: "Contacter CleanMyMap", exact: true });
        const email = footer.locator('a[href^="mailto:"]');
        await contact.focus();
        await expect(contact).toBeFocused();
        await page.keyboard.press("Tab");
        await expect(email).toBeFocused();

      }

      if (viewport.width <= 1440) {
        const information = footer.getByRole("button", { name: "Informations", exact: true });
        await information.focus();
        await expect(information).toBeFocused();
        await page.keyboard.press("Enter");

        const panel = page.getByRole("region", { name: "Informations" });
        await expect(panel).toBeVisible();
        await expect(panel.getByRole("link", { name: "Mentions légales" })).toBeVisible();
        await expect(panel.getByRole("link", { name: "CGU" })).toBeVisible();
        await expect(panel.getByRole("link", { name: "Confidentialité" })).toBeVisible();
        await expect(panel.getByRole("link", { name: "Politique cookies" })).toBeVisible();
        await expect(panel.getByRole("button", { name: "Gérer mes cookies" })).toBeVisible();

        await page.keyboard.press("Tab");
        await expect(panel.getByRole("link", { name: "Mentions légales" })).toBeFocused();

        await page.keyboard.press("Shift+Tab");
        await expect(information).toBeFocused();
        await page.keyboard.press("Enter");
        await expect(panel).toBeHidden();
        await expect(information).toBeFocused();

        await page.keyboard.press("Enter");
        const cookieButton = panel.getByRole("button", { name: "Gérer mes cookies" });
        await cookieButton.focus();
        await expect(cookieButton).toBeFocused();
        await cookieButton.click();
        await expect(page.getByRole("button", { name: "Tout refuser" })).toBeVisible();
      }
    }
  });
});
