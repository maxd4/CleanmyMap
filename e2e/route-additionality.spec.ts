import { expect, test } from "@playwright/test";

test("Comprendre cet itinéraire affiche la justification d'additionnalité", async ({ page }) => {
  await page.route("**/api/route/recommend", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        isLoop: true,
        status: "ok",
        dataStatus: "complete",
        dataLayers: { observed: "complete", prediction: "unavailable", recommendation: "ok" },
        isTruncated: false,
        sourceHealth: { partial: false, failedSources: [], availableSources: ["spots"], warnings: [] },
        origin: { latitude: 48.8566, longitude: 2.3522, source: "browser" },
        travelDistanceKm: 1.6,
        travelMinutes: 12,
        travelBudgetMinutes: 60,
        loop: {
          isLoop: true,
          origin: { latitude: 48.8566, longitude: 2.3522, source: "browser" },
          returnDistanceKm: 0.8,
          returnMinutes: 6,
          budgetRemainingMinutes: 48,
        },
        withinBudget: true,
        serviceMinutesEstimate: null,
        totalMinutesEstimate: null,
        diagnostics: { loaded: 1, eligible: 1, excluded: 0, selected: 1, sourcePartial: false, truncated: false, excludedUnsafe: 0, excludedByTravelBudget: 0 },
        generatedAt: "2026-09-06T00:00:00.000Z",
        engineVersion: "route-planner-v2",
        stops: [{ id: "observed:tree", label: "Pied d'arbre", latitude: 48.86, longitude: 2.35, segmentKm: 0.8, estimatedMinutes: 6, priorityReason: "Signalement observé", score: 82, evidence: { family: "observed", source: "trash_spotter_spots", proof: "validated", observedAt: "2026-09-05T10:00:00.000Z" } }],
        prediction: { status: "unavailable", source: "urban-pressure-model", modelVersion: null, snapshot: null, riskFocus: "all", zonesConsidered: 0, candidatesConsidered: 0, admitted: 0, admittedCandidateIds: [], passedToPlanner: 0, excludedByPreselection: 0, excludedByPlannerBudget: 0, excludedByFinalRoutingBudget: 0, preselectionExcludedCandidateIds: [], preselectionExclusionReasons: {}, finalRoutingBudgetExcludedCandidateIds: [], selected: 0, selectedCandidateIds: [], excludedByCorridor: 0, deduplicated: 0, warnings: [] },
        trace: {
          engineVersion: "route-planner-v2",
          planningMode: { type: "free" },
          parameters: { travelBudgetMinutes: 60, maxStops: 6, priorityVsTravel: 65 },
          origin: { latitude: 48.8566, longitude: 2.3522, source: "browser" },
          candidates: { loaded: 1, admissible: 1, excluded: 0, excludedByReason: {} },
          selectedStops: [{
            step: 1,
            id: "observed:tree",
            criteriaUsed: ["priority_score", "incremental_travel_cost", "return_travel_cost"],
            normalizedScoreComponents: { priority: 0.82, travel: 0.94 },
            combinedScore: 0.862,
            pollutionPriority: 90,
            volunteerAdditionality: 76,
            finalPlannerContribution: 86.5,
            volunteerAdditionalityConfidence: 0.8,
            additionalityWeight: 0.25,
            additionality: {
              modelVersion: "volunteer-additionality-v1",
              volunteerAdditionality: 76,
              eligible: true,
              pollutionRisk: { value: 0.9, wasteRisk: 88, cigaretteButtRisk: 74, confidence: 0.8, recentEvents: { value: null, normalized: null, confidence: 0, evidenceKind: "unknown", available: false }, observedReports: { value: 0.8, normalized: 0.8, confidence: 1, evidenceKind: "observed_report", available: true }, predictedSignals: { value: 0.7, normalized: 0.7, confidence: 0.7, evidenceKind: "prediction", available: true } },
              historicalCleanliness: { raw: 0.7, effective: 0.65, confidence: 0.8, influence: 0.35, normalizedPressure: 0.7, resolution: "iris", note: "prior" },
              municipalCleaning: { lowRelativeCoverage: { raw: 0.7, effective: 0.66, confidence: 0.75, influence: 1, note: "proxy" }, documentedCoverage: { value: null, normalized: null, confidence: 0, evidenceKind: "unknown", available: false }, documentedFrequency: { visitsPerWeek: null, normalized: null, confidence: 0 }, mechanizedAccessibility: { value: 0.75, normalized: 0.75, confidence: 0.7, evidenceKind: "inference", available: true }, manualIntervention: { value: 0.8, normalized: 0.8, confidence: 0.7, evidenceKind: "inference", available: true }, surfaceComplexity: { value: 0.65, normalized: 0.65, confidence: 0.7, evidenceKind: "inference", available: true }, scheduledInterventionMultiplier: 1, scheduledInterventionPenalty: 0 },
              volunteerSuitability: { value: 1, confidence: 1, status: "safe", exclusionReasons: [] },
              confidence: { pollution: 0.8, cleanliness: 0.8, municipalCleaning: 0.75, volunteerSuitability: 1, overall: 0.75 },
              adjustments: { bonuses: ["surface géométriquement complexe : influence limitée et documentée"], maluses: [] },
              explanation: "Priorité bénévole élevée : signalement réellement observé, surface complexe, zone sûre.",
            },
            incrementalDistanceKm: 0.8,
            incrementalTravelMinutes: 6,
            cumulativeTravelMinutes: 6,
            returnDistanceKm: 0.8,
            returnTravelMinutes: 6,
            loopDistanceKm: 1.6,
            loopTravelMinutes: 12,
            budgetAfterReturnMinutes: 48,
            budgetBeforeMinutes: 60,
            budgetAfterMinutes: 48,
            reason: "Score combiné dans le budget.",
            eventContributions: [],
            eventScoreContribution: 0,
            parisPressure: null,
            targetFamily: "observed",
            evidence: { family: "observed", source: "trash_spotter_spots", proof: "validated", observedAt: "2026-09-05T10:00:00.000Z" },
          }],
          ordering: { stopIds: ["observed:tree"], criteria: ["combined_score_desc", "priority_desc", "incremental_travel_asc", "id_lexicographic"] },
          loop: {
            isLoop: true,
            origin: { latitude: 48.8566, longitude: 2.3522, source: "browser" },
            returnDistanceKm: 0.8,
            returnMinutes: 6,
            budgetRemainingMinutes: 48,
          },
          budget: { requestedMinutes: 60, consumedMinutes: 12, remainingMinutes: 48 },
          distance: { totalKm: 1.6, segmentsTotalKm: 1.6 },
          duration: { networkMinutes: null, estimatedMinutes: 12, serviceMinutes: null, totalMinutes: 12 },
          routing: { provider: "none", profile: null, mode: "fallback", estimated: true, parameters: { walkingSpeedKmPerHour: 4.5, coordinateCount: 3, budgetPrefixApplied: false }, opaqueProviderDecisions: [], degradations: [] },
          segments: [{ from: "origin", to: "observed:tree", distanceKm: 0.8, durationMinutes: 6, measured: false, streetSteps: [] }, { from: "observed:tree", to: "origin", distanceKm: 0.8, durationMinutes: 6, measured: false, streetSteps: [] }], warnings: [], approximations: ["distance estimée"], fallbacks: ["fallback_route_geometry"],
          eventSignal: { completedEventsConsidered: 0, geolocatedCompletedEvents: 0, eventsWithoutCoordinates: 0, sourceAvailable: false, recentWindowDays: 16, signalHorizonDays: 56, spatialRadiusKm: 2, maxScoreBoost: 20 },
          eventCentered: null, spatialPrior: null, prediction: null,
          finalRoutingReconciliation: { stopsBefore: 1, stopsAfter: 1, excludedCandidateIds: [], providerCalls: 0, firstProviderMode: "fallback", finalGeometryMode: "fallback", degraded: false, warning: null },
        },
        routeGeometry: {
          isLoop: true,
          origin: [48.8566, 2.3522],
          returnLeg: { fromStopIndex: 1, toStopIndex: 2, distanceKm: 0.8, estimatedMinutes: 6 },
          coordinates: [[48.8566, 2.3522], [48.86, 2.35], [48.8566, 2.3522]],
          distanceKm: 1.6,
          durationMinutes: 12,
          legs: [
            { fromStopIndex: 0, toStopIndex: 1, distanceKm: 0.8, estimatedMinutes: 6 },
            { fromStopIndex: 1, toStopIndex: 2, distanceKm: 0.8, estimatedMinutes: 6 },
          ],
          provider: "none",
          profile: null,
          mode: "fallback",
          estimated: true,
        },
        scoreBreakdown: { priority: 86.5, distance: 96 },
        tradeoffs: [],
        proactiveAssistant: { actNow: "", criticalNearby: "", mostUsefulAction: "", operationalSignalZones: [], upcomingEvents: [], hotspots: [] },
      }),
    });
  });

  await page.addInitScript(() => {
    window.localStorage.setItem(
      "cleanmymap_cookie_consent",
      JSON.stringify({ choice: "rejected", timestamp: Date.now(), analytics: false }),
    );
  });
  await page.goto("/sections/route", { waitUntil: "domcontentloaded" });
  const refuseCookies = page.getByRole("button", { name: "Tout refuser" });
  if (await refuseCookies.isVisible().catch(() => false)) {
    await refuseCookies.click();
  }
  const calculate = page.getByRole("button", { name: /Calculer la recommandation/ });
  await expect(calculate).toBeVisible({ timeout: 30_000 });
  await calculate.click();
  await expect(page.getByText("Comprendre cet itinéraire")).toBeVisible({ timeout: 30_000 });
  await page.locator("summary").filter({ hasText: "Comprendre cet itinéraire" }).click();
  const whyPoints = page.locator("summary").filter({ hasText: "Pourquoi ces points ?" });
  await expect(whyPoints).toBeVisible();
  await whyPoints.click();
  const details = page.locator("[data-route-additionality-details]");
  await expect(details).toBeVisible();
  await expect(details.getByText("Forte valeur bénévole")).toBeVisible();
  await expect(details.getByText("Micro-espace susceptible d'accumuler des déchets")).toBeVisible();
  await expect(details.getByText("Couverture de nettoyage inconnue")).toBeVisible();
});
