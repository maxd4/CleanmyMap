import {
  ROUTE_CALIBRATION_CONTEXT_LEGACY_VERSION,
  ROUTE_CALIBRATION_CONTEXT_VERIFIED_VERSION,
  ROUTE_CALIBRATION_CONTEXT_VERSION,
  ROUTE_CALIBRATION_STATUSES,
} from "./route-calibration-contract";
import type { RouteOperationalBudget } from "./route-operational-budget";

export const ROUTE_OPERATIONAL_BUDGET_CONTRACT_VERSION =
  "route-operational-budget-v3" as const;
export const ROUTE_ORGANIZATION_MARGIN_MINUTES = 15 as const;

const ROUTE_CALIBRATION_CONTEXT_VERSIONS = [
  ROUTE_CALIBRATION_CONTEXT_LEGACY_VERSION,
  ROUTE_CALIBRATION_CONTEXT_VERSION,
  ROUTE_CALIBRATION_CONTEXT_VERIFIED_VERSION,
] as const;

export function isRouteOperationalBudget(
  value: unknown,
): value is RouteOperationalBudget {
  if (!value || typeof value !== "object") return false;
  const budget = value as Partial<RouteOperationalBudget>;
  return (
    budget.contractVersion === ROUTE_OPERATIONAL_BUDGET_CONTRACT_VERSION &&
    isNullableNonNegative(budget.travelMinutes) &&
    isNullableNonNegative(budget.actionMinutes) &&
    isNullableNonNegative(budget.eventBudgetMinutes) &&
    isNullableNonNegative(budget.actionBudgetMinutes) &&
    budget.organizationMarginMinutes === ROUTE_ORGANIZATION_MARGIN_MINUTES &&
    isNullableNonNegative(budget.serviceMinutes) &&
    isNullableNonNegative(budget.uncertaintyReserveMinutes) &&
    isNullableNonNegative(budget.totalMinutes) &&
    (budget.withinBudget === null || typeof budget.withinBudget === "boolean") &&
    isCalibrationStatus(budget.calibrationStatus) &&
    isNonEmptyString(budget.durationModelVersion) &&
    isNonEmptyString(budget.durationReason) &&
    isDurationProvenance(budget.durationProvenance) &&
    isWeatherBudgetEffect(budget.weather) &&
    budget.serviceMinutes === budget.actionMinutes &&
    budget.actionBudgetMinutes === expectedActionBudgetMinutes(budget.eventBudgetMinutes) &&
    budget.totalMinutes === expectedTotalMinutes(budget.actionMinutes) &&
    budget.withinBudget === expectedWithinBudget(
      budget.actionMinutes,
      budget.actionBudgetMinutes,
    )
  );
}

function isWeatherBudgetEffect(value: unknown): boolean {
  if (!value || typeof value !== "object") return false;
  const weather = value as Partial<RouteOperationalBudget["weather"]>;
  return (
    (weather.status === "not_provided" ||
      weather.status === "nominal" ||
      weather.status === "limited" ||
      weather.status === "fallback") &&
    (weather.riskLevel === null ||
      weather.riskLevel === "vert" ||
      weather.riskLevel === "orange" ||
      weather.riskLevel === "rouge") &&
    Array.isArray(weather.reasons) &&
    weather.reasons.every((reason) => typeof reason === "string") &&
    (weather.ruleVersion === null || typeof weather.ruleVersion === "string") &&
    (weather.ruleSource === null || typeof weather.ruleSource === "string") &&
    isNullableNonNegative(weather.operationalLimitMinutes) &&
    isNullableNonNegative(weather.eventBudgetBeforeWeatherMinutes) &&
    isNullableNonNegative(weather.weatherLimitedEventMinutes) &&
    weather.weatherLimitedEventMinutes === expectedWeatherLimitedEventMinutes(weather) &&
    (weather.status !== "limited" || weather.operationalLimitMinutes !== null)
  );
}

function expectedWeatherLimitedEventMinutes(
  weather: Partial<RouteOperationalBudget["weather"]>,
): number | null {
  if (weather.eventBudgetBeforeWeatherMinutes === null ||
    weather.eventBudgetBeforeWeatherMinutes === undefined) return null;
  if (weather.operationalLimitMinutes === null ||
    weather.operationalLimitMinutes === undefined) {
    return weather.eventBudgetBeforeWeatherMinutes;
  }
  return round(Math.min(
    weather.eventBudgetBeforeWeatherMinutes,
    weather.operationalLimitMinutes,
  ));
}

function isCalibrationStatus(value: unknown): boolean {
  return typeof value === "string" &&
    (ROUTE_CALIBRATION_STATUSES as readonly string[]).includes(value);
}

function isDurationProvenance(value: unknown): boolean {
  if (!value || typeof value !== "object") return false;
  const provenance = value as Partial<RouteOperationalBudget["durationProvenance"]>;
  return (
    provenance.source === "route-calibration" &&
    (provenance.contextVersion === null ||
      (typeof provenance.contextVersion === "string" &&
        (ROUTE_CALIBRATION_CONTEXT_VERSIONS as readonly string[]).includes(
          provenance.contextVersion,
        ))) &&
    (provenance.artifactVersion === null ||
      isNonEmptyString(provenance.artifactVersion))
  );
}

function isNullableNonNegative(value: unknown): value is number | null {
  return value === null || (
    typeof value === "number" &&
    Number.isFinite(value) &&
    value >= 0
  );
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

function expectedActionBudgetMinutes(value: number | null | undefined): number | null {
  return value === null || value === undefined
    ? null
    : round(Math.max(0, value - ROUTE_ORGANIZATION_MARGIN_MINUTES));
}

function expectedTotalMinutes(value: number | null | undefined): number | null {
  return value === null || value === undefined
    ? null
    : round(value + ROUTE_ORGANIZATION_MARGIN_MINUTES);
}

function expectedWithinBudget(
  actionMinutes: number | null | undefined,
  actionBudgetMinutes: number | null | undefined,
): boolean | null {
  return actionMinutes === null ||
    actionMinutes === undefined ||
    actionBudgetMinutes === null ||
    actionBudgetMinutes === undefined
    ? null
    : actionMinutes <= actionBudgetMinutes;
}

function round(value: number): number {
  return Number(value.toFixed(2));
}
