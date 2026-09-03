import { clerk } from "@clerk/testing/playwright";
import { expect, test, type BrowserContext, type Page } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const baseUrl = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3000";
const baseOrigin = new URL(baseUrl).origin;
const evidenceDirectory = path.join(process.cwd(), "artifacts", "playwright", "route-campaign-3c");
const evidenceFile = path.join(evidenceDirectory, "evidence.json");
const routeDraftStorageKey = "cleanmymap.route-draft";
const injectedGeolocation = { latitude: 48.8566, longitude: 2.3522 };
const evidence: Array<Record<string, unknown>> = [];

type RecommendationObservation = {
  requests: Array<{ payload: Record<string, unknown> }>;
  responses: Array<{ status: number; body: Record<string, unknown> | null }>;
};

type RouteResponseBody = {
  status?: "ok" | "empty" | "degraded";
  dataStatus?: string;
  origin?: { latitude?: number; longitude?: number; source?: string };
  travelDistanceKm?: number;
  travelMinutes?: number;
  travelBudgetMinutes?: number;
  withinBudget?: boolean;
  stops?: Array<unknown>;
  diagnostics?: {
    loaded?: number;
    eligible?: number;
    excluded?: number;
    selected?: number;
    sourcePartial?: boolean;
    truncated?: boolean;
  };
  routeGeometry?: {
    mode?: "network" | "fallback";
    provider?: string;
    profile?: string | null;
    estimated?: boolean;
  };
};

function installRouteInstrumentation(page: Page): RecommendationObservation {
  const observation: RecommendationObservation = { requests: [], responses: [] };

  page.on("request", (request) => {
    const url = new URL(request.url());
    if (url.origin !== baseOrigin || url.pathname !== "/api/route/recommend") return;
    if (request.method() !== "POST") return;
    const payload = request.postDataJSON() as Record<string, unknown>;
    observation.requests.push({ payload });
  });

  page.on("response", async (response) => {
    const url = new URL(response.url());
    if (url.origin !== baseOrigin || url.pathname !== "/api/route/recommend") return;
    let body: Record<string, unknown> | null = null;
    try {
      body = (await response.json()) as Record<string, unknown>;
    } catch {
      body = null;
    }
    observation.responses.push({ status: response.status(), body });
  });

  return observation;
}

async function preparePage(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const state = { geolocationCalls: 0 };
    Object.defineProperty(window, "__cmmRouteE2e", {
      configurable: false,
      value: state,
    });

    const geolocation = navigator.geolocation;
    if (geolocation) {
      const original = geolocation.getCurrentPosition.bind(geolocation);
      Object.defineProperty(geolocation, "getCurrentPosition", {
        configurable: true,
        value: (...args: Parameters<Geolocation["getCurrentPosition"]>) => {
          state.geolocationCalls += 1;
          return original(...args);
        },
      });
    }

    const errors: string[] = [];
    const originalConsoleError = console.error;
    (window as Window & { __cmmRouteConsoleErrors?: string[] }).__cmmRouteConsoleErrors = errors;
    console.error = (...args: unknown[]) => {
      errors.push(args.map(String).join(" "));
      originalConsoleError(...args);
    };
  });
}

async function getGeolocationCallCount(page: Page): Promise<number> {
  return page.evaluate(
    () => (window as Window & { __cmmRouteE2e?: { geolocationCalls: number } }).__cmmRouteE2e
      ?.geolocationCalls ?? 0,
  );
}

async function assertNoPageErrors(page: Page): Promise<void> {
  const errors = await page.evaluate(
    () => (window as Window & { __cmmRouteConsoleErrors?: string[] }).__cmmRouteConsoleErrors ?? [],
  );
  const unexpectedErrors = errors.filter((error) => !error.startsWith("[Notifications] Fetch failed"));
  expect(unexpectedErrors).toEqual([]);
}

async function dismissCookies(page: Page): Promise<void> {
  const refuse = page.getByRole("button", { name: "Tout refuser" });
  try {
    await refuse.waitFor({ state: "visible", timeout: 5_000 });
    await refuse.click();
    await expect(refuse).toHaveCount(0);
  } catch {
    // The banner may already be absent or persisted for this browser context.
  }
}

async function openRoute(page: Page): Promise<void> {
  const response = await page.goto("/sections/route", { waitUntil: "domcontentloaded" });
  expect(response?.status()).toBe(200);
  await dismissCookies(page);
  await expect(page.locator("#route").getByRole("heading", { name: "Où agir", exact: true })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Calculer la recommandation" }).or(
      page.getByRole("link", { name: "Se connecter pour calculer" }),
    ),
  ).toBeVisible({ timeout: 30_000 });
}

async function assertNoRecommendationBeforeAction(
  page: Page,
  observation: RecommendationObservation,
): Promise<void> {
  await page.waitForTimeout(500);
  expect(observation.requests).toHaveLength(0);
  expect(await getGeolocationCallCount(page)).toBe(0);
  const clientState = await page.evaluate(() => ({
    href: window.location.href,
    hash: window.location.hash,
    sessionStorage: Object.fromEntries(Object.entries(window.sessionStorage)),
    localStorage: Object.fromEntries(Object.entries(window.localStorage)),
    cookie: document.cookie,
  }));
  const serialized = JSON.stringify(clientState);
  expect(serialized).not.toContain(String(injectedGeolocation.latitude));
  expect(serialized).not.toContain(String(injectedGeolocation.longitude));
}

async function getAuthenticationMode(page: Page): Promise<"anonymous" | "authenticated"> {
  const action = page.getByRole("button", { name: /Calculer la recommandation|Recalculer la recommandation/ });
  if (await action.isVisible().catch(() => false)) return "authenticated";
  await expect(page.getByRole("link", { name: "Se connecter pour calculer" })).toBeVisible();
  return "anonymous";
}

async function ensureAuthenticated(page: Page): Promise<"dev-bypass" | "clerk"> {
  const action = page.getByRole("button", { name: /Calculer la recommandation|Recalculer la recommandation/ });
  if (await action.isVisible().catch(() => false)) return "dev-bypass";

  const email = process.env.E2E_CLERK_USER_EMAIL?.trim();
  if (!email) {
    throw new Error("No authenticated route surface and E2E_CLERK_USER_EMAIL is not configured.");
  }

  await page.getByRole("link", { name: "Se connecter pour calculer" }).click();
  await expect(page).toHaveURL(/\/sign-in\?redirect_url=%2Fsections%2Froute$/);
  await clerk.signIn({ page, emailAddress: email });
  await page.waitForFunction(() => Boolean(window.Clerk?.user && window.Clerk?.session));
  await page.goto("/sections/route", { waitUntil: "domcontentloaded" });
  await expect(action).toBeVisible({ timeout: 30_000 });
  return "clerk";
}

async function assertPrivacy(page: Page): Promise<void> {
  const state = await page.evaluate((draftKey) => ({
    href: window.location.href,
    hash: window.location.hash,
    search: window.location.search,
    draft: window.sessionStorage.getItem(draftKey),
    sessionStorage: Object.fromEntries(Object.entries(window.sessionStorage)),
    localStorage: Object.fromEntries(Object.entries(window.localStorage)),
    cookie: document.cookie,
  }), routeDraftStorageKey);
  const serialized = JSON.stringify(state);
  expect(serialized).not.toMatch(/latitude|longitude|origin/i);
  expect(serialized).not.toContain(String(injectedGeolocation.latitude));
  expect(serialized).not.toContain(String(injectedGeolocation.longitude));
}

function assertRecommendationContract(
  body: RouteResponseBody,
  expectedBudget: number,
  expectedMaxStops: number,
  expectedOrigin: "browser" | "map" | "approximate_saved_area",
): void {
  expect(["ok", "empty", "degraded"]).toContain(body.status);
  expect(body.origin?.source).toBe(expectedOrigin);
  expect(typeof body.travelDistanceKm).toBe("number");
  expect(typeof body.travelMinutes).toBe("number");
  expect(body.travelMinutes).toBeLessThanOrEqual(expectedBudget);
  expect(body.travelBudgetMinutes).toBe(expectedBudget);
  expect(body.withinBudget).toBe(true);
  expect(body.stops?.length ?? 0).toBeLessThanOrEqual(expectedMaxStops);

  const diagnostics = body.diagnostics;
  expect(typeof diagnostics?.loaded).toBe("number");
  expect(typeof diagnostics?.eligible).toBe("number");
  expect(typeof diagnostics?.excluded).toBe("number");
  expect(typeof diagnostics?.selected).toBe("number");
  expect(typeof diagnostics?.sourcePartial).toBe("boolean");
  expect(typeof diagnostics?.truncated).toBe("boolean");
  expect(diagnostics?.selected).toBe(body.stops?.length ?? 0);
  expect(diagnostics?.loaded).toBeGreaterThanOrEqual(0);
  expect(diagnostics?.eligible).toBeGreaterThanOrEqual(0);
  expect(diagnostics?.excluded).toBeGreaterThanOrEqual(0);

  if (body.routeGeometry?.mode === "network") {
    expect(body.routeGeometry.provider).toBe("fossgis-osrm");
    expect(body.routeGeometry.profile).toBeTruthy();
  }
  if (body.routeGeometry?.mode === "fallback") {
    expect(body.routeGeometry.estimated).toBe(true);
  }
}

async function clickAndReadRecommendation(
  page: Page,
  observation: RecommendationObservation,
  options: { expectedBudget: number; expectedMaxStops: number; expectedOrigin: "browser" | "map" },
): Promise<RouteResponseBody> {
  const action = page.getByRole("button", { name: /Calculer la recommandation|Recalculer la recommandation/ });
  const responsePromise = page.waitForResponse(
    (response) =>
      new URL(response.url()).origin === baseOrigin &&
      new URL(response.url()).pathname === "/api/route/recommend" &&
      response.request().method() === "POST",
  );
  await action.click();
  const response = await responsePromise;
  expect(observation.requests).toHaveLength(1);
  expect(response.status()).not.toBe(401);
  expect(response.status()).not.toBe(422);
  expect(response.status()).toBe(200);
  const body = (await response.json()) as RouteResponseBody;
  assertRecommendationContract(body, options.expectedBudget, options.expectedMaxStops, options.expectedOrigin);
  return body;
}

async function allowGeolocation(context: BrowserContext): Promise<void> {
  await context.grantPermissions(["geolocation"], { origin: baseOrigin });
  await context.setGeolocation(injectedGeolocation);
}

test.describe.configure({ mode: "serial" });
test.setTimeout(120_000);

test.afterAll(async () => {
  await mkdir(evidenceDirectory, { recursive: true });
  await writeFile(evidenceFile, `${JSON.stringify({ campaign: "3C-V1", evidence }, null, 2)}\n`, "utf8");
});

test("route V1 is inert on load and anonymous access stays fail closed", async ({ page }) => {
  await preparePage(page);
  const observation = installRouteInstrumentation(page);
  await openRoute(page);
  await assertNoRecommendationBeforeAction(page, observation);

  const mode = await getAuthenticationMode(page);
  if (mode === "authenticated") {
    test.skip(true, "Anonymous branch requires a server run with the local bypass disabled.");
    return;
  }

  await expect(page.getByRole("button", { name: /Calculer la recommandation/ })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Se connecter pour calculer" })).toBeVisible();
  await assertNoPageErrors(page);
  evidence.push({
    id: "E2E-3C-V1-LOAD-ANONYMOUS",
    page: "200",
    autoGeolocationCalls: await getGeolocationCallCount(page),
    recommendationRequestsBeforeAction: observation.requests.length,
    auth: "anonymous fail-closed CTA",
  });
});

test("GPS browser origin produces one bounded V1 recommendation", async ({ page }) => {
  await preparePage(page);
  const observation = installRouteInstrumentation(page);
  await allowGeolocation(page.context());
  await openRoute(page);
  const authMode = await ensureAuthenticated(page);
  await assertNoRecommendationBeforeAction(page, observation);
  await page.getByLabel("Budget de déplacement (minutes)").fill("45");
  await page.getByLabel("Arrêts maximum").fill("1");

  const body = await clickAndReadRecommendation(page, observation, {
    expectedBudget: 45,
    expectedMaxStops: 1,
    expectedOrigin: "browser",
  });
  const payloadOrigin = observation.requests[0].payload.origin as Record<string, unknown>;
  expect(payloadOrigin).toEqual({ ...injectedGeolocation, source: "browser" });
  expect(body.origin?.source).toBe("browser");
  await expect(page.getByText("Point de départ utilisé : Position actuelle")).toBeVisible();
  expect(await page.locator("body").innerText()).not.toContain(String(injectedGeolocation.latitude));
  expect(await page.locator("body").innerText()).not.toContain(String(injectedGeolocation.longitude));
  await assertPrivacy(page);
  await assertNoPageErrors(page);
  evidence.push({
    id: "E2E-3C-V1-GPS-BROWSER",
    authMode,
    requestCount: observation.requests.length,
    payloadOriginSource: payloadOrigin.source,
    coordinatesMatchInjectedPosition: payloadOrigin.latitude === injectedGeolocation.latitude &&
      payloadOrigin.longitude === injectedGeolocation.longitude,
    responseStatus: observation.responses.at(-1)?.status,
    returnedOrigin: body.origin?.source,
    clientDisplayedCoordinates: false,
  });
});

test("repeated rapid clicks do not duplicate a GPS recommendation", async ({ page }) => {
  await preparePage(page);
  const observation = installRouteInstrumentation(page);
  await allowGeolocation(page.context());
  await openRoute(page);
  await ensureAuthenticated(page);

  await page.route("**/api/route/recommend", async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 750));
    await route.continue();
  });
  const action = page.getByRole("button", { name: /Calculer la recommandation/ });
  const actionHandle = await action.elementHandle();
  expect(actionHandle).not.toBeNull();
  const responsePromise = page.waitForResponse(
    (response) => new URL(response.url()).pathname === "/api/route/recommend" && response.request().method() === "POST",
  );
  await action.click();
  await actionHandle!.evaluate((element) => {
    for (let index = 0; index < 3; index += 1) {
      element.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, view: window }));
    }
  });
  await responsePromise;
  await expect.poll(() => observation.requests.length, { timeout: 30_000 }).toBe(1);
  expect(observation.requests).toHaveLength(1);
  await assertNoPageErrors(page);
  evidence.push({
    id: "E2E-3C-V1-ANTI-DOUBLE",
    requestCount: observation.requests.length,
  });
});

test("map origin is selectable, movable, resettable, and never calls GPS", async ({ page }) => {
  await preparePage(page);
  const observation = installRouteInstrumentation(page);
  await openRoute(page);
  await ensureAuthenticated(page);
  await page.getByLabel("Choisir sur la carte").check();
  await expect(page.locator(".leaflet-container")).toBeVisible();
  await expect(page.getByRole("button", { name: "Choisir un point sur la carte" })).toBeDisabled();
  await assertNoRecommendationBeforeAction(page, observation);

  const map = page.locator(".leaflet-container");
  const box = await map.boundingBox();
  expect(box).not.toBeNull();
  if (!box) throw new Error("The route map did not expose a bounding box.");

  await map.click({ position: { x: box.width * 0.42, y: box.height * 0.48 } });
  await expect(page.getByText("Point choisi sur la carte.", { exact: false })).toBeVisible();
  await expect(page.locator(".cmm-route-origin-icon")).toHaveCount(1);
  const firstMarker = await page.locator(".cmm-route-origin-icon").boundingBox();
  expect(firstMarker).not.toBeNull();

  await map.click({ position: { x: box.width * 0.62, y: box.height * 0.55 } });
  await expect(page.locator(".cmm-route-origin-icon")).toHaveCount(1);
  const movedMarker = await page.locator(".cmm-route-origin-icon").boundingBox();
  expect(movedMarker).not.toBeNull();
  expect(movedMarker?.x).not.toBe(firstMarker?.x);

  await page.getByRole("button", { name: "Réinitialiser" }).first().click();
  await expect(page.locator(".cmm-route-origin-icon")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Choisir un point sur la carte" })).toBeDisabled();

  await map.click({ position: { x: box.width * 0.52, y: box.height * 0.44 } });
  await expect(page.getByRole("button", { name: "Choisir un point sur la carte" })).toHaveCount(0);
  const body = await clickAndReadRecommendation(page, observation, {
    expectedBudget: 60,
    expectedMaxStops: 6,
    expectedOrigin: "map",
  });
  const payloadOrigin = observation.requests[0].payload.origin as Record<string, unknown>;
  expect(payloadOrigin.source).toBe("map");
  expect(typeof payloadOrigin.latitude).toBe("number");
  expect(typeof payloadOrigin.longitude).toBe("number");
  expect(body.origin?.source).toBe("map");
  await expect(page.getByText("Point de départ utilisé : Origine sélectionnée sur la carte")).toBeVisible();
  expect(await getGeolocationCallCount(page)).toBe(0);
  await assertPrivacy(page);
  await assertNoPageErrors(page);
  evidence.push({
    id: "E2E-3C-V1-MAP-ORIGIN",
    requestCount: observation.requests.length,
    payloadOriginSource: payloadOrigin.source,
    payloadCoordinatesValid: Number.isFinite(payloadOrigin.latitude) && Number.isFinite(payloadOrigin.longitude),
    returnedOrigin: body.origin?.source,
    geolocationCalls: await getGeolocationCallCount(page),
  });
});

test("GPS denial still sends one request without a browser origin", async ({ page }) => {
  await preparePage(page);
  const observation = installRouteInstrumentation(page);
  await page.context().clearPermissions();
  await openRoute(page);
  const authMode = await ensureAuthenticated(page);
  await assertNoRecommendationBeforeAction(page, observation);

  const action = page.getByRole("button", { name: /Calculer la recommandation/ });
  const responsePromise = page.waitForResponse(
    (response) => new URL(response.url()).pathname === "/api/route/recommend" && response.request().method() === "POST",
  );
  await action.click();
  const response = await responsePromise;
  expect(observation.requests).toHaveLength(1);
  expect(observation.requests[0].payload).not.toHaveProperty("origin");
  expect(response.status()).not.toBe(401);
  expect([200, 422]).toContain(response.status());
  if (response.status() === 200) {
    const body = (await response.json()) as RouteResponseBody;
    expect(body.origin?.source).toBe("approximate_saved_area");
  }
  await assertPrivacy(page);
  await assertNoPageErrors(page);
  evidence.push({
    id: "E2E-3C-V1-GPS-DENIED",
    authMode,
    requestCount: observation.requests.length,
    payloadHasOrigin: Object.prototype.hasOwnProperty.call(observation.requests[0].payload, "origin"),
    responseStatus: response.status(),
  });
});
