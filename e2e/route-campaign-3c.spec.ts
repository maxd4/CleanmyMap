import { clerk } from "@clerk/testing/playwright";
import { expect, test, type Browser, type Page } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const evidenceDirectory = path.join(process.cwd(), "artifacts", "playwright", "route-campaign-3c");
const evidenceFile = path.join(evidenceDirectory, "evidence.json");
const evidence: Array<Record<string, unknown>> = [];
const routeDraftStorageKey = "cleanmymap.route-draft";

type MutationGuard = {
  observed: string[];
};

function installMutationGuard(page: Page): MutationGuard {
  const guard: MutationGuard = { observed: [] };
  const origin = new URL(process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3000").origin;

  page.on("request", (request) => {
    const url = new URL(request.url());
    if (url.origin !== origin || !url.pathname.startsWith("/api/")) return;
    if (!["GET", "HEAD", "OPTIONS"].includes(request.method())) {
      guard.observed.push(`${request.method()} ${url.pathname}`);
    }
  });

  return guard;
}

async function dismissCookies(page: Page): Promise<void> {
  const refuse = page.getByRole("button", { name: "Tout refuser" });
  try {
    await refuse.waitFor({ state: "visible", timeout: 5_000 });
    await refuse.click();
    await expect(refuse).toHaveCount(0);
  } catch {
    // The banner may already be persisted for this browser context.
  }
}

async function assertNoPageErrors(page: Page, surface: string): Promise<string[]> {
  const errors = await page.evaluate(() => {
    const value = (window as Window & { __cmmConsoleErrors?: string[] }).__cmmConsoleErrors;
    return value ?? [];
  });
  const auxiliaryErrors = errors.filter((error) => error.startsWith("[Notifications] Fetch failed"));
  const unexpectedErrors = errors.filter((error) => !error.startsWith("[Notifications] Fetch failed"));
  expect(unexpectedErrors, `${surface} unexpected console errors`).toEqual([]);
  return auxiliaryErrors;
}

async function preparePage(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const errors: string[] = [];
    const original = console.error;
    (window as Window & { __cmmConsoleErrors?: string[] }).__cmmConsoleErrors = errors;
    console.error = (...args: unknown[]) => {
      errors.push(args.map(String).join(" "));
      original(...args);
    };
  });
}

async function fillNonDefaultConstraints(page: Page): Promise<Record<string, string>> {
  const values = {
    minutes: "255",
    volunteers: "7",
    accessibility: "strict",
    security: "renforced",
    weather: "wind",
    impactVsDistance: "42",
    maxStops: "9",
  };

  await page.getByLabel("Temps dispo (min)").fill(values.minutes);
  await page.getByLabel("Bénévoles").fill(values.volunteers);
  await page.getByLabel("Accessibilité").selectOption(values.accessibility);
  await page.getByLabel("Sécurité").selectOption(values.security);
  await page.getByLabel("Météo").selectOption(values.weather);
  await page.getByLabel("Arbitrage impact / distance").fill(values.impactVsDistance);
  await page.getByLabel("Arrêts maximum").fill(values.maxStops);

  for (const [label, value] of [
    ["Temps dispo (min)", values.minutes],
    ["Bénévoles", values.volunteers],
    ["Accessibilité", values.accessibility],
    ["Sécurité", values.security],
    ["Météo", values.weather],
    ["Arbitrage impact / distance", values.impactVsDistance],
    ["Arrêts maximum", values.maxStops],
  ] as const) {
    await expect(page.getByLabel(label)).toHaveValue(value);
  }

  return values;
}

async function assertDefaultConstraints(page: Page): Promise<void> {
  await expect(page.getByLabel("Temps dispo (min)")).toHaveValue("180");
  await expect(page.getByLabel("Bénévoles")).toHaveValue("4");
  await expect(page.getByLabel("Accessibilité")).toHaveValue("standard");
  await expect(page.getByLabel("Sécurité")).toHaveValue("standard");
  await expect(page.getByLabel("Météo")).toHaveValue("ok");
  await expect(page.getByLabel("Arbitrage impact / distance")).toHaveValue("65");
  await expect(page.getByLabel("Arrêts maximum")).toHaveValue("6");
}

async function signInThroughClerk(page: Page): Promise<void> {
  const email = process.env.E2E_CLERK_USER_EMAIL;
  if (!email) throw new Error("The official Clerk E2E user email was not provisioned.");
  await clerk.signIn({ page, emailAddress: email });
  await page.waitForFunction(() => Boolean(window.Clerk?.user && window.Clerk?.session));
}

test.describe.configure({ mode: "serial" });
test.setTimeout(120_000);

test.afterAll(async () => {
  await mkdir(evidenceDirectory, { recursive: true });
  await writeFile(evidenceFile, `${JSON.stringify({ campaign: "3C", evidence }, null, 2)}\n`, "utf8");
});

test("late Clerk authentication restores the route draft without requesting a recommendation", async ({
  browser,
  page,
}) => {
  await preparePage(page);
  const guard = installMutationGuard(page);
  const response = await page.goto("/sections/route", { waitUntil: "domcontentloaded" });
  expect(response?.status()).toBe(200);
  await dismissCookies(page);
  const values = await fillNonDefaultConstraints(page);

  await expect(page.getByRole("link", { name: "Se connecter pour calculer" })).toBeVisible();
  expect(await page.evaluate((key) => document.cookie.includes(key), routeDraftStorageKey)).toBe(false);
  expect(guard.observed).toEqual([]);

  const signInLink = page.getByRole("link", { name: "Se connecter pour calculer" });
  await expect(signInLink).toHaveAttribute("href", "/sign-in?redirect_url=%2Fsections%2Froute");
  await signInLink.click();
  await expect(page).toHaveURL(/\/sign-in\?redirect_url=%2Fsections%2Froute$/);
  await signInThroughClerk(page);
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page).toHaveURL(/\/sections\/route$/);

  await expect(page.getByRole("button", { name: "Calculer la recommandation" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Calculer la recommandation" })).toBeEnabled();
  for (const [label, value] of [
    ["Temps dispo (min)", values.minutes],
    ["Bénévoles", values.volunteers],
    ["Accessibilité", values.accessibility],
    ["Sécurité", values.security],
    ["Météo", values.weather],
    ["Arbitrage impact / distance", values.impactVsDistance],
    ["Arrêts maximum", values.maxStops],
  ] as const) {
    await expect(page.getByLabel(label)).toHaveValue(value);
  }
  expect(guard.observed).toEqual([]);

  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page).toHaveURL(/\/sections\/route$/);
  await expect(page.getByRole("button", { name: "Calculer la recommandation" })).toBeVisible();
  for (const [label, value] of [
    ["Temps dispo (min)", values.minutes],
    ["Bénévoles", values.volunteers],
    ["Accessibilité", values.accessibility],
    ["Sécurité", values.security],
    ["Météo", values.weather],
    ["Arbitrage impact / distance", values.impactVsDistance],
    ["Arrêts maximum", values.maxStops],
  ] as const) {
    await expect(page.getByLabel(label)).toHaveValue(value);
  }
  expect(guard.observed).toEqual([]);

  const isolatedContext = await browser.newContext();
  const isolatedPage = await isolatedContext.newPage();
  await isolatedPage.goto("/sections/route", { waitUntil: "domcontentloaded" });
  await assertDefaultConstraints(isolatedPage);
  await expect(isolatedPage.getByRole("link", { name: "Se connecter pour calculer" })).toBeVisible();
  await isolatedContext.close();

  const auxiliaryErrors = await assertNoPageErrors(page, "route 3C authenticated return");
  evidence.push({
    id: "E2E-3C-AUTH-RETURN-DRAFT",
    PAGE: "PAGE_OK",
    INTERACTION: "INTERACTION_OK",
    END_TO_END: "END_TO_END_OK",
    auth: "official Clerk Testing Token and real Development E2E session",
    returnTarget: "/sections/route",
    draft: "all seven non-default route constraints restored after Clerk return and reload",
    storage: routeDraftStorageKey,
    recommendation: "no POST /api/route/recommend; calculate button not clicked",
    isolation: "fresh browser context retained canonical defaults and remained anonymous",
    auxiliaryErrors,
  });
});

test("anonymous and invalid route drafts fail closed without exposing a calculation action", async ({ page }) => {
  await preparePage(page);
  const guard = installMutationGuard(page);
  await page.goto("/sections/route", { waitUntil: "domcontentloaded" });
  await dismissCookies(page);
  await assertDefaultConstraints(page);
  const signInLink = page.getByRole("link", { name: "Se connecter pour calculer" });
  await expect(signInLink).toBeVisible();
  await expect(page.getByRole("button", { name: "Calculer la recommandation" })).toHaveCount(0);

  await signInLink.click();
  await expect(page).toHaveURL(/\/sign-in\?redirect_url=%2Fsections%2Froute$/);
  await page.goto("/sections/route", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("link", { name: "Se connecter pour calculer" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Calculer la recommandation" })).toHaveCount(0);

  await page.evaluate((key) => sessionStorage.setItem(key, "not-json"), routeDraftStorageKey);
  await page.reload({ waitUntil: "domcontentloaded" });
  await assertDefaultConstraints(page);

  await page.evaluate(
    ({ key }) => sessionStorage.setItem(key, JSON.stringify({ version: 0, constraints: { availableMinutes: 500 } })),
    { key: routeDraftStorageKey },
  );
  await page.reload({ waitUntil: "domcontentloaded" });
  await assertDefaultConstraints(page);
  expect(guard.observed).toEqual([]);
  const auxiliaryErrors = await assertNoPageErrors(page, "route 3C negative cases");
  evidence.push({
    id: "E2E-3C-NEGATIVE-CASES",
    PAGE: "PAGE_OK",
    INTERACTION: "INTERACTION_OK",
    END_TO_END: "END_TO_END_OK",
    anonymous: "no direct calculation button; Clerk link only",
    returnWithoutSession: "target remained anonymous and protected calculation stayed unavailable",
    invalidDraft: "corrupt and incompatible payloads fell back to canonical defaults without exception",
    navigation: "no auth loop observed",
    mutations: guard.observed,
    auxiliaryErrors,
  });
});
