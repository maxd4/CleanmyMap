import { findNearestParisPressureZone } from "@/lib/geo/paris-pressure-lookup";
import { estimateParisPressureRisk } from "@/lib/geo/paris-pressure-risk";
import type { ParisPressureSnapshot, ParisPressureZone } from "@/lib/geo/paris-pressure-contract";
import type {
  MunicipalCleaningServiceabilitySnapshot,
  MunicipalCleaningServiceabilityZone,
} from "@/lib/geo/municipal-cleaning-serviceability-contract";
import {
  calculateVolunteerAdditionality,
} from "@/lib/geo/volunteer-additionality";
import type { VolunteerAdditionalityResult, VolunteerSafetyAssessment } from "@/lib/geo/volunteer-additionality-contract";
import type { TrashSpotterActionableCandidate } from "@/lib/actions/trash-spotter-actionable-candidates";

export const ROUTE_PLANNER_ADDITIONALITY_WEIGHT = 0.25;
export const ROUTE_PLANNER_ADDITIONALITY_MODEL_VERSION =
  "route-planner-volunteer-additionality-v1" as const;

export type RoutePlannerContribution = {
  pollutionPriority: number;
  volunteerAdditionality: number | null;
  finalPlannerContribution: number;
  volunteerAdditionalityConfidence: number | null;
  additionalityWeight: number;
  additionality?: VolunteerAdditionalityResult;
  volunteerSafety?: VolunteerSafetyAssessment;
};

export type RouteAdditionalityOptions = {
  pressureSnapshot: ParisPressureSnapshot | null;
  municipalCleaningSnapshot: MunicipalCleaningServiceabilitySnapshot | null;
  safety?: VolunteerSafetyAssessment;
  municipalInterventions?: Parameters<typeof calculateVolunteerAdditionality>[0]["municipalInterventions"];
};

function clamp(value: number, min = 0, max = 100): number {
  return Math.min(max, Math.max(min, value));
}

function round(value: number, digits = 2): number {
  return Number(value.toFixed(digits));
}

export function finalPlannerContribution(input: {
  pollutionPriority: number;
  volunteerAdditionality: number | null;
  confidence?: number | null;
}): number {
  const pollution = clamp(input.pollutionPriority);
  if (input.volunteerAdditionality === null) return round(pollution);
  const confidence = Math.min(1, Math.max(0, input.confidence ?? 0));
  const effectiveWeight = ROUTE_PLANNER_ADDITIONALITY_WEIGHT * confidence;
  return round(
    (1 - effectiveWeight) * pollution +
      effectiveWeight * clamp(input.volunteerAdditionality),
  );
}

export function serviceabilityByZone(
  snapshot: MunicipalCleaningServiceabilitySnapshot | null,
): ReadonlyMap<string, MunicipalCleaningServiceabilityZone> {
  return new Map((snapshot?.zones ?? []).map((zone) => [zone.id, zone]));
}

export function safetyForObservedCandidate(
  candidate: TrashSpotterActionableCandidate,
  geographicSafety?: VolunteerSafetyAssessment,
): VolunteerSafetyAssessment {
  if (!candidate.safety) {
    return { status: "unknown", suitability: null, confidence: 0 };
  }
  if (candidate.safety.volunteerEligibility !== "eligible") {
    return {
      status: "excluded",
      suitability: 0,
      confidence: 1,
      exclusionReasons: [
        candidate.safety.specializationReason === "trained_only"
          ? "trained_only_waste"
          : candidate.safety.specializationReason === "no_pickup"
            ? "no_pickup_waste"
            : candidate.safety.specializationReason === "missing_categories"
              ? "cleanmymap_safety_doctrine"
              : "cleanmymap_safety_doctrine",
      ],
      evidenceIds: ["trash-spotter-category-safety-policy"],
    };
  }
  if (geographicSafety) return geographicSafety;
  return {
    status: "unknown",
    suitability: null,
    confidence: 0,
  };
}

export function calculateRouteAdditionality(input: {
  zone: ParisPressureZone;
  pressureSnapshot: ParisPressureSnapshot;
  municipalCleaning: MunicipalCleaningServiceabilityZone | null;
  volunteerSafety: VolunteerSafetyAssessment;
  municipalInterventions?: RouteAdditionalityOptions["municipalInterventions"];
  eventPressure?: number | null;
  observedWasteReport?: boolean;
  observedCigaretteReport?: boolean;
}): VolunteerAdditionalityResult {
  return calculateVolunteerAdditionality({
    zone: input.zone,
    risk: estimateParisPressureRisk(input.zone, input.pressureSnapshot, {
      eventPressure: input.eventPressure,
      validatedWasteReports: input.observedWasteReport ? 1 : null,
      validatedCigaretteButts: input.observedCigaretteReport ? 1 : null,
    }),
    municipalCleaning: input.municipalCleaning,
    volunteerSafety: input.volunteerSafety,
    municipalInterventions: input.municipalInterventions,
  });
}

export function contributionForAdditionality(
  pollutionPriority: number,
  additionality: VolunteerAdditionalityResult | null,
): RoutePlannerContribution {
  const volunteerAdditionality = additionality?.eligible
    ? additionality.volunteerAdditionality
    : null;
  const confidence = additionality?.eligible
    ? additionality.confidence.overall
    : null;
  return {
    pollutionPriority: round(clamp(pollutionPriority)),
    volunteerAdditionality:
      volunteerAdditionality === null ? null : round(clamp(volunteerAdditionality)),
    finalPlannerContribution: finalPlannerContribution({
      pollutionPriority,
      volunteerAdditionality,
      confidence,
    }),
    volunteerAdditionalityConfidence: confidence,
    additionalityWeight: ROUTE_PLANNER_ADDITIONALITY_WEIGHT,
    ...(additionality ? { additionality } : {}),
  };
}

export function observedCandidateContribution(input: {
  candidate: TrashSpotterActionableCandidate & {
    score: number;
    parisPressure?: ReturnType<typeof findNearestParisPressureZone> | null;
    eventPressure?: { combinedPressure: number } | null;
  };
  pressureSnapshot: ParisPressureSnapshot | null;
  municipalCleaningSnapshot: MunicipalCleaningServiceabilitySnapshot | null;
  municipalInterventions?: RouteAdditionalityOptions["municipalInterventions"];
  geographicSafety?: VolunteerSafetyAssessment;
}): RoutePlannerContribution {
  const safety = safetyForObservedCandidate(input.candidate, input.geographicSafety);
  const pressureSnapshot = input.pressureSnapshot;
  const nearest = pressureSnapshot
    ? findNearestParisPressureZone(input.candidate, pressureSnapshot)
    : null;
  const zone = pressureSnapshot
    ? input.candidate.parisPressure?.zoneId
      ? pressureSnapshot.zones.find((candidate) => candidate.id === input.candidate.parisPressure?.zoneId)
      : nearest
        ? pressureSnapshot.zones.find((candidate) => candidate.id === nearest.zoneId)
        : undefined
    : undefined;
  if (!zone || !pressureSnapshot || safety.status !== "safe") {
    return {
      ...contributionForAdditionality(input.candidate.score, null),
      volunteerSafety: safety,
    };
  }
  const additionality = calculateRouteAdditionality({
    zone,
    pressureSnapshot,
    municipalCleaning:
      serviceabilityByZone(input.municipalCleaningSnapshot).get(zone.id) ?? null,
    volunteerSafety: safety,
    municipalInterventions: input.municipalInterventions,
    eventPressure: input.candidate.eventPressure?.combinedPressure,
    observedWasteReport: true,
    observedCigaretteReport: (input.candidate.wasteCategories ?? []).some((category) =>
      String(category).toLowerCase().includes("cigarette") ||
      String(category).toLowerCase().includes("mégot"),
    ),
  });
  return {
    ...contributionForAdditionality(input.candidate.score, additionality),
    volunteerSafety: safety,
  };
}

type EvidenceWithContributionFields = Pick<
  RoutePlannerContribution,
  | "pollutionPriority"
  | "volunteerAdditionality"
  | "finalPlannerContribution"
  | "volunteerAdditionalityConfidence"
  | "additionalityWeight"
  | "additionality"
>;

export function evidenceWithContribution<T extends object>(
  evidence: T,
  contribution: RoutePlannerContribution,
): T & EvidenceWithContributionFields {
  return {
    ...evidence,
    pollutionPriority: contribution.pollutionPriority,
    volunteerAdditionality: contribution.volunteerAdditionality,
    finalPlannerContribution: contribution.finalPlannerContribution,
    volunteerAdditionalityConfidence: contribution.volunteerAdditionalityConfidence,
    additionalityWeight: contribution.additionalityWeight,
    ...(contribution.additionality ? { additionality: contribution.additionality } : {}),
  } as T & EvidenceWithContributionFields;
}
