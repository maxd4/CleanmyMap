import { clerk } from "@clerk/testing/playwright";
import { expect, test } from "@playwright/test";

const routeResponse = {
  status: "ok",
  dataStatus: "complete",
  isTruncated: false,
  sourceHealth: {
    partial: false,
    failedSources: [],
    availableSources: ["spots"],
    warnings: [],
  },
  origin: {
    latitude: 48.8566,
    longitude: 2.3522,
    source: "browser",
  },
  travelDistanceKm: 1.2,
  travelMinutes: 16,
  travelBudgetMinutes: 60,
  withinBudget: true,
  serviceMinutesEstimate: null,
  totalMinutesEstimate: null,
  diagnostics: {
    loaded: 1,
    eligible: 1,
    excluded: 0,
    selected: 1,
    sourcePartial: false,
    truncated: false,
    excludedUnsafe: 0,
    excludedByTravelBudget: 0,
  },
  generatedAt: "2026-09-03T10:00:00.000Z",
  engineVersion: "route-planner-v1",
  stops: [{
    id: "spot-1",
    label: "Place de test",
    latitude: 48.86,
    longitude: 2.35,
    segmentKm: 1.2,
    estimatedMinutes: 16,
    priorityReason: "Priorité opérationnelle",
    score: 80,
  }],
  routeGeometry: {
    coordinates: [[48.8566, 2.3522], [48.86, 2.35]],
    distanceKm: 1.2,
    durationMinutes: 16,
    legs: [{
      fromStopIndex: 0,
      toStopIndex: 1,
      distanceKm: 1.2,
      estimatedMinutes: 16,
      steps: [{
        name: "Rue des Tests",
        distanceKm: 1.2,
        durationMinutes: 16,
        maneuver: "depart",
      }],
    }],
    provider: "fossgis-osrm",
    profile: "foot",
    mode: "network",
    estimated: false,
  },
  scoreBreakdown: { priority: 80, distance: 1.2 },
  tradeoffs: [],
  proactiveAssistant: {
    actNow: "Agir maintenant",
    criticalNearby: "Point prioritaire",
    mostUsefulAction: "Ramasser ce point",
    operationalSignalZones: [],
    upcomingEvents: [],
    hotspots: [],
  },
  trace: {
    engineVersion: "route-planner-v1",
    parameters: { travelBudgetMinutes: 60, maxStops: 6, priorityVsTravel: 65 },
    origin: { latitude: 48.8566, longitude: 2.3522, source: "browser" },
    candidates: { loaded: 1, admissible: 1, excluded: 0, excludedByReason: {} },
    selectedStops: [{
      step: 1,
      id: "spot-1",
      criteriaUsed: ["priority_score", "incremental_travel_cost"],
      normalizedScoreComponents: { priority: 0.8, travel: 0.95 },
      combinedScore: 0.8525,
      incrementalDistanceKm: 1.2,
      incrementalTravelMinutes: 16,
      cumulativeTravelMinutes: 16,
      budgetBeforeMinutes: 60,
      budgetAfterMinutes: 44,
      reason: "Étape 1: meilleur candidat dans le budget.",
    }],
    ordering: {
      stopIds: ["spot-1"],
      criteria: ["combined_score_desc", "priority_desc", "incremental_travel_asc", "id_lexicographic"],
    },
    budget: { requestedMinutes: 60, consumedMinutes: 16, remainingMinutes: 44 },
    distance: { totalKm: 1.2, segmentsTotalKm: 1.2 },
    duration: { networkMinutes: 16, estimatedMinutes: null, serviceMinutes: null, totalMinutes: 16 },
    routing: {
      provider: "fossgis-osrm",
      profile: "foot",
      mode: "network",
      estimated: false,
      parameters: { walkingSpeedKmPerHour: 4.5, coordinateCount: 2, budgetPrefixApplied: false },
      opaqueProviderDecisions: ["choix du tracé routier et mesures réseau déterminés par le fournisseur externe"],
      degradations: [],
    },
    segments: [{
      from: "origin",
      to: "spot-1",
      distanceKm: 1.2,
      durationMinutes: 16,
      measured: true,
      streetSteps: [{ name: "Rue des Tests", distanceKm: 1.2, durationMinutes: 16, maneuver: "depart" }],
    }],
    warnings: [],
    approximations: [],
    fallbacks: [],
  },
};

test("un itinéraire calculé peut être ouvert et expliqué jusqu’à un segment réseau", async ({ page }) => {
  const email = process.env.E2E_CLERK_USER_EMAIL;
  if (!email) throw new Error("The official Clerk E2E user email was not provisioned.");

  await page.goto("/");
  await clerk.signIn({ page, emailAddress: email });
  await page.waitForFunction(() => Boolean(window.Clerk?.user && window.Clerk?.session));
  await page.goto("/sections/route", { waitUntil: "domcontentloaded" });

  await page.route("**/api/route/recommend", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(routeResponse),
    });
  });

  await page.getByRole("button", { name: "Calculer la recommandation" }).click();
  await expect(page.getByText("Point de départ utilisé : Position actuelle")).toBeVisible();
  await expect(page.getByText("Comprendre cet itinéraire")).toBeVisible();
  await page.getByText("Comprendre cet itinéraire").click();
  await page.getByText("Détail du trajet").click();
  await expect(page.getByText("Rue des Tests")).toBeVisible();
  await expect(page.getByText("Mesure réseau").last()).toBeVisible();
});
