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
    const links = Array.from(footer.querySelectorAll<HTMLElement>("a, button")).map((element) => {
      const rect = element.getBoundingClientRect();
      return {
        name: element.textContent?.trim() ?? "",
        width: rect.width,
        height: rect.height,
        insideFooter: rect.left >= footerRect.left - 1 && rect.right <= footerRect.right + 1,
      };
    });
    const signature = footer.querySelector<HTMLElement>(".cmm-footer-signature")?.getBoundingClientRect();

    return {
      documentClientWidth: document.documentElement.clientWidth,
      documentScrollWidth: document.documentElement.scrollWidth,
      footerClientWidth: footer.clientWidth,
      footerScrollWidth: footer.scrollWidth,
      footerRightGap: signature ? footerRect.right - signature.right : null,
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
      await page.goto("/contact", { waitUntil: "domcontentloaded" });
      await dismissCookies(page);

      const footer = page.locator('footer[aria-label="Pied de page"]');
      await expect(footer).toBeVisible();
      await expect(footer.locator("a, button")).toHaveCount(9);

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

      if (viewport.width > 1100) {
        expect(layout.footerRightGap).not.toBeNull();
        expect(layout.footerRightGap!).toBeLessThanOrEqual(32);
      }

      if (viewport.label === "100%") {
        const contact = footer.getByRole("link", { name: "Contact", exact: true });
        const email = footer.locator('a[href^="mailto:"]');
        await contact.focus();
        await expect(contact).toBeFocused();
        await page.keyboard.press("Tab");
        await expect(email).toBeFocused();

        const cookieButton = footer.getByRole("button", { name: "Gérer mes cookies" });
        await cookieButton.focus();
        await expect(cookieButton).toBeFocused();
        await cookieButton.click();
        await expect(page.getByRole("button", { name: "Tout refuser" })).toBeVisible();
      }
    }
  });
});
