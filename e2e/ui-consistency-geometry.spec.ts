import { expect, test, type Page } from "@playwright/test";

const viewports = [390, 768, 1440] as const;
const displayModes = ["exhaustif", "minimaliste", "sobre"] as const;

const pages = [
  { slug: "annuaire", path: "/sections/annuaire", family: "section" },
  { slug: "compost", path: "/sections/compost", family: "section" },
  { slug: "recycling", path: "/sections/recycling", family: "section" },
  { slug: "climate", path: "/sections/climate", family: "section" },
  { slug: "reports", path: "/reports", family: "reports" },
  { slug: "spogomi", path: "/spogomi", family: "spogomi" },
] as const;

type Geometry = {
  headerLeft: number;
  shellLeft: number;
  shellRight: number;
  shellContentLeft: number;
  shellContentRight: number;
  headerToFirst: number;
  sectionGap: number | null;
  cardWidth: number | null;
  cardPadding: number | null;
  overflow: number;
};

async function measureGeometry(page: Page, family: string, routePath: string) {
  const selectors = family === "section"
    ? {
        header: "[data-rubrique-report-root] .cmm-page-header",
        shell: "[data-rubrique-report-root] .cmm-page-layout",
        first: "[data-rubrique-report-root] .cmm-section-group > *",
        group: "[data-rubrique-report-root] .cmm-section-group",
        card: "[data-rubrique-report-root] .cmm-card[data-cmm-card-size], [data-rubrique-report-root] .cmm-card",
      }
    : family === "reports"
      ? {
          header: ".cmm-grid-shell .cmm-page-header",
          shell: ".cmm-grid-shell",
          first: ".cmm-grid-shell .cmm-grid-layout > .cmm-grid-span:nth-child(3)",
          group: ".cmm-grid-shell .cmm-grid-layout",
          card: ".cmm-grid-shell .cmm-card[data-cmm-card-size], .cmm-grid-shell .cmm-card",
        }
      : {
          header: "main .cmm-page-header",
          shell: "main .cmm-page-width",
          first: "main .cmm-page-width > *:not(.cmm-page-header)",
          group: "main .cmm-page-width",
          card: "main .cmm-page-width .cmm-card[data-cmm-card-size], main .cmm-page-width .cmm-card",
        };

  return page.evaluate(({ query, routePath }: { query: typeof selectors; routePath: string }) => {
    const readRect = (element: Element | null) => {
      if (!element) return null;
      const rect = element.getBoundingClientRect();
      return { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom, width: rect.width };
    };
    const header = document.querySelector(query.header);
    const shell = document.querySelector(query.shell);
    const first = document.querySelector(query.first);
    const group = document.querySelector(query.group);
    const card = document.querySelector(query.card);
    if (!header || !shell || !first || !group) {
      throw new Error(`${routePath}: missing geometry anchor: ${JSON.stringify(query)} counts=${JSON.stringify({ header: Boolean(header), shell: Boolean(shell), first: Boolean(first), group: Boolean(group), body: document.body.innerText.slice(0, 160) })}`);
    }
    const shellStyle = getComputedStyle(shell);
    const cardStyle = card ? getComputedStyle(card) : null;
    const headerRect = readRect(header)!;
    const shellRect = readRect(shell)!;
    const firstRect = readRect(first)!;
    const groupStyle = getComputedStyle(group);
    return {
      headerLeft: headerRect.left,
      shellLeft: shellRect.left,
      shellRight: shellRect.right,
      shellContentLeft: shellRect.left + Number.parseFloat(shellStyle.paddingLeft || "0"),
      shellContentRight: shellRect.right - Number.parseFloat(shellStyle.paddingRight || "0"),
      headerToFirst: firstRect.top - headerRect.bottom,
      sectionGap: Number.parseFloat(groupStyle.rowGap || groupStyle.gap || "0") || null,
      cardWidth: card ? readRect(card)!.width : null,
      cardPadding: cardStyle ? Number.parseFloat(cardStyle.paddingLeft || "0") : null,
      overflow: Math.max(0, document.documentElement.scrollWidth - document.documentElement.getBoundingClientRect().width),
    } satisfies Geometry;
  }, { query: selectors, routePath });
}

test.describe("UI consistency geometry", () => {
  test("keeps comparable shells aligned across responsive viewports and display modes", async ({ page }, testInfo) => {
    test.setTimeout(120_000);
    for (const viewportWidth of viewports) {
      await page.setViewportSize({ width: viewportWidth, height: 900 });
      const measurements = new Map<string, Geometry[]>();

      for (const route of pages) {
        await page.goto(route.path, { waitUntil: "domcontentloaded" });
        await expect(page.locator("main").first()).toBeVisible();
        await page.locator(".cmm-page-header").first().waitFor({ state: "visible", timeout: 10_000 });
        await page.waitForTimeout(150);

        const routeMeasurements: Geometry[] = [];
        for (const mode of displayModes) {
          await page.evaluate((displayMode) => {
            document.documentElement.setAttribute("data-display-mode", displayMode);
          }, mode);
          await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => resolve())));
          const geometry = await measureGeometry(page, route.family, route.path);
          routeMeasurements.push(geometry);
          expect(geometry.overflow, `${route.path} overflow at ${viewportWidth}px in ${mode}`).toBeLessThanOrEqual(2);
        }

        const baseline = routeMeasurements[0];
        for (const current of routeMeasurements.slice(1)) {
          expect(Math.abs(current.headerLeft - baseline.headerLeft), `${route.path} header moved in display mode`).toBeLessThanOrEqual(2);
          expect(Math.abs(current.shellContentLeft - baseline.shellContentLeft), `${route.path} shell moved in display mode`).toBeLessThanOrEqual(2);
          expect(Math.abs(current.headerToFirst - baseline.headerToFirst), `${route.path} header rhythm changed in display mode`).toBeLessThanOrEqual(3);
        }

        measurements.set(route.slug, routeMeasurements);
        if (viewportWidth === 390 || viewportWidth === 1440) {
          await testInfo.attach(`${route.slug}-${viewportWidth}`, {
            body: await page.screenshot({ fullPage: true }),
            contentType: "image/png",
          });
        }
      }

      const classical = pages.filter((route) => route.family === "section");
      const classicalGeometry = classical.map((route) => measurements.get(route.slug)![0]);
      const headerAxis = classicalGeometry.map((geometry) => geometry.headerLeft);
      const shellAxis = classicalGeometry.map((geometry) => geometry.shellContentLeft);
      const groupGaps = classicalGeometry.map((geometry) => geometry.sectionGap).filter((gap): gap is number => gap !== null);
      expect(Math.max(...headerAxis) - Math.min(...headerAxis), `classical PageHeader axis at ${viewportWidth}px`).toBeLessThanOrEqual(3);
      expect(Math.max(...shellAxis) - Math.min(...shellAxis), `classical shell axis at ${viewportWidth}px`).toBeLessThanOrEqual(3);
      if (groupGaps.length > 1) {
        expect(Math.max(...groupGaps) - Math.min(...groupGaps), `classical section rhythm at ${viewportWidth}px`).toBeLessThanOrEqual(3);
      }

      for (const route of pages) {
        const geometry = measurements.get(route.slug)![0];
        expect(geometry.shellRight).toBeGreaterThan(geometry.shellLeft);
        expect(geometry.headerToFirst, `${route.path} header-to-first-block gap`).toBeGreaterThanOrEqual(0);
        if (geometry.cardWidth !== null) {
          expect(geometry.cardWidth).toBeGreaterThan(0);
          expect(geometry.cardPadding).toBeGreaterThan(0);
        }
      }
    }
  });
});
