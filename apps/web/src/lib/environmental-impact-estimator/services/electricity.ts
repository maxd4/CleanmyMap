import { ENVIRONMENTAL_IMPACT_ELECTRICITY_FACTOR } from "../constants";
import type {
  EnvironmentalImpactElectricityEstimate,
  EnvironmentalImpactUsageProfileEstimate,
} from "../types";
import { hasNumericInput, round6 } from "./utils";

export function calculateElectricityCo2e(
  kWh: number | null | undefined,
  factorKgCo2ePerKwh = ENVIRONMENTAL_IMPACT_ELECTRICITY_FACTOR.kgCo2ePerKwh,
): number | null {
  if (!hasNumericInput(kWh)) {
    return null;
  }

  return round6(kWh * factorKgCo2ePerKwh);
}
export function buildElectricityEstimate(
  usageProfile: Pick<EnvironmentalImpactUsageProfileEstimate, "monthlyElectricityKwh">,
  proxyKgCo2e: number | null,
): EnvironmentalImpactElectricityEstimate {
  const kWh = usageProfile.monthlyElectricityKwh;
  const measuredKgCo2e = calculateElectricityCo2e(kWh);

  if (measuredKgCo2e !== null && hasNumericInput(kWh)) {
    return {
      calculation: "measured_kwh_to_co2e",
      factorKgCo2ePerKwh: ENVIRONMENTAL_IMPACT_ELECTRICITY_FACTOR.kgCo2ePerKwh,
      kWh: round6(kWh),
      kgCo2e: measuredKgCo2e,
      source: "input",
      note: "CO2e calculé dans le sens kWh × facteur électrique à partir d'un signal saisi ou mesuré.",
    };
  }

  if (hasNumericInput(proxyKgCo2e) && proxyKgCo2e > 0) {
    return {
      calculation: "proxy_equivalent",
      factorKgCo2ePerKwh: ENVIRONMENTAL_IMPACT_ELECTRICITY_FACTOR.kgCo2ePerKwh,
      kWh: null,
      kgCo2e: round6(proxyKgCo2e),
      source: "derived",
      note: "Equivalent électrique estimé à partir du proxy CO2e; aucun kWh réel n'est disponible.",
    };
  }

  return {
    calculation: "missing",
    factorKgCo2ePerKwh: ENVIRONMENTAL_IMPACT_ELECTRICITY_FACTOR.kgCo2ePerKwh,
    kWh: null,
    kgCo2e: null,
    source: "missing",
    note: "À compléter: aucun kWh réel ni proxy électrique exploitable n'est disponible.",
  };
}
