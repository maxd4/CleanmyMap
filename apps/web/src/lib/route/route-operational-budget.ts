import {
  estimateRouteCleanupDuration,
  type RouteCalibrationContext,
  type RouteCleanupDurationEstimate,
  type RouteCalibrationStatus,
} from "./route-calibration";
import {
  ROUTE_OPERATIONAL_BUDGET_CONTRACT_VERSION,
  ROUTE_ORGANIZATION_MARGIN_MINUTES,
} from "./route-operational-budget-contract";

export {
  ROUTE_OPERATIONAL_BUDGET_CONTRACT_VERSION,
  ROUTE_ORGANIZATION_MARGIN_MINUTES,
  isRouteOperationalBudget,
} from "./route-operational-budget-contract";

export type RouteOperationalBudget = {
  contractVersion: typeof ROUTE_OPERATIONAL_BUDGET_CONTRACT_VERSION;
  travelMinutes: number | null;
  /** Future duration model output: walking + collection + sorting + weighing. */
  actionMinutes: number | null;
  eventBudgetMinutes: number | null;
  actionBudgetMinutes: number | null;
  organizationMarginMinutes: typeof ROUTE_ORGANIZATION_MARGIN_MINUTES;
  /** Legacy read compatibility alias for actionMinutes. */
  serviceMinutes: number | null;
  /** Diagnostic model uncertainty; never added to totalMinutes. */
  uncertaintyReserveMinutes: number | null;
  /** actionMinutes + organizationMarginMinutes. */
  totalMinutes: number | null;
  withinBudget: boolean | null;
  calibrationStatus: RouteCalibrationStatus;
  durationModelVersion: string;
  durationReason: string;
  durationProvenance: RouteCleanupDurationEstimate["provenance"];
};

export type RouteOperationalBudgetEstimator = (input: {
  context: RouteCalibrationContext;
  travelMinutes?: number | null;
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
  /** Existing transport field now carries the total user event slot. */
  budgetMinutes?: number | null;
  durationDependency?: RouteOperationalBudgetDependency | null;
}): RouteOperationalBudget {
  const travelMinutes = finiteNonNegative(input.travelMinutes)
    ? round(input.travelMinutes)
    : null;
  const eventBudgetMinutes = finiteNonNegative(input.budgetMinutes)
    ? round(input.budgetMinutes)
    : null;
  const actionBudgetMinutes = eventBudgetMinutes === null
    ? null
    : Math.max(0, eventBudgetMinutes - ROUTE_ORGANIZATION_MARGIN_MINUTES);
  const durationEstimate = input.calibrationContext
    ? (input.durationDependency?.estimateDuration ?? defaultEstimateDuration)({
        context: input.calibrationContext,
        travelMinutes,
      })
    : unavailableDurationEstimate();
  const actionMinutes = finiteNonNegative(durationEstimate.minutes)
    ? round(durationEstimate.minutes)
    : null;
  const uncertaintyReserveMinutes = finiteNonNegative(
    durationEstimate.uncertaintyMinutes,
  )
    ? round(durationEstimate.uncertaintyMinutes)
    : null;
  const totalMinutes = actionMinutes !== null
      ? round(actionMinutes + ROUTE_ORGANIZATION_MARGIN_MINUTES)
      : null;

  return {
    contractVersion: ROUTE_OPERATIONAL_BUDGET_CONTRACT_VERSION,
    travelMinutes,
    actionMinutes,
    eventBudgetMinutes,
    actionBudgetMinutes,
    organizationMarginMinutes: ROUTE_ORGANIZATION_MARGIN_MINUTES,
    serviceMinutes: actionMinutes,
    uncertaintyReserveMinutes,
    totalMinutes,
    withinBudget:
      actionMinutes === null || actionBudgetMinutes === null
        ? null
        : actionMinutes <= actionBudgetMinutes,
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
  actionMinutes: number;
  eventBudgetMinutes: number;
  actionBudgetMinutes: number;
  serviceMinutes: number;
  totalMinutes: number;
  withinBudget: boolean;
} {
  return budget.actionMinutes !== null &&
    budget.eventBudgetMinutes !== null &&
    budget.actionBudgetMinutes !== null &&
    budget.totalMinutes !== null &&
    budget.withinBudget !== null;
}

function unavailableDurationEstimate(): RouteCleanupDurationEstimate {
  return estimateRouteCleanupDuration({ context: null });
}

function finiteNonNegative(value: number | null | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

function round(value: number): number {
  return Number(value.toFixed(2));
}
