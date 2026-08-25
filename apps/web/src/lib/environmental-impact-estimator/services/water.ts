import { ENVIRONMENTAL_IMPACT_WATER_FACTOR } from "../constants";
import type {
  EnvironmentalImpactUsageProfileEstimate,
  EnvironmentalImpactWaterEstimate,
} from "../types";
import { hasNumericInput, round6 } from "./utils";

type WaterUsageInput = Pick<
  EnvironmentalImpactUsageProfileEstimate,
  | "monthlyElectricityKwh"
  | "monthlyDirectWaterConsumptionLiters"
  | "monthlyEvaporatedWaterLiters"
>;

export function calculateIndirectElectricityWater(
  kWh: number | null | undefined,
  litersPerKwh = ENVIRONMENTAL_IMPACT_WATER_FACTOR.litersPerKwh,
): number | null {
  if (!hasNumericInput(kWh) || !hasNumericInput(litersPerKwh)) {
    return null;
  }

  return round6(kWh * litersPerKwh);
}

export function buildWaterEstimate(
  usageProfile: WaterUsageInput,
): EnvironmentalImpactWaterEstimate {
  const directWaterConsumptionLiters = hasNumericInput(
    usageProfile.monthlyDirectWaterConsumptionLiters,
  )
    ? usageProfile.monthlyDirectWaterConsumptionLiters
    : null;
  const evaporatedWaterLiters = hasNumericInput(usageProfile.monthlyEvaporatedWaterLiters)
    ? usageProfile.monthlyEvaporatedWaterLiters
    : null;
  const indirectElectricityWaterLiters = calculateIndirectElectricityWater(
    usageProfile.monthlyElectricityKwh,
  );
  const totalWaterConsumptionLiters =
    directWaterConsumptionLiters !== null && indirectElectricityWaterLiters !== null
      ? round6(directWaterConsumptionLiters + indirectElectricityWaterLiters)
      : null;
  const hasDirectSignal = directWaterConsumptionLiters !== null;
  const hasEvaporationSignal = evaporatedWaterLiters !== null;
  const hasIndirectSignal = indirectElectricityWaterLiters !== null;

  return {
    directWaterConsumptionLiters,
    evaporatedWaterLiters,
    indirectElectricityWaterLiters,
    totalWaterConsumptionLiters,
    factorLitersPerKwh: ENVIRONMENTAL_IMPACT_WATER_FACTOR.litersPerKwh,
    factorSourceLabel: ENVIRONMENTAL_IMPACT_WATER_FACTOR.sourceLabel,
    factorSourceUrl: ENVIRONMENTAL_IMPACT_WATER_FACTOR.sourceUrl,
    availability:
      hasDirectSignal && hasIndirectSignal
        ? "available"
        : hasDirectSignal || hasEvaporationSignal || hasIndirectSignal
          ? "partial"
          : "missing",
    source:
      hasDirectSignal || hasEvaporationSignal
        ? hasIndirectSignal
          ? "mixed"
          : "input"
        : hasIndirectSignal
          ? "derived"
          : "missing",
    provenance: [
      hasDirectSignal
        ? "Eau directe : signal fourni pour la consommation sur site."
        : "Eau directe : à compléter, aucune consommation sur site fournie.",
      hasEvaporationSignal
        ? "Évaporation : composant direct fourni séparément; elle n'est pas assimilée à toute l'eau directe."
        : "Évaporation : à compléter, aucune mesure séparée disponible.",
      hasIndirectSignal
        ? `Eau indirecte : kWh × ${ENVIRONMENTAL_IMPACT_WATER_FACTOR.litersPerKwh} L/kWh, proxy ${ENVIRONMENTAL_IMPACT_WATER_FACTOR.sourceLabel}.`
        : "Eau indirecte : à compléter, aucun kWh exploitable.",
      totalWaterConsumptionLiters === null
        ? "Eau totale estimée : à compléter tant que les composantes nécessaires ne sont pas disponibles."
        : "Eau totale estimée : somme de l'eau directe et de l'eau indirecte disponibles.",
    ],
  };
}
