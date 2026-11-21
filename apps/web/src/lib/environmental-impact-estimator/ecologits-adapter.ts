import type { AiModelRecord } from "./model-catalog";
import {
  ECOLOGITS_CONSTANTS,
  computeOfficialEcologitsLlmImpacts,
  type OfficialEcologitsLlmCoefficients,
  type OfficialEcologitsLlmParams,
  type OfficialEcologitsLlmRawImpacts,
} from "./ecologits-core";
import {
  getScientificFactor,
  resolveElectricityFactorForRegion,
  type EnvironmentalDataQualityDiagnostic,
  type ScientificFactorRegion,
} from "./scientific-registry";
import { roundPhysicalOutput } from "./physical-rounding";

export {
  ECOLOGITS_CONSTANTS,
  computeOfficialEcologitsLlmImpacts,
  type OfficialEcologitsLlmCoefficients,
  type OfficialEcologitsLlmParams,
  type OfficialEcologitsLlmRawImpacts,
};

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

function assertFinitePhysicalValue(val: number, label: string): void {
  if (!Number.isFinite(val) || val < 0) {
    throw new Error(`Résultat physique invalide (${label}) : un nombre fini >= 0 est attendu.`);
  }
}

function round12(val: number): number {
  assertFinitePhysicalValue(val, "output");
  if (val === 0) return 0;
  if (Math.abs(val) >= 1e-9 && Math.abs(val) < Number.MAX_SAFE_INTEGER / 1_000_000_000_000) {
    return Math.round(val * 1_000_000_000_000) / 1_000_000_000_000;
  }
  return Number(val.toPrecision(6));
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
  /** Qualification explicite de la granularité des tokens fournis. */
  usageGranularity?: EcologitsUsageGranularity;
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
  /** Opt-in factor version; omitted means the historical regional default. */
  electricityFactorId?: string;
  /** Scénario de sensibilité */
  scenario?: "low" | "central" | "high";
  /** Environnement d'exécution */
  executionEnvironment?: "cloud_api" | "local_device";
};

export type EcologitsUsageGranularity = "PER_REQUEST" | "AGGREGATE" | "UNKNOWN";

export function isEcologitsRequestGranularityQualified(params: {
  usageGranularity?: EcologitsUsageGranularity;
  requestCount?: number | null;
}): boolean {
  return params.usageGranularity === "PER_REQUEST" && (params.requestCount ?? 1) === 1;
}

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
  if (params.customActiveParametersBillion !== undefined && params.customActiveParametersBillion !== null) {
    if (
      typeof params.customActiveParametersBillion !== "number" ||
      !Number.isFinite(params.customActiveParametersBillion) ||
      params.customActiveParametersBillion <= 0
    ) {
      throw new Error("Paramètre invalide 'customActiveParametersBillion' : un nombre fini > 0 est attendu.");
    }
  }
  if (params.customTotalParametersBillion !== undefined && params.customTotalParametersBillion !== null) {
    if (
      typeof params.customTotalParametersBillion !== "number" ||
      !Number.isFinite(params.customTotalParametersBillion) ||
      params.customTotalParametersBillion <= 0
    ) {
      throw new Error("Paramètre invalide 'customTotalParametersBillion' : un nombre fini > 0 est attendu.");
    }
  }
  if (
    typeof params.customActiveParametersBillion === "number" &&
    typeof params.customTotalParametersBillion === "number" &&
    params.customActiveParametersBillion > params.customTotalParametersBillion
  ) {
    throw new Error(
      "Architecture personnalisée incohérente : 'customActiveParametersBillion' ne peut pas dépasser 'customTotalParametersBillion'.",
    );
  }
  if (params.modelQuantizationBits !== undefined && params.modelQuantizationBits !== null) {
    if (
      typeof params.modelQuantizationBits !== "number" ||
      !Number.isFinite(params.modelQuantizationBits) ||
      params.modelQuantizationBits <= 0
    ) {
      throw new Error("Paramètre invalide 'modelQuantizationBits' : un nombre fini > 0 est attendu.");
    }
  }
  if (params.gpuMemoryGb !== undefined && params.gpuMemoryGb !== null) {
    if (
      typeof params.gpuMemoryGb !== "number" ||
      !Number.isFinite(params.gpuMemoryGb) ||
      params.gpuMemoryGb <= 0
    ) {
      throw new Error("Paramètre invalide 'gpuMemoryGb' : un nombre fini > 0 est attendu.");
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

function resolveValidatedArchitecture(
  params: EcologitsComputationParams,
  warnings: string[],
): { activeBillion: number; totalBillion: number } | null {
  let activeBillion: number | null = null;
  let totalBillion: number | null = null;

  const hasCustomActive =
    params.customActiveParametersBillion !== undefined &&
    params.customActiveParametersBillion !== null;
  const hasCustomTotal =
    params.customTotalParametersBillion !== undefined &&
    params.customTotalParametersBillion !== null;

  if (hasCustomActive || hasCustomTotal) {
    activeBillion = hasCustomActive
      ? (params.customActiveParametersBillion as number)
      : (params.model?.architecture.activeParametersBillion ?? null);
    totalBillion = hasCustomTotal
      ? (params.customTotalParametersBillion as number)
      : (params.model?.architecture.totalParametersBillion ?? null);
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
    return null;
  }
  if (activeBillion > totalBillion) {
    throw new Error(
      "Architecture incohérente : les paramètres actifs ne peuvent pas dépasser les paramètres totaux.",
    );
  }
  return { activeBillion, totalBillion };
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
  const architecture = resolveValidatedArchitecture(params, warnings);
  if (!architecture) {
    return buildNotCalculableResult(notes, warnings);
  }
  const { activeBillion, totalBillion } = architecture;

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

  if (!isEcologitsRequestGranularityQualified(params)) {
    warnings.push(
      "EcoLogits v3.0.0 exige des tokens explicitement qualifiés PER_REQUEST pour une seule requête. Les agrégats non ventilés ne sont pas assimilés à une requête conforme.",
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
  const electricityFactor = resolveElectricityFactorForRegion(params.region, params.electricityFactorId);
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
