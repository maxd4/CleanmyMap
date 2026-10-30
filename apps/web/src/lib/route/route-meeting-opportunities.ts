import type { MeetingPointProjection } from "./route-response-contract";
import {
  isRoutePlannerCandidateEligible,
  routeDistanceKm,
  type RoutePlannerCandidate,
} from "./route-planner";

export const MEETING_OPPORTUNITY_POLICY = {
  maxRadiusMeters: 150,
  maxCount: 3,
  distanceType: "straight_line",
} as const;
export const MEETING_OPPORTUNITY_MAX_RADIUS_METERS = MEETING_OPPORTUNITY_POLICY.maxRadiusMeters;
export const MEETING_OPPORTUNITY_MAX_COUNT = MEETING_OPPORTUNITY_POLICY.maxCount;

export type MeetingOpportunityDistanceType = "straight_line";
export type MeetingOpportunityProvenance = "observed" | "predicted";

export type MeetingOpportunity = {
  candidateId: string;
  label: string;
  coordinates: [number, number];
  distanceMeters: number;
  distanceType: MeetingOpportunityDistanceType;
  provenance: MeetingOpportunityProvenance;
  source: string;
  modelVersion?: string;
};

export type MeetingOpportunityTraceReason =
  | "not_admissible"
  | "trained_only"
  | "no_pickup"
  | "safety_or_accessibility_unknown"
  | "invalid_coordinate"
  | "outside_radius"
  | "duplicate_candidate"
  | "duplicate_coordinate"
  | "already_a_main_stop"
  | "rank_limit"
  | "selected_by_deterministic_rank";

export type MeetingOpportunityTraceEntry = {
  candidateId: string;
  distanceMeters: number | null;
  provenance: MeetingOpportunityProvenance | null;
  outcome: "selected" | "excluded";
  reason?: MeetingOpportunityTraceReason;
};

export type MeetingOpportunityTrace = {
  radiusMeters: typeof MEETING_OPPORTUNITY_MAX_RADIUS_METERS;
  distanceType: MeetingOpportunityDistanceType;
  candidatesConsidered: number;
  selectedCandidateIds: string[];
  entries: MeetingOpportunityTraceEntry[];
  skippedReason: "meeting_point_unavailable" | null;
};

type PlannerEvaluation = {
  candidateId: string;
  feasible: boolean;
};

export type MeetingOpportunityBuildResult = {
  opportunities: MeetingOpportunity[];
  trace: MeetingOpportunityTrace;
};

function provenanceFor(candidate: RoutePlannerCandidate): MeetingOpportunityProvenance {
  return candidate.family === "predicted" ? "predicted" : "observed";
}

function sourceFor(candidate: RoutePlannerCandidate): { source: string; modelVersion?: string } {
  if (candidate.family === "predicted") {
    return {
      source: candidate.evidence.source,
      modelVersion: candidate.evidence.modelVersion,
    };
  }
  return { source: candidate.evidence.source };
}

function safetyPolicyReason(candidate: RoutePlannerCandidate): MeetingOpportunityTraceReason | null {
  if (candidate.family === "observed") {
    if (candidate.safety.specializationReason === "trained_only") return "trained_only";
    if (candidate.safety.specializationReason === "no_pickup") return "no_pickup";
  }
  return null;
}

function hasReliableSafetyAndAccessibility(candidate: RoutePlannerCandidate): boolean {
  const safety = candidate.volunteerSafety;
  return safety?.status === "safe" &&
    safety.suitability !== null &&
    safety.suitability > 0;
}

function validCoordinate(candidate: Pick<RoutePlannerCandidate, "latitude" | "longitude">): boolean {
  return Number.isFinite(candidate.latitude) &&
    Number.isFinite(candidate.longitude) &&
    candidate.latitude >= -90 &&
    candidate.latitude <= 90 &&
    candidate.longitude >= -180 &&
    candidate.longitude <= 180;
}

function coordinateKey(candidate: Pick<RoutePlannerCandidate, "latitude" | "longitude">): string {
  return `${candidate.latitude.toFixed(6)},${candidate.longitude.toFixed(6)}`;
}

function traceEntry(
  candidate: RoutePlannerCandidate,
  distanceMeters: number | null,
  outcome: MeetingOpportunityTraceEntry["outcome"],
  reason?: MeetingOpportunityTraceReason,
): MeetingOpportunityTraceEntry {
  return {
    candidateId: candidate.id,
    distanceMeters,
    provenance: provenanceFor(candidate),
    outcome,
    ...(reason ? { reason } : {}),
  };
}

type AcceptedOpportunity = {
  candidate: RoutePlannerCandidate;
  distanceMeters: number;
  score: number;
  coordinateKey: string;
};

function compareAcceptedOpportunities(
  left: AcceptedOpportunity,
  right: AcceptedOpportunity,
): number {
  return left.distanceMeters - right.distanceMeters ||
    right.score - left.score ||
    (provenanceFor(left.candidate) === provenanceFor(right.candidate)
      ? 0
      : provenanceFor(left.candidate) === "observed" ? -1 : 1) ||
    left.candidate.id.localeCompare(right.candidate.id);
}

export function buildMeetingOpportunities(input: {
  meetingPoint: MeetingPointProjection | null | undefined;
  candidates: readonly RoutePlannerCandidate[];
  /** Planner feasibility is budget-specific and is not local admissibility evidence. */
  evaluations?: readonly PlannerEvaluation[];
  mainStops?: readonly Pick<RoutePlannerCandidate, "id" | "latitude" | "longitude">[];
}): MeetingOpportunityBuildResult {
  const trace: MeetingOpportunityTrace = {
    radiusMeters: MEETING_OPPORTUNITY_MAX_RADIUS_METERS,
    distanceType: MEETING_OPPORTUNITY_POLICY.distanceType,
    candidatesConsidered: input.candidates.length,
    selectedCandidateIds: [],
    entries: [],
    skippedReason: input.meetingPoint ? null : "meeting_point_unavailable",
  };
  if (!input.meetingPoint) return { opportunities: [], trace };

  const mainStopIds = new Set(input.mainStops?.map(({ id }) => id));
  const mainStopCoordinateKeys = new Set(
    input.mainStops
      ?.filter(validCoordinate)
      .map(coordinateKey),
  );
  const accepted: AcceptedOpportunity[] = [];
  const seenCandidateIds = new Set<string>();

  for (const candidate of input.candidates) {
    if (seenCandidateIds.has(candidate.id)) {
      trace.entries.push(traceEntry(candidate, null, "excluded", "duplicate_candidate"));
      continue;
    }
    seenCandidateIds.add(candidate.id);
    const policyReason = safetyPolicyReason(candidate);
    if (policyReason) {
      trace.entries.push(traceEntry(candidate, null, "excluded", policyReason));
      continue;
    }
    if (
      mainStopIds.has(candidate.id) ||
      (validCoordinate(candidate) && mainStopCoordinateKeys.has(coordinateKey(candidate)))
    ) {
      trace.entries.push(traceEntry(candidate, null, "excluded", "already_a_main_stop"));
      continue;
    }
    if (!isRoutePlannerCandidateEligible(candidate)) {
      trace.entries.push(traceEntry(candidate, null, "excluded", "not_admissible"));
      continue;
    }
    if (!hasReliableSafetyAndAccessibility(candidate)) {
      trace.entries.push(traceEntry(candidate, null, "excluded", "safety_or_accessibility_unknown"));
      continue;
    }
    if (!validCoordinate(candidate)) {
      trace.entries.push(traceEntry(candidate, null, "excluded", "invalid_coordinate"));
      continue;
    }

    const distanceMetersExact = routeDistanceKm(
      { latitude: input.meetingPoint.coordinates[0], longitude: input.meetingPoint.coordinates[1] },
      candidate,
    ) * 1_000;
    const distanceMeters = Math.round(distanceMetersExact);
    if (distanceMetersExact > MEETING_OPPORTUNITY_MAX_RADIUS_METERS) {
      trace.entries.push(traceEntry(candidate, distanceMeters, "excluded", "outside_radius"));
      continue;
    }
    accepted.push({
      candidate,
      distanceMeters,
      score: candidate.finalPlannerContribution ?? candidate.score,
      coordinateKey: coordinateKey(candidate),
    });
  }

  const uniqueByCoordinate = new Map<string, AcceptedOpportunity>();
  const duplicateAccepted: AcceptedOpportunity[] = [];
  for (const item of accepted) {
    const existing = uniqueByCoordinate.get(item.coordinateKey);
    if (!existing) {
      uniqueByCoordinate.set(item.coordinateKey, item);
      continue;
    }
    if (compareAcceptedOpportunities(item, existing) < 0) {
      uniqueByCoordinate.set(item.coordinateKey, item);
      duplicateAccepted.push(existing);
    } else {
      duplicateAccepted.push(item);
    }
  }
  for (const duplicate of duplicateAccepted) {
    trace.entries.push(traceEntry(duplicate.candidate, duplicate.distanceMeters, "excluded", "duplicate_coordinate"));
  }
  const uniqueAccepted = [...uniqueByCoordinate.values()].sort(compareAcceptedOpportunities);

  const opportunities = uniqueAccepted.slice(0, MEETING_OPPORTUNITY_MAX_COUNT).map(({ candidate, distanceMeters }) => {
    const source = sourceFor(candidate);
    trace.entries.push(traceEntry(candidate, distanceMeters, "selected", "selected_by_deterministic_rank"));
    return {
      candidateId: candidate.id,
      label: candidate.label,
      coordinates: [candidate.latitude, candidate.longitude] as [number, number],
      distanceMeters,
      distanceType: MEETING_OPPORTUNITY_POLICY.distanceType,
      provenance: provenanceFor(candidate),
      ...source,
    };
  });
  for (const excluded of uniqueAccepted.slice(MEETING_OPPORTUNITY_MAX_COUNT)) {
    trace.entries.push(traceEntry(excluded.candidate, excluded.distanceMeters, "excluded", "rank_limit"));
  }
  trace.selectedCandidateIds = opportunities.map(({ candidateId }) => candidateId);
  return { opportunities, trace };
}
