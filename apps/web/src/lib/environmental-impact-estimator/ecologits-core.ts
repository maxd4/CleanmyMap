/**
 * Noyau mathématique pur conforme à `computeLlmImpacts` d'EcoLogits.js v3.0.0.
 *
 * Référence officielle :
 * - https://github.com/mlco2/ecologits.js/blob/main/packages/ecologits.js/src/impacts/llm.ts
 * - https://github.com/mlco2/ecologits.js/tree/main/spec/vectors
 */

/**
 * Constantes physiques officielles d'EcoLogits.js v3.0.0 (packages/ecologits.js/src/impacts/llm.ts).
 */
export const ECOLOGITS_CONSTANTS = {
  /** Quantization standard (bits par paramètre) */
  MODEL_QUANTIZATION_BITS: 16,
  /** Coefficient alpha d'énergie active GPU (Wh / token / milliard de paramètres) */
  GPU_ENERGY_ALPHA: 1.1665273170451914e-6,
  /** Coefficient beta de sensibilité énergétique au batch size */
  GPU_ENERGY_BETA: -0.011205921025579175,
  /** Ordonnée à l'origine gamma d'énergie active par GPU (Wh / token) */
  GPU_ENERGY_GAMMA: 4.052928146734005e-5,
  /** Coefficient alpha de latence par paramètre actif (s / token / milliard de paramètres) */
  LATENCY_ALPHA: 0.0006785088094353663,
  /** Coefficient beta de latence par unité de batch (s / token) */
  LATENCY_BETA: 0.0003119310311688259,
  /** Ordonnée à l'origine gamma de latence (s / token) */
  LATENCY_GAMMA: 0.019473717579473387,
  /** Mémoire disponible sur un GPU de référence (Go) */
  GPU_MEMORY_GB: 80,
  /** Puissance électrique du serveur hors GPU (kW) */
  SERVER_POWER_KW: 1.2,
  /** Nombre de GPU installés dans le serveur de référence */
  SERVER_GPUS: 8,
  /** Nombre de requêtes traitées simultanément par le serveur (batch size de référence) */
  BATCH_SIZE: 64,
  /** Durée de vie du matériel en secondes : 3 ans = 3 * 365 * 24 * 60 * 60 */
  HARDWARE_LIFESPAN_SECONDS: 3 * 365 * 24 * 60 * 60, // 94 608 000 s
  /** Impact carbone incorporé du serveur hors GPU (kgCO2eq) */
  SERVER_EMBODIED_GWP_KG: 5700,
  /** Impact carbone incorporé d'un GPU (kgCO2eq) */
  GPU_EMBODIED_GWP_KG: 273,
  /** Impact ADPe incorporé du serveur hors GPU (kgSbeq) */
  SERVER_EMBODIED_ADPE_KG: 0.37,
  /** Impact ADPe incorporé d'un GPU (kgSbeq) */
  GPU_EMBODIED_ADPE_KG: 0.00895,
  /** Impact énergie primaire incorporé du serveur hors GPU (MJ) */
  SERVER_EMBODIED_PE_MJ: 70000,
  /** Impact énergie primaire incorporé d'un GPU (MJ) */
  GPU_EMBODIED_PE_MJ: 3721,
} as const;

export type OfficialEcologitsLlmCoefficients = {
  modelQuantizationBits?: number;
  gpuEnergyAlpha?: number;
  gpuEnergyBeta?: number;
  gpuEnergyGamma?: number;
  latencyAlpha?: number;
  latencyBeta?: number;
  latencyGamma?: number;
  gpuMemory?: number;
  gpuEmbodiedGwp?: number;
  gpuEmbodiedAdpe?: number;
  gpuEmbodiedPe?: number;
  serverGpuCount?: number;
  serverPower?: number;
  serverEmbodiedGwp?: number;
  serverEmbodiedAdpe?: number;
  serverEmbodiedPe?: number;
  serverLifetime?: number;
  batchSize?: number;
};

export type OfficialEcologitsLlmParams = OfficialEcologitsLlmCoefficients & {
  /** Paramètres actifs du modèle en milliards (B) */
  modelActiveParameterCount: number;
  /** Paramètres totaux du modèle en milliards (B) */
  modelTotalParameterCount: number;
  /** Nombre de tokens de sortie générés */
  outputTokenCount: number;
  /** Latence mesurée (en secondes) ; si omise ou null, non bornée par une mesure externe */
  requestLatency?: number | null;
  /** Débit mesuré ou publié en tokens/seconde */
  tps?: number | null;
  /** Time-to-first-token (en secondes) par requête */
  ttft?: number | null;
  /** Nombre de requêtes agrégées (défaut: 1) pour l'application de ttft */
  requestCount?: number | null;
  /** PUE du data center */
  datacenterPue: number;
  /** WUE direct sur site du data center (L/kWh IT) */
  datacenterWue: number;
  /** Facteur carbone du mix électrique (kgCO2eq/kWh) */
  ifElectricityMixGwp: number;
  /** Facteur ADPe du mix électrique (kgSbeq/kWh) */
  ifElectricityMixAdpe?: number;
  /** Facteur énergie primaire du mix électrique (MJ/kWh) */
  ifElectricityMixPe?: number;
  /** Facteur eau indirecte du mix électrique (L/kWh) */
  ifElectricityMixWue: number;
};

export type OfficialEcologitsLlmRawImpacts = {
  gpuEnergyPerGpuKwh: number;
  generationLatencySeconds: number;
  modelRequiredMemoryGb: number;
  gpuRequiredCount: number;
  serverEnergyKwh: number;
  requestItEnergyKwh: number;
  requestEnergyKwh: number;
  usageGwpKgCo2e: number;
  usageAdpeKgSbEq: number;
  usagePeMj: number;
  usageWcfLiters: number;
  directWaterLiters: number;
  indirectWaterLiters: number;
  embodiedGwpKgCo2e: number;
  embodiedAdpeKgSbEq: number;
  embodiedPeMj: number;
  totalGwpKgCo2e: number;
  totalAdpeKgSbEq: number;
  totalPeMj: number;
  totalWcfLiters: number;
};

function assertFiniteNumber(val: number, name: string): void {
  if (typeof val !== "number" || !Number.isFinite(val)) {
    throw new Error(`Invalid ${name}: must be a finite number.`);
  }
}

function assertFiniteNonNegative(val: number, name: string): void {
  if (typeof val !== "number" || !Number.isFinite(val) || val < 0) {
    throw new Error(`Invalid ${name}: must be a non-negative finite number.`);
  }
}

function assertFinitePositive(val: number, name: string): void {
  if (typeof val !== "number" || !Number.isFinite(val) || val <= 0) {
    throw new Error(`Invalid ${name}: must be a positive finite number.`);
  }
}

function assertOfficialEcologitsResultIntegrity(result: OfficialEcologitsLlmRawImpacts): void {
  for (const [key, value] of Object.entries(result)) {
    if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
      throw new Error(
        `Physical integrity violation in EcoLogits core (${key}=${String(value)}): result must be a finite non-negative number.`,
      );
    }
  }
  if (!Number.isInteger(result.gpuRequiredCount) || result.gpuRequiredCount < 1) {
    throw new Error(
      `Physical integrity violation in EcoLogits core (gpuRequiredCount=${String(result.gpuRequiredCount)}): must be a finite integer >= 1.`,
    );
  }
}

function validateOfficialEcologitsInputs(
  params: OfficialEcologitsLlmParams,
  coeffs: {
    quantizationBits: number;
    batchSize: number;
    gpuMemory: number;
    serverGpuCount: number;
    serverLifetime: number;
    serverPower: number;
    gpuEmbodiedGwp: number;
    gpuEmbodiedAdpe: number;
    gpuEmbodiedPe: number;
    serverEmbodiedGwp: number;
    serverEmbodiedAdpe: number;
    serverEmbodiedPe: number;
    gpuEnergyAlpha: number;
    gpuEnergyBeta: number;
    gpuEnergyGamma: number;
    latencyAlpha: number;
    latencyBeta: number;
    latencyGamma: number;
  },
): void {
  const activeParameterCount = params.modelActiveParameterCount;
  const totalParameterCount = params.modelTotalParameterCount;
  if (
    !Number.isFinite(activeParameterCount) ||
    activeParameterCount <= 0 ||
    !Number.isFinite(totalParameterCount) ||
    totalParameterCount <= 0
  ) {
    throw new Error(
      "Cannot size the GPU set: modelActiveParameterCount and modelTotalParameterCount must be positive, finite numbers.",
    );
  }
  if (activeParameterCount > totalParameterCount) {
    throw new Error(
      "Invalid architecture: modelActiveParameterCount cannot exceed modelTotalParameterCount.",
    );
  }
  assertFiniteNonNegative(params.outputTokenCount, "outputTokenCount");

  if (typeof params.datacenterPue !== "number" || !Number.isFinite(params.datacenterPue) || params.datacenterPue < 1) {
    throw new Error("Invalid datacenterPue: must be a finite number >= 1.");
  }
  assertFiniteNonNegative(params.datacenterWue, "datacenterWue");
  assertFiniteNonNegative(params.ifElectricityMixGwp, "ifElectricityMixGwp");
  assertFiniteNonNegative(params.ifElectricityMixAdpe ?? 0, "ifElectricityMixAdpe");
  assertFiniteNonNegative(params.ifElectricityMixPe ?? 0, "ifElectricityMixPe");
  assertFiniteNonNegative(params.ifElectricityMixWue, "ifElectricityMixWue");

  assertFinitePositive(coeffs.quantizationBits, "modelQuantizationBits");
  assertFinitePositive(coeffs.batchSize, "batchSize");
  assertFinitePositive(coeffs.gpuMemory, "gpuMemory");
  assertFinitePositive(coeffs.serverGpuCount, "serverGpuCount");
  assertFinitePositive(coeffs.serverLifetime, "serverLifetime");
  assertFiniteNonNegative(coeffs.serverPower, "serverPower");
  assertFiniteNonNegative(coeffs.gpuEmbodiedGwp, "gpuEmbodiedGwp");
  assertFiniteNonNegative(coeffs.gpuEmbodiedAdpe, "gpuEmbodiedAdpe");
  assertFiniteNonNegative(coeffs.gpuEmbodiedPe, "gpuEmbodiedPe");
  assertFiniteNonNegative(coeffs.serverEmbodiedGwp, "serverEmbodiedGwp");
  assertFiniteNonNegative(coeffs.serverEmbodiedAdpe, "serverEmbodiedAdpe");
  assertFiniteNonNegative(coeffs.serverEmbodiedPe, "serverEmbodiedPe");
  assertFiniteNumber(coeffs.gpuEnergyAlpha, "gpuEnergyAlpha");
  assertFiniteNumber(coeffs.gpuEnergyBeta, "gpuEnergyBeta");
  assertFiniteNumber(coeffs.gpuEnergyGamma, "gpuEnergyGamma");
  assertFiniteNumber(coeffs.latencyAlpha, "latencyAlpha");
  assertFiniteNumber(coeffs.latencyBeta, "latencyBeta");
  assertFiniteNumber(coeffs.latencyGamma, "latencyGamma");
}

/**
 * Noyau mathématique pur conforme à `computeLlmImpacts` d'EcoLogits.js v3.0.0.
 * Reproduit à l'identique (0 ULP d'écart sur les vecteurs scalaires officiels) le DAG `llm.ts`.
 */
export function computeOfficialEcologitsLlmImpacts(
  params: OfficialEcologitsLlmParams,
): OfficialEcologitsLlmRawImpacts {
  const activeParameterCount = params.modelActiveParameterCount;
  const totalParameterCount = params.modelTotalParameterCount;
  const outputTokenCount = params.outputTokenCount;

  const quantizationBits =
    params.modelQuantizationBits ?? ECOLOGITS_CONSTANTS.MODEL_QUANTIZATION_BITS;
  const gpuEnergyAlpha = params.gpuEnergyAlpha ?? ECOLOGITS_CONSTANTS.GPU_ENERGY_ALPHA;
  const gpuEnergyBeta = params.gpuEnergyBeta ?? ECOLOGITS_CONSTANTS.GPU_ENERGY_BETA;
  const gpuEnergyGamma = params.gpuEnergyGamma ?? ECOLOGITS_CONSTANTS.GPU_ENERGY_GAMMA;
  const latencyAlpha = params.latencyAlpha ?? ECOLOGITS_CONSTANTS.LATENCY_ALPHA;
  const latencyBeta = params.latencyBeta ?? ECOLOGITS_CONSTANTS.LATENCY_BETA;
  const latencyGamma = params.latencyGamma ?? ECOLOGITS_CONSTANTS.LATENCY_GAMMA;
  const gpuMemory = params.gpuMemory ?? ECOLOGITS_CONSTANTS.GPU_MEMORY_GB;
  const gpuEmbodiedGwp = params.gpuEmbodiedGwp ?? ECOLOGITS_CONSTANTS.GPU_EMBODIED_GWP_KG;
  const gpuEmbodiedAdpe = params.gpuEmbodiedAdpe ?? ECOLOGITS_CONSTANTS.GPU_EMBODIED_ADPE_KG;
  const gpuEmbodiedPe = params.gpuEmbodiedPe ?? ECOLOGITS_CONSTANTS.GPU_EMBODIED_PE_MJ;
  const serverGpuCount = params.serverGpuCount ?? ECOLOGITS_CONSTANTS.SERVER_GPUS;
  const serverPower = params.serverPower ?? ECOLOGITS_CONSTANTS.SERVER_POWER_KW;
  const serverEmbodiedGwp =
    params.serverEmbodiedGwp ?? ECOLOGITS_CONSTANTS.SERVER_EMBODIED_GWP_KG;
  const serverEmbodiedAdpe =
    params.serverEmbodiedAdpe ?? ECOLOGITS_CONSTANTS.SERVER_EMBODIED_ADPE_KG;
  const serverEmbodiedPe = params.serverEmbodiedPe ?? ECOLOGITS_CONSTANTS.SERVER_EMBODIED_PE_MJ;
  const serverLifetime = params.serverLifetime ?? ECOLOGITS_CONSTANTS.HARDWARE_LIFESPAN_SECONDS;
  const batchSize = params.batchSize ?? ECOLOGITS_CONSTANTS.BATCH_SIZE;

  validateOfficialEcologitsInputs(params, {
    quantizationBits,
    batchSize,
    gpuMemory,
    serverGpuCount,
    serverLifetime,
    serverPower,
    gpuEmbodiedGwp,
    gpuEmbodiedAdpe,
    gpuEmbodiedPe,
    serverEmbodiedGwp,
    serverEmbodiedAdpe,
    serverEmbodiedPe,
    gpuEnergyAlpha,
    gpuEnergyBeta,
    gpuEnergyGamma,
    latencyAlpha,
    latencyBeta,
    latencyGamma,
  });

  // 1. gpu_energy
  const scale = gpuEnergyAlpha * Math.exp(gpuEnergyBeta * batchSize);
  const energyPerToken = (scale * activeParameterCount + gpuEnergyGamma) / 1000;
  const gpuEnergyPerGpuKwh = outputTokenCount * energyPerToken;

  // 2. generation_latency
  let latencyPerToken: number;
  if (params.tps === null || params.tps === undefined) {
    latencyPerToken =
      latencyAlpha * activeParameterCount + latencyBeta * batchSize + latencyGamma;
  } else if (params.tps <= 0 || !Number.isFinite(params.tps)) {
    throw new Error(
      "Cannot derive a latency from tps <= 0; the deployment data for this model is invalid.",
    );
  } else {
    latencyPerToken = 1 / params.tps;
  }

  const requestCount = params.requestCount ?? 1;
  if (!Number.isFinite(requestCount) || requestCount < 1 || !Number.isInteger(requestCount)) {
    throw new Error("Invalid requestCount: must be a positive integer >= 1.");
  }
  const firstTokenLatencyPerRequest =
    params.ttft === null || params.ttft === undefined ? 0 : params.ttft;
  if (!Number.isFinite(firstTokenLatencyPerRequest) || firstTokenLatencyPerRequest < 0) {
    throw new Error("Invalid ttft: must be a non-negative finite number.");
  }
  const gpuLatency =
    outputTokenCount * latencyPerToken + requestCount * firstTokenLatencyPerRequest;

  const requestLatency =
    params.requestLatency === null || params.requestLatency === undefined
      ? Number.POSITIVE_INFINITY
      : params.requestLatency;
  if (
    params.requestLatency !== null &&
    params.requestLatency !== undefined &&
    (typeof requestLatency !== "number" || !Number.isFinite(requestLatency) || requestLatency < 0)
  ) {
    throw new Error("Invalid requestLatency: must be a non-negative finite number.");
  }
  const generationLatencySeconds = requestLatency < gpuLatency ? requestLatency : gpuLatency;

  // 3. model_required_memory & gpu_required_count
  const modelRequiredMemoryGb = (1.2 * totalParameterCount * quantizationBits) / 8;
  const rawGpuCount = Math.ceil(modelRequiredMemoryGb / gpuMemory);
  if (!(rawGpuCount >= 1) || !Number.isFinite(rawGpuCount)) {
    throw new Error(
      "Cannot size the GPU set: the required GPU count must be a positive, finite number.",
    );
  }
  const gpuRequiredCount = 2 ** Math.ceil(Math.log2(rawGpuCount));

  // 4. server_energy & request_it_energy & request_energy
  const perHour = generationLatencySeconds / 3600;
  const gpuRatio = gpuRequiredCount / serverGpuCount;
  const serverEnergyKwh = perHour * serverPower * gpuRatio * (1 / batchSize);
  const requestItEnergyKwh = serverEnergyKwh + gpuRequiredCount * gpuEnergyPerGpuKwh;
  const requestEnergyKwh = params.datacenterPue * requestItEnergyKwh;

  // 5. usage impacts (GWP, ADPe, PE, WCF)
  const usageGwpKgCo2e = requestEnergyKwh * params.ifElectricityMixGwp;
  const usageAdpeKgSbEq = requestEnergyKwh * (params.ifElectricityMixAdpe ?? 0);
  const usagePeMj = requestEnergyKwh * (params.ifElectricityMixPe ?? 0);
  const directWaterLiters = requestItEnergyKwh * params.datacenterWue;
  const indirectWaterLiters = requestEnergyKwh * params.ifElectricityMixWue;
  const usageWcfLiters =
    requestItEnergyKwh *
    (params.datacenterWue + params.datacenterPue * params.ifElectricityMixWue);

  // 6. embodied impacts (server + GPUs)
  const serverGpuEmbodiedGwp =
    (gpuRequiredCount / serverGpuCount) * serverEmbodiedGwp +
    gpuRequiredCount * gpuEmbodiedGwp;
  const serverGpuEmbodiedAdpe =
    (gpuRequiredCount / serverGpuCount) * serverEmbodiedAdpe +
    gpuRequiredCount * gpuEmbodiedAdpe;
  const serverGpuEmbodiedPe =
    (gpuRequiredCount / serverGpuCount) * serverEmbodiedPe +
    gpuRequiredCount * gpuEmbodiedPe;

  const embodiedGwpKgCo2e =
    (generationLatencySeconds * serverGpuEmbodiedGwp) / (serverLifetime * batchSize);
  const embodiedAdpeKgSbEq =
    (generationLatencySeconds * serverGpuEmbodiedAdpe) / (serverLifetime * batchSize);
  const embodiedPeMj =
    (generationLatencySeconds * serverGpuEmbodiedPe) / (serverLifetime * batchSize);

  const result: OfficialEcologitsLlmRawImpacts = {
    gpuEnergyPerGpuKwh,
    generationLatencySeconds,
    modelRequiredMemoryGb,
    gpuRequiredCount,
    serverEnergyKwh,
    requestItEnergyKwh,
    requestEnergyKwh,
    usageGwpKgCo2e,
    usageAdpeKgSbEq,
    usagePeMj,
    usageWcfLiters,
    directWaterLiters,
    indirectWaterLiters,
    embodiedGwpKgCo2e,
    embodiedAdpeKgSbEq,
    embodiedPeMj,
    totalGwpKgCo2e: usageGwpKgCo2e + embodiedGwpKgCo2e,
    totalAdpeKgSbEq: usageAdpeKgSbEq + embodiedAdpeKgSbEq,
    totalPeMj: usagePeMj + embodiedPeMj,
    totalWcfLiters: usageWcfLiters,
  };

  assertOfficialEcologitsResultIntegrity(result);

  return result;
}
