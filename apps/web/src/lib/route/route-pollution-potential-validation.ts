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

type JsonRecord = Record<string, unknown>;

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function validNullableNumber(value: unknown): value is number | null {
  return value === null || (typeof value === "number" && Number.isFinite(value));
}

function validNullableIndex(value: unknown): value is number | null {
  return validNullableNumber(value) && (value === null || (value >= 0 && value <= 100));
}

function validStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function sameNullableNumber(left: unknown, right: unknown): boolean {
  return left === right || (typeof left === "number" && typeof right === "number" && Object.is(left, right));
}

function close(left: number, right: number, tolerance = 0.001): boolean {
  return Math.abs(left - right) <= tolerance;
}

function validStatus(value: unknown): value is "available" | "partial" | "unavailable" {
  return value === "available" || value === "partial" || value === "unavailable";
}

function validConfidenceRecord(value: unknown): value is JsonRecord {
  if (!isRecord(value) || !validNullableNumber(value.score)) return false;
  const validLevel = value.level === "high" || value.level === "medium" || value.level === "low" || value.level === "unknown";
  const validSource = value.source === "segment_projection" || value.source === "unavailable";
  if (!validLevel || !validSource) return false;
  return value.score === null
    ? value.level === "unknown" && value.source === "unavailable"
    : value.source === "segment_projection" && value.score >= 0 && value.score <= 1 &&
      value.score === Number(value.score.toFixed(3)) &&
      value.level === (value.score >= 0.75 ? "high" : value.score >= 0.5 ? "medium" : "low");
}

export function isRoutePollutionPotentialConfidence(value: unknown): value is RoutePollutionPotentialConfidence {
  return validConfidenceRecord(value);
}

function validCoverage(collectionLengthM: unknown, coveredLengthM: unknown, coverageRatio: unknown): boolean {
  if (typeof collectionLengthM !== "number" || !Number.isFinite(collectionLengthM) || collectionLengthM < 0) return false;
  if (typeof coveredLengthM !== "number" || !Number.isFinite(coveredLengthM) || coveredLengthM < 0 || coveredLengthM > collectionLengthM) return false;
  if (!validNullableNumber(coverageRatio) || (coverageRatio !== null && (coverageRatio < 0 || coverageRatio > 1))) return false;
  return collectionLengthM === 0
    ? coverageRatio === null && coveredLengthM === 0
    : coverageRatio !== null && close(coverageRatio, coveredLengthM / collectionLengthM, 0.0015);
}

function sameConfidence(left: unknown, right: unknown): boolean {
  return isRecord(left) && isRecord(right) && left.level === right.level && sameNullableNumber(left.score, right.score) && left.source === right.source;
}

function validCategoryResult(value: unknown, allowAvailabilityPartial = false): value is RoutePollutionPotentialCategoryResult {
  if (!isRecord(value) || !validNullableIndex(value.value) || !validNullableIndex(value.rawProjectionIndex) || !validStatus(value.status)) return false;
  const uniqueSegmentCount = value.uniqueSegmentCount;
  const availableSegmentCount = value.availableSegmentCount;
  const coverageRatio = value.coverageRatio;
  if (typeof uniqueSegmentCount !== "number" || !Number.isInteger(uniqueSegmentCount) || uniqueSegmentCount < 0) return false;
  if (typeof availableSegmentCount !== "number" || !Number.isInteger(availableSegmentCount) || availableSegmentCount < 0 || availableSegmentCount > uniqueSegmentCount) return false;
  if (!validNullableNumber(coverageRatio)) return false;
  if (!validCoverage(value.collectionLengthM, value.coveredLengthM, coverageRatio) || !validConfidenceRecord(value.confidence) || !validStringArray(value.missingReasons)) return false;
  if (value.value === null) {
    return value.status === "unavailable" && (value.rawProjectionIndex !== null || value.confidence.score === null);
  }
  return value.status === (coverageRatio !== null && coverageRatio < 1 || allowAvailabilityPartial && value.missingReasons.length > 0 ? "partial" : "available");
}

function validIndex(value: unknown): value is RoutePollutionPotentialIndex {
  if (!isRecord(value) || !validStatus(value.status) || !validNullableIndex(value.value)) return false;
  const uniqueSegmentCount = value.uniqueSegmentCount;
  if (typeof uniqueSegmentCount !== "number" || !Number.isInteger(uniqueSegmentCount) || uniqueSegmentCount < 0 || !validCoverage(value.collectionLengthM, value.coveredLengthM, value.coverageRatio)) return false;
  if (!validConfidenceRecord(value.confidence) || !validStringArray(value.limitations) || !isRecord(value.categories)) return false;
  const waste = value.categories.waste;
  const cigaretteButts = value.categories.cigaretteButts;
  const mixed = value.categories.mixed;
  if (!validCategoryResult(waste) || !validCategoryResult(cigaretteButts) || !validCategoryResult(mixed, true)) return false;
  const categories = [waste, cigaretteButts, mixed];
  const expectedMixedStatus = waste.value === null && cigaretteButts.value === null
    ? "unavailable"
    : waste.status === "partial" || cigaretteButts.status === "partial" || waste.status === "unavailable" || cigaretteButts.status === "unavailable"
      ? "partial"
      : "available";
  if (mixed.status !== expectedMixedStatus) return false;
  if (categories.some((category) => category.uniqueSegmentCount !== uniqueSegmentCount || category.collectionLengthM !== value.collectionLengthM)) return false;
  if (value.coveredLengthM !== Math.max(...categories.map((category) => category.coveredLengthM))) return false;
  const expectedMissing = categories.flatMap((category, index) => category.value === null ? (["waste", "cigaretteButts", "mixed"] as const).slice(index, index + 1) : []);
  if (!Array.isArray(value.missingCategories) || value.missingCategories.length !== expectedMissing.length || value.missingCategories.some((category, index) => category !== expectedMissing[index])) return false;
  if (!categories.some((category) => sameNullableNumber(category.value, value.value) && category.status === value.status && sameConfidence(category.confidence, value.confidence))) return false;
  return value.value === null ? value.status === "unavailable" : value.status !== "unavailable";
}

function validReferenceComparison(value: unknown): value is RoutePollutionReferenceComparison {
  if (!isRecord(value)) return false;
  return (value.pickupPreference === "balanced" || value.pickupPreference === "waste" || value.pickupPreference === "cigarette_butts") &&
    (value.routeTopology === "loop" || value.routeTopology === "open") &&
    typeof value.travelBudgetMinutes === "number" && Number.isFinite(value.travelBudgetMinutes) && value.travelBudgetMinutes > 0 &&
    typeof value.usefulCollectionLengthM === "number" && Number.isFinite(value.usefulCollectionLengthM) && value.usefulCollectionLengthM > 0;
}

function validReference(value: unknown): boolean {
  if (value === null) return true;
  if (!isRecord(value)) return false;
  const validKindAndScore = value.kind === "historical_action_score_100"
    ? value.historicalScore === 100
    : value.kind === "theoretical_network" && value.historicalScore === null;
  return typeof value.id === "string" && value.id.length > 0 && typeof value.label === "string" &&
    validKindAndScore && validReferenceComparison(value.comparison) && validStringArray(value.provenance);
}

function validVersion(value: unknown): boolean {
  if (!isRecord(value)) return false;
  return value.potentialSchemaVersion === ROUTE_POLLUTION_POTENTIAL_SCHEMA_VERSION &&
    (value.referenceCatalogSchemaVersion === null || value.referenceCatalogSchemaVersion === ROUTE_POLLUTION_REFERENCE_CATALOG_SCHEMA_VERSION) &&
    (value.projectionSchemaVersion === null || typeof value.projectionSchemaVersion === "string") &&
    (value.projectionVersionId === null || typeof value.projectionVersionId === "string") &&
    (value.networkVersionId === null || typeof value.networkVersionId === "string") &&
    (value.riskModelVersion === null || typeof value.riskModelVersion === "string");
}

export function isRoutePollutionPotential(value: unknown): value is RoutePollutionPotential {
  if (!isRecord(value) || value.schemaVersion !== ROUTE_POLLUTION_POTENTIAL_SCHEMA_VERSION || !validStatus(value.status)) return false;
  if (value.selectedCategory !== "waste" && value.selectedCategory !== "cigaretteButts" && value.selectedCategory !== "mixed") return false;
  if (!validNullableNumber(value.value) || !validIndex(value.global) || !Array.isArray(value.groups) || !validReference(value.reference)) return false;
  if (!value.groups.every((group) => {
    if (!isRecord(group)) return false;
    const groupIndex = group.groupIndex;
    const volunteerCount = group.volunteerCount;
    return typeof groupIndex === "number" && Number.isInteger(groupIndex) && groupIndex >= 1 && typeof volunteerCount === "number" && Number.isInteger(volunteerCount) && volunteerCount >= 0 && validIndex(group.index);
  })) return false;
  if (!isRecord(value.coverage) || !validCoverage(value.coverage.collectionLengthM, value.coverage.coveredLengthM, value.coverage.coverageRatio)) return false;
  if (value.coverage.uniqueSegmentCount !== value.global.uniqueSegmentCount || value.coverage.collectionLengthM !== value.global.collectionLengthM || value.coverage.coveredLengthM !== value.global.coveredLengthM || !sameNullableNumber(value.coverage.coverageRatio, value.global.coverageRatio) || value.coverage.groupCount !== value.groups.length) return false;
  if (!validConfidenceRecord(value.confidence) || !validStringArray(value.provenance) || !validStringArray(value.limitations) || !validVersion(value.version)) return false;
  if (!sameNullableNumber(value.value, value.global.value) || value.status !== value.global.status || !sameConfidence(value.confidence, value.global.confidence)) return false;
  const selected = value.global.categories[value.selectedCategory];
  if (!sameNullableNumber(value.global.value, selected.value) || value.global.status !== selected.status || !sameConfidence(value.global.confidence, selected.confidence)) return false;
  return value.value === null ? value.status === "unavailable" : value.status !== "unavailable";
}
