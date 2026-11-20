/**
 * Lot 0, candidate pure. No changes to existing estimator, project snapshots or terrain KPIs.
 * Explicit energy measurement boundary, independently qualified water/carbon,
 * and pedagogical hypotheses. Never classify an assumed location as observed.
 */
export type AiEnergyBoundary = "IT_FULL" | "FACILITY" | "LOCAL_WALL";
export type AiEnergyEvidence = "MEASURED" | "DECLARED" | "ASSUMPTION";
export type AiEnergyInput = {
  environment: "cloud_api" | "local_device";
  measurement?: { kwh: number; boundary: AiEnergyBoundary; evidence: AiEnergyEvidence };
  localPower?: { watts: number; durationSeconds: number; idleWatts?: number };
  pue?: number;
};
export type AiEnergyResult = {
  itKwh: number | null;
  facilityKwh: number | null;
  localWallKwh: number | null;
  localIncrementalKwh: number | null;
  boundary: AiEnergyBoundary | null;
  evidence: AiEnergyEvidence | null;
  limitations: readonly string[];
};
export type AiElectricityFactor = {
  id: string;
  version: string;
  region: "FR" | "US" | string;
  kgCo2ePerKwh: number;
  basis: "consumption_direct" | "production_direct" | "scenario_proxy";
  sourceUrl: string;
  period: string;
  status: "OBSERVED" | "ASSUMPTION";
};
/** Candidate factor to register in scientific-registry.ts during integration; not a default location. */
export const RTE_FRANCE_2025_CONSUMPTION: AiElectricityFactor = {
  id: "rte-fr-consumption-direct-2025",
  version: "1",
  region: "FR",
  kgCo2ePerKwh: 0.02,
  basis: "consumption_direct",
  sourceUrl: "https://analysesetdonnees.rte-france.com/bilan-electrique-2025/emissions",
  period: "2025",
  status: "OBSERVED",
};
export const TEXTUAL_ENERGY_PROXY_KWH_IT_PER_M_TOKENS = {
  low: 0.06,
  central: 0.30,
  high: 0.60,
} as const;

function nonnegative(value: number, key: string): void {
  if (!Number.isFinite(value) || value < 0) throw new Error(`${key}: nombre positif ou zéro requis`);
}
function positive(value: number, key: string): void {
  if (!Number.isFinite(value) || value <= 0) throw new Error(`${key}: nombre strictement positif requis`);
}
export function computeQualifiedEnergy(input: AiEnergyInput): AiEnergyResult {
  const { environment, measurement, localPower } = input;
  if (measurement && localPower) throw new Error("Une seule origine de mesure énergétique autorisée");
  if (input.pue !== undefined && (!Number.isFinite(input.pue) || input.pue < 1 || input.pue > 5)) {
    throw new Error("PUE hors domaine [1,5]");
  }
  if (environment === "local_device") {
    if (input.pue !== undefined && input.pue !== 1) throw new Error("PUE local doit valoir 1");
    if (measurement && measurement.boundary !== "LOCAL_WALL") throw new Error("Mesure IT/site incompatible avec local_device");
    if (localPower) {
      nonnegative(localPower.watts, "watts"); nonnegative(localPower.durationSeconds, "durationSeconds");
      if (localPower.idleWatts !== undefined) nonnegative(localPower.idleWatts, "idleWatts");
      const wall = (localPower.watts * localPower.durationSeconds) / 3_600_000;
      const incremental = localPower.idleWatts === undefined ? null : Math.max(0, localPower.watts - localPower.idleWatts) * localPower.durationSeconds / 3_600_000;
      return { itKwh: null, facilityKwh: null, localWallKwh: wall, localIncrementalKwh: incremental, boundary: "LOCAL_WALL", evidence: "DECLARED", limitations: ["Énergie prise murale locale, pas une énergie de datacenter", "Puissance et durée déclarées, pas mesure instrumentale"] };
    }
    if (measurement) {
      nonnegative(measurement.kwh, "measurement.kwh");
      return { itKwh: null, facilityKwh: null, localWallKwh: measurement.kwh, localIncrementalKwh: null, boundary: "LOCAL_WALL", evidence: measurement.evidence, limitations: ["Part incrémentale inconnue sans puissance à vide"] };
    }
    return {itKwh: null, facilityKwh: null, localWallKwh: null, localIncrementalKwh: null, boundary: null, evidence: null, limitations: ["Pas d'énergie locale mesurée ou déclarée"]};
  }
  if (localPower || measurement?.boundary === "LOCAL_WALL") throw new Error("LOCAL_WALL incompatible avec cloud_api");
  if (!measurement) return {itKwh:null,facilityKwh:null,localWallKwh:null,localIncrementalKwh:null,boundary:null,evidence:null,limitations:["Énergie cloud non disponible"]};
  nonnegative(measurement.kwh, "measurement.kwh");
  if (measurement.boundary === "FACILITY") return {itKwh:null, facilityKwh:measurement.kwh,localWallKwh:null,localIncrementalKwh:null,boundary:"FACILITY",evidence:measurement.evidence,limitations:["PUE déjà inclus, aucune multiplication supplémentaire"]};
  const pue = input.pue ?? null;
  return {itKwh:measurement.kwh, facilityKwh:pue === null ? null : measurement.kwh*pue,localWallKwh:null,localIncrementalKwh:null,boundary:"IT_FULL",evidence:measurement.evidence,limitations:pue===null?["PUE manquant : total site non calculable"]:[]};
}

export function computeEnergyCarbonWater(input: {
  energy: AiEnergyResult;
  /** Physical processing region verified, or an expressly selected hypothetical region. */
  region: string | null;
  factor: AiElectricityFactor | null;
  locationMode: "VERIFIED_PHYSICAL" | "HYPOTHETICAL" | "UNKNOWN";
  wueSiteLitersPerItKwh?: number | null;
  wueGridLitersPerSiteKwh?: number | null;
}): {co2eKg: number | null; directWaterLiters: number | null; indirectWaterLiters: number | null; totalWaterLiters: number | null; status: "LOCATION_BASED" | "SCENARIO_ONLY" | "UNKNOWN"} {
  const { energy, factor, region, locationMode } = input;
  if (input.wueSiteLitersPerItKwh != null) nonnegative(input.wueSiteLitersPerItKwh,"wueSite");
  if (input.wueGridLitersPerSiteKwh != null) nonnegative(input.wueGridLitersPerSiteKwh,"wueGrid");
  const electricityKwh = energy.facilityKwh ?? energy.localWallKwh;
  const factorValid = factor !== null && region !== null && locationMode !== "UNKNOWN" && factor.region === region;
  if (factor) nonnegative(factor.kgCo2ePerKwh,"electricityFactor");
  const carbon = electricityKwh === null || !factorValid ? null : electricityKwh * factor.kgCo2ePerKwh;
  const direct = energy.itKwh !== null && input.wueSiteLitersPerItKwh != null ? energy.itKwh * input.wueSiteLitersPerItKwh : null;
  const indirect = energy.facilityKwh !== null && input.wueGridLitersPerSiteKwh != null && factorValid ? energy.facilityKwh * input.wueGridLitersPerSiteKwh : null;
  return {co2eKg: carbon, directWaterLiters:direct, indirectWaterLiters:indirect, totalWaterLiters:direct!==null&&indirect!==null?direct+indirect:null,status:carbon===null?"UNKNOWN":locationMode==="HYPOTHETICAL" || energy.evidence==="ASSUMPTION" || factor?.status==="ASSUMPTION" ?"SCENARIO_ONLY":"LOCATION_BASED"};
}

export function computeTextEnergyScenario(tokens: number, scenario: keyof typeof TEXTUAL_ENERGY_PROXY_KWH_IT_PER_M_TOKENS, pue=1.15): AiEnergyResult {
  if (!Number.isSafeInteger(tokens) || tokens < 0) throw new Error("Tokens entiers non négatifs requis");
  positive(pue,"pue");
  return computeQualifiedEnergy({environment:"cloud_api",measurement:{kwh:tokens/1_000_000*TEXTUAL_ENERGY_PROXY_KWH_IT_PER_M_TOKENS[scenario],boundary:"IT_FULL",evidence:"ASSUMPTION"},pue});
}

export const NO_PHYSICAL_COMPENSATION_NOTICE = "La collecte de déchets ne compense pas les émissions ou l'eau consommée par l'IA. Les objectifs sont des comparaisons pédagogiques conditionnelles.";
