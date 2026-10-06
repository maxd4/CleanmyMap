import { describe, expect, it } from "vitest";
import type { RouteResponse } from "./route-types";
import { deriveRouteSectionState, EMPTY_ROUTE_GEOMETRY } from "./route-section.model";

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
});
