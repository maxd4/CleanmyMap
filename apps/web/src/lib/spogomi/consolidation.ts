import type { WasteCategorySlug } from "@/lib/waste/types";

export const SPOGOMI_ENVIRONMENTAL_MAPPING_VERSION = "spogomi-cleanmymap-v1";
const SPOGOMI_CONSOLIDATION_KEY_PREFIX = "spogomi-environmental";

type SpogomiEnvironmentalSourceField =
  | "mass_grams"
  | "object_count"
  | "quantity";

type SpogomiEnvironmentalTargetUnit = "grams" | "count" | "quantity";

type SpogomiEnvironmentalMappingStatus = "mapped" | "excluded" | "unmapped";

export type SpogomiEnvironmentalMapping = {
  categoryRuleId: string;
  categoryCode: string;
  mappingVersion: string;
  environmentalCategorySlug: WasteCategorySlug | null;
  sourceField: SpogomiEnvironmentalSourceField | null;
  sourceUnit: string;
  targetUnit: SpogomiEnvironmentalTargetUnit | null;
  unitFactorToTarget: number | null;
  countsTowardTotal: boolean;
  isMegots: boolean;
  status: SpogomiEnvironmentalMappingStatus;
  exclusionReason: string | null;
};

export type SpogomiConsolidationSourceItem = {
  categoryRuleId: string;
  categoryCode: string;
  categoryLabel: string;
  quantity: number | null;
  massGrams: number | null;
  objectCount: number | null;
  provenance: string;
  measurementMethod?: string | null;
  sourceReference?: string | null;
  submissionId: string;
  teamId: string;
};

type SpogomiConsolidationSourceTeam = {
  teamId: string;
  teamNumber: number;
  publicName: string;
  certifiedSubmissionId: string | null;
  certifiedSubmissionStatus: string | null;
  items: SpogomiConsolidationSourceItem[];
};

export type SpogomiConsolidationParticipant = {
  id: string;
  teamId: string | null;
  attendanceStatus: string;
  registrationStatus: string;
};

type SpogomiSourceRowSnapshot = {
  id: string;
  updatedAt: string;
};

export type SpogomiConsolidationSourceSnapshot = {
  event: SpogomiSourceRowSnapshot & {
    name: string;
    locationLabel: string;
    startsAt: string;
    endsAt: string | null;
    mappingVersion: string;
  };
  action: SpogomiSourceRowSnapshot & {
    organizerId: string | null;
    organizerName: string | null;
    organizerType: string | null;
  };
  categories: SpogomiSourceRowSnapshot[];
  mappings: SpogomiSourceRowSnapshot[];
  teams: SpogomiSourceRowSnapshot[];
  submissions: SpogomiSourceRowSnapshot[];
  items: SpogomiSourceRowSnapshot[];
  participants: SpogomiSourceRowSnapshot[];
  route: SpogomiSourceRowSnapshot | null;
};

export type SpogomiOfficialRouteReference = {
  source: "official_reference";
  fileName: string;
  pointCount: number;
  referenceDistanceKm: number;
  inferredTopology: "loop" | "point_to_point";
  geometryGeojson: { type: "LineString"; coordinates: [number, number][] };
  note: string;
};

export type SpogomiConsolidationInput = {
  eventId: string;
  actionId: string;
  mappingVersion: string;
  mappings: SpogomiEnvironmentalMapping[];
  teams: SpogomiConsolidationSourceTeam[];
  participants: SpogomiConsolidationParticipant[];
  officialRoute: SpogomiOfficialRouteReference | null;
  organizer: {
    id: string;
    name: string;
    organizerType: "association";
  } | null;
  eventMetadata: {
    name: string;
    locationLabel: string;
    startsAt: string;
    endsAt: string | null;
  };
  actionMetadata: {
    organizerId: string | null;
    organizerName: string | null;
    organizerType: string | null;
  };
  sourceSnapshot: SpogomiConsolidationSourceSnapshot;
};

type SpogomiEnvironmentalCategoryTotal = {
  categoryCode: string;
  categoryLabel: string;
  environmentalCategorySlug: WasteCategorySlug | null;
  unit: SpogomiEnvironmentalTargetUnit | "unmapped";
  total: number | null;
  provenance: string[];
  teamCount: number;
  countsTowardTotal: boolean;
  isMegots: boolean;
};

type SpogomiExcludedMeasure = {
  teamId: string;
  submissionId: string | null;
  categoryCode: string;
  reason:
    | "team_not_certified"
    | "incomplete_submission"
    | "category_without_mapping"
    | "missing_source_value"
    | "unknown_unit"
    | "explicitly_excluded";
};

export type SpogomiConsolidationProjection = {
  readyForPublication: boolean;
  consolidationKey: string;
  projectionVersion: string;
  sourceHash: string;
  eventId: string;
  actionId: string;
  teamsIncluded: number;
  participantsPresent: number;
  totalWasteMassGrams: number | null;
  cigaretteButtsMassGrams: number | null;
  cigaretteButtsCount: number | null;
  categoryTotals: SpogomiEnvironmentalCategoryTotal[];
  categoriesWithoutMapping: string[];
  excludedMeasures: SpogomiExcludedMeasure[];
  officialRoute: SpogomiOfficialRouteReference | null;
  organizer: SpogomiConsolidationInput["organizer"];
  sourceSnapshot: SpogomiConsolidationSourceSnapshot;
  sourceSubmissionIds: string[];
  action: {
    wasteKg: number | null;
    cigaretteButts: number | null;
    volunteersCount: number;
  };
  consolidation: {
    consolidationKey: string;
    projectionVersion: string;
    sourceHash: string;
    teamsIncluded: number;
    participantsPresent: number;
    totalWasteMassGrams: number | null;
    cigaretteButtsMassGrams: number | null;
    cigaretteButtsCount: number | null;
    categoriesWithoutMapping: string[];
    excludedMeasures: string[];
    officialReferenceOnly: boolean;
  };
};

function finiteNonNegative(value: number | null): value is number {
  return value !== null && Number.isFinite(value) && value >= 0;
}

function normalizeNumber(value: number): number {
  return Number(value.toFixed(6));
}

function conversionForUnit(unit: string): { targetUnit: "grams"; factor: number } | { targetUnit: "quantity"; factor: 1 } | null {
  const normalized = unit.trim().toLocaleLowerCase("fr-FR");
  if (["g", "gram", "gramme", "grammes"].includes(normalized)) return { targetUnit: "grams", factor: 1 };
  if (["kg", "kilogram", "kilogramme", "kilogrammes"].includes(normalized)) return { targetUnit: "grams", factor: 1000 };
  if (["l", "litre", "litres", "liter", "liters"].includes(normalized)) return { targetUnit: "quantity", factor: 1 };
  return null;
}

export function deriveSpogomiEnvironmentalMapping(params: {
  categoryRuleId: string;
  categoryCode: string;
  measurementKind: "mass" | "count" | "volume";
  unit: string;
  environmentalCategorySlug: WasteCategorySlug | null;
  mappingVersion: string;
  persisted?: SpogomiEnvironmentalMapping | null;
}): SpogomiEnvironmentalMapping {
  if (params.persisted) return params.persisted;
  if (!params.environmentalCategorySlug) {
    return {
      categoryRuleId: params.categoryRuleId,
      categoryCode: params.categoryCode,
      mappingVersion: params.mappingVersion,
      environmentalCategorySlug: null,
      sourceField: null,
      sourceUnit: params.unit,
      targetUnit: null,
      unitFactorToTarget: null,
      countsTowardTotal: false,
      isMegots: false,
      status: "unmapped",
      exclusionReason: "Aucune catégorie environnementale CleanMyMap configurée.",
    };
  }
  if (params.measurementKind === "count" && params.environmentalCategorySlug === "cigarette_butt") {
    return {
      categoryRuleId: params.categoryRuleId,
      categoryCode: params.categoryCode,
      mappingVersion: params.mappingVersion,
      environmentalCategorySlug: params.environmentalCategorySlug,
      sourceField: "object_count",
      sourceUnit: params.unit,
      targetUnit: "count",
      unitFactorToTarget: 1,
      countsTowardTotal: false,
      isMegots: true,
      status: "mapped",
      exclusionReason: null,
    };
  }
  if (params.measurementKind === "count") {
    return {
      categoryRuleId: params.categoryRuleId,
      categoryCode: params.categoryCode,
      mappingVersion: params.mappingVersion,
      environmentalCategorySlug: params.environmentalCategorySlug,
      sourceField: "quantity",
      sourceUnit: params.unit,
      targetUnit: "count",
      unitFactorToTarget: 1,
      countsTowardTotal: true,
      isMegots: false,
      status: "mapped",
      exclusionReason: null,
    };
  }
  const conversion = conversionForUnit(params.unit);
  if (!conversion) {
    return {
      categoryRuleId: params.categoryRuleId,
      categoryCode: params.categoryCode,
      mappingVersion: params.mappingVersion,
      environmentalCategorySlug: params.environmentalCategorySlug,
      sourceField: "mass_grams",
      sourceUnit: params.unit,
      targetUnit: "grams",
      unitFactorToTarget: null,
      countsTowardTotal: params.environmentalCategorySlug !== "cigarette_butt",
      isMegots: params.environmentalCategorySlug === "cigarette_butt",
      status: "excluded",
      exclusionReason: `Unité non convertible : ${params.unit}.`,
    };
  }
  return {
    categoryRuleId: params.categoryRuleId,
    categoryCode: params.categoryCode,
    mappingVersion: params.mappingVersion,
    environmentalCategorySlug: params.environmentalCategorySlug,
    sourceField: "mass_grams",
    sourceUnit: params.unit,
    targetUnit: conversion.targetUnit,
    unitFactorToTarget: conversion.factor,
    countsTowardTotal: params.environmentalCategorySlug !== "cigarette_butt",
    isMegots: params.environmentalCategorySlug === "cigarette_butt",
    status: "mapped",
    exclusionReason: null,
  };
}

function sourceValue(item: SpogomiConsolidationSourceItem, mapping: SpogomiEnvironmentalMapping): number | null {
  if (mapping.status !== "mapped") return null;
  if (mapping.sourceField === "mass_grams") {
    if (finiteNonNegative(item.massGrams)) return item.massGrams;
    if (finiteNonNegative(item.quantity) && mapping.unitFactorToTarget !== null) return item.quantity * mapping.unitFactorToTarget;
    return null;
  }
  if (mapping.sourceField === "object_count") return finiteNonNegative(item.objectCount) ? item.objectCount : null;
  return finiteNonNegative(item.quantity) && mapping.unitFactorToTarget !== null
    ? item.quantity * mapping.unitFactorToTarget
    : null;
}

function buildSpogomiConsolidationKey(eventId: string, mappingVersion: string): string {
  return `${SPOGOMI_CONSOLIDATION_KEY_PREFIX}:${eventId}:${mappingVersion}`;
}

export function aggregateSpogomiEnvironmentalProjection(input: SpogomiConsolidationInput): Omit<SpogomiConsolidationProjection, "sourceHash"> {
  const mappings = new Map(input.mappings.map((mapping) => [mapping.categoryRuleId, mapping]));
  const categoryTotals = new Map<string, SpogomiEnvironmentalCategoryTotal>();
  const excludedMeasures: SpogomiExcludedMeasure[] = [];
  const sourceSubmissionIds: string[] = [];
  let totalWasteMassGrams = 0;
  let hasWasteMass = false;
  let cigaretteButtsMassGrams = 0;
  let hasCigaretteButtsMass = false;
  let cigaretteButtsCount = 0;
  let hasCigaretteButtsCount = false;
  let teamsIncluded = 0;

  for (const team of input.teams) {
    if (team.certifiedSubmissionId === null || team.certifiedSubmissionStatus !== "certified") {
      excludedMeasures.push({ teamId: team.teamId, submissionId: team.certifiedSubmissionId, categoryCode: "*", reason: "team_not_certified" });
      continue;
    }
    teamsIncluded += 1;
    sourceSubmissionIds.push(team.certifiedSubmissionId);
    const expectedCategoryIds = new Set(input.mappings.map((mapping) => mapping.categoryRuleId));
    const seenCategoryIds = new Set<string>();
    let hasIncompleteItems = team.items.length !== expectedCategoryIds.size;
    for (const item of team.items) {
      if (seenCategoryIds.has(item.categoryRuleId)) hasIncompleteItems = true;
      seenCategoryIds.add(item.categoryRuleId);
      const mapping = mappings.get(item.categoryRuleId);
      if (!mapping || mapping.status === "unmapped") {
        excludedMeasures.push({ teamId: team.teamId, submissionId: team.certifiedSubmissionId, categoryCode: item.categoryCode, reason: "category_without_mapping" });
        continue;
      }
      if (mapping.status === "excluded") {
        excludedMeasures.push({ teamId: team.teamId, submissionId: team.certifiedSubmissionId, categoryCode: item.categoryCode, reason: "explicitly_excluded" });
        continue;
      }
      const value = sourceValue(item, mapping);
      if (value === null) {
        excludedMeasures.push({ teamId: team.teamId, submissionId: team.certifiedSubmissionId, categoryCode: item.categoryCode, reason: mapping.unitFactorToTarget === null ? "unknown_unit" : "missing_source_value" });
        continue;
      }
      const slug = mapping.environmentalCategorySlug;
      const totalKey = `${slug ?? "unmapped"}:${mapping.targetUnit ?? "quantity"}:${mapping.isMegots ? "megots" : "waste"}`;
      const previous = categoryTotals.get(totalKey) ?? {
        categoryCode: item.categoryCode,
        categoryLabel: item.categoryLabel,
        environmentalCategorySlug: slug,
        unit: mapping.targetUnit ?? "unmapped",
        total: 0,
        provenance: [],
        teamCount: 0,
        countsTowardTotal: mapping.countsTowardTotal,
        isMegots: mapping.isMegots,
      };
      previous.total = normalizeNumber((previous.total ?? 0) + value);
      if (!previous.provenance.includes(item.provenance)) previous.provenance.push(item.provenance);
      previous.teamCount += 1;
      categoryTotals.set(totalKey, previous);
      if (mapping.targetUnit === "grams" && mapping.isMegots) {
        cigaretteButtsMassGrams += value;
        hasCigaretteButtsMass = true;
      } else if (mapping.targetUnit === "grams" && mapping.countsTowardTotal) {
        totalWasteMassGrams += value;
        hasWasteMass = true;
      } else if (mapping.targetUnit === "count" && mapping.isMegots) {
        cigaretteButtsCount += value;
        hasCigaretteButtsCount = true;
      }
    }
    for (const categoryRuleId of expectedCategoryIds) {
      if (seenCategoryIds.has(categoryRuleId)) continue;
      const mapping = mappings.get(categoryRuleId);
      excludedMeasures.push({
        teamId: team.teamId,
        submissionId: team.certifiedSubmissionId,
        categoryCode: mapping?.categoryCode ?? categoryRuleId,
        reason: "incomplete_submission",
      });
    }
    if (hasIncompleteItems && !expectedCategoryIds.size) {
      excludedMeasures.push({
        teamId: team.teamId,
        submissionId: team.certifiedSubmissionId,
        categoryCode: "*",
        reason: "incomplete_submission",
      });
    }
  }

  const participantsPresent = new Set(
    input.participants
      .filter((participant) => participant.registrationStatus === "registered" && participant.attendanceStatus === "present")
      .map((participant) => participant.id),
  ).size;
  const categoriesWithoutMapping = input.mappings.filter((mapping) => mapping.status === "unmapped").map((mapping) => mapping.categoryCode);
  const blockingExclusions = excludedMeasures.filter((measure) => measure.reason !== "team_not_certified");
  const readyForPublication = teamsIncluded > 0 && excludedMeasures.length === 0 && categoriesWithoutMapping.length === 0;
  const consolidationKey = buildSpogomiConsolidationKey(input.eventId, input.mappingVersion);
  const totalWaste = hasWasteMass ? normalizeNumber(totalWasteMassGrams) : null;
  const buttsMass = hasCigaretteButtsMass ? normalizeNumber(cigaretteButtsMassGrams) : null;
  const buttsCount = hasCigaretteButtsCount ? Math.trunc(cigaretteButtsCount) : null;
  const actionWasteKg = totalWaste === null ? null : Number((totalWaste / 1000).toFixed(2));
  return {
    readyForPublication: readyForPublication && blockingExclusions.length === 0,
    consolidationKey,
    projectionVersion: input.mappingVersion,
    eventId: input.eventId,
    actionId: input.actionId,
    teamsIncluded,
    participantsPresent,
    totalWasteMassGrams: totalWaste,
    cigaretteButtsMassGrams: buttsMass,
    cigaretteButtsCount: buttsCount,
    categoryTotals: [...categoryTotals.values()].sort((left, right) => left.categoryCode.localeCompare(right.categoryCode)),
    categoriesWithoutMapping,
    excludedMeasures,
    officialRoute: input.officialRoute,
    organizer: input.organizer,
    sourceSnapshot: input.sourceSnapshot,
    sourceSubmissionIds: [...new Set(sourceSubmissionIds)].sort(),
    action: { wasteKg: actionWasteKg, cigaretteButts: buttsCount, volunteersCount: participantsPresent },
    consolidation: {
      consolidationKey,
      projectionVersion: input.mappingVersion,
      sourceHash: "",
      teamsIncluded,
      participantsPresent,
      totalWasteMassGrams: totalWaste,
      cigaretteButtsMassGrams: buttsMass,
      cigaretteButtsCount: buttsCount,
      categoriesWithoutMapping,
      excludedMeasures: excludedMeasures.map((measure) => `${measure.teamId}:${measure.categoryCode}:${measure.reason}`),
      officialReferenceOnly: input.officialRoute !== null,
    },
  };
}
