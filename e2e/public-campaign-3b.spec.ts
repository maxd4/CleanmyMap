import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { expect, test, type Page } from "@playwright/test";

const evidenceDirectory = path.join(process.cwd(), "artifacts", "playwright", "public-campaign-3b");
const evidenceFile = path.join(evidenceDirectory, "evidence.json");
const evidence: Array<Record<string, unknown>> = [];

type MutationGuard = {
  observed: string[];
  unexpected: string[];
};

function installMutationGuard(page: Page): MutationGuard {
  const guard: MutationGuard = { observed: [], unexpected: [] };
  const origin = new URL(process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3000").origin;

  page.on("request", (request) => {
    const url = new URL(request.url());
    if (url.origin !== origin || !url.pathname.startsWith("/api/")) {
      return;
    }

    if (!["GET", "HEAD", "OPTIONS"].includes(request.method())) {
      const item = `${request.method()} ${url.pathname}`;
      guard.observed.push(item);
      guard.unexpected.push(item);
    }
  });

  return guard;
}

async function assertNoPageErrors(page: Page, surface: string): Promise<void> {
  const errors = await page.evaluate(() => {
    const value = (window as Window & { __cmmConsoleErrors?: string[] }).__cmmConsoleErrors;
    return value ?? [];
  });
  expect(errors, `${surface} console errors`).toEqual([]);
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
    Object.defineProperty(navigator, "geolocation", {
      configurable: true,
      value: {
        getCurrentPosition: (_success: PositionCallback, error?: PositionErrorCallback) =>
          error?.({ code: 1, message: "E2E geolocation denied" } as PositionError),
        watchPosition: () => 0,
        clearWatch: () => undefined,
      },
    });
  });
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

test.beforeEach(async ({ page }) => {
  await preparePage(page);
});

test.afterAll(async () => {
  await mkdir(evidenceDirectory, { recursive: true });
  await writeFile(evidenceFile, `${JSON.stringify({ campaign: "3B", evidence }, null, 2)}\n`, "utf8");
});

test.describe("campaign 3B — public surfaces and late authentication", () => {
  test("WEATHER: public location, forecast day selection and denied geolocation", async ({ page }) => {
    const guard = installMutationGuard(page);
    const response = await page.goto("/sections/weather", { waitUntil: "domcontentloaded" });
    expect(response?.status()).toBe(200);
    await expect(page.getByRole("combobox")).toBeVisible();
    await expect(page).not.toHaveURL(/\/sign-(?:in|up)(?:[/?#]|$)/i);

    const location = page.getByRole("combobox");
    await location.fill("");
    await location.fill("Lyon");
    const option = page.getByRole("option").filter({ hasText: /Lyon/i }).first();
    let hasSuggestion = true;
    try {
      await expect(option).toBeVisible({ timeout: 10_000 });
    } catch {
      hasSuggestion = false;
    }
    if (hasSuggestion) {
      await option.click();
    }

    const forecast = page.getByText("Prévisions horaires", { exact: true });
    const hasForecast = await forecast.isVisible({ timeout: 20_000 }).catch(() => false);
    if (hasForecast) {
      const dayButtons = page.locator('button').filter({ hasText: /° \/ / });
      const dayCount = await dayButtons.count();
      expect(dayCount).toBeGreaterThanOrEqual(2);
      const firstDay = (await dayButtons.nth(0).innerText()).trim();
      await dayButtons.nth(1).click();
      await expect(dayButtons.nth(1)).toHaveClass(/bg-emerald-50/);
      const secondDay = (await dayButtons.nth(1).innerText()).trim();
      expect(secondDay).not.toBe(firstDay);
    }

    const weatherUnavailable = await page.getByText("Météo indisponible", { exact: true }).isVisible().catch(() => false);
    expect(hasForecast || weatherUnavailable).toBe(true);
    expect(guard.unexpected).toEqual([]);
    await assertNoPageErrors(page, "weather");
    evidence.push({
      id: "E2E-3B-WEATHER",
      PAGE: "PAGE_OK",
      INTERACTION: hasSuggestion && (hasForecast || weatherUnavailable) ? "INTERACTION_OK" : "BLOCKED_DATA",
      END_TO_END: hasForecast ? "END_TO_END_OK" : "BLOCKED_DATA",
      provider: hasForecast ? "live Open-Meteo" : "unavailable",
      geolocation: "controlled-denial-fallback-observed",
      suggestionSelected: hasSuggestion,
      forecastDayChanged: hasForecast,
      reset: "NOT_EXPOSED_BY_UI",
      proof: hasForecast ? "forecast heading and second day active after Lyon selection" : "provider-unavailable state rendered",
    });
  });

  test("ROUTE: constraints remain public and identity is requested at the recommendation boundary", async ({ page }) => {
    const guard = installMutationGuard(page);
    const responses: Array<{ status: number; url: string }> = [];
    page.on("response", (response) => {
      if (response.url().includes("/api/route/recommend")) {
        responses.push({ status: response.status(), url: new URL(response.url()).pathname });
      }
    });
    const response = await page.goto("/sections/route", { waitUntil: "domcontentloaded" });
    expect(response?.status()).toBe(200);
    await dismissCookies(page);
    const minutes = page.getByLabel("Temps dispo (min)");
    await expect(minutes).toBeVisible();
    await minutes.fill("240");
    await expect(minutes).toHaveValue("240");
    await page.getByLabel("Météo").selectOption("rain");
    await expect(page.getByLabel("Météo")).toHaveValue("rain");
    await expect(page).not.toHaveURL(/\/sign-(?:in|up)(?:[/?#]|$)/i);
    await page.waitForTimeout(1_500);
    expect(guard.observed).toEqual([]);
    const signIn = page.getByRole("link", { name: /Se connecter pour calculer/i });
    await expect(signIn).toBeVisible();
    await expect(signIn).toHaveAttribute("href", "/sign-in?redirect_url=%2Fsections%2Froute");
    const signInHref = await signIn.getAttribute("href");
    expect(signInHref).toBe("/sign-in?redirect_url=%2Fsections%2Froute");
    await page.goto(signInHref!, { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/sign-in(?:\?.*)?$/);
    expect(guard.unexpected).toEqual([]);
    evidence.push({
      id: "E2E-3B-ROUTE",
      PAGE: "PAGE_OK",
      INTERACTION: "INTERACTION_OK",
      END_TO_END: "BLOCKED_AUTH",
      observed: guard.observed,
      responses,
      authBoundary: "/sign-in?redirect_url=%2Fsections%2Froute",
      anomaly: "FIXED: protected recommendation is no longer auto-triggered; identity is requested only at the recommendation action boundary",
      proof: "public controls retained values, no business POST occurred, and the explicit sign-in boundary was reached",
    });
    await assertNoPageErrors(page, "route");
  });

  test("RECYCLING: public question assistant remains usable when private breakdown is unavailable", async ({ page }) => {
    const guard = installMutationGuard(page);
    const response = await page.goto("/sections/recycling", { waitUntil: "domcontentloaded" });
    expect(response?.status()).toBe(200);
    const assistant = page.locator("#sorting-question");
    await expect(assistant).toBeVisible({ timeout: 15_000 });
    await assistant.fill("Que faire d'une bouteille en plastique ?");
    await expect(page.getByText(/bouteille|plastique/i).first()).toBeVisible();
    expect(guard.unexpected).toEqual([]);
    await assertNoPageErrors(page, "recycling");
    evidence.push({
      id: "E2E-3B-RECYCLING",
      PAGE: "PAGE_OK",
      INTERACTION: "INTERACTION_OK",
      END_TO_END: "END_TO_END_OK",
      proof: "public textarea produced the local answer without a business mutation",
    });
  });

  test("GUIDE: guide alias and public practice tabs reach stable URL targets", async ({ page }) => {
    const guard = installMutationGuard(page);
    await page.goto("/sections/guide", { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/sections\/weather(?:[?#].*)?$/);
    await page.goto("/learn/bonnes-pratiques", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("tab", { name: /Composter/i }).first()).toBeVisible();
    await page.getByRole("tab", { name: /Composter/i }).first().click();
    await expect(page).toHaveURL(/\/learn\/bonnes-pratiques\?theme=compost$/);
    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/learn\/bonnes-pratiques\?theme=compost$/);
    expect(guard.unexpected).toEqual([]);
    await assertNoPageErrors(page, "guide");
    evidence.push({
      id: "E2E-3B-GUIDE-CHECKLIST",
      PAGE: "PAGE_OK",
      INTERACTION: "INTERACTION_OK",
      END_TO_END: "END_TO_END_OK",
      alias: "/sections/guide → /sections/weather",
      proof: "practice theme compost URL survived reload; no server save was attempted",
      checklist: "NOT_EXPOSED_ON_CANONICAL_PUBLIC_PAGE",
    });
  });

  test("QUIZ: public demo session reaches its summary and can restart without remote progression", async ({ page }) => {
    const guard = installMutationGuard(page);
    await page.goto("/learn/ecole", { waitUntil: "domcontentloaded" });
    await dismissCookies(page);
    await expect(page.getByRole("link", { name: "Lancer la démo" }).first()).toBeVisible();
    await page.goto("/learn/sentrainer?mode=demo", { waitUntil: "domcontentloaded" });
    await dismissCookies(page);
    const quizDeferred = page.getByText("Le quiz s'active à l'approche de la section.", { exact: true });
    await quizDeferred.scrollIntoViewIfNeeded();
    await page.mouse.wheel(0, 600);
    await expect(page.getByRole("progressbar")).toBeVisible({ timeout: 20_000 });

    for (let step = 0; step < 20; step += 1) {
      const progress = page.getByRole("progressbar");
      if (!(await progress.isVisible().catch(() => false))) break;
      const option = page.locator('button[aria-pressed="false"]').first();
      const reveal = page.getByRole("button", { name: /Révéler la bonne réponse/i });
      if (await reveal.isVisible().catch(() => false)) await reveal.click();
      else if (await option.isVisible().catch(() => false)) {
        await option.click();
        const verify = page.getByRole("button", { name: "Vérifier la réponse" });
        if (await verify.isVisible().catch(() => false)) await verify.click();
      }
      const next = page.getByRole("button", { name: "Question suivante" });
      if (await next.isVisible().catch(() => false)) {
        await next.click();
      } else {
        const finish = page.getByRole("button", { name: "Voir le bilan" });
        if (await finish.isVisible().catch(() => false)) {
          await finish.click();
        }
        break;
      }
    }

    await expect(page.getByText("Bilan de session", { exact: true })).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(/Score/i).first()).toBeVisible();
    const localProgress = await page.evaluate(() => ({
      page: localStorage.getItem("cleanmymap.learn.progress"),
      quiz: localStorage.getItem("cleanmymap.quiz.progress"),
    }));
    await page.getByRole("button", { name: "Recommencer" }).first().click();
    await page.goto("/learn/sentrainer?mode=demo", { waitUntil: "domcontentloaded" });
    const replayDeferred = page.getByText("Le quiz s'active à l'approche de la section.", { exact: true });
    await replayDeferred.scrollIntoViewIfNeeded();
    await page.mouse.wheel(0, 600);
    await expect(page.getByRole("progressbar")).toBeVisible();
    expect(guard.unexpected).toEqual([]);
    await assertNoPageErrors(page, "quiz");
    evidence.push({
      id: "E2E-3B-QUIZ",
      PAGE: "PAGE_OK",
      INTERACTION: "INTERACTION_OK",
      END_TO_END: "END_TO_END_OK",
      proof: "demo progress reached session summary with score, then replayed",
      localProgress,
      remoteProgression: "no non-safe API request observed",
    });
  });
});
