import type { ImpactProxyFactors } from "@/lib/gamification/impact-proxy-config";

export type ImpactMagnitudeInputs = {
  cigaretteButts: number;
  wasteKg: number;
  volunteerMinutes: number;
};

export type ImpactMagnitudeSnapshot = {
  cigaretteButts: number;
  wasteKg: number;
  volunteerMinutes: number;
  waterLiters: number;
  co2Kg: number;
  surfaceM2FromWaste: number;
  surfaceM2FromVolunteerTime: number;
  euroSaved: number;
};

export const DEFAULT_IMPACT_MAGNITUDE_INPUTS: ImpactMagnitudeInputs = {
  cigaretteButts: 10,
  wasteKg: 20,
  volunteerMinutes: 30,
};

const MIN_INPUT_VALUE = 0;
const MAX_INPUT_VALUE = 100_000;

export function clampImpactMagnitudeInput(value: number, fallback: number): number {
  if (!Number.isFinite(value)) {
    return fallback;
  }

  return Math.min(MAX_INPUT_VALUE, Math.max(MIN_INPUT_VALUE, value));
}

export function buildImpactMagnitudeSnapshot(
  inputs: ImpactMagnitudeInputs,
  factors: ImpactProxyFactors,
): ImpactMagnitudeSnapshot {
  const cigaretteButts = clampImpactMagnitudeInput(inputs.cigaretteButts, DEFAULT_IMPACT_MAGNITUDE_INPUTS.cigaretteButts);
  const wasteKg = clampImpactMagnitudeInput(inputs.wasteKg, DEFAULT_IMPACT_MAGNITUDE_INPUTS.wasteKg);
  const volunteerMinutes = clampImpactMagnitudeInput(inputs.volunteerMinutes, DEFAULT_IMPACT_MAGNITUDE_INPUTS.volunteerMinutes);

  return {
    cigaretteButts,
    wasteKg,
    volunteerMinutes,
    waterLiters: cigaretteButts * factors.waterLitersPerCigaretteButt,
    co2Kg: wasteKg * factors.co2KgPerWasteKg,
    surfaceM2FromWaste: wasteKg * factors.surfaceM2PerWasteKg,
    surfaceM2FromVolunteerTime: volunteerMinutes * factors.surfaceM2PerVolunteerMinute,
    euroSaved: wasteKg * factors.euroSavedPerWasteKg,
  };
}
