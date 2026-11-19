import { expect, test, type Page } from "@playwright/test";

const requestedViewports = [320, 375, 390, 430, 640, 768, 1024, 1280, 1440, 1600, 1728, 1920, 2160] as const;
const zoomLevels = [1, 1.1, 1.25, 1.5] as const;

function effectiveViewportWidth(width: number, zoom: number): number {
  // The requested responsive contract starts at 320 CSS px. Keep the proxy
  // inside that supported floor for narrow mobile widths; desktop/tablet
  // widths still exercise the full zoom-equivalent range.
  return Math.max(320, Math.round(width / zoom));
}

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
    type Rect = { left: number; right: number; top: number; bottom: number; width: number; height: number };
    type Unit = Rect & { name: string };

    const toRect = (element: Element): Rect => {
      const rect = element.getBoundingClientRect();
      return {
        left: rect.left,
        right: rect.right,
        top: rect.top,
        bottom: rect.bottom,
        width: rect.width,
        height: rect.height,
      };
    };
    const isVisible = (element: Element): boolean => {
      const rect = element.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    };
    const directVisibleChildren = (root: Element | null, name: string): Unit[] =>
      root
        ? Array.from(root.children)
            .filter(isVisible)
            .map((element, index) => ({ ...toRect(element), name: `${name}[${index}]` }))
        : [];
    const visibleUnits = (root: Element | null, selector: string, name: string): Unit[] =>
      root
        ? Array.from(root.querySelectorAll(selector))
            .filter(isVisible)
            .map((element, index) => ({ ...toRect(element), name: `${name}[${index}]` }))
        : [];

    const footer = document.querySelector<HTMLElement>('footer[aria-label="Pied de page"]');
    if (!footer) {
      throw new Error("Missing global footer landmark");
    }

    const row = footer.querySelector<HTMLElement>(".cmm-footer-row");
    const contactActions = footer.querySelector<HTMLElement>(".cmm-footer-contact-actions");
    const legalLinks = footer.querySelector<HTMLElement>(".cmm-footer-legal-links");
    const information = footer.querySelector<HTMLElement>(".cmm-footer-information");
    const footerRect = toRect(footer);
    const rowRect = row ? toRect(row) : null;
    const rectsIntersect = (first: Rect, second: Rect): boolean =>
      Math.min(first.right, second.right) - Math.max(first.left, second.left) > 0.5 &&
      Math.min(first.bottom, second.bottom) - Math.max(first.top, second.top) > 0.5;
    const rowItems = directVisibleChildren(row, "row");
    const collisionScopes = [
      { root: row, name: "row" },
      { root: contactActions, name: "contacts" },
      { root: legalLinks, name: "legal" },
      ...Array.from(footer.querySelectorAll<HTMLElement>(".cmm-footer-contact-link")).map((root, index) => ({
        root,
        name: `contact-link[${index}]`,
      })),
    ];
    const collisions = collisionScopes.flatMap(({ root, name }) => {
      const units = directVisibleChildren(root, name);
      return units.flatMap((first, firstIndex) =>
        units.slice(firstIndex + 1).flatMap((second) =>
          rectsIntersect(first, second)
            ? [{ first: first.name, second: second.name }]
            : [],
        ),
      );
    });
    const links = Array.from(footer.querySelectorAll<HTMLElement>("a, button, summary"))
      .filter(isVisible)
      .map((element) => ({
        name: element.textContent?.trim() ?? "",
        ...toRect(element),
        insideFooter: (() => {
          const rect = element.getBoundingClientRect();
          return rect.left >= footerRect.left - 1 && rect.right <= footerRect.right + 1;
        })(),
      }));
    const visibleLegal = Boolean(legalLinks && isVisible(legalLinks));
    const informationSummary = information?.querySelector("summary");
    const visibleInformation = Boolean(informationSummary && isVisible(informationSummary));

    return {
      documentClientWidth: document.documentElement.clientWidth,
      documentScrollWidth: document.documentElement.scrollWidth,
      footerClientWidth: footer.clientWidth,
      footerScrollWidth: footer.scrollWidth,
      rowRect,
      rowItems,
      collisions,
      links,
      visibleContactLinks: visibleUnits(contactActions, ":scope > a", "contact"),
      visibleLegal,
      visibleInformation,
    };
  });
}

test.describe("public global footer responsive layout", () => {
  test("covers requested widths and zoom-equivalent viewports without real collisions", async ({ page }, testInfo) => {
    test.setTimeout(180_000);
    testInfo.annotations.push({
      type: "coverage",
      description:
        "ZOOM_PROXY: each requested CSS width is tested at 100/110/125/150% through its equivalent Playwright viewport width; native browser zoom remains a complementary manual check.",
    });

    for (const requestedWidth of requestedViewports) {
      for (const zoom of zoomLevels) {
        const viewportWidth = effectiveViewportWidth(requestedWidth, zoom);
        await page.setViewportSize({ width: viewportWidth, height: 900 });
        await page.goto("/mentions-legales", { waitUntil: "domcontentloaded" });
        await dismissCookies(page);

        const footer = page.locator('footer[aria-label="Pied de page"]');
        await expect(footer).toBeVisible();
        await expect(footer.locator("a, button, summary")).toHaveCount(15);

        const layout = await readFooterLayout(page);
        const label = `${requestedWidth}px @ ${Math.round(zoom * 100)}% (effective ${viewportWidth}px)`;
        expect(layout.documentScrollWidth, `page overflow at ${label}`).toBeLessThanOrEqual(layout.documentClientWidth + 1);
        expect(layout.footerScrollWidth, `footer overflow at ${label}`).toBeLessThanOrEqual(layout.footerClientWidth + 1);
        expect(layout.collisions, `visible collision at ${label}`).toEqual([]);
        expect(layout.links.every((link) => link.insideFooter), `interactive element escapes footer at ${label}`).toBe(true);
        expect(
          layout.links.every((link) => link.width >= 40 && link.height >= 40),
          `touch target below the footer minimum at ${label}`,
        ).toBe(true);

        if (viewportWidth >= 640) {
          expect(layout.rowItems.length, `missing desktop/tablet group at ${label}`).toBe(4);
          const commonRowTop = Math.max(...layout.rowItems.map((item) => item.top));
          const commonRowBottom = Math.min(...layout.rowItems.map((item) => item.bottom));
          expect(
            commonRowBottom - commonRowTop > 0,
            `footer groups are not on one line at ${label}`,
          ).toBe(true);
          expect(
            layout.rowItems.every(
              (item) => item.left >= (layout.rowRect?.left ?? 0) - 1 && item.right <= (layout.rowRect?.right ?? 0) + 1,
            ),
          ).toBe(true);
        } else {
          expect(layout.visibleContactLinks.length, `mobile contact count at ${label}`).toBe(4);
          const contactRows = new Map<number, number>();
          for (const contact of layout.visibleContactLinks) {
            const rowKey = Math.round(contact.top);
            contactRows.set(rowKey, (contactRows.get(rowKey) ?? 0) + 1);
          }
          expect([...contactRows.values()].sort(), `mobile contacts are not two rows at ${label}`).toEqual([2, 2]);
          expect(layout.visibleLegal, `legal links should be behind Informations at ${label}`).toBe(false);
          expect(layout.visibleInformation, `Informations should be visible at ${label}`).toBe(true);
        }

        if (layout.visibleInformation) {
          expect(layout.visibleLegal, `legal links duplicated outside Informations at ${label}`).toBe(false);
        } else {
          expect(layout.visibleLegal, `legal links disappeared at ${label}`).toBe(true);
        }
      }
    }
  });

  test("preserves keyboard navigation and the complete Information menu", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/mentions-legales", { waitUntil: "domcontentloaded" });
    await dismissCookies(page);

    const footer = page.locator('footer[aria-label="Pied de page"]');
    const contact = footer.getByRole("link", { name: "Contacter CleanMyMap", exact: true });
    const email = footer.locator('a[href^="mailto:"]');
    await contact.focus();
    await expect(contact).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(email).toBeFocused();

    await page.setViewportSize({ width: 390, height: 900 });
    await page.reload({ waitUntil: "domcontentloaded" });
    await dismissCookies(page);
    const information = footer.locator("summary.cmm-footer-information-trigger");
    await information.focus();
    await expect(information).toBeFocused();
    await page.keyboard.press("Enter");

    const panel = footer.getByRole("region", { name: "Informations" });
    await expect(panel).toBeVisible();
    await expect(panel.getByRole("link", { name: "Mentions légales" })).toBeVisible();
    await expect(panel.getByRole("link", { name: "CGU" })).toBeVisible();
    await expect(panel.getByRole("link", { name: "Confidentialité" })).toBeVisible();
    await expect(panel.getByRole("link", { name: "Politique cookies" })).toBeVisible();
    const cookieButton = panel.getByRole("button", { name: "Gérer mes cookies" });
    await expect(cookieButton).toBeVisible();
    await page.keyboard.press("Tab");
    await expect(panel.getByRole("link", { name: "Mentions légales" })).toBeFocused();
    await page.keyboard.press("Shift+Tab");
    await expect(information).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(panel).toBeHidden();
    await expect(information).toBeFocused();
    await page.keyboard.press("Enter");
    await cookieButton.focus();
    await cookieButton.click();
    await expect(page.getByRole("button", { name: "Tout refuser" })).toBeVisible();
  });

  test("captures representative desktop, tablet and mobile footers", async ({ page }, testInfo) => {
    const captures = [
      { label: "mobile-390", width: 390 },
      { label: "tablet-768", width: 768 },
      { label: "desktop-1440", width: 1440 },
      { label: "desktop-wide-1920", width: 1920 },
    ];

    for (const capture of captures) {
      await page.setViewportSize({ width: capture.width, height: 900 });
      await page.goto("/mentions-legales", { waitUntil: "domcontentloaded" });
      await dismissCookies(page);
      // Keep the development-only Next.js badge out of visual evidence; it is
      // not part of the public footer and is absent from production builds.
      await page.locator("nextjs-portal").evaluate((element) => {
        (element as HTMLElement).style.display = "none";
      });
      await page.locator('footer[aria-label="Pied de page"]').screenshot({
        path: testInfo.outputPath(`${capture.label}.png`),
      });
    }
  });
});
