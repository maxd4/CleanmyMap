import type { ActionMegotsCondition, ActionWasteBreakdown } from "@/lib/actions/types";
import type {
  ActionCigaretteButtsMeasurements,
  CigaretteButtsLotResult,
} from "@/lib/waste/cigarette-butts";
import { estimateActionWasteKg } from "@/lib/actions/impact-calculators";
import {
  BUTT_LENGTH_METERS,
  CIGARETTE_BUTTS_MASS_CONVERSION_VERSION,
  CIGARETTE_BUTTS_MASS_CONVERSION_VERSION_V1,
  computeImpactTerrain2026Co2Conversions,
  computeImpactTerrain2026WaterConversions,
  MEGOTS_CONDITIONS,
  MEGOTS_CONDITION_LABELS,
  WASTE_KG_PER_50L_BAG,
  WASTE_KG_PER_MECHANICAL_BICYCLE,
  estimateButtsWeightKg,
  isCigaretteButtsMassConversionVersion,
} from "./impact-terrain-2026";
import type { ImpactTerrain2026LocalizedText } from "./impact-terrain-2026";

export type ImpactTerrainActionMetricsInput = {
  wasteKg?: number | null;
  cigaretteButts?: number | null;
  cigaretteButtsMeasurements?: ActionCigaretteButtsMeasurements | null;
  wasteBreakdown?: Pick<
    ActionWasteBreakdown,
    "megotsCondition" | "megotsKg"
  > | null;
};

type ImpactTerrain2026ButtsMassProvenance =
  | "measured"
  | "estimated"
  | "mixed"
  | "unknown";

type ImpactTerrain2026ButtsMassContribution = {
  count: number;
  massKg: number | null;
  massProvenance: "measured" | "estimated" | "unknown";
  conversionVersion: string | null;
};

export type ImpactTerrain2026ButtsDistributionEntry = {
  condition: ActionMegotsCondition;
  label: ImpactTerrain2026LocalizedText;
  count: number;
  estimatedWeightKg: number | null;
  massProvenance: ImpactTerrain2026ButtsMassProvenance;
  conversionVersions: string[];
};

export type ImpactTerrain2026PublicResults = {
  wasteKg: number;
  wasteKnownActions: number;
  wasteCoverageRate: number;
  wasteBagsEquivalent: number;
  wasteMechanicalBicyclesEquivalent: number;
  buttsTotal: number;
  qualifiedButtsTotal: number;
  unqualifiedButtsTotal: number;
  buttsByCondition: ImpactTerrain2026ButtsDistributionEntry[];
  estimatedButtsWeightKg: number | null;
  buttsMassProvenance: ImpactTerrain2026ButtsMassProvenance | null;
  buttsMassConversionVersions: string[];
  buttsDistanceMeters: number;
  co2eKg: number;
  co2eGrams: number;
  co2CarKilometers: number;
  co2ParisMoscowCarTrips: number;
  co2ParisNewYorkFlightShares: number;
  waterLiters: number;
  waterOlympicPools: number;
  waterFrenchPersonYears: number;
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
  massContributions: Partial<
    Record<ActionMegotsCondition, ImpactTerrain2026ButtsMassContribution[]>
  > = {},
  fallbackVersion: string = CIGARETTE_BUTTS_MASS_CONVERSION_VERSION,
): ImpactTerrain2026ButtsDistributionEntry[] {
  return MEGOTS_CONDITIONS.map((condition) => {
    const contributions = massContributions[condition];
    const count = contributions
      ? contributions.reduce((sum, contribution) => sum + contribution.count, 0)
      : toFiniteNonNegativeNumber(counts[condition]);
    const resolvedContributions = contributions ?? (count > 0
      ? [{
          count,
          massKg: null,
          massProvenance: "unknown" as const,
          conversionVersion: fallbackVersion,
        }]
      : []);
    const resolvedMasses = resolvedContributions.map((contribution) => ({
      ...contribution,
      massConversionVersion: isCigaretteButtsMassConversionVersion(
        contribution.conversionVersion,
      )
        ? contribution.conversionVersion
        : null,
      massKg: contribution.massKg ?? (
        isCigaretteButtsMassConversionVersion(contribution.conversionVersion)
          ? estimateButtsWeightKg(
              contribution.count,
              condition,
              contribution.conversionVersion,
            )
          : null
      ),
      massProvenance: contribution.massKg !== null
        ? contribution.massProvenance
        : isCigaretteButtsMassConversionVersion(contribution.conversionVersion)
          ? "estimated" as const
          : "unknown" as const,
    }));
    const knownMasses = resolvedMasses.filter(
      (contribution) => contribution.massKg !== null,
    );
    const massProvenanceValues = new Set(
      resolvedMasses.map((contribution) => contribution.massProvenance),
    );
    const massProvenance: ImpactTerrain2026ButtsMassProvenance =
      resolvedMasses.length === 0
        ? "unknown"
        : knownMasses.length !== resolvedMasses.length
          ? "unknown"
          : massProvenanceValues.size === 1
            ? [...massProvenanceValues][0] as "measured" | "estimated"
            : "mixed";
    const conversionVersions = [...new Set(
      resolvedMasses
        .map((contribution) => contribution.conversionVersion)
        .filter((version): version is string => Boolean(version)),
    )];
    return {
      condition,
      label: MEGOTS_CONDITION_LABELS[condition],
      count,
      estimatedWeightKg:
        count === 0
          ? 0
          : knownMasses.length === resolvedMasses.length
            ? knownMasses.reduce((sum, contribution) => sum + (contribution.massKg ?? 0), 0)
            : null,
      massProvenance,
      conversionVersions,
    };
  }).filter((entry) => entry.count > 0);
}

export function buildImpactTerrain2026PublicResults(params: {
  wasteKg?: number | null;
  wasteKnownActions?: number | null;
  wasteActionCount?: number | null;
  buttsTotal?: number | null;
  qualifiedButtsByCondition?: ImpactTerrain2026ConditionCounts;
  qualifiedButtsMassByCondition?: Partial<
    Record<ActionMegotsCondition, ImpactTerrain2026ButtsMassContribution[]>
  >;
  buttsMassConversionVersion?: string;
}): ImpactTerrain2026PublicResults {
  const wasteKg = toFiniteNonNegativeNumber(params.wasteKg);
  const wasteKnownActions = toFiniteNonNegativeNumber(params.wasteKnownActions);
  const wasteActionCount = toFiniteNonNegativeNumber(params.wasteActionCount);
  const buttsTotal = toFiniteNonNegativeNumber(params.buttsTotal);
  const buttsByCondition = buildConditionEntries(
    params.qualifiedButtsByCondition ?? {},
    params.qualifiedButtsMassByCondition,
    params.buttsMassConversionVersion,
  );
  const qualifiedButtsTotal = Math.min(
    buttsTotal,
    buttsByCondition.reduce((sum, entry) => sum + entry.count, 0),
  );
  const unqualifiedButtsTotal = Math.max(0, buttsTotal - qualifiedButtsTotal);
  const qualifiedWeightKg = buttsByCondition.reduce(
    (sum, entry) => sum + (entry.estimatedWeightKg ?? 0),
    0,
  );
  const buttsMassConversionVersions = [...new Set(
    buttsByCondition.flatMap((entry) => entry.conversionVersions),
  )];
  const buttsMassProvenance =
    qualifiedButtsTotal === 0
      ? null
      : buttsByCondition.some((entry) => entry.massProvenance === "unknown")
        ? "unknown"
        : new Set(buttsByCondition.map((entry) => entry.massProvenance)).size === 1
          ? buttsByCondition[0]?.massProvenance ?? "unknown"
          : "mixed";
  const co2Conversions = computeImpactTerrain2026Co2Conversions(wasteKg);
  const waterConversions =
    computeImpactTerrain2026WaterConversions(buttsTotal);

  return {
    wasteKg,
    wasteKnownActions,
    wasteCoverageRate:
      wasteActionCount > 0 ? (wasteKnownActions / wasteActionCount) * 100 : 0,
    wasteBagsEquivalent: wasteKg / WASTE_KG_PER_50L_BAG,
    wasteMechanicalBicyclesEquivalent:
      wasteKg / WASTE_KG_PER_MECHANICAL_BICYCLE,
    buttsTotal,
    qualifiedButtsTotal,
    unqualifiedButtsTotal,
    buttsByCondition,
    estimatedButtsWeightKg:
      qualifiedButtsTotal > 0 && buttsByCondition.every((entry) => entry.estimatedWeightKg !== null)
        ? qualifiedWeightKg
        : buttsTotal === 0
          ? 0
          : null,
    buttsMassProvenance,
    buttsMassConversionVersions,
    buttsDistanceMeters: buttsTotal * BUTT_LENGTH_METERS,
    co2eKg: co2Conversions.co2eKg,
    co2eGrams: co2Conversions.co2eGrams,
    co2CarKilometers: co2Conversions.carKilometers,
    co2ParisMoscowCarTrips: co2Conversions.parisMoscowCarTrips,
    co2ParisNewYorkFlightShares: co2Conversions.parisNewYorkFlightShares,
    waterLiters: waterConversions.waterLiters,
    waterOlympicPools: waterConversions.olympicPools,
    waterFrenchPersonYears: waterConversions.frenchPersonYears,
  };
}

function estimateActionWasteKgFromImpactTerrainMetrics(
  input: ImpactTerrainActionMetricsInput,
): number | null {
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
  let wasteKnownActions = 0;
  let buttsTotal = 0;
  const qualifiedButtsByCondition: ImpactTerrain2026ConditionCounts = {};
  const qualifiedButtsMassByCondition: Partial<
    Record<ActionMegotsCondition, ImpactTerrain2026ButtsMassContribution[]>
  > = {};

  for (const action of actions) {
    const actionButts = toFiniteNonNegativeNumber(action.cigaretteButts);
    const measuredWasteKg = estimateActionWasteKgFromImpactTerrainMetrics(action);
    if (measuredWasteKg !== null) {
      wasteKg += measuredWasteKg;
      wasteKnownActions += 1;
    }
    buttsTotal += actionButts;

    const lotContributions = action.cigaretteButtsMeasurements?.cigaretteButtsLotResults;
    if (lotContributions && lotContributions.length > 0) {
      for (const result of lotContributions) {
        if (result.count <= 0) continue;
        qualifiedButtsByCondition[result.condition] =
          (qualifiedButtsByCondition[result.condition] ?? 0) + result.count;
        qualifiedButtsMassByCondition[result.condition] = [
          ...(qualifiedButtsMassByCondition[result.condition] ?? []),
          toMassContribution(result),
        ];
      }
    } else {
      const condition = action.wasteBreakdown?.megotsCondition;
      if (condition && actionButts > 0) {
        qualifiedButtsByCondition[condition] =
          (qualifiedButtsByCondition[condition] ?? 0) + actionButts;
        qualifiedButtsMassByCondition[condition] = [
          ...(qualifiedButtsMassByCondition[condition] ?? []),
          toActionMassContribution(action, actionButts),
        ];
      }
    }
  }

  return buildImpactTerrain2026PublicResults({
    wasteKg,
    wasteKnownActions,
    wasteActionCount: actions.length,
    buttsTotal,
    qualifiedButtsByCondition,
    qualifiedButtsMassByCondition,
  });
}

function toMassContribution(
  result: CigaretteButtsLotResult,
): ImpactTerrain2026ButtsMassContribution {
  return {
    count: result.count,
    massKg: result.massKg,
    massProvenance: result.massProvenance === "measured"
      ? "measured"
      : "estimated",
    conversionVersion:
      result.massConversionFormulaVersion ?? result.volumeConversionFormulaVersion,
  };
}

function toActionMassContribution(
  action: ImpactTerrainActionMetricsInput,
  count: number,
): ImpactTerrain2026ButtsMassContribution {
  const measurements = action.cigaretteButtsMeasurements;
  const massKg = measurements?.cigaretteButtsMassKg ?? null;
  return {
    count,
    massKg,
    massProvenance: massKg === null
      ? "unknown"
      : measurements?.cigaretteButtsMassProvenance === "measured"
        ? "measured"
        : "estimated",
    conversionVersion: measurements
      ? measurements.cigaretteButtsConversionFormulaVersion ?? null
      : CIGARETTE_BUTTS_MASS_CONVERSION_VERSION_V1,
  };
}

export function buildImpactTerrain2026PublicResultsFromAggregate(params: {
  wasteKg?: unknown;
  wasteKnownActions?: unknown;
  wasteActionCount?: unknown;
  cigaretteButts?: unknown;
  buttsByCondition?: unknown;
  buttsMassConversionVersion?: string;
}): ImpactTerrain2026PublicResults {
  const qualifiedButtsByCondition: ImpactTerrain2026ConditionCounts = {};
  const qualifiedButtsMassByCondition: Partial<
    Record<ActionMegotsCondition, ImpactTerrain2026ButtsMassContribution[]>
  > = {};
  if (Array.isArray(params.buttsByCondition)) {
    for (const entry of params.buttsByCondition) {
      if (typeof entry !== "object" || entry === null) continue;
      const record = entry as Record<string, unknown>;
      const condition = record.condition;
      if (
        typeof condition === "string" &&
        MEGOTS_CONDITIONS.includes(condition as ActionMegotsCondition)
      ) {
        const typedCondition = condition as ActionMegotsCondition;
        qualifiedButtsByCondition[typedCondition] =
          toFiniteNonNegativeNumber(record.count);
        if (Array.isArray(record.massContributions)) {
          const massContributions = record.massContributions.flatMap((value) => {
            if (typeof value !== "object" || value === null) return [];
            const contribution = value as Record<string, unknown>;
            const count = toFiniteNonNegativeNumber(contribution.count);
            if (count <= 0) return [];
            const rawMassKg = contribution.massKg;
            const massKg = rawMassKg === null || rawMassKg === undefined
              ? null
              : toFiniteNonNegativeNumber(rawMassKg);
            const massProvenance: ImpactTerrain2026ButtsMassContribution["massProvenance"] = contribution.massProvenance === "measured"
              ? "measured"
              : contribution.massProvenance === "estimated"
                ? "estimated"
                : "unknown";
            const conversionVersion = typeof contribution.conversionVersion === "string" &&
                contribution.conversionVersion.trim().length > 0
              ? contribution.conversionVersion
              : null;
            return [{
              count,
              massKg,
              massProvenance,
              conversionVersion,
            }];
          });
          if (massContributions.length > 0) {
            qualifiedButtsMassByCondition[typedCondition] = massContributions;
          }
        }
      }
    }
  }

  return buildImpactTerrain2026PublicResults({
    wasteKg: Number(params.wasteKg ?? 0),
    wasteKnownActions: Number(params.wasteKnownActions ?? 0),
    wasteActionCount: Number(params.wasteActionCount ?? 0),
    buttsTotal: Number(params.cigaretteButts ?? 0),
    qualifiedButtsByCondition,
    qualifiedButtsMassByCondition,
    buttsMassConversionVersion:
      params.buttsMassConversionVersion ?? CIGARETTE_BUTTS_MASS_CONVERSION_VERSION_V1,
  });
}

export const IMPACT_TERRAIN_2026_RESULTS_CONTRACT_VERSION =
  "impact-terrain-results-2026.09-v1";
