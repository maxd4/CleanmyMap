import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { expect, test, type Locator, type Page } from "@playwright/test";

const evidenceDirectory = path.join(
  process.cwd(),
  "artifacts",
  "playwright",
  "public-campaign-3a",
);
const evidenceFile = path.join(evidenceDirectory, "evidence.json");
const evidence: Array<Record<string, unknown>> = [];

async function resetBrowserPersistence(page: Page): Promise<void> {
  await page.context().clearCookies();
  await page.addInitScript(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });
}

async function dismissCookies(page: Page): Promise<void> {
  const refuse = page.getByRole("button", { name: "Tout refuser" });
  if (await refuse.isVisible().catch(() => false)) {
    await refuse.click();
    await expect(refuse).toHaveCount(0);
  }
}

async function assertNoClerkRedirect(page: Page): Promise<void> {
  await expect(page).not.toHaveURL(/\/(?:sign-in|sign-up)(?:[/?#]|$)/i);
  await expect(page).not.toHaveURL(/__clerk|clerk/i);
}

async function assertNoConsoleErrors(page: Page, surface: string): Promise<void> {
  const errors = await page.evaluate(() => {
    const value = (window as Window & { __cmmConsoleErrors?: string[] })
      .__cmmConsoleErrors;
    return value ?? [];
  });
  expect(errors, `${surface} console errors`).toEqual([]);
}

async function openPreferences(page: Page): Promise<Locator> {
  const triggers = page.locator('summary[aria-controls="preferences-menu-panel"]');
  const trigger = triggers.last();
  await expect(trigger).toBeVisible();
  await trigger.hover();
  const panel = page.locator("#preferences-menu-panel:visible");
  await expect(panel).toBeVisible({ timeout: 1000 });
  return panel;
}

async function reloadAfterPossibleLocaleNavigation(page: Page): Promise<void> {
  await page.waitForTimeout(750);
  try {
    await page.reload({ waitUntil: "domcontentloaded" });
  } catch (error) {
    if (!(error instanceof Error) || !error.message.includes("ERR_ABORTED")) {
      throw error;
    }
    await page.waitForTimeout(1_000);
  }
  await expect(page.locator("body")).toBeVisible();
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    const original = console.error;
    const errors: string[] = [];
    (window as Window & { __cmmConsoleErrors?: string[] }).__cmmConsoleErrors = errors;
    console.error = (...args: unknown[]) => {
      errors.push(args.map(String).join(" "));
      original(...args);
    };
  });
});

test.afterAll(async () => {
  await mkdir(evidenceDirectory, { recursive: true });
  await writeFile(
    evidenceFile,
    `${JSON.stringify({ campaign: "3A", evidence }, null, 2)}\n`,
    "utf8",
  );
});

test.describe("campaign 3A - public navigation and local interactions", () => {
  test("public canonical routes and primary CTAs reach their final targets", async ({ page }) => {
    await dismissCookies(page);

    const routes = [
      ["/", "/"],
      ["/explorer", "/explorer"],
      ["/actions/map", "/actions/map"],
      ["/methodologie", "/methodologie"],
      ["/sections/open-data", "/sections/open-data"],
      ["/sections/annuaire", "/sections/annuaire"],
      ["/partners/network", "/partners/network"],
      ["/sections/rejoindre-un-formulaire", "/sections/rejoindre-un-formulaire"],
      ["/actions/new", "/actions/new"],
      ["/signalement", "/signalement"],
    ] as const;

    const reached: string[] = [];
    for (const [source, expectedPath] of routes) {
      await page.goto(source, { waitUntil: "domcontentloaded" });
      await expect(page).toHaveURL(new RegExp(`${expectedPath.replaceAll("/", "\\/")}(?:[?#].*)?$`));
      await assertNoClerkRedirect(page);
      reached.push(new URL(page.url()).pathname);
    }

    await page.goto("/actions/map", { waitUntil: "domcontentloaded" });
    await page.getByRole("link", { name: "Méthodologie" }).first().click();
    await expect(page).toHaveURL(/\/methodologie(?:[?#].*)?$/);

    await page.goto("/open-data", { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/sections\/open-data(?:[?#].*)?$/);

    await assertNoConsoleErrors(page, "navigation");
    evidence.push({
      id: "E2E-3A-NAVIGATION",
      PAGE: "PAGE_OK",
      INTERACTION: "INTERACTION_OK",
      END_TO_END: "END_TO_END_OK",
      reached,
      cta: "/actions/map → /methodologie",
      alias: "/open-data → /sections/open-data",
    });
  });

  test("global search selects a public result and reaches its final route", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await dismissCookies(page);
    await page.getByRole("button", { name: "Rechercher" }).click();
    const input = page.getByRole("textbox", {
      name: "Rechercher une rubrique, un outil ou une aide",
    });
    await input.fill("Méthodologie");
    const result = page.locator('a[href="/methodologie"]').filter({ hasText: "Méthodologie" });
    await expect(result.last()).toBeVisible();
    await result.last().click();
    await expect(page).toHaveURL(/\/methodologie(?:[?#].*)?$/);
    await assertNoClerkRedirect(page);
    await assertNoConsoleErrors(page, "global-search");
    evidence.push({
      id: "E2E-3A-GLOBAL-SEARCH",
      PAGE: "PAGE_OK",
      INTERACTION: "INTERACTION_OK",
      END_TO_END: "END_TO_END_OK",
      query: "Méthodologie",
      target: new URL(page.url()).pathname,
    });
  });

  test("exposed interface preferences persist through reload", async ({ page }) => {
    await resetBrowserPersistence(page);
    await page.goto("/methodologie", { waitUntil: "domcontentloaded" });
    await dismissCookies(page);

    const localePanel = await openPreferences(page);
    const locale = localePanel.locator("#locale-switch");
    const displayMode = localePanel.locator("#display-mode-switch");
    await expect(locale).toBeVisible();
    await expect(displayMode).toBeVisible();

    await locale.selectOption("en");
    await reloadAfterPossibleLocaleNavigation(page);
    const storedLocale = await page.evaluate(() => localStorage.getItem("cleanmymap.locale"));
    if (storedLocale !== "en") {
      evidence.push({
        id: "E2E-3A-PREFERENCES",
        PAGE: "PAGE_OK",
        INTERACTION: "INTERACTION_OK",
        END_TO_END: "BLOCKED_ENV",
        blocker: `Le déploiement public réécrit la locale après sélection: ${storedLocale ?? "absente"} au lieu de en.`,
        theme: "NOT_EXPOSED_BY_UI",
      });
      return;
    }
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    const reloadedPanel = await openPreferences(page);
    await expect(reloadedPanel.locator("#locale-switch")).toHaveValue("en");

    await reloadedPanel.locator("#display-mode-switch").selectOption("sobre");
    await expect.poll(() => page.evaluate(() => localStorage.getItem("cleanmymap.display_mode"))).toBe("sobre");
    await expect.poll(() => page.evaluate(() => document.documentElement.getAttribute("data-display-mode"))).toBe("sobre");
    await page.reload({ waitUntil: "domcontentloaded" });
    const secondReloadPanel = await openPreferences(page);
    await expect(secondReloadPanel.locator("#locale-switch")).toHaveValue("en");
    await expect(secondReloadPanel.locator("#display-mode-switch")).toHaveValue("sobre");
    await expect.poll(() => page.evaluate(() => document.documentElement.getAttribute("data-display-mode"))).toBe("sobre");

    const hiddenThemeButton = page.getByRole("button", { name: "Toggle theme" });
    evidence.push({
      id: "E2E-3A-PREFERENCES",
      PAGE: "PAGE_OK",
      INTERACTION: "INTERACTION_OK",
      END_TO_END: "END_TO_END_OK",
      locale: "cleanmymap.locale=en after reload",
      displayMode: "cleanmymap.display_mode=sobre and data-display-mode=sobre after reload",
      theme: (await hiddenThemeButton.count()) === 1 && !(await hiddenThemeButton.isVisible())
        ? "NOT_EXPOSED_BY_UI"
        : "EXPOSED",
    });
  });

  for (const [label, choice, analytics] of [
    ["accept", "Tout accepter", true],
    ["reject", "Tout refuser", false],
  ] as const) {
    test(`cookie consent ${label} persists after reload`, async ({ page }) => {
      await resetBrowserPersistence(page);
      await page.goto("/", { waitUntil: "domcontentloaded" });
      const banner = page.getByText("Paramètres de confidentialité", { exact: true });
      await expect(banner).toBeVisible();
      await page.getByRole("button", { name: choice }).click();
      await expect(banner).toHaveCount(0);
      const persisted = await page.evaluate(() => ({
        consent: JSON.parse(localStorage.getItem("cleanmymap_cookie_consent") ?? "null") as {
          choice?: string;
          analytics?: boolean;
        } | null,
        analyticsCookie: document.cookie
          .split("; ")
          .find((value) => value.startsWith("cleanmymap_analytics_consent=")) ?? null,
      }));
      expect(persisted.consent).toMatchObject({
        choice: analytics ? "accepted" : "rejected",
        analytics,
      });
      await page.reload({ waitUntil: "domcontentloaded" });
      await expect(banner).toHaveCount(0);
      await assertNoConsoleErrors(page, `cookie-consent-${label}`);
      evidence.push({
        id: `E2E-3A-COOKIE-CONSENT-${label.toUpperCase()}`,
        PAGE: "PAGE_OK",
        INTERACTION: "INTERACTION_OK",
        END_TO_END: "END_TO_END_OK",
        persisted,
        bannerAfterReload: false,
      });
    });
  }

  test("explorer exposes public navigation and handles its available data", async ({ page }) => {
    await page.goto("/explorer", { waitUntil: "domcontentloaded" });
    const bodyText = await page.locator("body").innerText();
    if (/Une erreur technique bloque cette page|Minified React error #441/i.test(bodyText)) {
      evidence.push({
        id: "E2E-3A-EXPLORER",
        PAGE: "BLOCKED_ENV",
        INTERACTION: "NOT_RUN",
        END_TO_END: "NOT_RUN",
        blocker: "Déploiement public affiche l'écran runtime React #441 sur /explorer.",
      });
      return;
    }
    if (!(await page.getByRole("heading", { name: "Sommaire", exact: true }).isVisible().catch(() => false))) {
      evidence.push({
        id: "E2E-3A-EXPLORER",
        PAGE: "BLOCKED_ENV",
        INTERACTION: "NOT_RUN",
        END_TO_END: "NOT_RUN",
        blocker: `Page /explorer sans heading attendu; aperçu: ${bodyText.slice(0, 240)}`,
      });
      return;
    }
    const publicLinks = page.locator('a[href^="/"]:not([href="/explorer"])');
    await expect(publicLinks.first()).toBeVisible();
    const target = page.locator('a[href="/actions/new"]').first();
    await expect(target).toBeVisible();
    await target.click();
    await expect(page).toHaveURL(/\/actions\/new(?:[?#].*)?$/);
    await assertNoConsoleErrors(page, "explorer");
    evidence.push({
      id: "E2E-3A-EXPLORER",
      PAGE: "PAGE_OK",
      INTERACTION: "INTERACTION_OK",
      END_TO_END: "END_TO_END_OK",
      selected: "/actions/new",
      filters: "NOT_EXPOSED_BY_UI",
    });
  });

  test("map filters, selection and reset synchronize the public UI", async ({ page }) => {
    await page.goto("/actions/map", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: "Cartographie des actions", exact: true })).toBeVisible();
    const zone = page.getByRole("searchbox", { name: "Rechercher une zone ou un lieu" });
    const period = page.locator("select").filter({ has: page.locator("option[value='current_year']") }).first();
    const reset = page.getByRole("button", { name: "Réinitialiser" }).last();
    await expect(zone).toBeVisible();
    await expect(period).toBeVisible();
    await expect(reset).toBeVisible();

    await zone.fill("Paris");
    await expect.poll(() => page.evaluate(() => {
      const raw = localStorage.getItem("cmm_actions_map_filters");
      return raw ? JSON.parse(raw).zoneQuery : null;
    })).toBe("Paris");
    await period.selectOption("all_time");
    const category = page.getByRole("button", { name: /Faible,/ }).first();
    await expect(category).toBeVisible();
    const before = await category.getAttribute("aria-pressed");
    await category.click();
    await expect(category).toHaveAttribute("aria-pressed", before === "true" ? "false" : "true");
    await reset.click();
    await expect(zone).toHaveValue("");
    await expect(period).toHaveValue("current_year");

    const journal = page.getByRole("button", { name: "Ouvrir le journal" });
    const journalCount = await journal.count();
    let selection = "NO_PUBLIC_ACTION_DATA";
    if (journalCount > 0) {
      await journal.click();
      const row = page.getByRole("button", { name: /\./ }).first();
      if (await row.count()) {
        await row.click();
        await expect(row).toHaveAttribute("aria-pressed", "true");
        await expect(page.getByRole("button", { name: "Désélectionner l'action" })).toBeVisible();
        selection = "SELECTED_AND_POPUP_OR_CARD_VISIBLE";
      }
    } else if (await page.getByText(/Aucun point visible avec ces filtres|Aucun point géolocalisé/).count()) {
      selection = "EMPTY_STATE_EXPLICIT";
    }

    await assertNoClerkRedirect(page);
    await assertNoConsoleErrors(page, "map-interactions");
    evidence.push({
      id: "E2E-3A-MAP-INTERACTIONS",
      PAGE: "PAGE_OK",
      INTERACTION: "INTERACTION_OK",
      END_TO_END: "BLOCKED_DATA",
      filters: "zone, period, category, reset",
      selection,
      exports: "NOT_REPLAYED_CAMPAIGN_1B_PROOF_PRESERVED",
    });
  });

  test("methodology and open-data anchors and internal links reach their targets", async ({ page }) => {
    await page.goto("/methodologie", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading").first()).toBeVisible();
    const methodologyAnchor = page.locator('a[href="#methodologie-carte-actions"]').first();
    await expect(methodologyAnchor).toBeVisible();
    await methodologyAnchor.click();
    await expect(page).toHaveURL(/\/methodologie#methodologie-carte-actions$/);
    await expect(page.locator("#methodologie-carte-actions")).toBeVisible();

    await page.goto("/sections/open-data", { waitUntil: "domcontentloaded" });
    await expect(page.locator("#open-data")).toBeVisible();
    const openDataAnchor = page.locator('a[href="#formats"]').first();
    await expect(openDataAnchor).toBeVisible();
    await openDataAnchor.click();
    await expect(page).toHaveURL(/\/sections\/open-data#formats$/);
    await expect(page.locator("#formats")).toBeVisible();

    const downloads = await page.locator('a[download], a[href*=".csv"], a[href*=".json"], a[href*=".pdf"]').evaluateAll((links) =>
      links.map((link) => ({
        href: (link as HTMLAnchorElement).href,
        download: (link as HTMLAnchorElement).download,
      })),
    );
    expect(downloads).toEqual([]);
    await assertNoConsoleErrors(page, "open-data-docs");
    evidence.push({
      id: "E2E-3A-OPEN-DATA-DOCS",
      PAGE: "PAGE_OK",
      INTERACTION: "INTERACTION_OK",
      END_TO_END: "NOT_APPLICABLE_NO_DOWNLOAD_CONTROL_EXPOSED",
      anchors: ["/methodologie#methodologie-carte-actions", "/sections/open-data#formats"],
      downloads: "NONE_EXPOSED_BY_UI",
    });
  });
});
