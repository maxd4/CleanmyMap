import { describe, expect, it } from "vitest";
import { parseRouteRecommendationRequest } from "@/app/api/route/recommend/route.schema";
import {
  buildBoundedRouteStartZone,
  isRouteStartSelection,
  routeStartZoneContains,
  selectRouteOriginWithinZone,
} from "./route-start-location";
import type { RoutePlannerCandidate } from "./route-planner";

function candidate(id: string, latitude: number, longitude: number, score: number): RoutePlannerCandidate {
  return {
    id,
    label: id,
    latitude,
    longitude,
    score,
    reason: "fixture",
    family: "predicted",
    volunteerSafety: { status: "safe" },
  } as RoutePlannerCandidate;
}

describe("route start location", () => {
  it("accepts complete precise and confirmed zone selections", () => {
    const precise = {
      mode: "precise" as const,
      label: "Panthéon",
      origin: { latitude: 48.8462, longitude: 2.3464, source: "address" as const },
    };
    const zone = {
      mode: "zone" as const,
      label: "Paris 5e",
      zone: {
        ...buildBoundedRouteStartZone("Paris 5e", { latitude: 48.844, longitude: 2.35 }, 2),
        confirmed: true,
      },
    };

    expect(isRouteStartSelection(precise)).toBe(true);
    expect(isRouteStartSelection(zone)).toBe(true);
    expect(isRouteStartSelection({
      ...precise,
      resolvedOrigin: { latitude: 48.85, longitude: 2.35, source: "planner" },
    })).toBe(true);
  });

  it("rejects incomplete or out-of-contract precise origins", () => {
    const precise = {
      mode: "precise" as const,
      label: "Panthéon",
      origin: { latitude: 48.8462, longitude: 2.3464, source: "address" as const },
    };

    expect(isRouteStartSelection({ ...precise, origin: { latitude: 48.8462, source: "address" } })).toBe(false);
    expect(isRouteStartSelection({ ...precise, origin: { ...precise.origin, longitude: Number.NaN } })).toBe(false);
    expect(isRouteStartSelection({ ...precise, origin: { ...precise.origin, latitude: 91 } })).toBe(false);
    expect(isRouteStartSelection({ ...precise, origin: { ...precise.origin, longitude: -181 } })).toBe(false);
    expect(isRouteStartSelection({ ...precise, origin: { ...precise.origin, source: "planner" } })).toBe(false);
  });

  it("rejects incomplete, incoherent or out-of-contract zones", () => {
    const zone = {
      mode: "zone" as const,
      label: "Paris 5e",
      zone: {
        ...buildBoundedRouteStartZone("Paris 5e", { latitude: 48.844, longitude: 2.35 }, 2),
        confirmed: true,
      },
    };

    expect(isRouteStartSelection({ ...zone, zone: { ...zone.zone, center: undefined } })).toBe(false);
    expect(isRouteStartSelection({ ...zone, zone: { ...zone.zone, bounds: { ...zone.zone.bounds, north: undefined } } })).toBe(false);
    expect(isRouteStartSelection({ ...zone, zone: { ...zone.zone, bounds: { ...zone.zone.bounds, south: 49 } } })).toBe(false);
    expect(isRouteStartSelection({ ...zone, zone: { ...zone.zone, provenance: "imported" } })).toBe(false);
    expect(isRouteStartSelection({ ...zone, zone: { ...zone.zone, source: "planner" } })).toBe(false);
    expect(isRouteStartSelection({ ...zone, zone: { ...zone.zone, confirmed: false } })).toBe(false);
  });

  it("selects a deterministic admissible departure inside the confirmed zone", () => {
    const zone = { ...buildBoundedRouteStartZone("Paris 5e", { latitude: 48.844, longitude: 2.35 }, 2), confirmed: true };
    expect(routeStartZoneContains(zone, { latitude: 48.844, longitude: 2.35 })).toBe(true);
    expect(selectRouteOriginWithinZone(zone, [
      candidate("far-score", 48.845, 2.351, 90),
      candidate("near-score", 48.8441, 2.3501, 70),
    ])).toEqual({ latitude: 48.845, longitude: 2.351, source: "planner" });
  });

  it("returns no invented departure when no admissible network candidate is in the area", () => {
    const zone = { ...buildBoundedRouteStartZone("Lieu-dit", { latitude: 48.844, longitude: 2.35 }, 0.5), confirmed: true };
    expect(selectRouteOriginWithinZone(zone, [candidate("outside", 48.9, 2.35, 100)])).toBeNull();
  });

  it("accepts precise address and GPS departures but rejects invalid coordinates and unconfirmed areas", () => {
    const address = parseRouteRecommendationRequest({
      origin: { latitude: 48.8566, longitude: 2.3522, source: "address" },
      startLocation: { mode: "precise", label: "Panthéon", origin: { latitude: 48.8462, longitude: 2.3464, source: "address" } },
    });
    expect(address.success).toBe(true);

    const gps = parseRouteRecommendationRequest({
      startLocation: { mode: "precise", label: "GPS", origin: { latitude: 48.8462, longitude: 2.3464, source: "gps" } },
    });
    expect(gps.success).toBe(true);

    const invalidGps = parseRouteRecommendationRequest({
      startLocation: { mode: "precise", label: "GPS", origin: { latitude: 95, longitude: 2.3464, source: "gps" } },
    });
    expect(invalidGps.success).toBe(false);

    const unconfirmed = parseRouteRecommendationRequest({
      startLocation: {
        mode: "zone",
        label: "Ville homonyme",
        zone: { ...buildBoundedRouteStartZone("Ville homonyme", { latitude: 48.8, longitude: 2.3 }), confirmed: false },
      },
    });
    expect(unconfirmed.success).toBe(false);
  });
});
