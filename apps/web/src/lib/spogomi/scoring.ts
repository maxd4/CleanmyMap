import { isRegulationReadyForCertification, validateResultItem } from "./validation";
import type {
  SpogomiCompetitionInput,
  SpogomiCompetitionResult,
  SpogomiPenalty,
  SpogomiPhysicalTotals,
  SpogomiRegulation,
} from "./types";

function round(value: number, decimals: number, mode: "half_up" | "down" | "up"): number {
  const factor = 10 ** decimals;
  if (mode === "down") return Math.floor(value * factor) / factor;
  if (mode === "up") return Math.ceil(value * factor) / factor;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

function sumNullable(values: Array<number | null | undefined>): number | null {
  const present = values.filter((value): value is number => value !== null && value !== undefined);
  return present.length ? present.reduce((total, value) => total + value, 0) : null;
}

export function calculateSpogomiCompetitionResult(input: SpogomiCompetitionInput): SpogomiCompetitionResult {
  const { regulation } = input;
  const physicalTotals: SpogomiPhysicalTotals = {
    massGrams: sumNullable(input.items.map((item) => item.massGrams)),
    countedObjects: sumNullable(input.items.map((item) => item.objectCount)),
    presentParticipants: input.presentParticipants,
  };
  const comparableForButtsPerParticipant = physicalTotals.countedObjects !== null && input.presentParticipants > 0;
  const buttsPerParticipant = comparableForButtsPerParticipant
    ? physicalTotals.countedObjects! / input.presentParticipants
    : null;
  const appliedPenalties = input.appliedPenalties ?? [];

  if (!isRegulationReadyForCertification(regulation)) {
    return {
      physicalTotals,
      officialScore: null,
      scoreStatus: "unavailable",
      appliedPenalties,
      comparableForButtsPerParticipant,
      buttsPerParticipant,
      ineligibleReason: "regulation_incomplete",
    };
  }

  const minimumPresent = regulation.eligibility?.minimumPresentParticipants ?? null;
  if (minimumPresent !== null && input.presentParticipants < minimumPresent) {
    return {
      physicalTotals,
      officialScore: null,
      scoreStatus: "unavailable",
      appliedPenalties,
      comparableForButtsPerParticipant,
      buttsPerParticipant,
      ineligibleReason: "minimum_present_participants_not_met",
    };
  }

  const categories = new Map(regulation.categories.map((category) => [category.code, category]));
  const scoreBeforePenalties = input.items.reduce((total, item) => {
    const category = categories.get(item.categoryCode);
    if (!category || item.quantity === null || category.coefficient === null) return total;
    return total + item.quantity * category.coefficient;
  }, 0);
  const penaltyPoints = appliedPenalties.reduce((total, penalty) => total + penalty.points, 0);
  const rounded = round(scoreBeforePenalties - penaltyPoints, regulation.rounding!.decimals, regulation.rounding!.mode);

  return {
    physicalTotals,
    officialScore: rounded,
    scoreStatus: "official",
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

export function listConfiguredPenalties(regulation: SpogomiRegulation): SpogomiPenalty[] {
  return regulation.penalties ?? [];
}
