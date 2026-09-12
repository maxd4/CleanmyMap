import { describe, expect, it } from "vitest";
import {
  ROUTE_CLEANUP_DURATION_CONTRACT_VERSION,
  ROUTE_CALIBRATION_CONTEXT_VERSION,
  type RouteCalibrationContext,
} from "./route-calibration";
import {
  ROUTE_OPERATIONAL_BUDGET_CONTRACT_VERSION,
  buildRouteOperationalBudget,
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
      serviceMinutes: 18,
      uncertaintyReserveMinutes: 6,
      totalMinutes: 48,
      withinBudget: true,
      calibrationStatus: "calibrated",
      durationModelVersion: "fixture-calibrated-v1",
      durationProvenance: {
        artifactVersion: "fixture-artifact-v1",
      },
    });
  });

  it("does not manufacture a total when one required component is absent", () => {
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
    expect(budget.totalMinutes).toBeNull();
    expect(budget.withinBudget).toBeNull();
  });
});
