import { describe, expect, it } from "vitest";
import {
  createDefaultRouteTerritorialGuidedMode,
  isRouteGuidedBudget,
  MAX_ROUTE_GUIDED_GROUP_LABEL_LENGTH,
  MAX_ROUTE_GUIDED_WAYPOINT_ID_LENGTH,
  MAX_ROUTE_GUIDED_WAYPOINT_LABEL_LENGTH,
  routeGuidedBudgetForMode,
  routeTerritorialGuidedModeValidationError,
  ROUTE_TERRITORIAL_GUIDED_LEGACY_VERSION,
} from "./route-planning-mode";
import { haversineDistanceKm } from "@/lib/geo/geodesic-distance";

function assertBudgetArithmetic(budget: ReturnType<typeof routeGuidedBudgetForMode>) {
  if (!budget) throw new Error("Le budget guidé est absent.");
  expect(budget.totalMinutes).toBe(
    budget.organizationMarginMinutes +
      budget.minimumCollectionMinutes +
      budget.travelMaxMinutes,
  );
  expect(isRouteGuidedBudget(budget)).toBe(true);
}

describe("guided planning budgets", () => {
  it.each([
    [1, 1, [1]],
    [3, 2, [2, 1]],
    [7, 3, [3, 2, 2]],
    [10, 2, [5, 5]],
  ] as const)("distributes %i volunteers across %i groups without empty or fractional groups", (volunteers, groupCount, expectedCounts) => {
    const mode = createDefaultRouteTerritorialGuidedMode(volunteers, groupCount);

    expect(mode.groups.map(({ volunteerCount }) => volunteerCount)).toEqual(expectedCounts);
    expect(mode.groups.reduce((total, group) => total + (group.volunteerCount ?? 0), 0)).toBe(volunteers);
    expect(routeTerritorialGuidedModeValidationError(mode)).toBeNull();
  });

  it("preserves a single volunteer instead of replacing it with the historical default", () => {
    const mode = createDefaultRouteTerritorialGuidedMode(1, 2);

    expect(mode.groups).toHaveLength(1);
    expect(mode.groups[0]?.volunteerCount).toBe(1);
  });

  it("reports duplicate waypoint ids and over-limit staffing before submission", () => {
    const mode = createDefaultRouteTerritorialGuidedMode(10, 2);
    const duplicateId = mode.groups[0]!.waypoints[0]!.id;
    const duplicateMode = {
      ...mode,
      groups: mode.groups.map((group, index) => ({
        ...group,
        volunteerCount: group.volunteerCount,
        waypoints: group.waypoints.map((waypoint) => ({
          ...waypoint,
          ...(index === 1 ? { id: duplicateId } : {}),
        })),
      })),
    };

    expect(routeTerritorialGuidedModeValidationError(duplicateMode)).toContain("uniques");

    const overLimitMode = {
      ...mode,
      groups: mode.groups.map((group) => ({ ...group, volunteerCount: 100 })),
    };
    expect(routeTerritorialGuidedModeValidationError(overLimitMode)).toContain("total");
  });

  it("rejects a waypoint outside its sector and identifies the offending passage", () => {
    const mode = createDefaultRouteTerritorialGuidedMode(10, 2);
    const outsideMode = {
      ...mode,
      groups: mode.groups.map((group, index) => index === 0
        ? { ...group, sector: { ...group.sector, radiusKm: 0.01 } }
        : group),
    };

    expect(routeTerritorialGuidedModeValidationError(outsideMode)).toBe(
      "Le passage « Passage 1.1 » (n°1) du groupe « Groupe 1 » est hors de son secteur.",
    );
  });

  it("accepts a waypoint exactly on the sector boundary and remains parseable by the API schema", async () => {
    const mode = createDefaultRouteTerritorialGuidedMode(10, 2);
    const firstGroup = mode.groups[0]!;
    const firstWaypoint = firstGroup.waypoints[0]!;
    const boundaryMode = {
      ...mode,
      groups: mode.groups.map((group, index) => index === 0
        ? {
            ...group,
            sector: {
              ...group.sector,
              radiusKm: haversineDistanceKm(
                [group.sector.center.latitude, group.sector.center.longitude],
                [firstWaypoint.latitude, firstWaypoint.longitude],
              ),
            },
          }
        : group),
    };

    expect(routeTerritorialGuidedModeValidationError(boundaryMode)).toBeNull();
    const { parseRouteRecommendationRequest } = await import("@/app/api/route/recommend/route.schema");
    expect(parseRouteRecommendationRequest({
      volunteers: 10,
      groupCount: 2,
      planningMode: boundaryMode,
    }).success).toBe(true);
  });

  it("invalidates a passage when the sector is recentered", () => {
    const mode = createDefaultRouteTerritorialGuidedMode(10, 2);
    const recenteredMode = {
      ...mode,
      groups: mode.groups.map((group, index) => index === 0
        ? {
            ...group,
            sector: {
              ...group.sector,
              center: {
                latitude: group.sector.center.latitude + 0.02,
                longitude: group.sector.center.longitude,
              },
              radiusKm: 0.1,
            },
          }
        : group),
    };

    expect(routeTerritorialGuidedModeValidationError(recenteredMode)).toContain("hors de son secteur");
  });

  it("enforces API field lengths and non-empty identifiers and labels", () => {
    const mode = createDefaultRouteTerritorialGuidedMode(10, 2);
    const validLengthsMode = {
      ...mode,
      groups: mode.groups.map((group, index) => index === 0
        ? {
            ...group,
            label: "g".repeat(MAX_ROUTE_GUIDED_GROUP_LABEL_LENGTH),
            waypoints: group.waypoints.map((waypoint) => ({
              ...waypoint,
              id: "i".repeat(MAX_ROUTE_GUIDED_WAYPOINT_ID_LENGTH),
              label: "l".repeat(MAX_ROUTE_GUIDED_WAYPOINT_LABEL_LENGTH),
            })),
          }
        : group),
    };

    expect(routeTerritorialGuidedModeValidationError(validLengthsMode)).toBeNull();
    expect(routeTerritorialGuidedModeValidationError({
      ...validLengthsMode,
      groups: validLengthsMode.groups.map((group, index) => index === 0
        ? { ...group, label: "g".repeat(MAX_ROUTE_GUIDED_GROUP_LABEL_LENGTH + 1) }
        : group),
    })).toContain("80");
    expect(routeTerritorialGuidedModeValidationError({
      ...validLengthsMode,
      groups: validLengthsMode.groups.map((group, index) => index === 0
        ? { ...group, waypoints: group.waypoints.map((waypoint) => ({
            ...waypoint,
            id: "i".repeat(MAX_ROUTE_GUIDED_WAYPOINT_ID_LENGTH + 1),
          })) }
        : group),
    })).toContain("80");
    expect(routeTerritorialGuidedModeValidationError({
      ...validLengthsMode,
      groups: validLengthsMode.groups.map((group, index) => index === 0
        ? { ...group, waypoints: group.waypoints.map((waypoint) => ({
            ...waypoint,
            label: "l".repeat(MAX_ROUTE_GUIDED_WAYPOINT_LABEL_LENGTH + 1),
          })) }
        : group),
    })).toContain("120");
    expect(routeTerritorialGuidedModeValidationError({
      ...validLengthsMode,
      groups: validLengthsMode.groups.map((group, index) => index === 0
        ? { ...group, waypoints: group.waypoints.map((waypoint) => ({ ...waypoint, id: "  " })) }
        : group),
    })).toContain("identifiant non vide");
    expect(routeTerritorialGuidedModeValidationError({
      ...validLengthsMode,
      groups: validLengthsMode.groups.map((group, index) => index === 0
        ? { ...group, waypoints: group.waypoints.map((waypoint) => ({ ...waypoint, label: "  " })) }
        : group),
    })).toContain("nom et des coordonnées valides");
  });

  it("keeps the legacy v1 budget entirely available for historical travel", () => {
    const current = createDefaultRouteTerritorialGuidedMode();
    const legacy = {
      type: "territorial-guided" as const,
      version: ROUTE_TERRITORIAL_GUIDED_LEGACY_VERSION,
      groups: current.groups,
    };
    const budget = routeGuidedBudgetForMode(legacy, 60);

    expect(budget).toEqual({
      totalMinutes: 60,
      organizationMarginMinutes: 0,
      minimumCollectionMinutes: 0,
      travelMaxMinutes: 60,
    });
    assertBudgetArithmetic(budget);
  });

  it("preserves the explicit v2 allocation", () => {
    const mode = createDefaultRouteTerritorialGuidedMode();
    const budget = routeGuidedBudgetForMode(mode, 60);

    expect(budget).toEqual(mode.budget);
    assertBudgetArithmetic(budget);
  });
});
