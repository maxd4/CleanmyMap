import type { WasteCategorySlug } from "@/lib/waste/types";
import type { SpogomiEnvironmentalEligibility, SpogomiTeamClosureDecision, SpogomiTeamClosureStatus } from "./closure";

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
  divisionId?: string;
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
  divisionId?: string;
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
  divisionId?: string;
  teamNumber: number;
  publicName: string;
  certifiedSubmissionId: string | null;
  certifiedSubmissionStatus: string | null;
  closureStatus?: SpogomiTeamClosureStatus;
  sportEligible?: boolean;
  environmentalEligibility?: SpogomiEnvironmentalEligibility;
  closureDecision?: SpogomiTeamClosureDecision | null;
  items: SpogomiConsolidationSourceItem[];
};

export type SpogomiConsolidationParticipant = {
  id: string;
  divisionId?: string;
  teamId: string | null;
  attendanceStatus: string;
  registrationStatus: string;
};

type SpogomiSourceRowSnapshot = {
  id: string;
  divisionId?: string;
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
  decisions?: Array<SpogomiSourceRowSnapshot & { teamId: string; status: string; sportEligible: boolean; environmentalEligibility: string; decisionVersion: number }>;
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
    | "team_absent"
    | "team_forfeit"
    | "team_excluded"
    | "team_result_missing"
    | "team_contested"
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

type MappingParams = Parameters<typeof deriveSpogomiEnvironmentalMapping>[0];

function mappingBase(params: MappingParams, overrides: Partial<SpogomiEnvironmentalMapping>): SpogomiEnvironmentalMapping {
  return {
    categoryRuleId: params.categoryRuleId,
    categoryCode: params.categoryCode,
    mappingVersion: params.mappingVersion,
    environmentalCategorySlug: params.environmentalCategorySlug,
    sourceField: null,
    sourceUnit: params.unit,
    targetUnit: null,
    unitFactorToTarget: null,
    countsTowardTotal: false,
    isMegots: false,
    status: "unmapped",
    exclusionReason: null,
    ...overrides,
  };
}

function buildUnmappedMapping(params: MappingParams): SpogomiEnvironmentalMapping {
  return mappingBase(params, { status: "unmapped", exclusionReason: "Aucune catégorie environnementale CleanMyMap configurée." });
}

function buildCountMapping(params: MappingParams, isMegots: boolean): SpogomiEnvironmentalMapping {
  return mappingBase(params, { sourceField: isMegots ? "object_count" : "quantity", targetUnit: "count", unitFactorToTarget: 1, countsTowardTotal: !isMegots, isMegots, status: "mapped" });
}

function buildExcludedMapping(params: MappingParams): SpogomiEnvironmentalMapping {
  const isMegots = params.environmentalCategorySlug === "cigarette_butt";
  return mappingBase(params, { sourceField: "mass_grams", targetUnit: "grams", countsTowardTotal: !isMegots, isMegots, status: "excluded", exclusionReason: `Unité non convertible : ${params.unit}.` });
}

function buildConvertedMapping(params: MappingParams, conversion: NonNullable<ReturnType<typeof conversionForUnit>>): SpogomiEnvironmentalMapping {
  const isMegots = params.environmentalCategorySlug === "cigarette_butt";
  return mappingBase(params, { sourceField: "mass_grams", targetUnit: conversion.targetUnit, unitFactorToTarget: conversion.factor, countsTowardTotal: !isMegots, isMegots, status: "mapped" });
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
  if (!params.environmentalCategorySlug) return buildUnmappedMapping(params);
  if (params.measurementKind === "count") return buildCountMapping(params, params.environmentalCategorySlug === "cigarette_butt");
  const conversion = conversionForUnit(params.unit);
  return conversion ? buildConvertedMapping(params, conversion) : buildExcludedMapping(params);
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

type AggregationState = {
  categoryTotals: Map<string, SpogomiEnvironmentalCategoryTotal>;
  excludedMeasures: SpogomiExcludedMeasure[];
  sourceSubmissionIds: string[];
  totalWasteMassGrams: number;
  hasWasteMass: boolean;
  cigaretteButtsMassGrams: number;
  hasCigaretteButtsMass: boolean;
  cigaretteButtsCount: number;
  hasCigaretteButtsCount: boolean;
  teamsIncluded: number;
};

function createAggregationState(): AggregationState {
  return { categoryTotals: new Map(), excludedMeasures: [], sourceSubmissionIds: [], totalWasteMassGrams: 0, hasWasteMass: false, cigaretteButtsMassGrams: 0, hasCigaretteButtsMass: false, cigaretteButtsCount: 0, hasCigaretteButtsCount: false, teamsIncluded: 0 };
}

function teamExclusionReason(team: SpogomiConsolidationSourceTeam): SpogomiExcludedMeasure["reason"] | null {
  const hasExplicitClosure = team.environmentalEligibility !== undefined || team.closureStatus !== undefined;
  if (!hasExplicitClosure && (team.certifiedSubmissionId === null || team.certifiedSubmissionStatus !== "certified")) return "team_not_certified";
  const eligibility = team.environmentalEligibility ?? (team.certifiedSubmissionId && team.certifiedSubmissionStatus === "certified" ? "eligible" : "unknown");
  const status = team.closureStatus ?? (eligibility === "eligible" ? "present_measured" : "result_missing");
  if (eligibility === "excluded") return excludedTeamReason(status);
  if (eligibility === "unknown") return status === "contested" ? "team_contested" : "team_result_missing";
  return team.certifiedSubmissionId === null || team.certifiedSubmissionStatus !== "certified" ? "team_not_certified" : null;
}

function excludedTeamReason(status: string): SpogomiExcludedMeasure["reason"] {
  if (status === "absent") return "team_absent";
  if (status === "forfeit") return "team_forfeit";
  return "team_excluded";
}

function excludeTeam(state: AggregationState, team: SpogomiConsolidationSourceTeam, reason: SpogomiExcludedMeasure["reason"]): void {
  state.excludedMeasures.push({ teamId: team.teamId, submissionId: team.certifiedSubmissionId, categoryCode: "*", reason });
}

function addCategoryValue(state: AggregationState, item: SpogomiConsolidationSourceItem, mapping: SpogomiEnvironmentalMapping, value: number): void {
  const totalKey = `${mapping.environmentalCategorySlug ?? "unmapped"}:${mapping.targetUnit ?? "quantity"}:${mapping.isMegots ? "megots" : "waste"}`;
  const previous = state.categoryTotals.get(totalKey) ?? { categoryCode: item.categoryCode, categoryLabel: item.categoryLabel, environmentalCategorySlug: mapping.environmentalCategorySlug, unit: mapping.targetUnit ?? "unmapped", total: 0, provenance: [], teamCount: 0, countsTowardTotal: mapping.countsTowardTotal, isMegots: mapping.isMegots };
  previous.total = normalizeNumber((previous.total ?? 0) + value);
  if (!previous.provenance.includes(item.provenance)) previous.provenance.push(item.provenance);
  previous.teamCount += 1;
  state.categoryTotals.set(totalKey, previous);
  if (mapping.targetUnit === "grams" && mapping.isMegots) {
    state.cigaretteButtsMassGrams += value;
    state.hasCigaretteButtsMass = true;
  } else if (mapping.targetUnit === "grams" && mapping.countsTowardTotal) {
    state.totalWasteMassGrams += value;
    state.hasWasteMass = true;
  } else if (mapping.targetUnit === "count" && mapping.isMegots) {
    state.cigaretteButtsCount += value;
    state.hasCigaretteButtsCount = true;
  }
}

function addItemExclusion(state: AggregationState, team: SpogomiConsolidationSourceTeam, item: SpogomiConsolidationSourceItem, reason: SpogomiExcludedMeasure["reason"]): void {
  state.excludedMeasures.push({ teamId: team.teamId, submissionId: team.certifiedSubmissionId, categoryCode: item.categoryCode, reason });
}

function accumulateTeamItems(state: AggregationState, team: SpogomiConsolidationSourceTeam, mappings: Map<string, SpogomiEnvironmentalMapping>, expectedCategoryIds: Set<string>): void {
  const seenCategoryIds = new Set<string>();
  let hasIncompleteItems = team.items.length !== expectedCategoryIds.size;
  for (const item of team.items) {
    if (seenCategoryIds.has(item.categoryRuleId)) hasIncompleteItems = true;
    seenCategoryIds.add(item.categoryRuleId);
    const mapping = mappings.get(item.categoryRuleId);
    if (!mapping || mapping.status === "unmapped") {
      addItemExclusion(state, team, item, "category_without_mapping");
      continue;
    }
    if (mapping.status === "excluded") {
      addItemExclusion(state, team, item, "explicitly_excluded");
      continue;
    }
    const value = sourceValue(item, mapping);
    if (value === null) {
      addItemExclusion(state, team, item, mapping.unitFactorToTarget === null ? "unknown_unit" : "missing_source_value");
      continue;
    }
    addCategoryValue(state, item, mapping, value);
  }
  for (const categoryRuleId of expectedCategoryIds) {
    if (seenCategoryIds.has(categoryRuleId)) continue;
    const mapping = mappings.get(categoryRuleId);
    state.excludedMeasures.push({ teamId: team.teamId, submissionId: team.certifiedSubmissionId, categoryCode: mapping?.categoryCode ?? categoryRuleId, reason: "incomplete_submission" });
  }
  if (hasIncompleteItems && !expectedCategoryIds.size) state.excludedMeasures.push({ teamId: team.teamId, submissionId: team.certifiedSubmissionId, categoryCode: "*", reason: "incomplete_submission" });
}

function aggregateTeams(input: SpogomiConsolidationInput, state: AggregationState, mappings: Map<string, SpogomiEnvironmentalMapping>): void {
  const expectedCategoryIds = new Set(input.mappings.map((mapping) => mapping.categoryRuleId));
  for (const team of input.teams) {
    const exclusion = teamExclusionReason(team);
    if (exclusion) {
      excludeTeam(state, team, exclusion);
      continue;
    }
    state.teamsIncluded += 1;
    state.sourceSubmissionIds.push(team.certifiedSubmissionId!);
    accumulateTeamItems(state, team, mappings, expectedCategoryIds);
  }
}

function buildAggregationProjection(input: SpogomiConsolidationInput, state: AggregationState): Omit<SpogomiConsolidationProjection, "sourceHash"> {
  const participantsPresent = new Set(input.participants.filter((participant) => participant.registrationStatus === "registered" && participant.attendanceStatus === "present").map((participant) => participant.id)).size;
  const categoriesWithoutMapping = input.mappings.filter((mapping) => mapping.status === "unmapped").map((mapping) => mapping.categoryCode);
  const blockingExclusions = state.excludedMeasures.filter((measure) => !["team_absent", "team_forfeit", "team_excluded"].includes(measure.reason));
  const readyForPublication = state.teamsIncluded > 0 && blockingExclusions.length === 0 && categoriesWithoutMapping.length === 0;
  const consolidationKey = buildSpogomiConsolidationKey(input.eventId, input.mappingVersion);
  const totalWaste = state.hasWasteMass ? normalizeNumber(state.totalWasteMassGrams) : null;
  const buttsMass = state.hasCigaretteButtsMass ? normalizeNumber(state.cigaretteButtsMassGrams) : null;
  const buttsCount = state.hasCigaretteButtsCount ? Math.trunc(state.cigaretteButtsCount) : null;
  const actionWasteKg = totalWaste === null ? null : Number((totalWaste / 1000).toFixed(2));
  return {
    readyForPublication: readyForPublication && blockingExclusions.length === 0, consolidationKey, projectionVersion: input.mappingVersion, eventId: input.eventId, actionId: input.actionId,
    teamsIncluded: state.teamsIncluded, participantsPresent, totalWasteMassGrams: totalWaste, cigaretteButtsMassGrams: buttsMass, cigaretteButtsCount: buttsCount,
    categoryTotals: [...state.categoryTotals.values()].sort((left, right) => left.categoryCode.localeCompare(right.categoryCode)), categoriesWithoutMapping, excludedMeasures: state.excludedMeasures, officialRoute: input.officialRoute, organizer: input.organizer, sourceSnapshot: input.sourceSnapshot,
    sourceSubmissionIds: [...new Set(state.sourceSubmissionIds)].sort((left, right) => left < right ? -1 : left > right ? 1 : 0), action: { wasteKg: actionWasteKg, cigaretteButts: buttsCount, volunteersCount: participantsPresent },
    consolidation: { consolidationKey, projectionVersion: input.mappingVersion, sourceHash: "", teamsIncluded: state.teamsIncluded, participantsPresent, totalWasteMassGrams: totalWaste, cigaretteButtsMassGrams: buttsMass, cigaretteButtsCount: buttsCount, categoriesWithoutMapping, excludedMeasures: state.excludedMeasures.map((measure) => `${measure.teamId}:${measure.categoryCode}:${measure.reason}`), officialReferenceOnly: input.officialRoute !== null },
  };
}

export function aggregateSpogomiEnvironmentalProjection(input: SpogomiConsolidationInput): Omit<SpogomiConsolidationProjection, "sourceHash"> {
  const mappings = new Map(input.mappings.map((mapping) => [mapping.categoryRuleId, mapping]));
  const state = createAggregationState();
  aggregateTeams(input, state, mappings);
  return buildAggregationProjection(input, state);
}
