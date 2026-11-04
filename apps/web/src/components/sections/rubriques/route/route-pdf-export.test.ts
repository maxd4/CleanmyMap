import { describe, expect, it } from "vitest";
import type { RouteResponse } from "@/lib/route/route-response-contract";
import { createDefaultRouteTerritorialGuidedMode } from "@/lib/route/route-planning-mode";
import { buildRoutePdfHtml, countRoutePdfStops } from "./route-pdf-export";

const stop = (
  id: string,
  latitude: number,
  longitude: number,
  overrides: { label?: string; priorityReason?: string; score?: number } = {},
) => ({
  id,
  label: overrides.label ?? `Zone ${id}`,
  latitude,
  longitude,
  segmentKm: 0.8,
  estimatedMinutes: 6,
  priorityReason: overrides.priorityReason ?? "Signalement observé",
  score: overrides.score ?? 82,
});
const geometry = (coordinates: [number, number][]) => ({
  isLoop: true as const,
  origin: coordinates[0] ?? null,
  returnLeg: { fromStopIndex: 2, toStopIndex: 3, distanceKm: 0.8, estimatedMinutes: 6 },
  coordinates,
  distanceKm: 2.4,
  durationMinutes: 18,
  legs: [],
  provider: "osrm" as const,
  profile: "foot" as const,
  mode: "network" as const,
  estimated: false,
});

function buildFixture(groupCount = 1): RouteResponse {
  const origin = { latitude: 48.8566, longitude: 2.3522, source: "browser" as const };
  const firstStops = [stop("a", 48.857, 2.353), stop("b", 48.858, 2.354)];
  const firstGeometry = geometry([
    [origin.latitude, origin.longitude],
    [48.857, 2.353],
    [48.858, 2.354],
    [origin.latitude, origin.longitude],
  ]);
  const groupRoutes = groupCount === 1
    ? [{
        groupIndex: 1,
        volunteerCount: 6,
        origin,
        candidateIds: ["a", "b"],
        estimatedDistanceKm: 2.4,
        estimatedDurationMinutes: 18,
        targetCount: 2,
        reservedCandidateIds: [],
        stops: firstStops,
        routeGeometry: firstGeometry,
        travelDistanceKm: 2.4,
        travelMinutes: 18,
        travelBudgetMinutes: 60,
        withinBudget: true,
      }]
    : [1, 2, 3].map((groupIndex) => ({
        groupIndex,
        volunteerCount: 2,
        origin,
        candidateIds: [`group-${groupIndex}`],
        estimatedDistanceKm: 2.4,
        estimatedDurationMinutes: 18,
        targetCount: 1,
        reservedCandidateIds: [],
        stops: [stop(`g${groupIndex}`, 48.857 + groupIndex / 1000, 2.353 + groupIndex / 1000)],
        routeGeometry: geometry([
          [origin.latitude, origin.longitude],
          [48.857 + groupIndex / 1000, 2.353 + groupIndex / 1000],
          [origin.latitude, origin.longitude],
        ]),
        travelDistanceKm: 2.4,
        travelMinutes: 18,
        travelBudgetMinutes: 60,
        withinBudget: true,
      }));

  return {
    isLoop: true,
    routeTopology: "loop",
    planningMode: { type: "free" },
    status: "ok",
    dataStatus: "complete",
    dataLayers: {} as RouteResponse["dataLayers"],
    isTruncated: false,
    sourceHealth: {
      partial: false,
      failedSources: [],
      availableSources: ["spots"],
      warnings: [],
    },
    origin,
    arrival: origin,
    travelDistanceKm: 2.4,
    travelMinutes: 18,
    travelBudgetMinutes: 60,
    volunteers: 6,
    groupCount,
    constraintsApplied: { pickupPreference: "balanced" },
    loop: {
      isLoop: true,
      origin,
      returnDistanceKm: 0.8,
      returnMinutes: 6,
      budgetRemainingMinutes: 42,
    },
    withinBudget: true,
    serviceMinutesEstimate: null,
    totalMinutesEstimate: null,
    diagnostics: {} as RouteResponse["diagnostics"],
    generatedAt: "2026-09-08T10:30:00.000Z",
    engineVersion: "route-planner-v2",
    stops: firstStops,
    prediction: {} as RouteResponse["prediction"],
    trace: {
      warnings: [],
      segments: [],
      eventCentered: null,
    } as unknown as RouteResponse["trace"],
    routeGeometry: firstGeometry,
    scoreBreakdown: { priority: 82, distance: 18 },
    tradeoffs: [],
    proactiveAssistant: {} as RouteResponse["proactiveAssistant"],
    groups: [],
    groupRoutes,
    multiRoute: {
      groupCount,
      volunteers: 6,
      totalDistanceKm: groupCount === 1 ? 2.4 : 7.2,
      totalDurationMinutes: groupCount === 1 ? 18 : 54,
      coverageGain: 0.9,
      sharedTargetRatio: 0,
      sharedDistanceKm: null,
      sharedDistanceRatio: null,
      balanceDistance: 0,
      balanceDuration: 0,
      balanceTargetCount: 0,
      balanceVolunteerCount: 0,
      fallbackGroupCount: 0,
      networkDistanceMeasured: true,
    },
    partition: {} as RouteResponse["partition"],
  };
}

describe("route PDF export", () => {
  it("formate les scores avec le pourcentage canonique", () => {
    const data = buildFixture();
    const routeStop = data.groupRoutes[0]!.stops[0]!;
    data.groupRoutes[0]!.stops[0] = { ...routeStop, score: 82.5 };
    const html = buildRoutePdfHtml(data, "colors", data.generatedAt);

    expect(html).toContain("score 82,5 %");
    expect(html).toContain("score 82,0 %");
    expect(html).not.toMatch(/score 82(?:\s|·)/);
  });

  it("exporte un trajet ouvert sans refermer la géométrie ni marquer D/A", () => {
    const loop = buildFixture();
    const openGeometry = {
      ...loop.routeGeometry,
      isLoop: false as const,
      returnLeg: null,
      coordinates: loop.routeGeometry.coordinates.slice(0, -1),
    };
    const openData: RouteResponse = {
      ...loop,
      isLoop: false,
      routeTopology: "open",
      arrival: { latitude: 48.858, longitude: 2.354, source: "planner" },
      routeGeometry: openGeometry,
      groupRoutes: loop.groupRoutes.map((route) => ({ ...route, routeGeometry: { ...route.routeGeometry, isLoop: false, returnLeg: null, coordinates: route.routeGeometry.coordinates.slice(0, -1) } })),
    };
    const html = buildRoutePdfHtml(openData, "colors", openData.generatedAt);
    expect(html).toContain("trajet ouvert");
    expect(html).toContain(">D<");
    expect(html).not.toContain(">D/A<");
  });

  it("exporte l’audit guidé ouvert sans interpréter loopVerified comme une fermeture manquée", () => {
    const loop = buildFixture(2);
    const openData: RouteResponse = {
      ...loop,
      isLoop: false,
      routeTopology: "open",
      arrival: { latitude: 48.858, longitude: 2.354, source: "address" },
      groupRoutes: loop.groupRoutes.map((route) => ({
        ...route,
        plannedSector: { center: { latitude: 48.8566, longitude: 2.3522 }, radiusKm: 1 },
        guidedRouting: {
          availability: "network",
          loopVerified: false,
          originVerified: true,
          waypointOrderVerified: true,
          waypointIds: [],
          sectorDeviationKm: null,
          sectorWithinBounds: false,
          sectorStatus: "unknown",
          warning: null,
          budget: { totalMinutes: 90, organizationMarginMinutes: 15, minimumCollectionMinutes: 45, travelMaxMinutes: 30, travelMinutes: 20, collectionMinutesAvailable: 55, withinBudget: true },
        },
      })),
    };

    const html = buildRoutePdfHtml(openData, "colors", openData.generatedAt);

    expect(html).toContain("trajet ouvert");
    expect(html).toContain("arrivée fournie explicitement");
    expect(html).not.toContain("boucle non vérifiée");
  });

  it("échappe les valeurs injectées dans les attributs et le texte HTML", () => {
    const unsafe = "\"&<>'";
    const data = buildFixture();
    const routeStop = data.groupRoutes[0]!.stops[0]!;
    data.groupRoutes[0]!.stops[0] = {
      ...routeStop,
      id: unsafe,
      label: unsafe,
      priorityReason: unsafe,
    };
    const html = buildRoutePdfHtml(data, "colors", data.generatedAt);
    const escaped = "&quot;&amp;&lt;&gt;&#39;";

    expect(html).toContain(`data-route-stop="${escaped}"`);
    expect(html).toContain(`<strong>${escaped}</strong>`);
    expect(html).toContain(`<span>Source non précisée · ${escaped} · score`);
    expect(html).not.toContain(unsafe);
  });

  it("renders a reproducible single closed loop without planner calls", () => {
    const data = buildFixture();
    const first = buildRoutePdfHtml(data, "colors", data.generatedAt);
    const second = buildRoutePdfHtml(data, "colors", data.generatedAt);

    expect(first).toBe(second);
    expect(first).toContain("Itinéraire CleanMyMap");
    expect(first).toContain("Point de rendez-vous");
    expect(first).toContain("Départ / arrivée");
    expect(first).toContain("Durée d’action");
    expect(first).toContain("Non disponible : calibration absente");
    expect(first).toContain('size: A4 landscape');
    expect(first).toContain(
      '.route-pdf-map-shell, .route-pdf-legend, .route-pdf-metrics { break-inside: avoid; page-break-inside: avoid; }',
    );
    expect(first).toContain('data-route-stop="a"');
    expect(first).toContain('data-route-stop="b"');
    expect(first).not.toContain("Vue générale — 3 groupes");
  });

  it("renders an overview and one isolated printable sheet per group", () => {
    const html = buildRoutePdfHtml(buildFixture(3), "patterns", "2026-09-08T10:30:00.000Z");

    expect(html).toContain("Vue générale — 3 groupes");
    expect(html.match(/Fiche terrain/g)).toHaveLength(3);
    expect(html).toContain("Groupe 1 — 2 bénévoles");
    expect(html).toContain("Groupe 2 — 2 bénévoles");
    expect(html).toContain("Groupe 3 — 2 bénévoles");
    expect(html).toContain('stroke-dasharray="12 8"');
    expect(html).toContain('stroke-dasharray="3 7"');
    expect(html).toContain("Trait pointillés");
    expect(html).toContain("Aucune couche prédictive");
  });

  it("sépare les passages guidés des observations dans la vue et les fiches de groupe", () => {
    const data = buildFixture(2);
    const planningMode = createDefaultRouteTerritorialGuidedMode(10, 2);
    data.planningMode = planningMode;
    data.guidedBudget = planningMode.budget;
    data.volunteers = 10;
    data.groupCount = 2;
    data.groupRoutes = data.groupRoutes.slice(0, 2).map((route, index) => ({
      ...route,
      label: `Secteur ${index + 1}`,
      plannedSector: planningMode.groups[index]!.sector,
      plannedWaypoints: [{ ...planningMode.groups[index]!.waypoints[0]!, order: 0 }],
      guidedRouting: {
        availability: "network",
        loopVerified: true,
        originVerified: true,
        waypointOrderVerified: true,
        waypointIds: [planningMode.groups[index]!.waypoints[0]!.id],
        sectorDeviationKm: null,
        sectorWithinBounds: false,
        sectorStatus: "unknown",
        warning: null,
        budget: {
          ...planningMode.budget,
          travelMinutes: 18,
          collectionMinutesAvailable: 57,
          withinBudget: true,
        },
      },
    }));
    data.groupRoutes[0]!.stops[0] = { ...data.groupRoutes[0]!.stops[0]!, evidence: { family: "observed" } as never };
    data.groupRoutes[1]!.stops[0] = { ...data.groupRoutes[1]!.stops[0]!, evidence: { family: "predicted" } as never };

    const html = buildRoutePdfHtml(data, "colors", data.generatedAt);

    expect(html).toContain("Vue générale — 2 groupes");
    expect(html.match(/Fiche terrain/g)).toHaveLength(2);
    expect(html).toContain("Secteur 1");
    expect(html).toContain("Secteur 2");
    expect(html).toContain("Passages planifiés (ordre)");
    expect(html).toContain("aucune observation associée");
    expect(html).toContain("Observation");
    expect(html).toContain("Cible prédite");
    expect(html).toContain('data-route-planned-waypoint="group-1-waypoint-1"');
    expect(html).toContain("réseau piéton");
    expect(html).toContain("secteur inconnu (géométrie finale non vérifiable)");
    expect(html).toContain("45 min réservées");
  });

  it("compte séparément les cibles prédites, observations validées et passages planifiés", () => {
    const data = buildFixture(2);
    data.groupRoutes[0]!.stops[0] = { ...data.groupRoutes[0]!.stops[0]!, evidence: { family: "predicted" } as never };
    data.groupRoutes[1]!.stops[0] = { ...data.groupRoutes[1]!.stops[0]!, evidence: { family: "observed" } as never };
    data.groupRoutes[0]!.plannedWaypoints = [{ id: "planned", label: "Point", latitude: 48.86, longitude: 2.36, order: 0 }];

    expect(countRoutePdfStops(data.groupRoutes[0]!)).toMatchObject({
      predictedTargets: 1,
      validatedObservations: 0,
      plannedPassages: 1,
    });
    const html = buildRoutePdfHtml(data, "colors", data.generatedAt);
    expect(html).toContain("1 cible prédite · 1 observation validée");
    expect(html).toContain("1 passage planifié");
    expect(html).not.toContain("2 observations ·");
  });

  it("exporte la provenance du risque théorique sans le présenter comme une observation", () => {
    const data = buildFixture();
    data.plannerRiskContext = {
      schemaVersion: "route-planner-risk-context-v1",
      riskFocus: "all",
      source: "materialized_pedestrian_risk_projection",
      modelVersion: "paris-pressure-risk-v3-urban-morphology",
      projectionKey: "paris-pantheon-jardin-des-plantes",
      projectionVersionId: "projection-1",
      networkVersionId: "network-1",
      predictionStatus: "available",
      consideredSegments: 12,
      selectedSegments: 4,
      generatedAt: data.generatedAt,
    };
    data.prediction.selected = 4;
    data.observedEnrichment = {
      source: "validated_trash_spotter_spots",
      predictedCandidatesRetained: 4,
      considered: 1,
      accepted: 1,
      rejected: 0,
      rejectedByReason: {},
      acceptedCandidateIds: ["observed-1"],
      evaluations: [],
      totalDetourDistanceKm: 0.1,
      totalDetourMinutes: 3,
      routeBudgetMinutes: 60,
      routeDurationBeforeMinutes: 18,
      routeDurationAfterMinutes: 21,
      observedDoesNotReplacePrediction: true,
    };

    const html = buildRoutePdfHtml(data, "colors", data.generatedAt);

    expect(html).toContain("Risques théoriques retenus");
    expect(html).toContain("projection-1");
    expect(html).toContain("signalements observés ajoutés");
    expect(html).toContain("elles ne mesurent pas une pollution observée");
  });
});
