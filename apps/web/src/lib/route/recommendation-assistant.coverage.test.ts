import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/cache", () => ({
  unstable_cache: (callback: () => unknown) => callback,
}));

import {
  buildHotspots,
  buildProactiveAssistant,
  defaultRouteAssistantPayload,
  defaultRouteRecommendationFloorDate,
  loadCachedEventPressureByArrondissement,
} from "./recommendation-assistant";

describe("route recommendation projections", () => {
  beforeEach(() => vi.useFakeTimers({ now: new Date("2026-10-27T12:00:00Z") }));

  it("aggregates arrondissement and free-label candidates while preserving missing distance", () => {
    const hotspots = buildHotspots({
      candidates: [
        { label: "Paris 4e", latitude: 48.85, longitude: 2.35, observedAt: "2026-10-26T12:00:00Z" },
        { label: "Paris 4e", latitude: 48.86, longitude: 2.36, observedAt: "2026-09-01T12:00:00Z" },
        { label: " quai sans arrondissement ", latitude: 48.84, longitude: 2.34, observedAt: "2026-10-27T12:00:00Z" },
      ],
      pressureByArrondissement: new Map([[4, 4.25]]),
      userArrondissement: 1,
    });

    expect(hotspots).toHaveLength(2);
    const arrondissementHotspot = hotspots.find((item) => item.zoneLabel === "Paris 4e");
    const freeLabelHotspot = hotspots.find((item) => item.zoneLabel === "quai sans arrondissement");
    expect(arrondissementHotspot).toMatchObject({ recentSpots: 1, eventPressure: 4.3 });
    expect(arrondissementHotspot?.distanceKm).toEqual(expect.any(Number));
    expect(freeLabelHotspot).toMatchObject({ eventPressure: 0 });

    const noUserDistance = buildHotspots({
      candidates: [{ label: "Zone", latitude: 48.8, longitude: 2.3, observedAt: "invalid" }],
      pressureByArrondissement: new Map(),
      userArrondissement: null,
    });
    expect(noUserDistance[0]?.distanceKm).toBeNull();
  });

  it("selects the nearest hotspot and exposes empty-state messages", () => {
    const hotspot = { zoneLabel: "Paris 4e", operationalSignalScore: 8.2, recentActions: 0, recentSpots: 2, eventPressure: 1.5, distanceKm: 3.2, reason: "signal" };
    const far = { ...hotspot, zoneLabel: "Paris 12e", distanceKm: 8.1 };
    const result = buildProactiveAssistant({
      stops: [{ label: "Canal", score: 6.25 }],
      hotspots: [far, hotspot],
      eventSignals: ["event"],
    });
    expect(result).toMatchObject({
      actNow: "Tu devrais agir ici aujourd'hui: Canal.",
      criticalNearby: "Point prioritaire proche de toi: Paris 4e (3.2 km).",
      mostUsefulAction: "Intervention la plus utile en ce moment: Canal (score operationnel 6.3).",
      upcomingEvents: ["event"],
    });

    const empty = buildProactiveAssistant({ stops: [], hotspots: [{ ...hotspot, distanceKm: null }], eventSignals: [] });
    expect(empty.criticalNearby).toBe("Point prioritaire proche de toi: Paris 4e.");
    expect(buildProactiveAssistant({ stops: [], hotspots: [], eventSignals: [] })).toEqual({
      actNow: "Tu devrais agir ici aujourd'hui: aucun point prioritaire n'a ete identifie.",
      criticalNearby: "Point prioritaire proche de toi: donnees locales insuffisantes.",
      mostUsefulAction: "Intervention la plus utile en ce moment: renforcer la collecte de donnees geolocalisees.",
      operationalSignalZones: [], upcomingEvents: [], hotspots: [],
    });
    expect(defaultRouteAssistantPayload().hotspots).toEqual([]);
    expect(defaultRouteRecommendationFloorDate()).toBe("2026-06-29");
  });

  it("propagates event source errors through the cached loader", async () => {
    const query = { select: vi.fn(() => query), gte: vi.fn(() => query), lte: vi.fn(() => query), order: vi.fn(() => query), limit: vi.fn(async () => ({ data: [], error: { message: "events unavailable" } })) };
    const client = { from: vi.fn(() => query) } as never;
    await expect(loadCachedEventPressureByArrondissement(() => client)).rejects.toThrow("events unavailable");
  });
});
