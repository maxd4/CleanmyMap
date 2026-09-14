import { describe, expect, it } from "vitest";
import {
  ROUTE_CLEANUP_DURATION_CONTRACT_VERSION,
  ROUTE_CALIBRATION_CONTEXT_VERSION,
  type RouteCalibrationContext,
} from "./route-calibration";
import {
  ROUTE_ORGANIZATION_MARGIN_MINUTES,
  ROUTE_OPERATIONAL_BUDGET_CONTRACT_VERSION,
  buildRouteOperationalBudget,
  isRouteOperationalBudget,
} from "./route-operational-budget";

function context(): RouteCalibrationContext {
  return {
    version: ROUTE_CALIBRATION_CONTEXT_VERSION,
    generatedAt: "2026-09-12T00:00:00.000Z",
    routeEngineVersion: "route-planner-v2",
    cleanupWorkloadVersion: "route-cleanup-workload-v1",
    volunteersExpected: 4,
    groupCount: 1,
    candidates: [],
  };
}

describe("route operational budget contract", () => {
  it("keeps service, reserve, total and compliance null without a calibrated artifact", () => {
    const budget = buildRouteOperationalBudget({
      travelMinutes: 24,
      budgetMinutes: 60,
      calibrationContext: context(),
    });

    expect(budget).toMatchObject({
      contractVersion: ROUTE_OPERATIONAL_BUDGET_CONTRACT_VERSION,
      travelMinutes: 24,
      actionMinutes: null,
      eventBudgetMinutes: 60,
      actionBudgetMinutes: 45,
      organizationMarginMinutes: ROUTE_ORGANIZATION_MARGIN_MINUTES,
      serviceMinutes: null,
      uncertaintyReserveMinutes: null,
      totalMinutes: null,
      withinBudget: null,
      calibrationStatus: "data_insufficient",
    });
  });

  it("composes the calibrated contract only from the injected duration estimator", () => {
    const budget = buildRouteOperationalBudget({
      travelMinutes: 24,
      budgetMinutes: 60,
      calibrationContext: context(),
      durationDependency: {
        estimateDuration: ({ context: receivedContext }) => ({
          contractVersion: ROUTE_CLEANUP_DURATION_CONTRACT_VERSION,
          minutes: receivedContext.volunteersExpected === 4 ? 18 : null,
          uncertaintyMinutes: receivedContext.volunteersExpected === 4 ? 6 : null,
          modelVersion: "fixture-calibrated-v1",
          calibrationStatus: "calibrated",
          reason: "fixture",
          provenance: {
            source: "route-calibration",
            contextVersion: receivedContext.version,
            artifactVersion: "fixture-artifact-v1",
          },
        }),
      },
    });

    expect(budget).toMatchObject({
      contractVersion: ROUTE_OPERATIONAL_BUDGET_CONTRACT_VERSION,
      travelMinutes: 24,
      actionMinutes: 18,
      eventBudgetMinutes: 60,
      actionBudgetMinutes: 45,
      organizationMarginMinutes: ROUTE_ORGANIZATION_MARGIN_MINUTES,
      serviceMinutes: 18,
      uncertaintyReserveMinutes: 6,
      totalMinutes: 33,
      withinBudget: true,
      calibrationStatus: "calibrated",
      durationModelVersion: "fixture-calibrated-v1",
      durationProvenance: {
        artifactVersion: "fixture-artifact-v1",
      },
    });
  });

  it("keeps the fixed-margin total when model uncertainty is unavailable", () => {
    const budget = buildRouteOperationalBudget({
      travelMinutes: 24,
      budgetMinutes: 60,
      calibrationContext: context(),
      durationDependency: {
        estimateDuration: () => ({
          contractVersion: ROUTE_CLEANUP_DURATION_CONTRACT_VERSION,
          minutes: 18,
          uncertaintyMinutes: null,
          modelVersion: "fixture-partial-v1",
          calibrationStatus: "data_insufficient",
          reason: "missing_uncertainty",
          provenance: {
            source: "route-calibration",
            contextVersion: ROUTE_CALIBRATION_CONTEXT_VERSION,
            artifactVersion: "fixture-partial-v1",
          },
        }),
      },
    });

    expect(budget.serviceMinutes).toBe(18);
    expect(budget.uncertaintyReserveMinutes).toBeNull();
    expect(budget.totalMinutes).toBe(33);
    expect(budget.withinBudget).toBe(true);
    expect(budget.calibrationStatus).toBe("data_insufficient");
  });

  it("counts the fixed organization margin once and never adds model uncertainty", () => {
    const budget = buildRouteOperationalBudget({
      travelMinutes: 24,
      budgetMinutes: 60,
      calibrationContext: context(),
      durationDependency: {
        estimateDuration: () => ({
          contractVersion: ROUTE_CLEANUP_DURATION_CONTRACT_VERSION,
          minutes: 45,
          uncertaintyMinutes: 30,
          modelVersion: "fixture-action-duration-v1",
          calibrationStatus: "calibrated",
          reason: "fixture",
          provenance: {
            source: "route-calibration",
            contextVersion: ROUTE_CALIBRATION_CONTEXT_VERSION,
            artifactVersion: "fixture-artifact-v1",
          },
        }),
      },
    });

    expect(budget.actionBudgetMinutes).toBe(45);
    expect(budget.actionMinutes).toBe(45);
    expect(budget.organizationMarginMinutes).toBe(15);
    expect(budget.totalMinutes).toBe(60);
    expect(budget.uncertaintyReserveMinutes).toBe(30);
    expect(budget.withinBudget).toBe(true);
  });

  it("validates the persisted v2 budget contract instead of accepting any object", () => {
    const budget = buildRouteOperationalBudget({
      travelMinutes: 24,
      budgetMinutes: 60,
      calibrationContext: context(),
    });

    expect(isRouteOperationalBudget(budget)).toBe(true);
    expect(isRouteOperationalBudget({
      ...budget,
      actionMinutes: { value: 18 },
    })).toBe(false);
    expect(isRouteOperationalBudget({
      ...budget,
      contractVersion: "route-operational-budget-v1",
    })).toBe(false);
  });
});
