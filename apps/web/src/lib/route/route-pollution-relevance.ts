import { isRoutePollutionPotentialConfidence } from "./route-pollution-potential";
import type {
  RoutePollutionPotential,
  RoutePollutionPotentialConfidence,
  RoutePollutionPotentialIndex,
  RoutePollutionPotentialStatus,
} from "./route-pollution-potential";

export const ROUTE_POLLUTION_RELEVANCE_POLICY_VERSION =
  "route-pollution-relevance-v1" as const;

export const ROUTE_POLLUTION_RELEVANCE_POLICY = {
  version: ROUTE_POLLUTION_RELEVANCE_POLICY_VERSION,
  warningRedBelow: 40,
  warningOrangeBelow: 65,
  minimumConfidenceScore: 0.5,
} as const;

export type RoutePollutionRelevanceWarning =
  | "red"
  | "orange"
  | "none"
  | "unavailable";

export type RoutePollutionRelevanceReason =
  | "score_missing"
  | "confidence_unknown"
  | "confidence_insufficient"
  | null;

export type RoutePollutionRelevanceGroupAssessment = {
  groupIndex: number;
  score: number | null;
  status: RoutePollutionPotentialStatus;
  warning: RoutePollutionRelevanceWarning;
  confidence: RoutePollutionPotentialConfidence;
  reason: RoutePollutionRelevanceReason;
};

export type RoutePollutionRelevanceAssessment = {
  schemaVersion: typeof ROUTE_POLLUTION_RELEVANCE_POLICY_VERSION;
  policyVersion: typeof ROUTE_POLLUTION_RELEVANCE_POLICY_VERSION;
  score: number | null;
  status: "evaluated" | "unavailable";
  warning: RoutePollutionRelevanceWarning;
  reason: RoutePollutionRelevanceReason;
  selectedCategory: RoutePollutionPotential["selectedCategory"];
  confidence: RoutePollutionPotentialConfidence;
  reference: RoutePollutionPotential["reference"];
  groups: RoutePollutionRelevanceGroupAssessment[];
  alternativeSearch: {
    relevant: boolean;
    reason: "warning" | "group_warning" | "not_relevant" | "unavailable";
  };
  policy: {
    version: typeof ROUTE_POLLUTION_RELEVANCE_POLICY_VERSION;
    warningRedBelow: number;
    warningOrangeBelow: number;
    minimumConfidenceScore: number;
  };
  limitations: string[];
};

type IndexAssessment = {
  score: number | null;
  status: RoutePollutionPotentialStatus;
  warning: RoutePollutionRelevanceWarning;
  confidence: RoutePollutionPotentialConfidence;
  reason: RoutePollutionRelevanceReason;
};

function assessIndex(index: RoutePollutionPotentialIndex): IndexAssessment {
  if (index.value === null) {
    return {
      score: null,
      status: "unavailable",
      warning: "unavailable",
      confidence: index.confidence,
      reason: "score_missing",
    };
  }
  if (index.confidence.score === null || index.confidence.level === "unknown") {
    return {
      score: index.value,
      status: "unavailable",
      warning: "unavailable",
      confidence: index.confidence,
      reason: "confidence_unknown",
    };
  }
  if (index.confidence.score < ROUTE_POLLUTION_RELEVANCE_POLICY.minimumConfidenceScore) {
    return {
      score: index.value,
      status: "unavailable",
      warning: "unavailable",
      confidence: index.confidence,
      reason: "confidence_insufficient",
    };
  }
  return {
    score: index.value,
    status: index.status,
    warning: index.value < ROUTE_POLLUTION_RELEVANCE_POLICY.warningRedBelow
      ? "red"
      : index.value < ROUTE_POLLUTION_RELEVANCE_POLICY.warningOrangeBelow
        ? "orange"
        : "none",
    confidence: index.confidence,
    reason: null,
  };
}

export function evaluateRoutePollutionRelevance(
  potential: RoutePollutionPotential,
): RoutePollutionRelevanceAssessment {
  const global = assessIndex(potential.global);
  const groups = potential.groups.map((group) => {
    const assessment = assessIndex(group.index);
    return {
      groupIndex: group.groupIndex,
      score: assessment.score,
      status: assessment.status,
      warning: assessment.warning,
      confidence: assessment.confidence,
      reason: assessment.reason,
    };
  });
  const globalWarning = global.warning === "red" || global.warning === "orange";
  const groupWarning = groups.some((group) => group.warning === "red" || group.warning === "orange");
  const alternativeSearch = globalWarning || groupWarning
    ? { relevant: true, reason: globalWarning ? "warning" as const : "group_warning" as const }
    : {
        relevant: false,
        reason: global.warning === "unavailable" ? "unavailable" as const : "not_relevant" as const,
      };
  const limitations = [...potential.limitations];
  if (global.warning === "unavailable") {
    limitations.push(
      global.reason === "confidence_insufficient"
        ? "Confiance sous le seuil de la policy : pertinence non évaluable."
        : global.reason === "confidence_unknown"
          ? "Confiance inconnue : pertinence non évaluable."
          : "Indice serveur absent : pertinence non évaluable.",
    );
  }
  return {
    schemaVersion: ROUTE_POLLUTION_RELEVANCE_POLICY_VERSION,
    policyVersion: ROUTE_POLLUTION_RELEVANCE_POLICY_VERSION,
    score: global.score,
    status: global.warning === "unavailable" ? "unavailable" : "evaluated",
    warning: global.warning,
    reason: global.reason,
    selectedCategory: potential.selectedCategory,
    confidence: global.confidence,
    reference: potential.reference,
    groups,
    alternativeSearch,
    policy: {
      version: ROUTE_POLLUTION_RELEVANCE_POLICY_VERSION,
      warningRedBelow: ROUTE_POLLUTION_RELEVANCE_POLICY.warningRedBelow,
      warningOrangeBelow: ROUTE_POLLUTION_RELEVANCE_POLICY.warningOrangeBelow,
      minimumConfidenceScore: ROUTE_POLLUTION_RELEVANCE_POLICY.minimumConfidenceScore,
    },
    limitations: [...new Set(limitations)],
  };
}

function validNullableNumber(value: unknown): value is number | null {
  return value === null || (typeof value === "number" && Number.isFinite(value));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function validStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string" && item.trim().length > 0);
}

function validScore(value: unknown): value is number | null {
  return validNullableNumber(value) && (value === null || (value >= 0 && value <= 100));
}

function isValidRelevanceConfidence(value: unknown): value is RoutePollutionPotentialConfidence {
  if (!isRoutePollutionPotentialConfidence(value)) return false;
  const confidence = value as RoutePollutionPotentialConfidence;
  if (confidence.score === null) {
    return confidence.level === "unknown" && confidence.source === "unavailable";
  }
  const expectedLevel = confidence.score >= 0.75
    ? "high"
    : confidence.score >= 0.5
      ? "medium"
      : "low";
  return confidence.level === expectedLevel && confidence.source === "segment_projection";
}

function expectedReason(
  score: number | null,
  confidence: RoutePollutionPotentialConfidence,
): RoutePollutionRelevanceReason {
  if (score === null) return "score_missing";
  if (confidence.score === null) return "confidence_unknown";
  if (confidence.score < ROUTE_POLLUTION_RELEVANCE_POLICY.minimumConfidenceScore) {
    return "confidence_insufficient";
  }
  return null;
}

function expectedWarning(
  score: number | null,
  confidence: RoutePollutionPotentialConfidence,
): RoutePollutionRelevanceWarning {
  if (expectedReason(score, confidence) !== null) return "unavailable";
  if (score === null) return "unavailable";
  return score < ROUTE_POLLUTION_RELEVANCE_POLICY.warningRedBelow
    ? "red"
    : score < ROUTE_POLLUTION_RELEVANCE_POLICY.warningOrangeBelow
      ? "orange"
      : "none";
}

function validReference(value: unknown): boolean {
  if (value === null) return true;
  if (!isRecord(value)) return false;
  const reference = value as RoutePollutionRelevanceAssessment["reference"] & Record<string, unknown>;
  const comparison = reference.comparison;
  return (
    typeof reference.id === "string" && reference.id.trim().length > 0 &&
    typeof reference.label === "string" && reference.label.trim().length > 0 &&
    (reference.kind === "historical_action_score_100" || reference.kind === "theoretical_network") &&
    (reference.historicalScore === null || reference.historicalScore === 100) &&
    isRecord(comparison) &&
    (comparison.pickupPreference === "balanced" || comparison.pickupPreference === "waste" || comparison.pickupPreference === "cigarette_butts") &&
    (comparison.routeTopology === "loop" || comparison.routeTopology === "open") &&
    typeof comparison.travelBudgetMinutes === "number" && Number.isFinite(comparison.travelBudgetMinutes) && comparison.travelBudgetMinutes > 0 &&
    typeof comparison.usefulCollectionLengthM === "number" && Number.isFinite(comparison.usefulCollectionLengthM) && comparison.usefulCollectionLengthM > 0 &&
    validStringArray(reference.provenance)
  );
}

function validGroupAssessment(value: unknown): value is RoutePollutionRelevanceGroupAssessment {
  if (!isRecord(value)) return false;
  const group = value as RoutePollutionRelevanceGroupAssessment;
  if (!Number.isInteger(group.groupIndex) || group.groupIndex < 1 ||
      !validScore(group.score) || !isValidRelevanceConfidence(group.confidence)) {
    return false;
  }
  const reason = expectedReason(group.score, group.confidence);
  const warning = expectedWarning(group.score, group.confidence);
  const status = reason === null
    ? group.status === "available" || group.status === "partial"
    : group.status === "unavailable";
  return status && group.warning === warning && group.reason === reason;
}

export function isRoutePollutionRelevanceAssessment(
  value: unknown,
): value is RoutePollutionRelevanceAssessment {
  if (!isRecord(value)) return false;
  const assessment = value as RoutePollutionRelevanceAssessment;
  if (
    assessment.schemaVersion !== ROUTE_POLLUTION_RELEVANCE_POLICY_VERSION ||
    assessment.policyVersion !== ROUTE_POLLUTION_RELEVANCE_POLICY_VERSION ||
    !validScore(assessment.score) ||
    (assessment.selectedCategory !== "waste" && assessment.selectedCategory !== "cigaretteButts" && assessment.selectedCategory !== "mixed") ||
    !isValidRelevanceConfidence(assessment.confidence) ||
    !validReference(assessment.reference) ||
    !Array.isArray(assessment.groups) ||
    new Set(assessment.groups.map((group) => isRecord(group) ? group.groupIndex : undefined)).size !== assessment.groups.length ||
    !assessment.groups.every(validGroupAssessment) ||
    !isRecord(assessment.alternativeSearch) ||
    typeof assessment.alternativeSearch.relevant !== "boolean" ||
    !["warning", "group_warning", "not_relevant", "unavailable"].includes(assessment.alternativeSearch.reason as string) ||
    !validStringArray(assessment.limitations) ||
    !isRecord(assessment.policy) ||
    assessment.policy.version !== ROUTE_POLLUTION_RELEVANCE_POLICY_VERSION ||
    assessment.policy.warningRedBelow !== ROUTE_POLLUTION_RELEVANCE_POLICY.warningRedBelow ||
    assessment.policy.warningOrangeBelow !== ROUTE_POLLUTION_RELEVANCE_POLICY.warningOrangeBelow ||
    assessment.policy.minimumConfidenceScore !== ROUTE_POLLUTION_RELEVANCE_POLICY.minimumConfidenceScore
  ) {
    return false;
  }

  const globalReason = expectedReason(assessment.score, assessment.confidence);
  const globalWarning = expectedWarning(assessment.score, assessment.confidence);
  const status = globalReason === null ? "evaluated" : "unavailable";
  const hasGlobalWarning = globalWarning === "red" || globalWarning === "orange";
  const hasGroupWarning = assessment.groups.some((group) => group.warning === "red" || group.warning === "orange");
  const expectedAlternative = hasGlobalWarning
    ? { relevant: true, reason: "warning" }
    : hasGroupWarning
      ? { relevant: true, reason: "group_warning" }
      : globalWarning === "unavailable"
        ? { relevant: false, reason: "unavailable" }
        : { relevant: false, reason: "not_relevant" };

  return (
    assessment.status === status &&
    assessment.warning === globalWarning &&
    assessment.reason === globalReason &&
    assessment.alternativeSearch.relevant === expectedAlternative.relevant &&
    assessment.alternativeSearch.reason === expectedAlternative.reason
  );
}
