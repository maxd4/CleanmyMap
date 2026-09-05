import type {
  RouteTraceExclusionReason,
  RouteTraceSelectedStop,
  RouteRecommendationTrace,
} from "@/lib/route/route-trace";
import type { RouteResponse } from "../route-types";

export type RouteExplanationData = RouteResponse & {
  planningMode:
    | { type: "free" }
    | { type: "event-centered"; eventId: string };
  trace: RouteRecommendationTrace;
};

export type RouteExplanationProps = {
  data: RouteExplanationData;
  fr: boolean;
};

export const exclusionLabels: Record<RouteTraceExclusionReason, string> = {
  not_admissible: "non admissible",
  unsafe_trained_only: "réservé à un bénévole formé",
  unsafe_no_pickup: "ramassage non autorisé",
  unsafe_missing_categories: "catégories de déchets absentes",
  unsafe_unknown_categories: "catégories de déchets inconnues",
  travel_budget: "hors budget de déplacement",
  source_unavailable: "source indisponible",
};

export function formatNumber(value: number, maximumFractionDigits = 2): string {
  return new Intl.NumberFormat("fr-FR", {
    maximumFractionDigits,
  }).format(value);
}

export function formatDistance(value: number | null): string {
  return value === null ? "Inconnue" : `${formatNumber(value)} km`;
}

export function formatDuration(value: number | null): string {
  return value === null ? "Inconnue" : `${formatNumber(value)} min`;
}

export function riskLabel(value: number): string {
  return `${formatNumber(value, 1)}/100`;
}

export type RouteEventTemporalStatus = "past" | "today" | "future";

export function routeEventStatusLabel(
  status: RouteEventTemporalStatus,
  fr = true,
): string {
  if (status === "past") return fr ? "Passé" : "Past";
  if (status === "today") return fr ? "Aujourd’hui" : "Today";
  return fr ? "À venir" : "Upcoming";
}

export function stopLabel(
  stopId: string,
  data: RouteExplanationData,
  originLabel: string,
): string {
  if (stopId === "origin") return originLabel;
  return data.stops.find((stop) => stop.id === stopId)?.label ?? stopId;
}

export type PredictedRouteEvidence = Extract<
  NonNullable<RouteTraceSelectedStop["evidence"]>,
  { family: "predicted" }
>;
