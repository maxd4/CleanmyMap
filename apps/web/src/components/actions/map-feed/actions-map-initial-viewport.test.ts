import { describe, expect, it, vi } from "vitest";
import type { ActionMapItem } from "@/lib/actions/types";
import {
  INITIAL_MAP_SEARCH_RADII_KM,
  haversineDistanceKm,
  isActivePollutionItem,
  resolveInitialMapViewport,
  selectMapReferencePoint,
  selectNearestActivePollution,
  type InitialMapActionsFetcher,
} from "./actions-map-initial-viewport";
import { shouldApplyAutomaticViewport } from "./use-actions-map-viewport";
import { DEFAULT_ACTIONS_MAP_VIEWPORT, NEUTRAL_MAP_CENTER } from "../actions-map-canvas.utils";

function buildItem(overrides: Partial<ActionMapItem>): ActionMapItem {
  return {
    id: "item-1",
    action_date: "2026-08-25",
    location_label: "Zone test",
    latitude: 48.8566,
    longitude: 2.3522,
    waste_kg: 0,
    cigarette_butts: 10,
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

  it("selects the nearest active pollution independently of API order", () => {
    const reference = { latitude: 48.8566, longitude: 2.3522 };
    const nearest = buildItem({ id: "nearest", latitude: 48.857, longitude: 2.353 });
    const farther = buildItem({ id: "farther", latitude: 48.88, longitude: 2.39 });

    expect(selectNearestActivePollution([farther, nearest], reference)?.id).toBe("nearest");
  });

  it("uses severity as the tie-breaker and excludes clean/history signals", () => {
    const reference = { latitude: 48.8566, longitude: 2.3522 };
    const lowSeverity = buildItem({ id: "low", waste_kg: 1 });
    const highSeverity = buildItem({ id: "high", waste_kg: 20 });
    const cleanPlace = buildItem({ id: "clean", record_type: "clean_place" });
    const cleanedSpot = buildItem({ id: "cleaned", source_status: "cleaned" });
    const blueSpot = buildItem({ id: "blue", waste_kg: 0, cigarette_butts: 0 });
    const historicalAction = buildItem({
      id: "history",
      record_type: "action",
      source: "actions",
      waste_kg: 100,
    });

    expect(selectNearestActivePollution([lowSeverity, highSeverity], reference)?.id).toBe("high");
    expect(isActivePollutionItem(cleanPlace)).toBe(false);
    expect(isActivePollutionItem(cleanedSpot)).toBe(false);
    expect(isActivePollutionItem(blueSpot)).toBe(false);
    expect(isActivePollutionItem(historicalAction)).toBe(false);
  });

  it("widens the bounded search progressively and stops on the first matching radius", async () => {
    const reference = { latitude: 48.8566, longitude: 2.3522 };
    const fetchActions = vi.fn<InitialMapActionsFetcher>(async () => ({ items: [] }));
    fetchActions
      .mockResolvedValueOnce({ items: [] })
      .mockResolvedValueOnce({
        items: [buildItem({ id: "target", latitude: 48.88, longitude: 2.39 })],
      });

    const result = await resolveInitialMapViewport({ reference, fetchActions });

    expect(fetchActions).toHaveBeenCalledTimes(2);
    expect(result.searchRadiiKm).toEqual(INITIAL_MAP_SEARCH_RADII_KM.slice(0, 2));
    expect(result.selectedItem?.id).toBe("target");
    expect(result.viewport.zoom).toBe(15);
  });

  it("keeps a stable local viewport when no active pollution is found", async () => {
    const reference = { latitude: 45.764, longitude: 4.8357 };
    const result = await resolveInitialMapViewport({
      reference,
      fetchActions: async () => ({ items: [] }),
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
        nextViewport: resultViewport(),
      }),
    ).toBe(false);
  });
});

function resultViewport() {
  return {
    center: [48.8566, 2.3522] as [number, number],
    zoom: 15,
    bounds: { south: 48.8, west: 2.2, north: 48.9, east: 2.4 },
  };
}
