import { expect, test, type Page } from "@playwright/test";
import path from "node:path";

const authFile = path.join(process.cwd(), "artifacts", "playwright", "clerk", "user.json");
const displayModes = ["exhaustif", "minimaliste", "sobre"] as const;
const viewports = [390, 320, 768, 1440] as const;
const protectedRoutes = [
  "/dashboard",
  "/profil",
  "/compte/evolution",
  "/parcours",
  "/pilotage",
  "/sponsor-portal",
] as const;

type OverflowObservation = {
  viewportWidth: number;
  documentScrollWidth: number;
  bodyScrollWidth: number;
  offenders: Array<{
    tag: string;
    className: string;
    left: number;
    right: number;
    width: number;
    position: string;
    overflowX: string;
  }>;
};

async function waitForClerkSession(page: Page): Promise<void> {
  await page.waitForFunction(() => {
    const clerk = (window as Window & {
      Clerk?: { loaded?: boolean; user?: { id?: string } | null; session?: { id?: string; status?: string } | null };
    }).Clerk;
    return Boolean(clerk?.loaded && clerk.user?.id && clerk.session?.id && clerk.session.status === "active");
  });
}

async function openProtectedRoute(page: Page, route: string): Promise<void> {
  await page.goto(route, { waitUntil: "domcontentloaded" });
  await waitForClerkSession(page);
  await expect(page).not.toHaveURL(/\/sign-in(?:[/?#]|$)/);
  await expect(page.locator("[data-auth-gate-card]")).toHaveCount(0);
}

async function measureDashboardOverflow(page: Page, viewportWidth: number): Promise<OverflowObservation> {
  return page.evaluate((expectedViewportWidth) => {
    const viewport = window.innerWidth;
    const candidates = Array.from(document.querySelectorAll<HTMLElement>("main, main *"))
      .map((element) => {
        const rect = element.getBoundingClientRect();
        const style = getComputedStyle(element);
        return {
          tag: element.tagName.toLowerCase(),
          className: typeof element.className === "string" ? element.className.slice(0, 180) : "",
          left: Number(rect.left.toFixed(2)),
          right: Number(rect.right.toFixed(2)),
          width: Number(rect.width.toFixed(2)),
          position: style.position,
          overflowX: style.overflowX,
        };
      })
      .filter(({ left, right, width }) => width > 0 && (left < -0.5 || right > viewport + 0.5))
      .sort((left, right) => Math.max(right.right - viewport, 0) - Math.max(left.right - viewport, 0))
      .slice(0, 12);

    return {
      viewportWidth: expectedViewportWidth,
      documentScrollWidth: document.documentElement.scrollWidth,
      bodyScrollWidth: document.body.scrollWidth,
      offenders: candidates,
    } satisfies OverflowObservation;
  }, viewportWidth);
}

test.describe("Dashboard Clerk persistence and responsive recipe", () => {
  test.use({ storageState: undefined });

  test("restores the Clerk session in a new context across protected routes", async ({ browser }) => {
    test.setTimeout(120_000);
    const context = await browser.newContext({ storageState: authFile });
    const page = await context.newPage();

    try {
      for (const route of protectedRoutes) {
        await openProtectedRoute(page, route);
        const observation = await page.evaluate(() => ({
          pathname: window.location.pathname,
          hasClientSession: Boolean((window as Window & { Clerk?: { session?: { id?: string } | null } }).Clerk?.session?.id),
          hasClientUser: Boolean((window as Window & { Clerk?: { user?: { id?: string } | null } }).Clerk?.user?.id),
          serverProtectedSurface: Boolean(document.querySelector("main[data-display-mode], [data-authenticated-surface]")),
        }));

        expect(observation.hasClientSession, `${route}: Clerk session disappeared`).toBe(true);
        expect(observation.hasClientUser, `${route}: Clerk user disappeared`).toBe(true);
        expect(observation.pathname, `${route}: unexpected anonymous redirect`).not.toMatch(/^\/sign-in/);

        if (route === "/dashboard" || route === "/profil") {
          expect(observation.serverProtectedSurface, `${route}: server auth surface was not resolved`).toBe(true);
        }
      }
    } finally {
      await context.close();
    }
  });

  test("keeps Dashboard free of horizontal overflow across modes and viewports", async ({ browser }, testInfo) => {
    test.setTimeout(180_000);
    const context = await browser.newContext({ storageState: authFile });
    const page = await context.newPage();

    try {
      for (const viewportWidth of viewports) {
        await page.setViewportSize({ width: viewportWidth, height: 900 });

        for (const displayMode of displayModes) {
          await page.goto("/dashboard", { waitUntil: "domcontentloaded" });
          await waitForClerkSession(page);
          await page.evaluate((mode) => {
            window.localStorage.setItem("cleanmymap.display_mode", mode);
            document.documentElement.setAttribute("data-display-mode", mode);
          }, displayMode);
          await page.reload({ waitUntil: "domcontentloaded" });
          await expect(page.locator("main[data-display-mode]")).toHaveCount(1);

          const observation = await measureDashboardOverflow(page, viewportWidth);
          expect(
            observation.documentScrollWidth,
            `Dashboard horizontal overflow at ${viewportWidth}px in ${displayMode}: ${JSON.stringify(observation)}`,
          ).toBeLessThanOrEqual(viewportWidth);
          expect(
            observation.bodyScrollWidth,
            `Body horizontal overflow at ${viewportWidth}px in ${displayMode}: ${JSON.stringify(observation)}`,
          ).toBeLessThanOrEqual(viewportWidth);

          if (viewportWidth === 390 || viewportWidth === 1440) {
            await testInfo.attach(`dashboard-${viewportWidth}-${displayMode}`, {
              body: await page.screenshot({ fullPage: true }),
              contentType: "image/png",
            });
          }
        }
      }
    } finally {
      await context.close();
    }
  });

  test("keeps Dashboard controls reachable with visible keyboard focus", async ({ browser }) => {
    test.setTimeout(60_000);
    const context = await browser.newContext({ storageState: authFile });
    const page = await context.newPage();

    try {
      await page.setViewportSize({ width: 390, height: 900 });
      await openProtectedRoute(page, "/dashboard");

      for (let index = 0; index < 8; index += 1) {
        await page.keyboard.press("Tab");
        const focus = await page.evaluate(() => {
          const element = document.activeElement;
          if (!(element instanceof HTMLElement)) return null;
          const rect = element.getBoundingClientRect();
          const style = getComputedStyle(element);
          return {
            tag: element.tagName.toLowerCase(),
            visible: rect.width > 0 && rect.height > 0,
            focusVisible: element.matches(":focus-visible"),
            hasIndicator: style.outlineStyle !== "none" || style.boxShadow !== "none",
          };
        });

        expect(focus, `Tab ${index + 1}: no focused control`).not.toBeNull();
        expect(focus?.visible, `Tab ${index + 1}: focused control is not visible`).toBe(true);
        expect(focus?.focusVisible, `Tab ${index + 1}: focus-visible state missing on ${focus?.tag}`).toBe(true);
        expect(focus?.hasIndicator, `Tab ${index + 1}: focus indicator missing on ${focus?.tag}`).toBe(true);
      }
    } finally {
      await context.close();
    }
  });

  test("contains the compact identity bubble and preserves the utility-interval dock", async ({ browser }) => {
    test.setTimeout(180_000);
    const context = await browser.newContext({ storageState: authFile });
    const page = await context.newPage();
    const widths = [390, 768, 1024, 1279, 1280, 1439, 1440, 1600, 1920] as const;

    try {
      for (const viewportWidth of widths) {
        await page.setViewportSize({ width: viewportWidth, height: 900 });
        await openProtectedRoute(page, "/dashboard");
        await expect(page.locator("[data-navigation-account-identity]")).toBeVisible();

        const metrics = await page.evaluate(() => {
          const rectFor = (selector: string) => {
            const element = document.querySelector<HTMLElement>(selector);
            if (!element) return null;
            const rect = element.getBoundingClientRect();
            return { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom, width: rect.width, height: rect.height };
          };
          const identity = document.querySelector<HTMLElement>("[data-navigation-account-identity]");
          const fullName = document.querySelector<HTMLElement>("[data-navigation-account-full-name]");
          const activityStatus = document.querySelector<HTMLButtonElement>('button[aria-label^="Statut :"]');
          const identityGroup = rectFor('[data-navigation-group="account"]');
          const preferences = rectFor('button[data-navigation-tutorial-target="preferences"]');
          const feedback = rectFor('button[data-navigation-tutorial-target="feedback"]');
          const searchLabel = document.querySelector<HTMLElement>('button[data-navigation-tutorial-target="search"] .cmm-ribbon-text');
          const rightControls = [
            rectFor('[data-navigation-tutorial-target="feedback"]'),
            rectFor('button[aria-label^="Notifications"]'),
            rectFor('button[aria-label="Menu du profil actif"]'),
            rectFor("[data-navigation-account-identity]"),
          ].filter((rect): rect is NonNullable<typeof rect> => rect !== null);
          const sortedControls = [...rightControls].sort((left, right) => left.left - right.left);
          const dock = rectFor('nav[aria-label="Navigation par blocs"]');
          const dockCenter = dock ? dock.left + dock.width / 2 : null;
          const availableCenter = preferences && feedback ? (preferences.right + feedback.left) / 2 : null;
          return {
            viewportWidth: window.innerWidth,
            documentScrollWidth: document.documentElement.scrollWidth,
            bodyScrollWidth: document.body.scrollWidth,
            identity: rectFor("[data-navigation-account-identity]"),
            identityGroup,
            identityRole: identity?.getAttribute("role"),
            identityLabel: identity?.getAttribute("aria-label"),
            activityStatus: activityStatus
              ? {
                  width: activityStatus.getBoundingClientRect().width,
                  height: activityStatus.getBoundingClientRect().height,
                  label: activityStatus.getAttribute("aria-label"),
                  pressed: activityStatus.getAttribute("aria-pressed"),
                }
              : null,
            fullNameVisible: Boolean(fullName && fullName.getClientRects().length > 0 && getComputedStyle(fullName).visibility !== "hidden"),
            rightControls: sortedControls,
            dock,
            dockCenter,
            availableCenter,
            searchLabelVisible: Boolean(searchLabel && getComputedStyle(searchLabel).display !== "none"),
            searchShortcutCount: document.querySelectorAll('button[data-navigation-tutorial-target="search"] kbd').length,
          };
        });

        expect(metrics.identity, `${viewportWidth}px: compact identity bubble missing`).not.toBeNull();
        expect(metrics.identity?.width, `${viewportWidth}px: compact bubble width`).toBeGreaterThanOrEqual(viewportWidth < 1280 ? 58 : 50);
        expect(metrics.identity?.right, `${viewportWidth}px: compact bubble overflows viewport`).toBeLessThanOrEqual(viewportWidth + 1);
        expect(metrics.identityGroup?.right, `${viewportWidth}px: account group overflows viewport`).toBeLessThanOrEqual(viewportWidth + 1);
        expect(metrics.identityRole).toBe("group");
        expect(metrics.identityLabel).toMatch(/Niv\./u);
        expect(metrics.activityStatus, `${viewportWidth}px: activity status hit-target missing`).toEqual(
          expect.objectContaining({ label: expect.stringMatching(/^Statut : (actif|inactif)$/u), pressed: "true" }),
        );
        expect(metrics.activityStatus?.width, `${viewportWidth}px: activity status hit-target width`).toBeGreaterThanOrEqual(16);
        expect(metrics.activityStatus?.height, `${viewportWidth}px: activity status hit-target height`).toBeGreaterThanOrEqual(16);
        expect(metrics.documentScrollWidth, `${viewportWidth}px: document overflow`).toBeLessThanOrEqual(viewportWidth + 1);
        expect(metrics.bodyScrollWidth, `${viewportWidth}px: body overflow`).toBeLessThanOrEqual(viewportWidth + 1);

        for (const [index, current] of metrics.rightControls.entries()) {
          const next = metrics.rightControls[index + 1];
          if (next) {
            expect(current.right, `${viewportWidth}px: right controls overlap`).toBeLessThanOrEqual(next.left + 1);
          }
        }

        if (viewportWidth < 1440) {
          expect(metrics.fullNameVisible, `${viewportWidth}px: full name should remain assistive-only`).toBe(false);
        } else {
          expect(metrics.fullNameVisible, `${viewportWidth}px: full name should be visible`).toBe(true);
        }

        if (viewportWidth >= 1280) {
          expect(metrics.dock, `${viewportWidth}px: desktop dock missing`).not.toBeNull();
          expect(metrics.dockCenter, `${viewportWidth}px: dock center missing`).not.toBeNull();
          expect(metrics.availableCenter, `${viewportWidth}px: utility interval center missing`).not.toBeNull();
          expect(Math.abs(metrics.dockCenter! - metrics.availableCenter!), `${viewportWidth}px: dock not centered between preferences and feedback`).toBeLessThanOrEqual(8);
          expect(metrics.searchLabelVisible, `${viewportWidth}px: search label should remain visible`).toBe(true);
          expect(metrics.searchShortcutCount, `${viewportWidth}px: visual search shortcut should be removed`).toBe(0);
          expect(metrics.identityGroup?.left, `${viewportWidth}px: account group overlaps dock`).toBeGreaterThanOrEqual((metrics.dock?.right ?? 0) - 1);
        }
      }

      for (const zoom of [1.25, 1.5] as const) {
        const zoomProxyWidth = Math.floor(1440 / zoom);
        await page.setViewportSize({ width: zoomProxyWidth, height: 900 });
        await openProtectedRoute(page, "/dashboard");
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
        expect(overflow, `zoom ${zoom}: horizontal overflow`).toBeLessThanOrEqual(1);
      }
    } finally {
      await context.close();
    }
  });
});
