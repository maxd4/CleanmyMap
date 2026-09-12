import { describe, expect, it } from "vitest";
import type { RouteResponse } from "@/lib/route/route-response-contract";
import { buildRoutePdfHtml } from "./route-pdf-export";

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
    const escaped = "&quot;&amp;&lt;&gt;&#039;";

    expect(html).toContain(`data-route-stop="${escaped}"`);
    expect(html).toContain(`<strong>${escaped}</strong>`);
    expect(html).toContain(`<span>${escaped} · score`);
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
    expect(first).toContain("Durée collecte");
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
});
