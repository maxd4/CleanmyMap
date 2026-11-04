import {
  ROUTE_POLLUTION_POTENTIAL_SCHEMA_VERSION,
  ROUTE_POLLUTION_REFERENCE_CATALOG_SCHEMA_VERSION,
} from "./route-pollution-potential";
import type {
  RoutePollutionPotential,
  RoutePollutionPotentialCategoryResult,
  RoutePollutionPotentialConfidence,
  RoutePollutionPotentialIndex,
  RoutePollutionReferenceComparison,
} from "./route-pollution-potential";

function validNullableNumber(value: unknown): value is number | null {
  return value === null || (typeof value === "number" && Number.isFinite(value));
}

function validStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

export function isRoutePollutionPotentialConfidence(value: unknown): value is RoutePollutionPotentialConfidence {
  if (!value || typeof value !== "object") return false;
  const confidence = value as RoutePollutionPotentialConfidence;
  return (confidence.level === "high" || confidence.level === "medium" || confidence.level === "low" || confidence.level === "unknown") &&
    validNullableNumber(confidence.score) &&
    (confidence.source === "segment_projection" || confidence.source === "unavailable") &&
    (confidence.score === null ? confidence.level === "unknown" && confidence.source === "unavailable" : confidence.source === "segment_projection" && confidence.score >= 0 && confidence.score <= 1);
}

function validCategoryResult(value: unknown): value is RoutePollutionPotentialCategoryResult {
  if (!value || typeof value !== "object") return false;
  const result = value as RoutePollutionPotentialCategoryResult;
  return validNullableNumber(result.value) &&
    validNullableNumber(result.rawProjectionIndex) &&
    (result.status === "available" || result.status === "partial" || result.status === "unavailable") &&
    Number.isInteger(result.uniqueSegmentCount) && result.uniqueSegmentCount >= 0 &&
    Number.isInteger(result.availableSegmentCount) && result.availableSegmentCount >= 0 &&
    Number.isFinite(result.collectionLengthM) && result.collectionLengthM >= 0 &&
    Number.isFinite(result.coveredLengthM) && result.coveredLengthM >= 0 &&
    validNullableNumber(result.coverageRatio) &&
    (result.coverageRatio === null || (result.coverageRatio >= 0 && result.coverageRatio <= 1)) &&
    isRoutePollutionPotentialConfidence(result.confidence) &&
    validStringArray(result.missingReasons);
}

function validIndex(value: unknown): value is RoutePollutionPotentialIndex {
  if (!value || typeof value !== "object") return false;
  const index = value as RoutePollutionPotentialIndex;
  return (index.status === "available" || index.status === "partial" || index.status === "unavailable") &&
    validNullableNumber(index.value) &&
    Number.isInteger(index.uniqueSegmentCount) && index.uniqueSegmentCount >= 0 &&
    Number.isFinite(index.collectionLengthM) && index.collectionLengthM >= 0 &&
    Number.isFinite(index.coveredLengthM) && index.coveredLengthM >= 0 &&
    validNullableNumber(index.coverageRatio) &&
    (index.coverageRatio === null || (index.coverageRatio >= 0 && index.coverageRatio <= 1)) &&
    isRoutePollutionPotentialConfidence(index.confidence) &&
    Array.isArray(index.missingCategories) && index.missingCategories.every((category) => category === "waste" || category === "cigaretteButts" || category === "mixed") &&
    validStringArray(index.limitations) &&
    typeof index.categories === "object" && index.categories !== null &&
    validCategoryResult(index.categories.waste) &&
    validCategoryResult(index.categories.cigaretteButts) &&
    validCategoryResult(index.categories.mixed);
}

function validReferenceComparison(value: unknown): value is RoutePollutionReferenceComparison {
  if (!value || typeof value !== "object") return false;
  const comparison = value as RoutePollutionReferenceComparison;
  return (comparison.pickupPreference === "balanced" || comparison.pickupPreference === "waste" || comparison.pickupPreference === "cigarette_butts") &&
    (comparison.routeTopology === "loop" || comparison.routeTopology === "open") &&
    Number.isFinite(comparison.travelBudgetMinutes) && comparison.travelBudgetMinutes > 0 &&
    Number.isFinite(comparison.usefulCollectionLengthM) && comparison.usefulCollectionLengthM > 0;
}

export function isRoutePollutionPotential(value: unknown): value is RoutePollutionPotential {
  if (!value || typeof value !== "object") return false;
  const potential = value as RoutePollutionPotential;
  const reference = potential.reference;
  const version = potential.version;
  const validReference = reference === null || (
    typeof reference === "object" &&
    typeof reference.id === "string" && reference.id.length > 0 &&
    typeof reference.label === "string" &&
    (reference.kind === "historical_action_score_100" || reference.kind === "theoretical_network") &&
    (reference.historicalScore === null || reference.historicalScore === 100) &&
    validReferenceComparison(reference.comparison) &&
    validStringArray(reference.provenance)
  );
  return potential.schemaVersion === ROUTE_POLLUTION_POTENTIAL_SCHEMA_VERSION &&
    (potential.status === "available" || potential.status === "partial" || potential.status === "unavailable") &&
    (potential.selectedCategory === "waste" || potential.selectedCategory === "cigaretteButts" || potential.selectedCategory === "mixed") &&
    validNullableNumber(potential.value) &&
    validIndex(potential.global) &&
    Array.isArray(potential.groups) && potential.groups.every((group) =>
      Number.isInteger(group.groupIndex) && group.groupIndex >= 1 &&
      Number.isInteger(group.volunteerCount) && group.volunteerCount >= 0 &&
      validIndex(group.index),
    ) &&
    validReference &&
    Number.isInteger(potential.coverage.uniqueSegmentCount) && potential.coverage.uniqueSegmentCount >= 0 &&
    Number.isFinite(potential.coverage.collectionLengthM) && potential.coverage.collectionLengthM >= 0 &&
    Number.isFinite(potential.coverage.coveredLengthM) && potential.coverage.coveredLengthM >= 0 &&
    validNullableNumber(potential.coverage.coverageRatio) &&
    (potential.coverage.coverageRatio === null || (potential.coverage.coverageRatio >= 0 && potential.coverage.coverageRatio <= 1)) &&
    Number.isInteger(potential.coverage.groupCount) && potential.coverage.groupCount >= 0 &&
    isRoutePollutionPotentialConfidence(potential.confidence) &&
    validStringArray(potential.provenance) && validStringArray(potential.limitations) &&
    typeof version === "object" && version !== null &&
    version.potentialSchemaVersion === ROUTE_POLLUTION_POTENTIAL_SCHEMA_VERSION &&
    (version.referenceCatalogSchemaVersion === null || version.referenceCatalogSchemaVersion === ROUTE_POLLUTION_REFERENCE_CATALOG_SCHEMA_VERSION) &&
    (version.projectionSchemaVersion === null || typeof version.projectionSchemaVersion === "string") &&
    (version.projectionVersionId === null || typeof version.projectionVersionId === "string") &&
    (version.networkVersionId === null || typeof version.networkVersionId === "string") &&
    (version.riskModelVersion === null || typeof version.riskModelVersion === "string");
}
