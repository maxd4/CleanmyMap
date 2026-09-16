import { describe, expect, it, vi } from "vitest";
import type { ActionMapItem } from "@/lib/actions/types";
import {
  INITIAL_MAP_SEARCH_RADII_KM,
  haversineDistanceKm,
  isActivePollutionItem,
  isWithinRadialSearch,
  resolveInitialPublicMapViewport,
  resolveInitialMapViewport,
  selectMapReferencePoint,
  selectNearestActivePollution,
  type InitialPollutionCandidateFetcher,
} from "./actions-map-initial-viewport";
import { loadAllInitialPollutionPages } from "@/lib/actions/pollution/initial-nearest-pollution-source";
import { shouldApplyAutomaticViewport } from "./use-actions-map-viewport";
import { DEFAULT_ACTIONS_MAP_VIEWPORT, NEUTRAL_MAP_CENTER } from "../actions-map-canvas.utils";

const RUNTIME_REFERENCES = {
  global: {
    wastePerVolunteer: 20,
    buttsPerVolunteer: 2000,
    wasteSourceCount: 1,
    buttsSourceCount: 1,
  },
};

function buildItem(overrides: Partial<ActionMapItem> = {}): ActionMapItem {
  return {
    id: "item-1",
    action_date: "2026-08-25",
    location_label: "Zone test",
    latitude: 48.8566,
    longitude: 2.3522,
    waste_kg: 1,
    cigarette_butts: 0,
    status: "approved",
    record_type: "other",
    source: "trash_spotter_spots",
    source_status: "validated",
    created_by_clerk_id: null,
    ...overrides,
  };
}

describe("actions map initial viewport", () => {
  it("prefers the ephemeral GPS reference over residence", () => {
    const gps = { latitude: 43.6045, longitude: 1.444 };
    const residence = { latitude: 45.764, longitude: 4.835 };

    expect(selectMapReferencePoint(gps, residence)).toEqual(gps);
    expect(selectMapReferencePoint(null, residence)).toEqual(residence);
    expect(selectMapReferencePoint(null, null)).toBeNull();
  });

  it("keeps a neutral viewport when GPS and residence are both unavailable", () => {
    expect(selectMapReferencePoint(null, null)).toBeNull();
    expect(DEFAULT_ACTIONS_MAP_VIEWPORT.center).toEqual(NEUTRAL_MAP_CENTER);
  });

  it("computes a symmetric Haversine distance", () => {
    const left = { latitude: 48.8566, longitude: 2.3522 };
    const right = { latitude: 48.8666, longitude: 2.3622 };

    expect(haversineDistanceKm(left, right)).toBeCloseTo(haversineDistanceKm(right, left), 8);
    expect(haversineDistanceKm(left, left)).toBe(0);
  });

  it("selects the nearest active pollution independently of source order and recency", () => {
    const reference = { latitude: 48.8566, longitude: 2.3522 };
    const recentFarSpots = Array.from({ length: 120 }, (_, index) =>
      buildItem({
        id: `recent-${index}`,
        latitude: 49.2 + index / 1000,
        longitude: 2.8,
      }),
    );
    const oldNearest = buildItem({
      id: "old-nearest",
      latitude: 48.857,
      longitude: 2.353,
    });

    expect(selectNearestActivePollution(
      [...recentFarSpots, oldNearest],
      reference,
      RUNTIME_REFERENCES,
    )?.id).toBe("old-nearest");
  });

  it("selects the nearest public action and fits the actions from its city", async () => {
    const reference = { latitude: 48.8566, longitude: 2.3522 };
    const nearest = buildItem({
      id: "nearest-action",
      record_type: "action",
      source: "actions",
      latitude: 48.857,
      longitude: 2.353,
      contract: {
        type: "action",
        location: { label: "Quai de test", latitude: 48.857, longitude: 2.353 },
        metadata: { preparationData: { communeZoneLabel: "Paris" } },
      } as ActionMapItem["contract"],
    });
    const sameCity = buildItem({
      id: "same-city-action",
      record_type: "action",
      source: "actions",
      latitude: 48.86,
      longitude: 2.36,
      contract: {
        type: "action",
        location: { label: "Autre quai", latitude: 48.86, longitude: 2.36 },
        metadata: { preparationData: { communeZoneLabel: "PARIS" } },
      } as ActionMapItem["contract"],
    });
    const fetchActions = vi.fn(async ({ viewport }: { viewport?: unknown }) => ({
      items: viewport ? [nearest, sameCity] : [],
    }));

    const result = await resolveInitialPublicMapViewport({
      reference,
      fetchActions,
    });

    expect(result.selectedItem?.id).toBe("nearest-action");
    expect(result.cityLabel).toBe("Paris");
    expect(result.cityItems.map((item) => item.id)).toEqual([
      "nearest-action",
      "same-city-action",
    ]);
    expect(result.viewport?.center[0]).toBeCloseTo(48.8585, 4);
    expect(result.viewport?.center[1]).toBeCloseTo(2.3565, 4);
    expect(result.viewport?.zoom).toBeGreaterThanOrEqual(12);
  });

  it("uses the most recent public action as the deterministic no-location fallback", async () => {
    const recent = buildItem({
      id: "recent-action",
      record_type: "action",
      source: "actions",
      latitude: 43.6045,
      longitude: 1.444,
      contract: {
        type: "action",
        location: { label: "Toulouse", latitude: 43.6045, longitude: 1.444 },
        metadata: { preparationData: { communeZoneLabel: "Toulouse" } },
      } as ActionMapItem["contract"],
    });
    const fetchActions = vi.fn(async ({ viewport }: { viewport?: unknown }) => ({
      items: viewport ? [recent] : [recent],
    }));

    const result = await resolveInitialPublicMapViewport({ fetchActions });

    expect(result.selectedItem?.id).toBe("recent-action");
    expect(result.reference).toEqual({ latitude: 43.6045, longitude: 1.444 });
    expect(result.cityItems).toHaveLength(1);
    expect(result.viewport?.center).toEqual([43.6045, 1.444]);
    expect(fetchActions).toHaveBeenCalledTimes(2);
  });

  it("groups legacy action labels by their explicit postal city", async () => {
    const selected = buildItem({
      id: "selected-paris-action",
      record_type: "action",
      source: "actions",
      location_label: "Rue A, 75020 Paris → Rue B, 75020 Paris",
      latitude: 48.87,
      longitude: 2.4,
    });
    const sibling = buildItem({
      id: "sibling-paris-action",
      record_type: "action",
      source: "actions",
      location_label: "Porte C, 75010 Paris",
      latitude: 48.87,
      longitude: 2.37,
    });
    const otherCity = buildItem({
      id: "other-city-action",
      record_type: "action",
      source: "actions",
      location_label: "Place D, 69001 Lyon",
      latitude: 45.77,
      longitude: 4.83,
    });
    let call = 0;
    const fetchActions = vi.fn(async () => ({
      items: call++ === 0 ? [selected] : [selected, sibling, otherCity],
    }));

    const result = await resolveInitialPublicMapViewport({
      reference: { latitude: 48.87, longitude: 2.4 },
      fetchActions,
    });

    expect(result.cityLabel).toBe("Paris");
    expect(result.cityItems.map((item) => item.id)).toEqual([
      "selected-paris-action",
      "sibling-paris-action",
    ]);
  });

  it("returns the canonical empty result when no public action has coordinates", async () => {
    const result = await resolveInitialPublicMapViewport({
      fetchActions: async () => ({ items: [] }),
    });

    expect(result.selectedItem).toBeNull();
    expect(result.viewport).toBeNull();
    expect(result.cityItems).toEqual([]);
  });

  it("applies the radial criterion instead of accepting a farther bbox corner", () => {
    const reference = { latitude: 48.8566, longitude: 2.3522 };
    const cornerOfFiveKmBox = buildItem({
      id: "bbox-corner",
      latitude: reference.latitude + 0.045,
      longitude: reference.longitude + 0.045,
    });
    const candidateAtFivePointFiveKm = buildItem({
      id: "five-point-five-km",
      latitude: reference.latitude + 0.05,
      longitude: reference.longitude,
    });

    expect(isWithinRadialSearch(reference, cornerOfFiveKmBox, 5)).toBe(false);
    expect(isWithinRadialSearch(reference, candidateAtFivePointFiveKm, 20)).toBe(true);
    expect(selectNearestActivePollution(
      [cornerOfFiveKmBox, candidateAtFivePointFiveKm],
      reference,
      RUNTIME_REFERENCES,
      20,
    )?.id).toBe("five-point-five-km");
  });

  it("excludes actions, clean places, cleaned spots and zero-score spots", () => {
    const reference = { latitude: 48.8566, longitude: 2.3522 };
    const cleanPlace = buildItem({ id: "clean-place", record_type: "clean_place" });
    const action = buildItem({ id: "action", record_type: "action", source: "actions" });
    const cleanedSpot = buildItem({ id: "cleaned", source_status: "cleaned" });
    const zeroScoreSpot = buildItem({ id: "zero", waste_kg: 0, cigarette_butts: 0 });

    expect(isActivePollutionItem(cleanPlace, RUNTIME_REFERENCES)).toBe(false);
    expect(isActivePollutionItem(action, RUNTIME_REFERENCES)).toBe(false);
    expect(isActivePollutionItem(cleanedSpot, RUNTIME_REFERENCES)).toBe(false);
    expect(isActivePollutionItem(zeroScoreSpot, RUNTIME_REFERENCES)).toBe(false);
    expect(selectNearestActivePollution(
      [cleanPlace, action, cleanedSpot, zeroScoreSpot],
      reference,
      RUNTIME_REFERENCES,
    )).toBeNull();
  });

  it("uses the same dynamic references for activity and severity tie-break", () => {
    const reference = { latitude: 48.8566, longitude: 2.3522 };
    const dynamicReferences = {
      global: {
        wastePerVolunteer: 100,
        buttsPerVolunteer: 10,
        wasteSourceCount: 1,
        buttsSourceCount: 1,
      },
    };
    const wasteCandidate = buildItem({
      id: "waste",
      waste_kg: 5,
      cigarette_butts: 0,
      latitude: reference.latitude + 0.001,
    });
    const buttsCandidate = buildItem({
      id: "butts",
      waste_kg: 0,
      cigarette_butts: 50,
      latitude: reference.latitude - 0.001,
    });

    expect(isActivePollutionItem(wasteCandidate, dynamicReferences)).toBe(true);
    expect(isActivePollutionItem(buttsCandidate, dynamicReferences)).toBe(true);
    expect(selectNearestActivePollution(
      [wasteCandidate, buttsCandidate],
      reference,
      dynamicReferences,
    )?.id).toBe("butts");
  });

  it("uses severity only when distances are equivalent at the existing precision", () => {
    const reference = { latitude: 48.8566, longitude: 2.3522 };
    const lowSeverity = buildItem({ id: "low", waste_kg: 1, latitude: reference.latitude + 0.001 });
    const highSeverity = buildItem({ id: "high", waste_kg: 20, latitude: reference.latitude - 0.001 });

    expect(selectNearestActivePollution(
      [lowSeverity, highSeverity],
      reference,
      RUNTIME_REFERENCES,
    )?.id).toBe("high");
  });

  it("proves pagination does not truncate older candidates before distance comparison", async () => {
    const rows = Array.from({ length: 121 }, (_, index) => index);
    const fetchPage = vi.fn(async (offset: number, pageSize: number) =>
      rows.slice(offset, offset + pageSize),
    );

    await expect(loadAllInitialPollutionPages(fetchPage, 120)).resolves.toEqual(rows);
    expect(fetchPage).toHaveBeenCalledTimes(2);
  });

  it("widens from 5 km to 20 km when no active candidate is in the local radius", async () => {
    const target = buildItem({ id: "target-20km", latitude: 49.0, longitude: 2.3522 });
    const fetchInitialPollution = vi.fn<InitialPollutionCandidateFetcher>(async ({ radiusKm }) =>
      radiusKm === 20 ? { item: target } : { item: null },
    );

    const result = await resolveInitialMapViewport({
      reference: { latitude: 48.8566, longitude: 2.3522 },
      fetchInitialPollution,
    });

    expect(fetchInitialPollution).toHaveBeenCalledTimes(2);
    expect(result.searchRadiiKm).toEqual(INITIAL_MAP_SEARCH_RADII_KM.slice(0, 2));
    expect(result.selectedItem?.id).toBe("target-20km");
    expect(result.viewport.zoom).toBe(15);
  });

  it("keeps the stable reference viewport when no candidate exists within 150 km", async () => {
    const reference = { latitude: 45.764, longitude: 4.8357 };
    const result = await resolveInitialMapViewport({
      reference,
      fetchInitialPollution: async () => ({ item: null }),
    });

    expect(result.selectedItem).toBeNull();
    expect(result.viewport.center).toEqual([45.764, 4.8357]);
    expect(result.viewport.zoom).toBe(12);
  });

  it("stops an asynchronous recenter as soon as the user interacts", () => {
    expect(
      shouldApplyAutomaticViewport({
        isMounted: true,
        hasManualViewportChange: true,
        hasAutomaticViewportApplied: false,
        nextViewport: {
          center: [48.8566, 2.3522],
          zoom: 15,
          bounds: { south: 48.8, west: 2.2, north: 48.9, east: 2.4 },
        },
      }),
    ).toBe(false);
  });
});
