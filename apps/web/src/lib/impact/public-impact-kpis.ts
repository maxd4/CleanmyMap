import type { ActionImpactInput } from "@/lib/actions/impact-calculators";
import { toFiniteNonNegativeInteger } from "@/lib/data/number-normalization";
import {
  buildImpactTerrain2026PublicResultsFromAggregate,
  buildImpactTerrain2026PublicResultsFromActions,
  type ImpactTerrain2026PublicResults,
  type ImpactTerrainActionMetricsInput,
} from "./impact-terrain-2026-results";
import {
  computeImpactTerrain2026StreetCleaningSavings,
  type ImpactTerrain2026StreetCleaningSavings,
} from "./impact-terrain-2026";

type PublicImpactKpiKey =
  "wasteKg" | "butts" | "volunteers" | "co2" | "water" | "euro";

type PublicImpactKpiClassification = "terrain" | "proxy";

export type PublicImpactCounters = {
  wasteKg: number;
  butts: number;
  volunteers: number;
  co2: number;
  water: number;
  euro: number;
  volunteersKnownActions?: number;
  volunteersActionCount?: number;
  volunteersCoverageRate?: number;
};

export type PublicImpactMetric = {
  key: PublicImpactKpiKey;
  label: string;
  value: string;
  unit: "kg" | "L" | "€" | null;
  decimals: 0 | 1;
  category: "Résultat" | "Équivalent" | "Économique";
  accent: "blue" | "emerald" | "amber";
  classification: PublicImpactKpiClassification;
};

type PublicImpactKpiDefinition = Omit<PublicImpactMetric, "value">;

export const PUBLIC_IMPACT_KPI_DEFINITIONS: readonly PublicImpactKpiDefinition[] =
  [
    {
      key: "wasteKg",
      label: "Déchets récoltés",
      unit: "kg",
      decimals: 1,
      category: "Résultat",
      accent: "blue",
      classification: "terrain",
    },
    {
      key: "butts",
      label: "Mégots retirés",
      unit: null,
      decimals: 0,
      category: "Résultat",
      accent: "blue",
      classification: "terrain",
    },
    {
      key: "volunteers",
      label: "Bénévoles mobilisés",
      unit: null,
      decimals: 0,
      category: "Résultat",
      accent: "blue",
      classification: "terrain",
    },
    {
      key: "co2",
      label: "CO₂e évité",
      unit: "kg",
      decimals: 1,
      category: "Équivalent",
      accent: "emerald",
      classification: "proxy",
    },
    {
      key: "water",
      label: "Eau préservée",
      unit: "L",
      decimals: 0,
      category: "Équivalent",
      accent: "emerald",
      classification: "proxy",
    },
    {
      key: "euro",
      label: "Économie de voirie",
      unit: "€",
      decimals: 0,
      category: "Économique",
      accent: "amber",
      classification: "proxy",
    },
  ] as const;

const PUBLIC_IMPACT_KPI_VALUES: Readonly<
  Record<PublicImpactKpiKey, keyof PublicImpactCounters>
> = {
  wasteKg: "wasteKg",
  butts: "butts",
  volunteers: "volunteers",
  co2: "co2",
  water: "water",
  euro: "euro",
};

function formatPublicImpactValue(
  value: number,
  definition: PublicImpactKpiDefinition,
  hasData: boolean,
): string {
  if (!hasData) {
    return "n/a";
  }

  const normalized = Number.isFinite(value) ? value : 0;
  const rounded =
    definition.decimals === 0 ? Math.round(normalized) : normalized;
  const formatted = rounded.toLocaleString("fr-FR", {
    minimumFractionDigits: definition.decimals,
    maximumFractionDigits: definition.decimals,
  });

  return definition.unit ? `${formatted} ${definition.unit}` : formatted;
}

export function buildPublicImpactMetrics(
  counters: PublicImpactCounters,
  hasData: boolean,
): PublicImpactMetric[] {
  return PUBLIC_IMPACT_KPI_DEFINITIONS.map((definition) => ({
    ...definition,
    value: formatPublicImpactValue(
      counters[PUBLIC_IMPACT_KPI_VALUES[definition.key]] ?? 0,
      definition,
      definition.key === "volunteers" &&
        counters.volunteersKnownActions !== undefined &&
        counters.volunteersKnownActions === 0
        ? false
        : hasData,
    ),
  }));
}

export type PublicImpactActionInput = ActionImpactInput & {
  metadata: ActionImpactInput["metadata"] & {
    actionPhase?: string | null;
  };
};

export type PublicImpactCalculation = {
  counters: PublicImpactCounters;
  impactTerrain: ImpactTerrain2026PublicResults;
  streetCleaningSavings: ImpactTerrain2026StreetCleaningSavings;
  volunteersKnownActions: number;
  volunteersActionCount: number;
  volunteersCoverageRate: number;
};

function buildPublicImpactCounters(
  impactTerrain: ImpactTerrain2026PublicResults,
  streetCleaningSavings: ImpactTerrain2026StreetCleaningSavings,
  volunteers: number,
  volunteerCoverage: {
    knownActions: number;
    actionCount: number;
  },
): PublicImpactCounters {
  return {
    wasteKg: impactTerrain.wasteKg,
    butts: impactTerrain.buttsTotal,
    volunteers,
    co2: impactTerrain.co2eKg,
    water: impactTerrain.waterLiters,
    euro: Math.round(streetCleaningSavings.massEstimateEuros),
    volunteersKnownActions: volunteerCoverage.knownActions,
    volunteersActionCount: volunteerCoverage.actionCount,
    volunteersCoverageRate:
      volunteerCoverage.actionCount > 0
        ? (volunteerCoverage.knownActions / volunteerCoverage.actionCount) * 100
        : 0,
  };
}

export function isPublicImpactActionInputEligible(
  action: PublicImpactActionInput,
): boolean {
  return action.metadata.actionPhase !== "pre_action";
}

/**
 * Canonical public Impact calculation. Future preparation rows are excluded
 * here, at the Impact boundary, rather than relying on their current values.
 */
export function buildPublicImpactCalculationFromActions(
  actions: readonly PublicImpactActionInput[],
): PublicImpactCalculation {
  const eligibleActions = actions.filter(isPublicImpactActionInputEligible);
  const terrainInputs = eligibleActions.map(
    (action): ImpactTerrainActionMetricsInput => action.metadata,
  );
  const impactTerrain =
    buildImpactTerrain2026PublicResultsFromActions(terrainInputs);
  const totalDurationMinutes = eligibleActions.reduce(
    (total, action) =>
      total + toFiniteNonNegativeInteger(action.metadata.durationMinutes),
    0,
  );
  const volunteers = eligibleActions.reduce(
    (total, action) =>
      total +
      (action.metadata.volunteersCount === null ||
      action.metadata.volunteersCount === undefined
        ? 0
        : toFiniteNonNegativeInteger(action.metadata.volunteersCount)),
    0,
  );
  const volunteersKnownActions = eligibleActions.filter(
    (action) =>
      action.metadata.volunteersCount !== null &&
      action.metadata.volunteersCount !== undefined &&
      Number.isFinite(action.metadata.volunteersCount) &&
      action.metadata.volunteersCount >= 0,
  ).length;
  const streetCleaningSavings = computeImpactTerrain2026StreetCleaningSavings({
    wasteKg: impactTerrain.wasteKg,
    durationMinutes: totalDurationMinutes,
  });

  return {
    counters: buildPublicImpactCounters(
      impactTerrain,
      streetCleaningSavings,
      volunteers,
      { knownActions: volunteersKnownActions, actionCount: eligibleActions.length },
    ),
    impactTerrain,
    streetCleaningSavings,
    volunteersKnownActions,
    volunteersActionCount: eligibleActions.length,
    volunteersCoverageRate:
      eligibleActions.length > 0
        ? (volunteersKnownActions / eligibleActions.length) * 100
        : 0,
  };
}

export function buildPublicImpactCalculationFromAggregate(params: {
  wasteKg?: unknown;
  wasteKnownActions?: unknown;
  wasteActionCount?: unknown;
  cigaretteButts?: unknown;
  buttsByCondition?: unknown;
  durationMinutes: number;
  volunteers?: unknown;
  volunteersKnownActions?: unknown;
  volunteersActionCount?: unknown;
}): PublicImpactCalculation {
  const impactTerrain = buildImpactTerrain2026PublicResultsFromAggregate({
    wasteKg: params.wasteKg,
    wasteKnownActions: params.wasteKnownActions,
    wasteActionCount: params.wasteActionCount,
    cigaretteButts: params.cigaretteButts,
    buttsByCondition: params.buttsByCondition,
  });
  const normalizedDurationMinutes = toFiniteNonNegativeInteger(
    params.durationMinutes,
  );
  const streetCleaningSavings = computeImpactTerrain2026StreetCleaningSavings({
    wasteKg: impactTerrain.wasteKg,
    durationMinutes: normalizedDurationMinutes,
  });
  const normalizedVolunteers = toFiniteNonNegativeInteger(params.volunteers as number | null | undefined);
  const volunteersActionCount = toFiniteNonNegativeInteger(
    params.volunteersActionCount,
  );
  const volunteersKnownActions = Math.min(
    volunteersActionCount,
    toFiniteNonNegativeInteger(params.volunteersKnownActions),
  );

  return {
    counters: buildPublicImpactCounters(
      impactTerrain,
      streetCleaningSavings,
      normalizedVolunteers,
      {
        knownActions: volunteersKnownActions,
        actionCount: volunteersActionCount,
      },
    ),
    impactTerrain,
    streetCleaningSavings,
    volunteersKnownActions,
    volunteersActionCount,
    volunteersCoverageRate:
      volunteersActionCount > 0
        ? (volunteersKnownActions / volunteersActionCount) * 100
        : 0,
  };
}
