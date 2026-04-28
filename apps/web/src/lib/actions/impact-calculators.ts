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
