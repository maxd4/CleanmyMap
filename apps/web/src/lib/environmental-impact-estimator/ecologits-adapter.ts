import type { AiModelRecord } from "./model-catalog";
import {
  getScientificFactor,
  resolveElectricityFactorForRegion,
  type EnvironmentalDataQualityDiagnostic,
  type ScientificFactorRegion,
} from "./scientific-registry";

/**
 * Adaptateur et noyau de calcul fidèle à EcoLogits v3.0.0.
 *
 * Référence officielle :
 * - https://github.com/mlco2/ecologits.js/blob/main/packages/ecologits.js/src/impacts/llm.ts
 * - https://github.com/mlco2/ecologits.js/tree/main/spec/vectors
 *
 * Équations officielles EcoLogits v3.0.0 (DAG LLM) :
 * - E_GPU_per_device (kWh) = N_output × ((alpha × exp(beta × batch) × P_active + gamma) / 1000)
 * - Memory_req (GB) = 1.2 × P_total × quantization_bits / 8
 * - N_GPU = 2 ^ ceil(log2(ceil(Memory_req / GPU_memory)))
 * - Latency_per_token (s) = (1 / tps) si tps fourni, sinon (latency_alpha × P_active + latency_beta × batch + latency_gamma)
 * - Latency_gen (s) = min(request_latency, N_output × Latency_per_token + N_requests × ttft)
 * - E_server (kWh) = (Latency_gen / 3600) × Server_power × (N_GPU / Server_GPUs) × (1 / batch)
 * - E_IT (kWh) = E_server + N_GPU × E_GPU_per_device
 * - E_facility (kWh) = E_IT × PUE
 * - Usage_GWP = E_facility × f_grid_gwp
 * - Usage_WCF (L) = E_IT × (WUE_site + PUE × WUE_grid) = E_IT × WUE_site + E_facility × WUE_grid
 * - Embodied_server_gpu = (N_GPU / Server_GPUs) × Embodied_server + N_GPU × Embodied_GPU
 * - Request_embodied = Latency_gen × Embodied_server_gpu / (Hardware_lifespan × batch)
 */

export const ECOLOGITS_METADATA = {
  packageName: "@ecologits/ecologits.js",
  version: "3.0.0",
  coreVersion: "0.11.2",
  syncedAt: "2026-10-02",
  license: "MPL-2.0",
  unpackedSizeBytes: 1450447,
  homeUrl: "https://ecologits.ai",
  referenceSourceUrl:
    "https://github.com/mlco2/ecologits.js/blob/main/packages/ecologits.js/src/impacts/llm.ts",
  complianceVectorsUrl:
    "https://github.com/mlco2/ecologits.js/tree/main/spec/vectors",
} as const;

export type EcologitsEvaluationReport = {
  readonly version: string;
  readonly license: string;
  readonly coverage: {
    readonly supportedModalities: readonly string[];
    readonly supportedProviders: readonly string[];
    readonly architectureCoverage: string;
  };
  readonly units: {
    readonly energy: string;
    readonly gwp: string;
    readonly wcfWater: string;
    readonly adpe: string;
    readonly pe: string;
  };
  readonly strengths: readonly string[];
  readonly limitationsForCleanMyMap: readonly string[];
  readonly technicalCostAssessment: string;
};

/**
 * Fournit une évaluation scientifique et technique vérifiable d'EcoLogits v3.0.0.
 */
export function evaluateEcologitsMethodology(): EcologitsEvaluationReport {
  return {
    version: `${ECOLOGITS_METADATA.packageName}@${ECOLOGITS_METADATA.version} (core ${ECOLOGITS_METADATA.coreVersion})`,
    license: ECOLOGITS_METADATA.license,
    coverage: {
      supportedModalities: ["text"],
      supportedProviders: [
        "openai",
        "anthropic",
        "mistralai",
        "huggingface_hub",
        "cohere",
        "google_genai",
      ],
      architectureCoverage:
        "Modèles denses et MoE (Mixture of Experts) à paramètres actifs et totaux connus. Sans paramètres publiés (unreleased_proprietary), aucune conformité EcoLogits n'est revendiquée.",
    },
    units: {
      energy: "kWh (énergie finale électrique aux bornes du serveur et du data center)",
      gwp: "kgCO₂e (Global Warming Potential, 100 ans)",
      wcfWater: "L (Water Consumption Footprint, eau directe sur site et eau indirecte amont)",
      adpe: "kgSb-eq (Abiotic Depletion Potential pour les éléments minéraux/métaux)",
      pe: "MJ (Primary Energy consommée)",
    },
    strengths: [
      "Équations physiques déterministes et auditables (alpha/beta/gamma GPU, dimensionnement mémoire/N_GPU en puissance de 2, régression de latence).",
      "Distinction rigoureuse entre phase d'usage (énergie active GPU + part serveur hors GPU) et phase de fabrication (serveur + GPU amortis sur 3 ans).",
      "Approche multicritères (carbone, eau directe/indirecte, ressources abiotiques, énergie primaire).",
      "Validation numérique exacte contre les vecteurs officiels spec/vectors/estimator.json.",
    ],
    limitationsForCleanMyMap: [
      "L'équation officielle est paramétrée uniquement sur les tokens générés (output_token_count) ; elle ne modélise pas un volume totalTokens non ventilé ni une requête composée uniquement de prompt (outputTokens = 0, inputTokens > 0).",
      "Les paramètres de déploiement par défaut (batch_size = 64, quantization = 16 bits, GPU 80 Go, serveur 8 GPU de 1,2 kW) constituent des hypothèses de référence cloud et ne peuvent jamais être extrapolés à une machine personnelle (local_device).",
      "Inapplicable aux modalités image, audio et vidéo faute de méthode physique sourcée dans EcoLogits.",
    ],
    technicalCostAssessment:
      "L'implémentation directe et fidèle du noyau mathématique officiel (llm.ts) garantit une parité numérique exacte avec les vecteurs de conformité EcoLogits.js 3.0.0 sans embarquer les 1,45 Mo de données statiques du paquet complet.",
  };
}

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

function roundPhysicalOutput(val: number): number {
  if (!Number.isFinite(val) || val === 0) return 0;
  if (Math.abs(val) >= 0.001) {
    return Math.round(val * 1_000_000) / 1_000_000;
  }
  return Number(val.toPrecision(6));
}

function round12(val: number): number {
  if (!Number.isFinite(val) || val === 0) return 0;
  if (Math.abs(val) >= 1e-9) {
    return Math.round(val * 1_000_000_000_000) / 1_000_000_000_000;
  }
  return Number(val.toPrecision(6));
}

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
  if (!Number.isFinite(outputTokenCount) || outputTokenCount < 0) {
    throw new Error("Invalid outputTokenCount: must be a non-negative finite number.");
  }

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

  if (!Number.isFinite(batchSize) || batchSize <= 0) {
    throw new Error("Invalid batchSize: must be a positive finite number.");
  }
  if (!Number.isFinite(gpuMemory) || gpuMemory <= 0) {
    throw new Error("Invalid gpuMemory: must be a positive finite number.");
  }
  if (!Number.isFinite(serverGpuCount) || serverGpuCount <= 0) {
    throw new Error("Invalid serverGpuCount: must be a positive finite number.");
  }
  if (!Number.isFinite(serverLifetime) || serverLifetime <= 0) {
    throw new Error("Invalid serverLifetime: must be a positive finite number.");
  }

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
  if (requestLatency < 0 || Number.isNaN(requestLatency)) {
    throw new Error("Invalid requestLatency: must be a non-negative number.");
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

  return {
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
}

export type EcologitsComputationParams = {
  /** Modèle du catalogue ou null */
  model?: AiModelRecord | null;
  /** Paramètres actifs du modèle (en milliards) si personnalisés */
  customActiveParametersBillion?: number | null;
  /** Paramètres totaux du modèle (en milliards) si personnalisés */
  customTotalParametersBillion?: number | null;
  /** Tokens d'entrée (prompt, incluant éventuellement cachedTokens) */
  inputTokens?: number | null;
  /** Tokens de sortie (génération, incluant éventuellement reasoningTokensIncluded) */
  outputTokens?: number | null;
  /** Sous-ensemble de inputTokens servi depuis le KV-cache (0 <= cachedTokens <= inputTokens) */
  cachedTokens?: number | null;
  /** Sous-ensemble de outputTokens correspondant au raisonnement (0 <= reasoningTokensIncluded <= outputTokens) */
  reasoningTokensIncluded?: number | null;
  /** Nombre de requêtes associées (entier >= 1) */
  requestCount?: number | null;
  /** Latence mesurée ou durée totale d'inférence en secondes */
  durationSeconds?: number | null;
  /** Débit de génération connu en tokens/s (optionnel ; remplace la régression de latence si fourni) */
  tps?: number | null;
  /** Time-to-first-token par requête en secondes (optionnel) */
  ttft?: number | null;
  /** Concurrence serveur (batch size ; défaut EcoLogits = 64) */
  batchSize?: number | null;
  /** Quantification du modèle en bits (défaut EcoLogits = 16) */
  modelQuantizationBits?: number | null;
  /** Mémoire par GPU en Go (défaut EcoLogits = 80) */
  gpuMemoryGb?: number | null;
  /** PUE du data center (défaut: 1.15) */
  pue?: number;
  /** WUE direct de refroidissement du data center en L/kWh IT si connu */
  datacenterWue?: number | null;
  /** Région électrique */
  region?: ScientificFactorRegion | string | null;
  /** Scénario de sensibilité */
  scenario?: "low" | "central" | "high";
  /** Environnement d'exécution */
  executionEnvironment?: "cloud_api" | "local_device";
};

export type EcologitsImpactsResult = {
  /** Indique si le calcul a été exécuté selon les équations officielles EcoLogits v3.0.0 avec parité prouvée */
  isEcologitsCompliant: boolean;
  /** Nombre de GPU alloués par le dimensionnement mémoire EcoLogits, ou null si non applicable */
  gpuRequiredCount: number | null;
  /** Latence de génération retenue (en secondes), ou null si non applicable */
  generationLatencySeconds: number | null;
  /** Énergie informatique IT aux bornes du serveur (kWh), ou null si non calculable */
  itEnergyKwh: number | null;
  /** Énergie totale data center incluant le PUE (kWh), ou null si non calculable */
  facilityEnergyKwh: number | null;
  /** Émissions GES opérationnelles (Scope 2 location-based) en kgCO₂e, ou null si région inconnue/NA */
  operationalGwpKgCo2e: number | null;
  /** Émissions GES incorporées ACV matériel (Scope 3 amont) en kgCO₂e, ou null si inconnu/NA */
  embodiedGwpKgCo2e: number | null;
  /** Total GES ACV (opérationnel + incorporé) en kgCO₂e, ou null si l'une des composantes est inconnue */
  totalGwpKgCo2e: number | null;
  /** Eau directe consommée sur site pour le refroidissement (L), ou null si non calculable */
  directWaterLiters: number | null;
  /** Eau indirecte liée à la centrale électrique amont (L), ou null si non calculable */
  indirectWaterLiters: number | null;
  /** Eau totale (L), ou null si l'une des composantes directe ou indirecte manque */
  totalWaterLiters: number | null;
  /** Épuisement des ressources abiotiques incorporé (kgSb-eq), ou null si inconnu/NA */
  embodiedAdpeKgSbEq: number | null;
  /** Énergie primaire incorporée (MJ), ou null si inconnue/NA */
  embodiedPeMj: number | null;
  /** Diagnostic de qualité des données */
  diagnostic: EnvironmentalDataQualityDiagnostic;
  /** Notes méthodologiques et traçabilité */
  notes: string[];
  /** Avertissements méthodologiques */
  warnings: string[];
};

function buildNotCalculableResult(
  notes: string[],
  warnings: string[],
): EcologitsImpactsResult {
  return {
    isEcologitsCompliant: false,
    gpuRequiredCount: null,
    generationLatencySeconds: null,
    itEnergyKwh: null,
    facilityEnergyKwh: null,
    operationalGwpKgCo2e: null,
    embodiedGwpKgCo2e: null,
    totalGwpKgCo2e: null,
    directWaterLiters: null,
    indirectWaterLiters: null,
    totalWaterLiters: null,
    embodiedAdpeKgSbEq: null,
    embodiedPeMj: null,
    diagnostic: "NOT_CALCULABLE",
    notes,
    warnings,
  };
}

function validateAdapterParams(params: EcologitsComputationParams): void {
  const checkFiniteNonNegative = (val: number | null | undefined, name: string) => {
    if (val === undefined || val === null) return;
    if (typeof val !== "number" || !Number.isFinite(val) || val < 0) {
      throw new Error(`Paramètre invalide '${name}' : un nombre fini >= 0 est attendu.`);
    }
  };
  const checkIntegerNonNegative = (val: number | null | undefined, name: string) => {
    checkFiniteNonNegative(val, name);
    if (val !== undefined && val !== null && !Number.isInteger(val)) {
      throw new Error(`Paramètre invalide '${name}' : un entier >= 0 est attendu.`);
    }
  };

  checkIntegerNonNegative(params.inputTokens, "inputTokens");
  checkIntegerNonNegative(params.outputTokens, "outputTokens");
  checkIntegerNonNegative(params.cachedTokens, "cachedTokens");
  checkIntegerNonNegative(params.reasoningTokensIncluded, "reasoningTokensIncluded");
  checkIntegerNonNegative(params.requestCount, "requestCount");
  checkFiniteNonNegative(params.durationSeconds, "durationSeconds");
  checkFiniteNonNegative(params.datacenterWue, "datacenterWue");
  checkFiniteNonNegative(params.ttft, "ttft");

  if (params.tps !== undefined && params.tps !== null) {
    if (typeof params.tps !== "number" || !Number.isFinite(params.tps) || params.tps <= 0) {
      throw new Error("Paramètre invalide 'tps' : un nombre fini > 0 est attendu.");
    }
  }
  if (params.batchSize !== undefined && params.batchSize !== null) {
    if (
      typeof params.batchSize !== "number" ||
      !Number.isFinite(params.batchSize) ||
      !Number.isInteger(params.batchSize) ||
      params.batchSize < 1
    ) {
      throw new Error("Paramètre invalide 'batchSize' : un entier >= 1 est attendu.");
    }
  }
  if (params.pue !== undefined && params.pue !== null) {
    if (typeof params.pue !== "number" || !Number.isFinite(params.pue) || params.pue < 1.0 || params.pue > 5.0) {
      throw new Error("Paramètre invalide 'pue' : un nombre fini dans [1.0, 5.0] est attendu.");
    }
  }
  if (
    typeof params.cachedTokens === "number" &&
    params.cachedTokens > 0 &&
    (typeof params.inputTokens !== "number" || params.cachedTokens > params.inputTokens)
  ) {
    throw new Error(
      "Déclaration incohérente : 'cachedTokens' est un sous-ensemble de 'inputTokens' (inputTokens requis et cachedTokens <= inputTokens).",
    );
  }
  if (
    typeof params.reasoningTokensIncluded === "number" &&
    params.reasoningTokensIncluded > 0 &&
    (typeof params.outputTokens !== "number" || params.reasoningTokensIncluded > params.outputTokens)
  ) {
    throw new Error(
      "Déclaration incohérente : 'reasoningTokensIncluded' est un sous-ensemble de 'outputTokens' (outputTokens requis et reasoningTokensIncluded <= outputTokens).",
    );
  }
  if (
    params.requestCount === 0 &&
    ((params.outputTokens ?? 0) > 0 || (params.inputTokens ?? 0) > 0)
  ) {
    throw new Error(
      "Déclaration incohérente : 'requestCount' ne peut pas être 0 lorsqu'une activité de tokens est déclarée.",
    );
  }
}

/**
 * Adaptateur de calcul d'impacts fidèle à EcoLogits v3.0.0 pour CleanMyMap.
 *
 * - Exige une architecture documentée (paramètres actifs et totaux > 0) et un volume `outputTokens` explicite.
 * - Refuse toute extrapolation H100 sur `local_device` (retourne `null` / `NOT_CALCULABLE`).
 * - Ne substitue jamais `inputTokens` à `outputTokens` et n'invente jamais une durée d'une seconde pour une activité nulle.
 * - Ne retourne `totalWaterLiters` que lorsque l'eau directe ET l'eau indirecte sont toutes deux calculables.
 */
export function computeEcologitsCompatibleImpacts(
  params: EcologitsComputationParams,
): EcologitsImpactsResult {
  validateAdapterParams(params);

  const warnings: string[] = [];
  const notes: string[] = [];
  const executionEnv = params.executionEnvironment ?? "cloud_api";

  // 1. Refus d'extrapoler le profil serveur cloud H100 sur une machine locale
  if (executionEnv === "local_device") {
    warnings.push(
      "Exécution locale (local_device) : les équations serveur cloud H100 (8× GPU 80 Go, 1,2 kW) d'EcoLogits v3.0.0 ne sont pas applicables à un équipement personnel. Impacts physiques et ACV retournés à NA (null).",
    );
    return buildNotCalculableResult(notes, warnings);
  }

  // 2. Vérification stricte de l'architecture (aucune substitution d'architecture hypothétique)
  let activeBillion: number | null = null;
  let totalBillion: number | null = null;

  if (
    typeof params.customActiveParametersBillion === "number" &&
    params.customActiveParametersBillion > 0
  ) {
    activeBillion = params.customActiveParametersBillion;
    totalBillion =
      typeof params.customTotalParametersBillion === "number" &&
      params.customTotalParametersBillion > 0
        ? params.customTotalParametersBillion
        : activeBillion;
  } else if (params.model) {
    activeBillion = params.model.architecture.activeParametersBillion;
    totalBillion = params.model.architecture.totalParametersBillion;
  }

  if (
    activeBillion === null ||
    totalBillion === null ||
    !Number.isFinite(activeBillion) ||
    !Number.isFinite(totalBillion) ||
    activeBillion <= 0 ||
    totalBillion <= 0
  ) {
    warnings.push(
      `Architecture non publiée ou incomplète${params.model ? ` pour ${params.model.name}` : ""} : EcoLogits v3.0.0 exige les paramètres actifs et totaux pour dimensionner les GPU et l'énergie active. Aucun paramètre hypothétique n'est substitué.`,
    );
    return buildNotCalculableResult(notes, warnings);
  }

  // 3. Vérification stricte de outputTokens (aucun token d'entrée n'est traité comme token de sortie)
  if (params.outputTokens === null || params.outputTokens === undefined) {
    warnings.push(
      "Volume de génération (outputTokens) absent : EcoLogits v3.0.0 est paramétré sur les tokens générés (output_token_count) et refuse de traiter des tokens d'entrée ou un total non ventilé comme des tokens de sortie.",
    );
    return buildNotCalculableResult(notes, warnings);
  }

  const outputTokens = params.outputTokens;
  const inputTokens = params.inputTokens ?? 0;
  const cachedTokens = params.cachedTokens ?? 0;

  // Si outputTokens === 0 mais inputTokens > 0 (requête de prompt seul sans génération), EcoLogits v3.0.0 ne modélise pas le préfill isolé
  if (outputTokens === 0 && inputTokens > 0) {
    warnings.push(
      "Requête sans génération (outputTokens = 0 avec inputTokens > 0) : l'équation officielle EcoLogits v3.0.0 ne modélise pas l'énergie de préfill isolée sans génération.",
    );
    return buildNotCalculableResult(notes, warnings);
  }

  const pue = params.pue ?? 1.15;
  const batchSize = params.batchSize ?? ECOLOGITS_CONSTANTS.BATCH_SIZE;
  const quantizationBits =
    params.modelQuantizationBits ?? ECOLOGITS_CONSTANTS.MODEL_QUANTIZATION_BITS;
  const gpuMemoryGb = params.gpuMemoryGb ?? ECOLOGITS_CONSTANTS.GPU_MEMORY_GB;
  const requestCount =
    typeof params.requestCount === "number" && params.requestCount >= 1
      ? params.requestCount
      : 1;

  if (totalBillion !== activeBillion) {
    notes.push(
      `Architecture MoE : ${activeBillion} Md paramètres actifs sur ${totalBillion} Md paramètres totaux.`,
    );
  }

  if (
    typeof params.reasoningTokensIncluded === "number" &&
    params.reasoningTokensIncluded > 0
  ) {
    notes.push(
      `${params.reasoningTokensIncluded} tokens de raisonnement inclus dans les ${outputTokens} tokens de sortie (aucun surcoût multiplicateur arbitraire appliqué).`,
    );
  }

  if (inputTokens > 0) {
    const uncachedInputTokens = inputTokens - cachedTokens;
    notes.push(
      `Tokens d'entrée déclarés : ${inputTokens} (dont ${cachedTokens} servis depuis le KV-cache et ${uncachedInputTokens} non cachés). Conformément à EcoLogits v3.0.0, seuls les ${outputTokens} tokens générés (outputTokens) pilotent l'équation d'énergie active GPU.`,
    );
  }

  // 4. Facteurs régionaux d'électricité et d'eau
  const electricityFactor = resolveElectricityFactorForRegion(params.region);
  const hasElectricityFactor =
    electricityFactor !== null && typeof electricityFactor.value === "number";
  const usWaterFactor =
    params.region === "US" ? getScientificFactor("water-indirect-datacenter-us-2024") : null;
  const hasIndirectWaterFactor =
    usWaterFactor !== null && typeof usWaterFactor.value === "number";
  const hasDirectWue =
    typeof params.datacenterWue === "number" && params.datacenterWue >= 0;

  // 5. Exécution du noyau mathématique officiel EcoLogits v3.0.0
  const raw = computeOfficialEcologitsLlmImpacts({
    modelActiveParameterCount: activeBillion,
    modelTotalParameterCount: totalBillion,
    outputTokenCount: outputTokens,
    requestLatency: params.durationSeconds ?? null,
    tps: params.tps ?? null,
    ttft: params.ttft ?? null,
    requestCount,
    datacenterPue: pue,
    datacenterWue: hasDirectWue ? (params.datacenterWue as number) : 0,
    ifElectricityMixGwp: hasElectricityFactor ? (electricityFactor.value as number) : 0,
    ifElectricityMixWue: hasIndirectWaterFactor ? (usWaterFactor.value as number) : 0,
    batchSize,
    modelQuantizationBits: quantizationBits,
    gpuMemory: gpuMemoryGb,
  });

  notes.push(
    `Hypothèses de déploiement EcoLogits v3.0.0 : N_GPU = ${raw.gpuRequiredCount} (mémoire requise ${roundPhysicalOutput(raw.modelRequiredMemoryGb)} Go en ${quantizationBits} bits sur GPU ${gpuMemoryGb} Go), batch_size = ${batchSize}, latence active = ${roundPhysicalOutput(raw.generationLatencySeconds)} s.`,
  );

  if (outputTokens === 0) {
    notes.push(
      "Activité texte déclarée à zéro (0 token généré, sans mesure électrique directe aux bornes) : le zéro résulte d'une déclaration utilisateur.",
    );
  }

  const operationalGwpKgCo2e = hasElectricityFactor
    ? roundPhysicalOutput(raw.usageGwpKgCo2e)
    : null;
  if (!hasElectricityFactor) {
    warnings.push(
      `Facteur carbone électrique non disponible pour la région '${params.region ?? "UNKNOWN"}'. Émissions opérationnelles classées non calculables (NA) conformément au principe d'intégrité.`,
    );
  }

  const embodiedGwpKgCo2e = roundPhysicalOutput(raw.embodiedGwpKgCo2e);
  const totalGwpKgCo2e =
    hasElectricityFactor ? roundPhysicalOutput(raw.totalGwpKgCo2e) : null;

  const directWaterLiters = hasDirectWue
    ? roundPhysicalOutput(raw.directWaterLiters)
    : null;
  const indirectWaterLiters = hasIndirectWaterFactor
    ? roundPhysicalOutput(raw.indirectWaterLiters)
    : null;

  if (!hasIndirectWaterFactor && params.region && params.region !== "UNKNOWN") {
    notes.push(
      `Eau indirecte non calculée pour la région '${params.region}' : aucun facteur d'eau de réseau certifié équivalent à LBNL n'est branché.`,
    );
  }

  // L'eau totale n'est retournée QUE si les deux composantes (directe sur site et indirecte amont) sont calculables
  const totalWaterLiters =
    directWaterLiters !== null && indirectWaterLiters !== null
      ? roundPhysicalOutput(raw.usageWcfLiters)
      : null;

  const diagnostic: EnvironmentalDataQualityDiagnostic = hasElectricityFactor
    ? "DOCUMENTED_MODEL"
    : "NOT_CALCULABLE";

  return {
    isEcologitsCompliant: true,
    gpuRequiredCount: raw.gpuRequiredCount,
    generationLatencySeconds: roundPhysicalOutput(raw.generationLatencySeconds),
    itEnergyKwh: roundPhysicalOutput(raw.requestItEnergyKwh),
    facilityEnergyKwh: roundPhysicalOutput(raw.requestEnergyKwh),
    operationalGwpKgCo2e,
    embodiedGwpKgCo2e,
    totalGwpKgCo2e,
    directWaterLiters,
    indirectWaterLiters,
    totalWaterLiters,
    embodiedAdpeKgSbEq: round12(raw.embodiedAdpeKgSbEq),
    embodiedPeMj: roundPhysicalOutput(raw.embodiedPeMj),
    diagnostic,
    notes,
    warnings,
  };
}
