import {
  evaluateDataQualityDiagnostic,
  getScientificFactor,
  resolveElectricityFactorForRegion,
  type ScientificFactorRegion,
} from "./scientific-registry";
import { computeQualifiedEnergy } from "./ai-cleanwalk-science";
import { roundPhysicalOutput } from "./physical-rounding";
import type { PersonalAiFootprintEstimate, PersonalAiFootprintInput } from "./personal-ai-estimator";

type QualifiedEnergyInput = Pick<PersonalAiFootprintInput,
  "executionEnvironment" | "energyMeasurement" | "localPower" | "pue" | "datacenterWue" | "electricityFactorId"
>;

export function calculateQualifiedEnergyImpacts(params: {
  input: QualifiedEnergyInput;
  region: ScientificFactorRegion;
  activityCount: number | null;
}): {
  totals: PersonalAiFootprintEstimate["physicalTotals"];
  diagnostic: PersonalAiFootprintEstimate["dataQuality"];
  methodologyNote: string;
  notes: string[];
} {
  const { input, region, activityCount } = params;
  const environment = input.executionEnvironment ?? "cloud_api";
  const energy = computeQualifiedEnergy({
    environment,
    measurement: input.energyMeasurement,
    localPower: input.localPower,
    pue: environment === "local_device" ? 1 : input.pue,
  });
  const notes = [...energy.limitations];
  if (energy.localIncrementalKwh !== null) {
    notes.push(`Énergie incrémentale locale après soustraction de la puissance à vide déclarée : ${roundPhysicalOutput(energy.localIncrementalKwh)} kWh.`);
  }

  const factor = resolveElectricityFactorForRegion(region, input.electricityFactorId);
  const carbonFactor = factor?.value ?? null;
  const directWater = environment === "cloud_api" && energy.itKwh !== null && input.datacenterWue != null
    ? energy.itKwh * input.datacenterWue
    : null;
  const indirectWaterFactor = region === "US" ? getScientificFactor("water-indirect-datacenter-us-2024").value : null;
  const electricityKwh = energy.facilityKwh ?? energy.localWallKwh;
  const carbon = electricityKwh !== null && carbonFactor !== null ? electricityKwh * carbonFactor : null;
  const indirectWater = energy.facilityKwh !== null && indirectWaterFactor !== null
    ? energy.facilityKwh * indirectWaterFactor
    : null;
  const totalWater = directWater !== null && indirectWater !== null ? directWater + indirectWater : null;
  const hasCloudLca = environment === "cloud_api" && carbon !== null && energy.facilityKwh !== null;
  const overhead = getScientificFactor("ai-partial-lca-overhead-v1").value ?? 0.3;
  const totals: PersonalAiFootprintEstimate["physicalTotals"] = {
    itEnergyKwh: energy.itKwh === null ? null : roundPhysicalOutput(energy.itKwh),
    facilityEnergyKwh: energy.facilityKwh === null ? null : roundPhysicalOutput(energy.facilityKwh),
    localWallEnergyKwh: energy.localWallKwh === null ? null : roundPhysicalOutput(energy.localWallKwh),
    localIncrementalEnergyKwh: energy.localIncrementalKwh === null ? null : roundPhysicalOutput(energy.localIncrementalKwh),
    operationalKgCo2e: carbon === null ? null : roundPhysicalOutput(carbon),
    directWaterLiters: directWater === null ? null : roundPhysicalOutput(directWater),
    indirectWaterLiters: indirectWater === null ? null : roundPhysicalOutput(indirectWater),
    totalWaterLiters: totalWater === null ? null : roundPhysicalOutput(totalWater),
    embodiedKgCo2e: null,
    partialLcaKgCo2e: hasCloudLca ? roundPhysicalOutput(carbon! * (1 + overhead)) : null,
    primaryEnergyMj: null,
    abioticDepletionKgSbEq: null,
  };
  const diagnostic = energy.evidence === "MEASURED"
    ? "MEASURED"
    : energy.evidence === "DECLARED"
      ? "DECLARED"
      : energy.evidence === "ASSUMPTION"
        ? "PROXY_SCENARIO"
        : evaluateDataQualityDiagnostic({ isMissingOrUnmeasured: true });
  const methodologyNote = energy.boundary === "LOCAL_WALL"
    ? `Énergie locale à la prise murale (${totals.localWallEnergyKwh} kWh); elle reste séparée de l'énergie IT et de l'énergie de site d'un datacenter.`
    : energy.boundary === "FACILITY"
      ? `Énergie totale de site mesurée (${totals.facilityEnergyKwh} kWh); aucun PUE supplémentaire n'est appliqué.`
      : energy.boundary === "IT_FULL" && energy.facilityKwh === null
        ? `Énergie IT fournie (${totals.itEnergyKwh} kWh), mais sans PUE le total site reste inconnu.`
        : energy.evidence === "MEASURED"
          ? `Consommation électrique directe mesurée (${totals.itEnergyKwh} kWh).`
          : energy.evidence === "DECLARED"
            ? `Consommation électrique IT déclarée (${totals.itEnergyKwh} kWh).`
            : `Énergie IT qualifiée (${activityCount ?? "activité non déclarée"} tokens) avec PUE appliqué uniquement à la frontière IT_FULL.`;
  return { totals, diagnostic, methodologyNote, notes };
}
