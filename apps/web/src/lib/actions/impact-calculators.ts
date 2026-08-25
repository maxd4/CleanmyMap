import type { ActionWasteBreakdown } from "./types";
import { ActionMegotsCondition } from "./types";
import { IMPACT_PROXY_CONFIG } from "@/lib/gamification/impact-proxy-config";

export const BUTTS_PER_KG_REFERENCE = 2500;

export const CONDITION_WEIGHT_FACTORS: Record<ActionMegotsCondition, number> = {
  propre: 1.0,
  humide: 0.7,
  mouille: 0.4,
};

export type ActionImpactInput = {
  metadata: {
    wasteKg?: number | null;
    cigaretteButts?: number | null;
    volunteersCount?: number | null;
    wasteBreakdown?: ActionWasteBreakdown | null;
  };
};

export type ActionWasteKgSource =
  | "declared"
  | "waste_breakdown"
  | "cigarette_butts"
  | "none";

export type ActionImpactKpis = {
  wasteKg: number;
  wasteKgSource: ActionWasteKgSource;
  butts: number;
  volunteers: number;
  co2AvoidedKg: number;
  waterSavedLiters: number;
  euroSaved: number;
};

export type ActionImpactTotals = Omit<ActionImpactKpis, "wasteKgSource">;

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

/**
 * Calcule le nombre estimé de mégots en fonction du poids et de l'état (propreté/humidité).
 */
export function computeButtsCount(
  weightKg: number,
  condition: ActionMegotsCondition,
): number {
  return Math.round(
    weightKg * BUTTS_PER_KG_REFERENCE * CONDITION_WEIGHT_FACTORS[condition],
  );
}

/**
 * Estime le poids en kg correspondant à un nombre de mégots.
 * Sert à garder le slider de quantité et le poids saisis cohérents dans l'UI.
 */
export function estimateButtsWeightKg(
  count: number,
  condition: ActionMegotsCondition,
): number {
  const factor = CONDITION_WEIGHT_FACTORS[condition];
  if (!Number.isFinite(count) || count <= 0 || factor <= 0) {
    return 0;
  }

  return count / (BUTTS_PER_KG_REFERENCE * factor);
}

/**
 * Retourne la masse d'impact la plus fiable disponible pour une action.
 *
 * Priorité:
 * 1. poids total déclaré
 * 2. poids détaillé des mégots si présent dans les métadonnées
 * 3. conversion de secours depuis le nombre de mégots
 */
export function estimateActionWasteKg(
  contract: ActionImpactInput,
): number {
  const directWasteKg = Math.max(0, Number(contract.metadata.wasteKg || 0));
  const breakdownWasteKg = Math.max(
    0,
    Number(contract.metadata.wasteBreakdown?.megotsKg || 0),
  );
  const derivedWasteKg = Math.max(
    0,
    Number(contract.metadata.cigaretteButts || 0) / BUTTS_PER_KG_REFERENCE,
  );

  return Math.max(directWasteKg, breakdownWasteKg, derivedWasteKg);
}

export function resolveActionWasteKgSource(
  contract: ActionImpactInput,
): ActionWasteKgSource {
  const directWasteKg = Math.max(0, Number(contract.metadata.wasteKg || 0));
  const breakdownWasteKg = Math.max(
    0,
    Number(contract.metadata.wasteBreakdown?.megotsKg || 0),
  );
  const cigaretteButts = Math.max(
    0,
    Number(contract.metadata.cigaretteButts || 0),
  );
  const wasteKg = Math.max(
    directWasteKg,
    breakdownWasteKg,
    cigaretteButts / BUTTS_PER_KG_REFERENCE,
  );

  if (wasteKg <= 0) {
    return "none";
  }
  if (directWasteKg === wasteKg) {
    return "declared";
  }
  if (breakdownWasteKg === wasteKg) {
    return "waste_breakdown";
  }
  return "cigarette_butts";
}

export function computeActionImpactKpis(
  contract: ActionImpactInput,
): ActionImpactKpis {
  const wasteKg = estimateActionWasteKg(contract);
  const butts = Math.max(0, Number(contract.metadata.cigaretteButts || 0));
  const volunteers = Math.max(
    0,
    Number(contract.metadata.volunteersCount || 0),
  );

  return {
    wasteKg,
    wasteKgSource: resolveActionWasteKgSource(contract),
    butts,
    volunteers,
    co2AvoidedKg: wasteKg * IMPACT_PROXY_CONFIG.factors.co2KgPerWasteKg,
    waterSavedLiters: Math.round(
      butts * IMPACT_PROXY_CONFIG.factors.waterLitersPerCigaretteButt,
    ),
    euroSaved: Math.round(
      wasteKg * IMPACT_PROXY_CONFIG.factors.euroSavedPerWasteKg,
    ),
  };
}

export function sumActionImpactKpis(
  contracts: Iterable<ActionImpactInput>,
): ActionImpactTotals {
  const totals: ActionImpactTotals = {
    wasteKg: 0,
    butts: 0,
    volunteers: 0,
    co2AvoidedKg: 0,
    waterSavedLiters: 0,
    euroSaved: 0,
  };

  for (const contract of contracts) {
    const impact = computeActionImpactKpis(contract);
    totals.wasteKg += impact.wasteKg;
    totals.butts += impact.butts;
    totals.volunteers += impact.volunteers;
  }

  totals.co2AvoidedKg =
    totals.wasteKg * IMPACT_PROXY_CONFIG.factors.co2KgPerWasteKg;
  totals.waterSavedLiters = Math.round(
    totals.butts * IMPACT_PROXY_CONFIG.factors.waterLitersPerCigaretteButt,
  );
  totals.euroSaved = Math.round(
    totals.wasteKg * IMPACT_PROXY_CONFIG.factors.euroSavedPerWasteKg,
  );

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
      wasteKg: `wasteKg = max(0, wasteKg_declare, wasteBreakdown.megotsKg, cigaretteButts / ${BUTTS_PER_KG_REFERENCE})`,
      butts: "butts = max(0, cigaretteButts)",
      volunteers: "volunteers = max(0, volunteersCount)",
      co2e: `co2e_kg = wasteKg * ${factors.co2KgPerWasteKg}`,
      water: `eau_L = butts * ${factors.waterLitersPerCigaretteButt}`,
      euro: `economie_voirie_EUR = wasteKg * ${factors.euroSavedPerWasteKg}`,
      surface: `surface_m2 = wasteKg * ${factors.surfaceM2PerWasteKg} + volunteerMinutes * ${factors.surfaceM2PerVolunteerMinute}`,
    },
  };
}
