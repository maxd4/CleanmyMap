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

export function isRoutePollutionRelevanceAssessment(
  value: unknown,
): value is RoutePollutionRelevanceAssessment {
  if (!value || typeof value !== "object") return false;
  const assessment = value as RoutePollutionRelevanceAssessment;
  const validReference = assessment.reference === null || (
    typeof assessment.reference === "object" &&
    typeof assessment.reference.id === "string" &&
    typeof assessment.reference.label === "string" &&
    (assessment.reference.kind === "historical_action_score_100" || assessment.reference.kind === "theoretical_network") &&
    (assessment.reference.historicalScore === null || assessment.reference.historicalScore === 100) &&
    typeof assessment.reference.comparison === "object" &&
    assessment.reference.comparison !== null &&
    (assessment.reference.comparison.pickupPreference === "balanced" || assessment.reference.comparison.pickupPreference === "waste" || assessment.reference.comparison.pickupPreference === "cigarette_butts") &&
    (assessment.reference.comparison.routeTopology === "loop" || assessment.reference.comparison.routeTopology === "open") &&
    Number.isFinite(assessment.reference.comparison.travelBudgetMinutes) &&
    Number.isFinite(assessment.reference.comparison.usefulCollectionLengthM) &&
    Array.isArray(assessment.reference.provenance) &&
    assessment.reference.provenance.every((item) => typeof item === "string")
  );
  return assessment.schemaVersion === ROUTE_POLLUTION_RELEVANCE_POLICY_VERSION &&
    assessment.policyVersion === ROUTE_POLLUTION_RELEVANCE_POLICY_VERSION &&
    validNullableNumber(assessment.score) &&
    (assessment.status === "evaluated" || assessment.status === "unavailable") &&
    (assessment.warning === "red" || assessment.warning === "orange" || assessment.warning === "none" || assessment.warning === "unavailable") &&
    (assessment.selectedCategory === "waste" || assessment.selectedCategory === "cigaretteButts" || assessment.selectedCategory === "mixed") &&
    isRoutePollutionPotentialConfidence(assessment.confidence) &&
    validReference &&
    Array.isArray(assessment.groups) &&
    assessment.groups.every((group) =>
      Number.isInteger(group.groupIndex) &&
      validNullableNumber(group.score) &&
      (group.status === "available" || group.status === "partial" || group.status === "unavailable") &&
      (group.warning === "red" || group.warning === "orange" || group.warning === "none" || group.warning === "unavailable") &&
      isRoutePollutionPotentialConfidence(group.confidence) &&
      (group.reason === null || group.reason === "score_missing" || group.reason === "confidence_unknown" || group.reason === "confidence_insufficient"),
    ) &&
    typeof assessment.alternativeSearch === "object" && assessment.alternativeSearch !== null &&
    typeof assessment.alternativeSearch.relevant === "boolean" &&
    (assessment.alternativeSearch.reason === "warning" || assessment.alternativeSearch.reason === "group_warning" || assessment.alternativeSearch.reason === "not_relevant" || assessment.alternativeSearch.reason === "unavailable") &&
    Array.isArray(assessment.limitations) &&
    typeof assessment.policy === "object" && assessment.policy !== null &&
    assessment.policy.version === ROUTE_POLLUTION_RELEVANCE_POLICY_VERSION &&
    Number.isFinite(assessment.policy.warningRedBelow) &&
    Number.isFinite(assessment.policy.warningOrangeBelow) &&
    Number.isFinite(assessment.policy.minimumConfidenceScore);
}
