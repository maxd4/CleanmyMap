import { routeDistanceKm } from "./route-planner";
import {
  routeEventAgeDays,
  routeEventTemporalStatus,
  type RouteEventTemporalStatus,
} from "./route-planning-mode";

export const ROUTE_EVENT_CENTERED_RADIUS_KM = 2;
export const ROUTE_EVENT_CENTERED_ANCHOR_WEIGHT = 0.55;
export const ROUTE_EVENT_CENTERED_IMPACT_LIMIT = 24;

export type RouteEventCenteredAnchor = {
  id: string;
  title: string;
  eventDate: string;
  locationLabel: string;
  latitude: number;
  longitude: number;
};

export type RouteEventCenteredCandidateImpact = {
  candidateId: string;
  distanceKm: number;
  proximityFactor: number;
  priorityBefore: number;
  priorityAfter: number;
  scoreContribution: number;
  favored: boolean;
};

export type RouteEventCenteredContext = {
  event: RouteEventCenteredAnchor;
  temporalStatus: RouteEventTemporalStatus;
  ageDays: number | null;
  distanceFromOriginKm: number;
  role: "post_event_anchor" | "today_anchor" | "anticipation_anchor";
  radiusKm: number;
  anchorWeight: number;
  favoredCandidateIds: string[];
  outsideAnchorRadiusCandidateIds: string[];
  selectedCandidateIds: string[];
  candidateImpacts: RouteEventCenteredCandidateImpact[];
};

type ScoredCandidate = {
  id: string;
  latitude: number;
  longitude: number;
  score: number;
  reason: string;
};

function clamp(value: number, min = 0, max = 1): number {
  return Math.min(max, Math.max(min, value));
}

export function buildEventCenteredCandidates<
  T extends ScoredCandidate,
>(
  candidates: readonly T[],
  event: RouteEventCenteredAnchor,
): {
  candidates: Array<T & { eventCenteredInfluence: RouteEventCenteredCandidateImpact }>;
  impacts: RouteEventCenteredCandidateImpact[];
} {
  const scored = candidates.map((candidate) => {
    const distanceKm = routeDistanceKm(candidate, event);
    const proximityFactor = clamp(
      1 - distanceKm / ROUTE_EVENT_CENTERED_RADIUS_KM,
    );
    const priorityAfter =
      candidate.score * (1 - ROUTE_EVENT_CENTERED_ANCHOR_WEIGHT) +
      proximityFactor * 100 * ROUTE_EVENT_CENTERED_ANCHOR_WEIGHT;
    const impact: RouteEventCenteredCandidateImpact = {
      candidateId: candidate.id,
      distanceKm,
      proximityFactor,
      priorityBefore: candidate.score,
      priorityAfter,
      scoreContribution: priorityAfter - candidate.score,
      favored: proximityFactor > 0,
    };

    return {
      ...candidate,
      score: priorityAfter,
      reason:
        `${candidate.reason} Mode événement : distance à l’événement=${distanceKm.toFixed(2)} km, ` +
        `proximité=${proximityFactor.toFixed(3)}, contribution=${impact.scoreContribution.toFixed(2)}.`,
      eventCenteredInfluence: impact,
    };
  });

  scored.sort(
    (left, right) =>
      right.score - left.score ||
      left.eventCenteredInfluence.distanceKm - right.eventCenteredInfluence.distanceKm ||
      left.id.localeCompare(right.id),
  );

  return {
    candidates: scored,
    impacts: scored
      .map(({ eventCenteredInfluence }) => eventCenteredInfluence)
      .sort(
        (left, right) =>
          right.proximityFactor - left.proximityFactor ||
          left.distanceKm - right.distanceKm ||
          left.candidateId.localeCompare(right.candidateId),
      )
      .slice(0, ROUTE_EVENT_CENTERED_IMPACT_LIMIT),
  };
}

export function buildRouteEventCenteredContext(
  event: RouteEventCenteredAnchor,
  origin: { latitude: number; longitude: number },
  impacts: readonly RouteEventCenteredCandidateImpact[],
  selectedCandidateIds: readonly string[],
  now = new Date(),
): RouteEventCenteredContext {
  const temporalStatus = routeEventTemporalStatus(event.eventDate, now);
  return {
    event,
    temporalStatus,
    ageDays: routeEventAgeDays(event.eventDate, now),
    distanceFromOriginKm: routeDistanceKm(origin, event),
    role:
      temporalStatus === "future"
        ? "anticipation_anchor"
        : temporalStatus === "today"
          ? "today_anchor"
          : "post_event_anchor",
    radiusKm: ROUTE_EVENT_CENTERED_RADIUS_KM,
    anchorWeight: ROUTE_EVENT_CENTERED_ANCHOR_WEIGHT,
    favoredCandidateIds: impacts
      .filter((impact) => impact.favored)
      .map((impact) => impact.candidateId),
    outsideAnchorRadiusCandidateIds: impacts
      .filter((impact) => !impact.favored)
      .map((impact) => impact.candidateId),
    selectedCandidateIds: [...selectedCandidateIds],
    candidateImpacts: [...impacts],
  };
}
