import type { ActionRouteVersionCalculation } from "./route-active-version";
import {
  plannerWeatherOperationalAssessment,
  type PlannerWeatherContext,
} from "@/lib/weather/planner-weather";

export type RouteRefreshReason =
  | "participants_changed"
  | "newer_route_data"
  | "group_count_changed"
  | "weather_budget_mismatch";

export type RouteFreshnessSignal = {
  status: "current" | "newer" | "unknown";
  latestSourceAt: string | null;
};

export type RouteWeatherRefreshSignal = {
  status: "unchanged" | "degraded" | "unknown";
  message: string | null;
};

export type RouteRefreshSignals = {
  activeAppliedAt: string;
  participants: {
    used: number;
    confirmed: number | null;
  };
  groupCount: number;
  freshness: RouteFreshnessSignal;
  weather: RouteWeatherRefreshSignal;
  recommended: boolean;
  reasons: RouteRefreshReason[];
};

export function assessRouteWeatherRefreshSignal(input: {
  activeWeather: PlannerWeatherContext | null | undefined;
  currentWeather?: PlannerWeatherContext | null;
  operationalMinutes: number | null;
}): RouteWeatherRefreshSignal {
  const context = input.currentWeather ?? input.activeWeather;
  const assessment = plannerWeatherOperationalAssessment(context);
  if (!assessment || input.operationalMinutes === null) {
    return { status: "unknown", message: null };
  }

  if (
    assessment.operationalLimitMinutes !== null &&
    input.operationalMinutes > assessment.operationalLimitMinutes
  ) {
    return {
      status: "degraded",
      message: "Les conditions prévues rendent le parcours actuel probablement trop long.",
    };
  }

  return { status: "unchanged", message: null };
}

export function buildRouteRefreshSignals(input: {
  activeAppliedAt: string;
  calculation: ActionRouteVersionCalculation;
  confirmedParticipants: number | null;
  freshness: RouteFreshnessSignal;
  weather?: RouteWeatherRefreshSignal;
}): RouteRefreshSignals {
  const reasons: RouteRefreshReason[] = [];
  if (
    input.confirmedParticipants !== null &&
    input.confirmedParticipants !== input.calculation.parameters.volunteers
  ) {
    reasons.push("participants_changed");
  }
  if (input.freshness.status === "newer") {
    reasons.push("newer_route_data");
  }
  if (input.weather?.status === "degraded") {
    reasons.push("weather_budget_mismatch");
  }

  return {
    activeAppliedAt: input.activeAppliedAt,
    participants: {
      used: input.calculation.parameters.volunteers,
      confirmed: input.confirmedParticipants,
    },
    groupCount: input.calculation.parameters.groupCount,
    freshness: input.freshness,
    weather: input.weather ?? { status: "unknown", message: null },
    recommended: reasons.length > 0,
    reasons,
  };
}

export function addRouteRefreshGroupReason(
  signals: RouteRefreshSignals,
  groupCount: number,
): RouteRefreshSignals {
  const reasons: RouteRefreshReason[] = signals.reasons.filter(
    (reason): reason is Exclude<RouteRefreshReason, "group_count_changed"> =>
      reason !== "group_count_changed",
  );
  if (groupCount !== signals.groupCount) reasons.push("group_count_changed");
  return {
    ...signals,
    recommended: reasons.length > 0,
    reasons,
  };
}
