import { isRegulationReadyForCertification, validateResultItem } from "./validation";
import type {
  SpogomiCompetitionInput,
  SpogomiCompetitionResult,
  SpogomiPhysicalTotals,
} from "./types";

function round(value: number, decimals: number, mode: "half_up" | "down" | "up"): number {
  const factor = 10 ** decimals;
  if (mode === "down") return Math.floor(value * factor) / factor;
  if (mode === "up") return Math.ceil(value * factor) / factor;
  const scaled = value * factor;
  return (scaled >= 0 ? Math.floor(scaled + 0.5) : Math.ceil(scaled - 0.5)) / factor;
}
function sumNullable(values: Array<number | null | undefined>): number | null {
  const present = values.filter((value): value is number => value !== null && value !== undefined);
  return present.length ? present.reduce((total, value) => total + value, 0) : null;
}

function buildPhysicalTotals(input: SpogomiCompetitionInput, buttItems: SpogomiCompetitionInput["items"], hasCompleteButtCount: boolean): SpogomiPhysicalTotals {
  return {
    massGrams: sumNullable(input.items.map((item) => item.massGrams)),
    countedObjects: sumNullable(input.items.map((item) => item.objectCount)),
    countedButts: hasCompleteButtCount ? sumNullable(buttItems.map((item) => item.objectCount)) : null,
    buttMassGrams: sumNullable(buttItems.map((item) => item.massGrams)),
    presentParticipants: input.presentParticipants,
  };
}

function unavailableResult(
  physicalTotals: SpogomiPhysicalTotals,
  appliedPenalties: NonNullable<SpogomiCompetitionInput["appliedPenalties"]>,
  comparableForButtsPerParticipant: boolean,
  buttsPerParticipant: number | null,
  ineligibleReason: string,
): SpogomiCompetitionResult {
  return { physicalTotals, officialScore: null, scoreStatus: "unavailable", appliedPenalties, comparableForButtsPerParticipant, buttsPerParticipant, ineligibleReason };
}

function hasAllRequiredCategories(input: SpogomiCompetitionInput): boolean {
  const categoryCodes = new Set(input.regulation.categories.map((category) => category.code));
  const measuredCodes = new Set(input.items.filter((item) => item.quantity !== null).map((item) => item.categoryCode));
  return measuredCodes.size === categoryCodes.size && [...categoryCodes].every((code) => measuredCodes.has(code));
}

function calculateOfficialScore(input: SpogomiCompetitionInput): number {
  const categories = new Map(input.regulation.categories.map((category) => [category.code, category]));
  const scoreBeforePenalties = input.items.reduce((total, item) => {
    const category = categories.get(item.categoryCode);
    return !category || item.quantity === null || category.coefficient === null ? total : total + item.quantity * category.coefficient;
  }, 0);
  const penaltyPoints = (input.appliedPenalties ?? []).reduce((total, penalty) => total + penalty.points, 0);
  return round(scoreBeforePenalties - penaltyPoints, input.regulation.rounding!.decimals, input.regulation.rounding!.mode);
}

function completeButtCount(input: SpogomiCompetitionInput, buttCategoryCodes: Set<string>): { items: SpogomiCompetitionInput["items"]; complete: boolean } {
  const items = input.items.filter((item) => buttCategoryCodes.has(item.categoryCode));
  return { items, complete: buttCategoryCodes.size > 0 && items.length === buttCategoryCodes.size && items.every((item) => item.objectCount !== null && item.objectCount !== undefined) };
}

export function calculateSpogomiCompetitionResult(input: SpogomiCompetitionInput): SpogomiCompetitionResult {
  const { regulation } = input;
  const buttCategoryCodes = new Set(
    regulation.categories
      .filter((category) => category.environmentalCategorySlug === "cigarette_butt")
      .map((category) => category.code),
  );
  const buttCount = completeButtCount(input, buttCategoryCodes);
  const physicalTotals = buildPhysicalTotals(input, buttCount.items, buttCount.complete);
  const comparableForButtsPerParticipant = physicalTotals.countedButts !== null && input.presentParticipants > 0;
  const buttsPerParticipant = comparableForButtsPerParticipant
    ? physicalTotals.countedButts! / input.presentParticipants
    : null;
  const appliedPenalties = input.appliedPenalties ?? [];

  if (!isRegulationReadyForCertification(regulation)) {
    return unavailableResult(physicalTotals, appliedPenalties, comparableForButtsPerParticipant, buttsPerParticipant, "regulation_incomplete");
  }

  const itemValidation = validateCompetitionItems(input);
  if (!itemValidation.ok) {
    return unavailableResult(physicalTotals, appliedPenalties, comparableForButtsPerParticipant, buttsPerParticipant, itemValidation.reason);
  }

  if (input.submissionStatus === "certified" && regulation.eligibility?.requiresAllCategories) {
    if (!hasAllRequiredCategories(input)) return unavailableResult(physicalTotals, appliedPenalties, comparableForButtsPerParticipant, buttsPerParticipant, "all_categories_required");
  }

  const minimumPresent = regulation.eligibility?.minimumPresentParticipants ?? null;
  if (minimumPresent !== null && input.presentParticipants < minimumPresent) {
    return unavailableResult(physicalTotals, appliedPenalties, comparableForButtsPerParticipant, buttsPerParticipant, "minimum_present_participants_not_met");
  }

  return {
    physicalTotals,
    officialScore: calculateOfficialScore(input),
    scoreStatus: input.submissionStatus === "certified" ? "official" : "preview",
    appliedPenalties,
    comparableForButtsPerParticipant,
    buttsPerParticipant,
    ineligibleReason: null,
  };
}

export function validateCompetitionItems(input: SpogomiCompetitionInput): { ok: true } | { ok: false; reason: string } {
  const categories = new Map(input.regulation.categories.map((category) => [category.code, category]));
  for (const item of input.items) {
    const category = categories.get(item.categoryCode);
    if (!category) return { ok: false, reason: "unknown_category" };
    const result = validateResultItem(item, category);
    if (!result.ok) return result;
  }
  if (input.presentParticipants < 0 || !Number.isInteger(input.presentParticipants)) {
    return { ok: false, reason: "present_participants_must_be_a_non_negative_integer" };
  }
  return { ok: true };
}
