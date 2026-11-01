import { describe, expect, it } from "vitest";
import {
  createDefaultRouteTerritorialGuidedMode,
  isRouteGuidedBudget,
  routeGuidedBudgetForMode,
  routeTerritorialGuidedModeValidationError,
  ROUTE_TERRITORIAL_GUIDED_LEGACY_VERSION,
} from "./route-planning-mode";

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
