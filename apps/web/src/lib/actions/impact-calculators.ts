import type { ActionWasteBreakdown } from "./types";
import { IMPACT_PROXY_CONFIG } from "@/lib/gamification/impact-proxy-config";
import {
  BUTTS_PER_KG_REFERENCE,
  computeImpactTerrain2026StreetCleaningSavings,
  STREET_CLEANING_EUROS_PER_WASTE_KG,
  type ImpactTerrain2026StreetCleaningSavings,
  VOLUNTEER_ACTION_EUROS_PER_HOUR,
} from "@/lib/impact/impact-terrain-2026";

export {
  BUTTS_PER_KG_REFERENCE,
  CONDITION_WEIGHT_FACTORS,
  computeButtsCount,
  estimateButtsWeightKg,
} from "@/lib/impact/impact-terrain-2026";

export type ActionImpactInput = {
  metadata: {
    actionPhase?: string | null;
    wasteKg?: number | null;
    cigaretteButts?: number | null;
    volunteersCount?: number | null;
    durationMinutes?: number | null;
    wasteBreakdown?: ActionWasteBreakdown | null;
  };
};

export type ActionWasteKgSource =
  | "declared"
  | "none";

export type ActionImpactKpis = {
  wasteKg: number;
  wasteKnown: boolean;
  wasteKgSource: ActionWasteKgSource;
  butts: number;
  volunteers: number;
  co2AvoidedKg: number;
  waterSavedLiters: number;
  streetCleaningSavings: ImpactTerrain2026StreetCleaningSavings;
  /** Legacy mass-only facade retained for report/export consumers. */
  euroSaved: number;
};

export type ActionImpactTotals = Omit<ActionImpactKpis, "wasteKgSource"> & {
  wasteKnownActions: number;
  wasteActionCount: number;
  wasteCoverageRate: number;
};

export type ActionImpactMethodology = {
  version: string;
  scope: string;
  sources: typeof IMPACT_PROXY_CONFIG.sources;
  factors: typeof IMPACT_PROXY_CONFIG.factors;
  buttsPerKg: number;
  formulas: {
    wasteKg: string;
    butts: string;
    volunteers: string;
    co2e: string;
    water: string;
    euro: string;
    surface: string;
  };
};

/** Retourne la mesure de déchets déclarée, sans convertir les mégots en déchets. */
export function estimateActionWasteKg(
  contract: ActionImpactInput,
): number | null {
  const value = contract.metadata.wasteKg;
  if (value === null || value === undefined) {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

export function resolveActionWasteKgSource(
  contract: ActionImpactInput,
): ActionWasteKgSource {
  const wasteKg = estimateActionWasteKg(contract);
  if (wasteKg === null) {
    return "none";
  }
  if (wasteKg >= 0) {
    return "declared";
  }
  return "none";
}

export function computeActionImpactKpis(
  contract: ActionImpactInput,
): ActionImpactKpis {
  const measuredWasteKg = estimateActionWasteKg(contract);
  const wasteKnown = measuredWasteKg !== null;
  const wasteKg = measuredWasteKg ?? 0;
  const butts = Math.max(0, Number(contract.metadata.cigaretteButts || 0));
  const volunteers = Math.max(
    0,
    Number(contract.metadata.volunteersCount || 0),
  );
  const streetCleaningSavings =
    computeImpactTerrain2026StreetCleaningSavings({
      wasteKg,
      durationMinutes: Number(contract.metadata.durationMinutes || 0),
    });

  return {
    wasteKg,
    wasteKnown,
    wasteKgSource: resolveActionWasteKgSource(contract),
    butts,
    volunteers,
    co2AvoidedKg: wasteKg * IMPACT_PROXY_CONFIG.factors.co2KgPerWasteKg,
    waterSavedLiters: Math.round(
      butts * IMPACT_PROXY_CONFIG.factors.waterLitersPerCigaretteButt,
    ),
    streetCleaningSavings,
    euroSaved: Math.round(streetCleaningSavings.massEstimateEuros),
  };
}

export function sumActionImpactKpis(
  contracts: Iterable<ActionImpactInput>,
): ActionImpactTotals {
  const totals: ActionImpactTotals = {
    wasteKg: 0,
    wasteKnown: false,
    wasteKnownActions: 0,
    wasteActionCount: 0,
    wasteCoverageRate: 0,
    butts: 0,
    volunteers: 0,
    co2AvoidedKg: 0,
    waterSavedLiters: 0,
    streetCleaningSavings: computeImpactTerrain2026StreetCleaningSavings({
      wasteKg: 0,
      durationMinutes: 0,
    }),
    euroSaved: 0,
  };
  let totalDurationMinutes = 0;
  let wasteKnownActions = 0;
  let wasteActionCount = 0;

  for (const contract of contracts) {
    wasteActionCount += 1;
    const impact = computeActionImpactKpis(contract);
    totals.wasteKg += impact.wasteKg;
    if (impact.wasteKnown) {
      wasteKnownActions += 1;
    }
    totals.butts += impact.butts;
    totals.volunteers += impact.volunteers;
    totalDurationMinutes += Math.max(
      0,
      Number(contract.metadata.durationMinutes || 0),
    );
  }

  totals.co2AvoidedKg =
    totals.wasteKg * IMPACT_PROXY_CONFIG.factors.co2KgPerWasteKg;
  totals.waterSavedLiters = Math.round(
    totals.butts * IMPACT_PROXY_CONFIG.factors.waterLitersPerCigaretteButt,
  );
  totals.streetCleaningSavings =
    computeImpactTerrain2026StreetCleaningSavings({
      wasteKg: totals.wasteKg,
      durationMinutes: totalDurationMinutes,
    });
  totals.euroSaved = Math.round(totals.streetCleaningSavings.massEstimateEuros);
  totals.wasteKnownActions = wasteKnownActions;
  totals.wasteActionCount = wasteActionCount;
  totals.wasteCoverageRate =
    wasteActionCount > 0 ? (wasteKnownActions / wasteActionCount) * 100 : 0;
  totals.wasteKnown = wasteKnownActions > 0;

  return totals;
}

/**
 * Descripteur public de la méthode affichée par /methodologie.
 * Les facteurs et la version viennent du même runtime que les KPI.
 */
export function buildActionImpactMethodology(): ActionImpactMethodology {
  const { factors, sources, version } = IMPACT_PROXY_CONFIG;

  return {
    version,
    scope: "Actions approuvees et filtrees par la surface concernee.",
    sources,
    factors,
    buttsPerKg: BUTTS_PER_KG_REFERENCE,
    formulas: {
      wasteKg: "wasteKg = valeur déclarée de déchets; null = métrique non renseignée; les mégots restent une composante distincte",
      butts: "butts = max(0, cigaretteButts)",
      volunteers: "volunteers = max(0, volunteersCount)",
      co2e: `co2e_kg = wasteKg * ${factors.co2KgPerWasteKg}`,
      water: `eau_L = butts * ${factors.waterLitersPerCigaretteButt}`,
      euro: `economie_dechets = totalWasteKg * ${STREET_CLEANING_EUROS_PER_WASTE_KG}; heures_action = somme(durationMinutes) / 60; economie_temps = heures_action * ${VOLUNTEER_ACTION_EUROS_PER_HOUR}; economie_min = min(economie_dechets, economie_temps); economie_max = max(economie_dechets, economie_temps)`,
      surface: `surface_m2 = wasteKg * ${factors.surfaceM2PerWasteKg} + volunteerMinutes * ${factors.surfaceM2PerVolunteerMinute}`,
    },
  };
}
