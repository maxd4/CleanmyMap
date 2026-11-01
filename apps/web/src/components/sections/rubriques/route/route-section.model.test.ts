import { describe, expect, it } from "vitest";
import type { RouteGeometry } from "@/lib/route/route-contract";
import { createDefaultRouteTerritorialGuidedMode } from "@/lib/route/route-planning-mode";
import type { RouteResponse } from "./route-types";
import { deriveRouteSectionState, EMPTY_ROUTE_GEOMETRY } from "./route-section.model";

function routeGeometry(mode: "network" | "fallback"): RouteGeometry {
  const origin: [number, number] = [48.8566, 2.3522];
  const waypoint: [number, number] = [48.857, 2.3522];
  const leg = { fromStopIndex: 0, toStopIndex: 1, distanceKm: 0.5, estimatedMinutes: 5 };
  return {
    ...EMPTY_ROUTE_GEOMETRY,
    origin,
    returnLeg: { ...leg, fromStopIndex: 1, toStopIndex: 2 },
    coordinates: [origin, waypoint, origin],
    distanceKm: 1,
    durationMinutes: 10,
    legs: [leg, { ...leg, fromStopIndex: 1, toStopIndex: 2 }],
    provider: mode === "network" ? "osrm" : "none",
    profile: mode === "network" ? "foot" : null,
    mode,
    estimated: mode === "fallback",
  };
}

function guidedResponse(
  geometries: RouteGeometry[],
  overrides: { status?: RouteResponse["status"]; dataStatus?: RouteResponse["dataStatus"] } = {},
): RouteResponse {
  const groupCount = geometries.length;
  return {
    status: overrides.status ?? "empty",
    dataStatus: overrides.dataStatus ?? "empty",
    planningMode: createDefaultRouteTerritorialGuidedMode(10, Math.max(1, groupCount)),
    groupCount,
    groupRoutes: geometries.map((geometry, index) => ({
      groupIndex: index + 1,
      routeGeometry: geometry,
      stops: [],
    })),
    routeGeometry: EMPTY_ROUTE_GEOMETRY,
  } as unknown as RouteResponse;
}

describe("route section result derivations", () => {
  it("selects a group's stops and geometry without changing the empty fallback", () => {
    const groupGeometry = { ...EMPTY_ROUTE_GEOMETRY, mode: "network" as const, distanceKm: 2 };
    const data = {
      status: "degraded",
      dataStatus: "unavailable",
      routeGeometry: EMPTY_ROUTE_GEOMETRY,
      groupRoutes: [{ groupIndex: 2, stops: [{ id: "group-stop" }], routeGeometry: groupGeometry }],
      eventBudgetMinutes: 45,
      actionBudgetMinutes: 30,
      organizationMarginMinutes: 15,
    } as unknown as RouteResponse;

    const selected = deriveRouteSectionState({
      data,
      picks: [{ id: "all-stop" }] as RouteResponse["stops"],
      selectedGroupIndex: 2,
      fr: true,
      serviceMinutes: 18,
      operationalTotalMinutes: 33,
    });
    const empty = deriveRouteSectionState({
      data: undefined,
      picks: [],
      selectedGroupIndex: null,
      fr: true,
      serviceMinutes: null,
      operationalTotalMinutes: null,
    });

    expect(selected.visibleStops).toEqual([{ id: "group-stop" }]);
    expect(selected.visibleGeometry).toBe(groupGeometry);
    expect(selected.eventBudgetMinutes).toBe(45);
    expect(selected.dataStatusMessage).toContain("source de signalements est indisponible");
    expect(empty.visibleGeometry).toBe(EMPTY_ROUTE_GEOMETRY);
    expect(empty.dataStatusMessage).toBeNull();
  });

  it("distinguishes absent pollution targets from two usable network-planned guided loops", () => {
    const data = guidedResponse([routeGeometry("network"), routeGeometry("network")]);

    const state = deriveRouteSectionState({
      data,
      picks: [],
      selectedGroupIndex: null,
      fr: true,
      serviceMinutes: null,
      operationalTotalMinutes: null,
    });

    expect(data.dataStatus).toBe("empty");
    expect(state.dataStatusMessage).toBe(
      "Aucune cible de pollution admissible n'est disponible, mais les itinéraires guidés planifiés par le réseau restent disponibles.",
    );
  });

  it("identifies an estimated guided fallback without presenting it as network routing", () => {
    const data = guidedResponse([routeGeometry("fallback")]);

    const state = deriveRouteSectionState({
      data,
      picks: [],
      selectedGroupIndex: null,
      fr: true,
      serviceMinutes: null,
      operationalTotalMinutes: null,
    });

    expect(state.dataStatusMessage).toContain("Aucune cible de pollution admissible");
    expect(state.dataStatusMessage).toContain("tracé estimé faute de routage réseau");
    expect(state.dataStatusMessage).not.toContain("par le réseau restent disponibles");
  });

  it("keeps source unavailability distinct from an empty but available signal layer", () => {
    const data = guidedResponse([routeGeometry("network"), routeGeometry("network")], {
      status: "degraded",
      dataStatus: "unavailable",
    });

    const state = deriveRouteSectionState({
      data,
      picks: [],
      selectedGroupIndex: null,
      fr: true,
      serviceMinutes: null,
      operationalTotalMinutes: null,
    });

    expect(state.dataStatusMessage).toBe(
      "Recommandation dégradée : la source de signalements est indisponible.",
    );
  });

  it("keeps the absence message when a guided response has no exploitable route", () => {
    const data = guidedResponse([], { status: "empty", dataStatus: "empty" });

    const state = deriveRouteSectionState({
      data,
      picks: [],
      selectedGroupIndex: null,
      fr: true,
      serviceMinutes: null,
      operationalTotalMinutes: null,
    });

    expect(state.dataStatusMessage).toBe(
      "Aucune donnée géolocalisée exploitable n'est disponible pour cette recommandation.",
    );
  });
});
