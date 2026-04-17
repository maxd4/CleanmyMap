import type { ActionDataContract } from "./data-contract";
import { evaluateActionQuality } from "./quality";
import { toActionListItem } from "./data-contract";
import type { ActionImpactLevel, ActionQualityGrade } from "./types";

export type ActionInsights = {
  qualityScore: number;
  qualityGrade: ActionQualityGrade;
  qualityFlags: string[];
  qualityBreakdown: {
    completeness: number;
    coherence: number;
    geoloc: number;
    traceability: number;
    freshness: number;
  };
  toFixPriority: boolean;
  impactLevel: ActionImpactLevel;
};

function computeImpactLevel(contract: ActionDataContract): ActionImpactLevel {
  const kg = Number(contract.metadata.wasteKg || 0);
  const butts = Number(contract.metadata.cigaretteButts || 0);
  const volunteers = Number(contract.metadata.volunteersCount || 0);
  const duration = Number(contract.metadata.durationMinutes || 0);
  const score =
    kg * 5 + butts * 0.035 + volunteers * 1.6 + duration * 0.05;
  if (score >= 80) {
    return "critique";
  }
  if (score >= 60) {
    return "fort";
  }
  if (score >= 30) {
    return "moyen";
  }
  return "faible";
}

export function buildActionInsights(
  contract: ActionDataContract,
  now: Date = new Date(),
): ActionInsights {
  const quality = evaluateActionQuality(toActionListItem(contract), now);
  const toFixPriority =
    quality.grade === "C" ||
    quality.flags.length >= 2 ||
    quality.breakdown.geoloc < 70;

  return {
    qualityScore: quality.score,
    qualityGrade: quality.grade,
    qualityFlags: quality.flags,
    qualityBreakdown: quality.breakdown,
    toFixPriority,
    impactLevel: computeImpactLevel(contract),
  };
}
