import {
  ENVIRONMENTAL_IMPACT_LIFECYCLE_AXIS_DEFINITIONS,
  ENVIRONMENTAL_IMPACT_LIFECYCLE_COMPONENT_DEFINITIONS,
  ENVIRONMENTAL_IMPACT_LIFECYCLE_HYPOTHESES,
} from "../constants";
import type {
  EnvironmentalImpactInfrastructureServiceEstimate,
  EnvironmentalImpactLifecycleEstimate,
  EnvironmentalImpactUsageProfileEstimate,
} from "../types";
import { hasNumericInput, round6 } from "./utils";
import { calculateElectricityCo2e } from "./electricity";
import {
  buildLifecycleScoreSignals,
  type EnvironmentalImpactLifecycleScoreSignals,
} from "./lifecycle-signals";

export { buildLifecycleScoreSignals } from "./lifecycle-signals";

function buildUnavailableLifecycleEstimate(
  usageProfile: EnvironmentalImpactUsageProfileEstimate,
  totalKgCo2eProxy: number | null,
): EnvironmentalImpactLifecycleEstimate {
  const source: EnvironmentalImpactLifecycleEstimate["source"] =
    totalKgCo2eProxy === null || totalKgCo2eProxy <= 0 ? "reference" : "mixed";

  return {
    totalKgCo2eProxy: null,
    axisEstimates: ENVIRONMENTAL_IMPACT_LIFECYCLE_AXIS_DEFINITIONS.map((definition) => ({
      ...definition,
      quantity: definition.key === "energy" ? usageProfile.monthlyElectricityKwh ?? null : null,
      estimatedKgCo2eProxy: null,
      sharePercent: 0,
      source,
    })),
    componentEstimates: ENVIRONMENTAL_IMPACT_LIFECYCLE_COMPONENT_DEFINITIONS.map(
      (definition) => ({
        ...definition,
        quantity: null,
        estimatedKgCo2eProxy: null,
        sharePercent: 0,
        source,
      }),
    ),
    notes: [
      "La lecture lifecycle reste NA tant que le total d'infrastructure ne dispose d'aucune mesure ou facteur physique audité.",
    ],
    hypotheses: [...ENVIRONMENTAL_IMPACT_LIFECYCLE_HYPOTHESES],
    source,
  };
}

type LifecycleAxisEstimateResult = {
  axisEstimates: EnvironmentalImpactLifecycleEstimate["axisEstimates"];
  totalForAxes: number;
};

function buildLifecycleAxisEstimates(
  usageProfile: EnvironmentalImpactUsageProfileEstimate,
  scoreSignals: EnvironmentalImpactLifecycleScoreSignals,
  totalKgCo2eProxy: number,
  axisScoreTotal: number,
  axisNormalizer: number,
  axisTotalWeight: number,
): LifecycleAxisEstimateResult {
  const measuredEnergyKgCo2e = calculateElectricityCo2e(
    usageProfile.monthlyElectricityKwh,
  );
  const totalForAxes = round6(
    Math.max(totalKgCo2eProxy, measuredEnergyKgCo2e ?? 0),
  );
  const nonEnergyDefinitions = ENVIRONMENTAL_IMPACT_LIFECYCLE_AXIS_DEFINITIONS.filter(
    (definition) => definition.key !== "energy",
  );
  const nonEnergyScoreTotal = round6(
    nonEnergyDefinitions.reduce(
      (acc, definition) => acc + scoreSignals[definition.key],
      0,
    ),
  );
  const nonEnergyWeightTotal = nonEnergyDefinitions.reduce(
    (acc, definition) => acc + definition.referenceWeight,
    0,
  );

  return {
    totalForAxes,
    axisEstimates: ENVIRONMENTAL_IMPACT_LIFECYCLE_AXIS_DEFINITIONS.map((definition) => {
      const score = scoreSignals[definition.key];
      const normalizedWeight =
        axisScoreTotal > 0
          ? score / axisNormalizer
          : definition.referenceWeight / Math.max(1, axisTotalWeight);
      const isEnergy = definition.key === "energy";
      const estimatedKgCo2eProxy = isEnergy
        ? measuredEnergyKgCo2e ?? round6(totalForAxes * normalizedWeight)
        : round6(
            Math.max(0, totalForAxes - (measuredEnergyKgCo2e ?? 0)) *
              (nonEnergyScoreTotal > 0
                ? score / nonEnergyScoreTotal
                : definition.referenceWeight / Math.max(1, nonEnergyWeightTotal)),
          );
      const quantity = isEnergy
        ? usageProfile.monthlyElectricityKwh ?? null
        : definition.key === "water"
          ? null
          : round6(estimatedKgCo2eProxy / definition.proxyKgCo2ePerUnit);

      return {
        ...definition,
        quantity,
        estimatedKgCo2eProxy,
        sharePercent: round6(
          (estimatedKgCo2eProxy / Math.max(1, totalForAxes)) * 100,
        ),
        source: "mixed" as const,
      };
    }),
  };
}

function buildLifecycleComponentEstimates(
  scoreSignals: EnvironmentalImpactLifecycleScoreSignals,
  totalKgCo2eProxy: number,
  componentScoreTotal: number,
  componentNormalizer: number,
  componentTotalWeight: number,
): EnvironmentalImpactLifecycleEstimate["componentEstimates"] {
  return ENVIRONMENTAL_IMPACT_LIFECYCLE_COMPONENT_DEFINITIONS.map((definition) => {
    const score = scoreSignals[definition.key];
    const normalizedWeight =
      componentScoreTotal > 0
        ? score / componentNormalizer
        : definition.referenceWeight / Math.max(1, componentTotalWeight);
    const estimatedKgCo2eProxy = round6(totalKgCo2eProxy * normalizedWeight);
    const quantity = round6(estimatedKgCo2eProxy / definition.proxyKgCo2ePerUnit);

    return {
      ...definition,
      quantity,
      estimatedKgCo2eProxy,
      sharePercent: round6(normalizedWeight * 100),
      source: "mixed" as const,
    };
  });
}

export function buildLifecycleEstimate(
  usageProfile: EnvironmentalImpactUsageProfileEstimate,
  services: EnvironmentalImpactInfrastructureServiceEstimate[],
  totalKgCo2eProxy: number | null,
): EnvironmentalImpactLifecycleEstimate {
  const scoreSignals = buildLifecycleScoreSignals(usageProfile, services);
  const axisScoreTotal = round6(
    ENVIRONMENTAL_IMPACT_LIFECYCLE_AXIS_DEFINITIONS.reduce(
      (acc, definition) => acc + scoreSignals[definition.key],
      0,
    ),
  );
  const componentScoreTotal = round6(
    ENVIRONMENTAL_IMPACT_LIFECYCLE_COMPONENT_DEFINITIONS.reduce(
      (acc, definition) => acc + scoreSignals[definition.key],
      0,
    ),
  );
  const source: EnvironmentalImpactLifecycleEstimate["source"] =
    totalKgCo2eProxy === null || totalKgCo2eProxy <= 0 ? "reference" : "mixed";

  if (!hasNumericInput(totalKgCo2eProxy) || totalKgCo2eProxy <= 0) {
    return buildUnavailableLifecycleEstimate(usageProfile, totalKgCo2eProxy);
  }

  const axisTotalWeight = ENVIRONMENTAL_IMPACT_LIFECYCLE_AXIS_DEFINITIONS.reduce(
    (acc, definition) => acc + definition.referenceWeight,
    0,
  );
  const componentTotalWeight = ENVIRONMENTAL_IMPACT_LIFECYCLE_COMPONENT_DEFINITIONS.reduce(
    (acc, definition) => acc + definition.referenceWeight,
    0,
  );
  const axisNormalizer = axisScoreTotal > 0 ? axisScoreTotal : axisTotalWeight;
  const componentNormalizer =
    componentScoreTotal > 0 ? componentScoreTotal : componentTotalWeight;
  const { axisEstimates, totalForAxes } = buildLifecycleAxisEstimates(
    usageProfile,
    scoreSignals,
    totalKgCo2eProxy,
    axisScoreTotal,
    axisNormalizer,
    axisTotalWeight,
  );
  const componentEstimates = buildLifecycleComponentEstimates(
    scoreSignals,
    totalKgCo2eProxy,
    componentScoreTotal,
    componentNormalizer,
    componentTotalWeight,
  );
  const totalFromAxes = round6(
    axisEstimates.reduce((acc, axis) => acc + (axis.estimatedKgCo2eProxy ?? 0), 0),
  );

  return {
    totalKgCo2eProxy: totalForAxes ?? totalFromAxes,
    axisEstimates,
    componentEstimates,
    notes: [
      "La lecture lifecycle réunit énergie, carbone, eau, matière et e-waste pour montrer l'empreinte matérielle complète du projet.",
      "Cette couche reste une décomposition auditable du total d'infrastructure et ne doit pas être additionnée à un autre total identique.",
    ],
    hypotheses: [...ENVIRONMENTAL_IMPACT_LIFECYCLE_HYPOTHESES],
    source,
  };
}
