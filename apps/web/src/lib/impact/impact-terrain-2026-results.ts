import type { ActionMegotsCondition, ActionWasteBreakdown } from "@/lib/actions/types";
import { estimateActionWasteKg } from "@/lib/actions/impact-calculators";
import {
  BUTT_LENGTH_METERS,
  BUTTS_PER_KG_REFERENCE,
  CONDITION_WEIGHT_FACTORS,
  MEGOTS_CONDITIONS,
  MEGOTS_CONDITION_LABELS,
  WASTE_KG_PER_50L_BAG,
  WASTE_KG_PER_MECHANICAL_BICYCLE,
  estimateButtsWeightKg,
} from "./impact-terrain-2026";
import type { ImpactTerrain2026LocalizedText } from "./impact-terrain-2026";

export type ImpactTerrainActionMetricsInput = {
  wasteKg?: number | null;
  cigaretteButts?: number | null;
  wasteBreakdown?: Pick<
    ActionWasteBreakdown,
    "megotsCondition" | "megotsKg"
  > | null;
};

export type ImpactTerrain2026ButtsDistributionEntry = {
  condition: ActionMegotsCondition;
  label: ImpactTerrain2026LocalizedText;
  count: number;
  estimatedWeightKg: number;
};

export type ImpactTerrain2026PublicResults = {
  wasteKg: number;
  wasteBagsEquivalent: number;
  wasteMechanicalBicyclesEquivalent: number;
  buttsTotal: number;
  qualifiedButtsTotal: number;
  unqualifiedButtsTotal: number;
  buttsByCondition: ImpactTerrain2026ButtsDistributionEntry[];
  estimatedButtsWeightKg: number;
  buttsDistanceMeters: number;
};

export type ImpactTerrain2026ConditionCounts = Partial<
  Record<ActionMegotsCondition, number>
>;

function toFiniteNonNegativeNumber(value: unknown): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
}

function buildConditionEntries(
  counts: ImpactTerrain2026ConditionCounts,
): ImpactTerrain2026ButtsDistributionEntry[] {
  return MEGOTS_CONDITIONS.map((condition) => {
    const count = toFiniteNonNegativeNumber(counts[condition]);
    return {
      condition,
      label: MEGOTS_CONDITION_LABELS[condition],
      count,
      estimatedWeightKg: estimateButtsWeightKg(count, condition),
    };
  }).filter((entry) => entry.count > 0);
}

export function buildImpactTerrain2026PublicResults(params: {
  wasteKg?: number | null;
  buttsTotal?: number | null;
  qualifiedButtsByCondition?: ImpactTerrain2026ConditionCounts;
}): ImpactTerrain2026PublicResults {
  const wasteKg = toFiniteNonNegativeNumber(params.wasteKg);
  const buttsTotal = toFiniteNonNegativeNumber(params.buttsTotal);
  const buttsByCondition = buildConditionEntries(
    params.qualifiedButtsByCondition ?? {},
  );
  const qualifiedButtsTotal = Math.min(
    buttsTotal,
    buttsByCondition.reduce((sum, entry) => sum + entry.count, 0),
  );
  const unqualifiedButtsTotal = Math.max(0, buttsTotal - qualifiedButtsTotal);
  const qualifiedWeightKg = buttsByCondition.reduce(
    (sum, entry) => sum + entry.estimatedWeightKg,
    0,
  );

  return {
    wasteKg,
    wasteBagsEquivalent: wasteKg / WASTE_KG_PER_50L_BAG,
    wasteMechanicalBicyclesEquivalent:
      wasteKg / WASTE_KG_PER_MECHANICAL_BICYCLE,
    buttsTotal,
    qualifiedButtsTotal,
    unqualifiedButtsTotal,
    buttsByCondition,
    estimatedButtsWeightKg:
      qualifiedWeightKg +
      estimateButtsWeightKg(unqualifiedButtsTotal, null),
    buttsDistanceMeters: buttsTotal * BUTT_LENGTH_METERS,
  };
}

export function estimateActionWasteKgFromImpactTerrainMetrics(
  input: ImpactTerrainActionMetricsInput,
): number {
  return estimateActionWasteKg({
    metadata: {
      wasteKg: input.wasteKg,
      cigaretteButts: input.cigaretteButts,
      wasteBreakdown: input.wasteBreakdown,
    },
  });
}

export function buildImpactTerrain2026PublicResultsFromActions(
  actions: readonly ImpactTerrainActionMetricsInput[],
): ImpactTerrain2026PublicResults {
  let wasteKg = 0;
  let buttsTotal = 0;
  const qualifiedButtsByCondition: ImpactTerrain2026ConditionCounts = {};

  for (const action of actions) {
    const actionButts = toFiniteNonNegativeNumber(action.cigaretteButts);
    wasteKg += estimateActionWasteKgFromImpactTerrainMetrics(action);
    buttsTotal += actionButts;

    const condition = action.wasteBreakdown?.megotsCondition;
    if (condition && actionButts > 0) {
      qualifiedButtsByCondition[condition] =
        (qualifiedButtsByCondition[condition] ?? 0) + actionButts;
    }
  }

  return buildImpactTerrain2026PublicResults({
    wasteKg,
    buttsTotal,
    qualifiedButtsByCondition,
  });
}

export function buildImpactTerrain2026PublicResultsFromAggregate(params: {
  wasteKg?: unknown;
  cigaretteButts?: unknown;
  buttsByCondition?: unknown;
}): ImpactTerrain2026PublicResults {
  const qualifiedButtsByCondition: ImpactTerrain2026ConditionCounts = {};
  if (Array.isArray(params.buttsByCondition)) {
    for (const entry of params.buttsByCondition) {
      if (typeof entry !== "object" || entry === null) continue;
      const record = entry as Record<string, unknown>;
      const condition = record.condition;
      if (
        typeof condition === "string" &&
        MEGOTS_CONDITIONS.includes(condition as ActionMegotsCondition)
      ) {
        qualifiedButtsByCondition[condition as ActionMegotsCondition] =
          toFiniteNonNegativeNumber(record.count);
      }
    }
  }

  return buildImpactTerrain2026PublicResults({
    wasteKg: Number(params.wasteKg ?? 0),
    buttsTotal: Number(params.cigaretteButts ?? 0),
    qualifiedButtsByCondition,
  });
}

export function getConditionFactor(condition: ActionMegotsCondition): number {
  return CONDITION_WEIGHT_FACTORS[condition];
}

export const IMPACT_TERRAIN_2026_RESULTS_CONTRACT_VERSION =
  "impact-terrain-results-2026.09-v1";

export const IMPACT_TERRAIN_2026_RESULTS_FORMULA_REFERENCE =
  `masse_qualifiee = somme(mégots_etat / (${BUTTS_PER_KG_REFERENCE} × facteur_etat))`;
