import type { ActionDataContract } from "./data-contract";
import { ActionMegotsCondition } from "./types";

export const BUTTS_PER_KG_REFERENCE = 2500;

export const CONDITION_WEIGHT_FACTORS: Record<ActionMegotsCondition, number> = {
  propre: 1.0,
  humide: 0.7,
  mouille: 0.4,
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
  contract: Pick<ActionDataContract, "metadata">,
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
