import {
  estimateRouteCleanupDuration,
  type RouteCalibrationContext,
  type RouteCleanupDurationEstimate,
  type RouteCalibrationStatus,
} from "./route-calibration";

export const ROUTE_OPERATIONAL_BUDGET_CONTRACT_VERSION =
  "route-operational-budget-v1" as const;

export type RouteOperationalBudget = {
  contractVersion: typeof ROUTE_OPERATIONAL_BUDGET_CONTRACT_VERSION;
  travelMinutes: number | null;
  serviceMinutes: number | null;
  uncertaintyReserveMinutes: number | null;
  totalMinutes: number | null;
  withinBudget: boolean | null;
  calibrationStatus: RouteCalibrationStatus;
  durationModelVersion: string;
  durationReason: string;
  durationProvenance: RouteCleanupDurationEstimate["provenance"];
};

export type RouteOperationalBudgetEstimator = (input: {
  context: RouteCalibrationContext;
}) => RouteCleanupDurationEstimate;

export type RouteOperationalBudgetDependency = {
  estimateDuration: RouteOperationalBudgetEstimator;
  generatedAt?: string;
};

const defaultEstimateDuration: RouteOperationalBudgetEstimator = ({ context }) =>
  estimateRouteCleanupDuration({ context });

export function buildRouteOperationalBudget(input: {
  travelMinutes: number | null;
  calibrationContext?: RouteCalibrationContext | null;
  budgetMinutes?: number | null;
  durationDependency?: RouteOperationalBudgetDependency | null;
}): RouteOperationalBudget {
  const travelMinutes = finiteNonNegative(input.travelMinutes)
    ? round(input.travelMinutes)
    : null;
  const durationEstimate = input.calibrationContext
    ? (input.durationDependency?.estimateDuration ?? defaultEstimateDuration)({
        context: input.calibrationContext,
      })
    : unavailableDurationEstimate();
  const serviceMinutes = finiteNonNegative(durationEstimate.minutes)
    ? round(durationEstimate.minutes)
    : null;
  const uncertaintyReserveMinutes = finiteNonNegative(
    durationEstimate.uncertaintyMinutes,
  )
    ? round(durationEstimate.uncertaintyMinutes)
    : null;
  const totalMinutes =
    travelMinutes !== null &&
    serviceMinutes !== null &&
    uncertaintyReserveMinutes !== null
      ? round(travelMinutes + serviceMinutes + uncertaintyReserveMinutes)
      : null;

  return {
    contractVersion: ROUTE_OPERATIONAL_BUDGET_CONTRACT_VERSION,
    travelMinutes,
    serviceMinutes,
    uncertaintyReserveMinutes,
    totalMinutes,
    withinBudget:
      totalMinutes === null || input.budgetMinutes === null || input.budgetMinutes === undefined
        ? null
        : totalMinutes <= Math.max(0, input.budgetMinutes),
    calibrationStatus:
      totalMinutes === null ? "data_insufficient" : durationEstimate.calibrationStatus,
    durationModelVersion: durationEstimate.modelVersion,
    durationReason: durationEstimate.reason,
    durationProvenance: durationEstimate.provenance,
  };
}

export function isOperationalBudgetAvailable(
  budget: RouteOperationalBudget,
): budget is RouteOperationalBudget & {
  travelMinutes: number;
  serviceMinutes: number;
  uncertaintyReserveMinutes: number;
  totalMinutes: number;
  withinBudget: boolean;
} {
  return budget.totalMinutes !== null && budget.withinBudget !== null;
}

function unavailableDurationEstimate(): RouteCleanupDurationEstimate {
  return estimateRouteCleanupDuration({ context: null });
}

function finiteNonNegative(value: number | null): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

function round(value: number): number {
  return Number(value.toFixed(2));
}
