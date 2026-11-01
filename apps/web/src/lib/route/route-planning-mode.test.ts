import { describe, expect, it } from "vitest";
import {
  createDefaultRouteTerritorialGuidedMode,
  isRouteGuidedBudget,
  routeGuidedBudgetForMode,
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
