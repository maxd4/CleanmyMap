import { getScientificFactor } from "./scientific-registry";

export type AiEnergyBoundary = "IT_FULL" | "FACILITY" | "LOCAL_WALL";
export type AiEnergyEvidence = "MEASURED" | "DECLARED" | "ASSUMPTION";
export type AiQualifiedEnergyInput = {
  environment: "cloud_api" | "local_device";
  measurement?: { kwh: number; boundary: AiEnergyBoundary; evidence: AiEnergyEvidence };
  localPower?: { watts: number; durationSeconds: number; idleWatts?: number };
  pue?: number;
};
export type AiQualifiedEnergy = {
  itKwh: number | null;
  facilityKwh: number | null;
  localWallKwh: number | null;
  localIncrementalKwh: number | null;
  boundary: AiEnergyBoundary | null;
  evidence: AiEnergyEvidence | null;
  limitations: readonly string[];
};

export const RTE_FRANCE_2025_CONSUMPTION = getScientificFactor("electricity-fr-rte-consumption-2025");
export const TEXTUAL_ENERGY_PROXY_KWH_IT_PER_M_TOKENS = {
  low: getScientificFactor("ai-inference-energy-scenario-low-v1").value!,
  central: getScientificFactor("ai-inference-energy-scenario-central-v1").value!,
  high: getScientificFactor("ai-inference-energy-scenario-high-v1").value!,
} as const;

function assertFiniteNonnegative(value: number, field: string): void {
  if (!Number.isFinite(value) || value < 0) throw new Error(`${field}: nombre fini positif ou zéro requis`);
}

export function computeQualifiedEnergy(input: AiQualifiedEnergyInput): AiQualifiedEnergy {
  if (input.measurement && input.localPower) throw new Error("Une seule origine de mesure énergétique est autorisée");
  if (input.pue !== undefined && (!Number.isFinite(input.pue) || input.pue < 1 || input.pue > 5)) throw new Error("PUE hors domaine [1,5]");
  if (input.environment === "local_device") {
    if (input.pue !== undefined && input.pue !== 1) throw new Error("PUE local doit valoir 1");
    if (input.measurement && input.measurement.boundary !== "LOCAL_WALL") throw new Error("Mesure IT/site incompatible avec local_device");
    if (input.localPower) {
      assertFiniteNonnegative(input.localPower.watts, "watts");
      assertFiniteNonnegative(input.localPower.durationSeconds, "durationSeconds");
      if (input.localPower.idleWatts !== undefined) assertFiniteNonnegative(input.localPower.idleWatts, "idleWatts");
      const wall = input.localPower.watts * input.localPower.durationSeconds / 3_600_000;
      const incremental = input.localPower.idleWatts === undefined ? null : Math.max(0, input.localPower.watts - input.localPower.idleWatts) * input.localPower.durationSeconds / 3_600_000;
      return { itKwh: null, facilityKwh: null, localWallKwh: wall, localIncrementalKwh: incremental, boundary: "LOCAL_WALL", evidence: "DECLARED", limitations: ["Énergie prise murale locale, distincte de l'énergie IT ou du site d'un datacenter.", "Puissance et durée déclarées, non mesurées instrumentalement."] };
    }
    if (input.measurement) {
      assertFiniteNonnegative(input.measurement.kwh, "measurement.kwh");
      return { itKwh: null, facilityKwh: null, localWallKwh: input.measurement.kwh, localIncrementalKwh: null, boundary: "LOCAL_WALL", evidence: input.measurement.evidence, limitations: ["Part incrémentale inconnue sans mesure de puissance à vide."] };
    }
    return { itKwh: null, facilityKwh: null, localWallKwh: null, localIncrementalKwh: null, boundary: null, evidence: null, limitations: ["Énergie locale non disponible."] };
  }
  if (input.localPower || input.measurement?.boundary === "LOCAL_WALL") throw new Error("LOCAL_WALL incompatible avec cloud_api");
  if (!input.measurement) return { itKwh: null, facilityKwh: null, localWallKwh: null, localIncrementalKwh: null, boundary: null, evidence: null, limitations: ["Énergie cloud non disponible."] };
  assertFiniteNonnegative(input.measurement.kwh, "measurement.kwh");
  if (input.measurement.boundary === "FACILITY") return { itKwh: null, facilityKwh: input.measurement.kwh, localWallKwh: null, localIncrementalKwh: null, boundary: "FACILITY", evidence: input.measurement.evidence, limitations: ["PUE déjà inclus : aucune multiplication supplémentaire."] };
  return { itKwh: input.measurement.kwh, facilityKwh: input.pue === undefined ? null : input.measurement.kwh * input.pue, localWallKwh: null, localIncrementalKwh: null, boundary: "IT_FULL", evidence: input.measurement.evidence, limitations: input.pue === undefined ? ["PUE manquant : énergie totale du site non calculable."] : [] };
}
