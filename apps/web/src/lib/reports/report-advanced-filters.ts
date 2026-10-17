import { z } from "zod";
import type { ActionDataContract } from "@/lib/actions/data-contract";
import { toActionListItem } from "@/lib/actions/data-contract";
import { auditActionContract } from "@/lib/actions/quality/data-quality";
import type {
  ActionDataProvenance,
  ActionGeometryProvenance,
} from "@/lib/actions/quality/data-quality-types";
import { evaluateActionQuality, type ActionQualityGrade } from "@/lib/actions/quality/quality";

export const REPORT_ADVANCED_FILTERS_VERSION = "reports-advanced-filters-v1" as const;

export const REPORT_ADVANCED_FILTER_DEFAULTS = {
  dataQuality: "all",
  qualityGradeAtLeast: "any",
  measureProvenance: "any",
  validCoordinates: "any",
  geometryProvenance: "any",
  declarationOrigin: "any",
  wasteKgMin: null,
  wasteKgMax: null,
  cigaretteButtsMin: null,
  cigaretteButtsMax: null,
  wasteCategory: "any",
  exploitableGeometry: "any",
  photographicEvidence: "any",
} as const;

const dataQualitySchema = z.enum(["all", "without_blocking_anomaly"]);
const qualityGradeSchema = z.enum(["any", "A", "B", "C"]);
const provenanceSchema = z.enum(["any", "measured", "derived", "estimated", "missing"]);
const geometryProvenanceSchema = z.enum([
  "any",
  "observed",
  "declared",
  "reference",
  "reconstructed",
  "estimated",
  "fallback",
  "missing",
  "unknown",
]);
const declarationOriginSchema = z.enum(["any", "quick", "complete"]);
const thresholdSchema = z.number().finite().nonnegative().nullable();
const wasteCategorySchema = z.enum(["any", "recyclables", "glass", "household", "other"]);
const binaryFilterSchema = z.enum(["any", "with", "without"]);

export const reportAdvancedFiltersSchema = z.object({
  dataQuality: dataQualitySchema,
  qualityGradeAtLeast: qualityGradeSchema,
  measureProvenance: provenanceSchema,
  validCoordinates: z.enum(["any", "required"]),
  geometryProvenance: geometryProvenanceSchema,
  declarationOrigin: declarationOriginSchema,
  wasteKgMin: thresholdSchema,
  wasteKgMax: thresholdSchema,
  cigaretteButtsMin: thresholdSchema,
  cigaretteButtsMax: thresholdSchema,
  wasteCategory: wasteCategorySchema,
  exploitableGeometry: binaryFilterSchema,
  photographicEvidence: binaryFilterSchema,
}).strict();

export type ReportAdvancedFilters = z.infer<typeof reportAdvancedFiltersSchema>;
export type ReportAdvancedFilterMediaAvailability = "available" | "unavailable";

export class ReportAdvancedFilterSourceUnavailableError extends Error {
  constructor() {
    super("The canonical action media evidence source is unavailable for this filter.");
    this.name = "ReportAdvancedFilterSourceUnavailableError";
  }
}

export function normalizeReportAdvancedFilters(
  value: unknown,
): ReportAdvancedFilters {
  return reportAdvancedFiltersSchema.parse(value ?? REPORT_ADVANCED_FILTER_DEFAULTS);
}

function gradeRank(grade: ActionQualityGrade): number {
  return grade === "A" ? 3 : grade === "B" ? 2 : 1;
}

function passesThreshold(
  value: number | null | undefined,
  min: number | null,
  max: number | null,
): boolean {
  if (min === null && max === null) return true;
  if (typeof value !== "number" || !Number.isFinite(value)) return false;
  return (min === null || value >= min) && (max === null || value <= max);
}

function passesCategory(
  contract: ActionDataContract,
  category: ReportAdvancedFilters["wasteCategory"],
): boolean {
  if (category === "any") return true;
  const breakdown = contract.metadata.wasteBreakdown;
  if (!breakdown) return false;
  const field = {
    recyclables: "recyclablesKg",
    glass: "glassKg",
    household: "householdWasteKg",
    other: "otherWasteKg",
  }[category] as "recyclablesKg" | "glassKg" | "householdWasteKg" | "otherWasteKg";
  const value = breakdown[field];
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function passesBinary(
  value: boolean,
  selection: "any" | "with" | "without",
): boolean {
  if (selection === "any") return true;
  return selection === "with" ? value : !value;
}

export function assertReportAdvancedFilterSources(params: {
  filters: ReportAdvancedFilters;
  actionMediaAvailability: ReportAdvancedFilterMediaAvailability;
}): void {
  if (
    params.filters.photographicEvidence !== "any" &&
    params.actionMediaAvailability !== "available"
  ) {
    throw new ReportAdvancedFilterSourceUnavailableError();
  }
}

export function filterActionContractsByAdvancedFilters(params: {
  contracts: ActionDataContract[];
  filters: ReportAdvancedFilters;
  now: Date;
  actionMediaReadyCountByActionId?: ReadonlyMap<string, number>;
  actionMediaAvailability?: ReportAdvancedFilterMediaAvailability;
}): ActionDataContract[] {
  const actionMediaAvailability = params.actionMediaAvailability ?? "available";
  assertReportAdvancedFilterSources({
    filters: params.filters,
    actionMediaAvailability,
  });

  return params.contracts.filter((contract) => {
    const quality = auditActionContract(contract);
    const qualityResult = evaluateActionQuality(toActionListItem(contract), params.now);
    const coordinatesAreValid = quality.geolocation.state === "valid";
    const hasGeometry = quality.geolocation.hasGeometry;
    const hasReadyPhoto = (params.actionMediaReadyCountByActionId?.get(contract.id) ?? 0) > 0;

    if (
      params.filters.dataQuality === "without_blocking_anomaly" &&
      quality.blockingAnomalies.length > 0
    ) return false;
    if (
      params.filters.qualityGradeAtLeast !== "any" &&
      gradeRank(qualityResult.grade) < gradeRank(params.filters.qualityGradeAtLeast)
    ) return false;
    if (
      params.filters.measureProvenance !== "any" &&
      quality.provenance.measures !== params.filters.measureProvenance as ActionDataProvenance
    ) return false;
    if (params.filters.validCoordinates === "required" && !coordinatesAreValid) return false;
    if (
      params.filters.geometryProvenance !== "any" &&
      quality.provenance.geometry !== params.filters.geometryProvenance as ActionGeometryProvenance
    ) return false;
    if (
      params.filters.declarationOrigin !== "any" &&
      contract.metadata.submissionMode !== params.filters.declarationOrigin
    ) return false;
    if (!passesThreshold(contract.metadata.wasteKg, params.filters.wasteKgMin, params.filters.wasteKgMax)) return false;
    if (!passesThreshold(contract.metadata.cigaretteButts, params.filters.cigaretteButtsMin, params.filters.cigaretteButtsMax)) return false;
    if (!passesCategory(contract, params.filters.wasteCategory)) return false;
    if (!passesBinary(hasGeometry, params.filters.exploitableGeometry)) return false;
    if (!passesBinary(hasReadyPhoto, params.filters.photographicEvidence)) return false;
    return true;
  });
}
