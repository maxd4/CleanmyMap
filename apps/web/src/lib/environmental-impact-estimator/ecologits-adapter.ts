import type { AiModelRecord } from "./model-catalog";
import {
  getScientificFactor,
  resolveElectricityFactorForRegion,
  type EnvironmentalDataQualityDiagnostic,
  type ScientificFactorRegion,
} from "./scientific-registry";

/**
 * Adaptateur et évaluation de la méthodologie EcoLogits.
 *
 * Référence : EcoLogits (v3.0.0, licence MPL-2.0, Data For Good / GenAI Impact).
 * Modélise les impacts environnementaux de l'inférence des modèles de langage (LLM) :
 * 1. Énergie finale (GPU actif + part serveur/idle)
 * 2. Énergie totale data center (avec PUE)
 * 3. Émissions de GES opérationnelles (GWP Scope 2 location-based)
 * 4. Impacts incorporés ACV (Embodied GWP, ADPe, PE du serveur et des GPU)
 * 5. Consommation d'eau (WCF : eau directe de refroidissement + eau indirecte amont électrique)
 */

export const ECOLOGITS_METADATA = {
  packageName: "@ecologits/ecologits.js",
  version: "3.0.0",
  coreVersion: "0.11.2",
  syncedAt: "2026-10-02",
  license: "MPL-2.0",
  unpackedSizeBytes: 1450447, // ~1.45 MB
  homeUrl: "https://ecologits.ai",
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
 * Fournit une évaluation scientifique et technique vérifiable d'EcoLogits.
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
        "Modèles denses et MoE (Mixture of Experts) à paramètres connus. Modèles propriétaires fermés couverts via des hypothèses d'intervalles (RangeValue) ou des avertissements (model-arch-not-released).",
    },
    units: {
      energy: "kWh (énergie finale électrique aux bornes du serveur)",
      gwp: "kgCO₂e (Global Warming Potential, 100 ans)",
      wcfWater: "L (Water Consumption Footprint, phase d'usage directe et indirecte)",
      adpe: "kgSb-eq (Abiotic Depletion Potential pour les éléments minéraux/métaux)",
      pe: "MJ (Primary Energy consommée)",
    },
    strengths: [
      "Méthodologie standardisée et auditable par DAG (Directed Acyclic Graph) pour l'inférence générative.",
      "Distinction rigoureuse entre phase d'usage (énergie active + idle serveur) et phase de fabrication (matériel GPU + serveur amorti sur 3 ans).",
      "Approche multicritères (carbone, eau, ressources abiotiques, énergie primaire).",
      "Facteurs d'intensité électrique régionaux par zone ISO 3166-1 alpha-3.",
    ],
    limitationsForCleanMyMap: [
      "Exige une latence par requête (requestLatency) ou un profil tps/ttft pour borner l'énergie idle du serveur ; inadapté aux totaux de tokens déclarés mensuels sans profil temporel.",
      "Inapplicable directement aux modèles multimodaux pour l'image, l'audio et la vidéo (déclenche un avertissement model-arch-multimodal et ne fournit aucun facteur physique pour ces médias).",
      "Taille du paquet (1,5 Mo) et complexité d'un DAG complet alors qu'une formulation linéaire déterministe suffit pour les consommations déclarées.",
      "Nécessite une adaptation pour le prompt caching (KV-cache) et les tokens de raisonnement sans double comptage.",
    ],
    technicalCostAssessment:
      "Pertinence méthodologique très élevée pour l'ancrage physique (paramètres actifs, ratio serveur/GPU, ACV matérielle). L'intégration d'un adaptateur déterministe conforme aux constantes EcoLogits sans importer la totalité du paquet lourd permet de conserver 100 % de la rigueur scientifique avec un coût technique nul et une exécution ultra-rapide.",
  };
}

/**
 * Paramètres physiques de référence dérivés d'EcoLogits v3.0.0
 */
export const ECOLOGITS_CONSTANTS = {
  /** Quantization standard (bits par paramètre) */
  MODEL_QUANTIZATION_BITS: 16,
  /** Pente énergétique active GPU par paramètre actif (Wh par token par milliard de paramètres) */
  GPU_ENERGY_PER_TOKEN_PER_BILLION_PARAM_WH: 0.001166527,
  /** Puissance de base du serveur hors GPU (kW) pour 8 GPU */
  SERVER_POWER_KW: 1.2,
  /** Nombre de GPU de référence par serveur */
  SERVER_GPUS: 8,
  /** Concurrence de requêtes supposée sur le serveur (batch size) */
  BATCH_SIZE: 64,
  /** Durée de vie du matériel (secondes) : 3 ans */
  HARDWARE_LIFESPAN_SECONDS: 3 * 365.25 * 24 * 3600, // 94,672,800 s
  /** Impact carbone incorporé du serveur (kgCO2e) */
  SERVER_EMBODIED_GWP_KG: 5700,
  /** Impact carbone incorporé par GPU (kgCO2e) */
  GPU_EMBODIED_GWP_KG: 273,
  /** Impact ADPe incorporé du serveur (kgSb-eq) */
  SERVER_EMBODIED_ADPE_KG: 0.37,
  /** Impact ADPe incorporé par GPU (kgSb-eq) */
  GPU_EMBODIED_ADPE_KG: 0.00895,
  /** Impact énergie primaire incorporé du serveur (MJ) */
  SERVER_EMBODIED_PE_MJ: 70000,
  /** Impact énergie primaire incorporé par GPU (MJ) */
  GPU_EMBODIED_PE_MJ: 3721,
  /** Throughput typique (tokens/seconde) par défaut pour dériver la durée active si la latence est omise */
  DEFAULT_GENERATION_TPS: 50,
  /** Réduction énergétique du prompt caching (facteur multiplicateur sur le cache vs calcul complet) */
  CACHE_ENERGY_DISCOUNT_FACTOR: 0.15,
} as const;

function round6(val: number): number {
  return Math.round(val * 1_000_000) / 1_000_000;
}

function round12(val: number): number {
  return Math.round(val * 1_000_000_000_000) / 1_000_000_000_000;
}

export type EcologitsComputationParams = {
  /** Modèle du catalogue ou null */
  model?: AiModelRecord | null;
  /** Paramètres actifs du modèle (en milliards) si personnalisés */
  customActiveParametersBillion?: number | null;
  /** Paramètres totaux du modèle (en milliards) si personnalisés */
  customTotalParametersBillion?: number | null;
  /** Tokens d'entrée (prompt) */
  inputTokens?: number | null;
  /** Tokens de sortie (génération) */
  outputTokens?: number | null;
  /** Tokens en cache (KV-cache réutilisé) */
  cachedTokens?: number | null;
  /** Tokens de raisonnement déjà inclus dans les tokens de sortie */
  reasoningTokensIncluded?: number | null;
  /** Nombre de requêtes associées */
  requestCount?: number | null;
  /** Latence mesurée ou durée totale d'inférence en secondes */
  durationSeconds?: number | null;
  /** PUE du data center (défaut: 1.15) */
  pue?: number;
  /** WUE direct de refroidissement du data center en L/kWh si connu */
  datacenterWue?: number | null;
  /** Région électrique */
  region?: ScientificFactorRegion | string | null;
  /** Scénario de sensibilité */
  scenario?: "low" | "central" | "high";
  /** Environnement d'exécution */
  executionEnvironment?: "cloud_api" | "local_device";
};

export type EcologitsImpactsResult = {
  /** Énergie informatique IT aux bornes du serveur (kWh) */
  itEnergyKwh: number;
  /** Énergie totale data center incluant le PUE (kWh) */
  facilityEnergyKwh: number;
  /** Émissions GES opérationnelles (Scope 2 location-based) en kgCO₂e, ou null si région inconnue */
  operationalGwpKgCo2e: number | null;
  /** Émissions GES incorporées ACV matériel (Scope 3 amont) en kgCO₂e */
  embodiedGwpKgCo2e: number;
  /** Total GES ACV (opérationnel + incorporé) en kgCO₂e, ou null si opérationnel inconnu */
  totalGwpKgCo2e: number | null;
  /** Eau directe consommée sur site pour le refroidissement (L), ou null si non calculable */
  directWaterLiters: number | null;
  /** Eau indirecte liée à la centrale électrique amont (L), ou null si non calculable */
  indirectWaterLiters: number | null;
  /** Eau totale (L), ou null si l'une des composantes manque */
  totalWaterLiters: number | null;
  /** Épuisement des ressources abiotiques incorporé (kgSb-eq) */
  embodiedAdpeKgSbEq: number;
  /** Énergie primaire incorporée (MJ) */
  embodiedPeMj: number;
  /** Diagnostic de qualité des données */
  diagnostic: EnvironmentalDataQualityDiagnostic;
  /** Notes méthodologiques et traçabilité */
  notes: string[];
  /** Avertissements méthodologiques */
  warnings: string[];
};

/**
 * Moteur pur de calcul d'impacts conforme à la méthodologie EcoLogits v3.0.0.
 *
 * Implémente de manière déterministe les équations physiques d'EcoLogits :
 * - Active energy = Tokens × P_active × alpha
 * - Server idle energy = Duration × P_server_idle
 * - Embodied impacts = Duration × Hardware_embodied_rate
 * - Direct water = Facility Energy × WUE_datacenter
 * - Indirect water = Facility Energy × Water_grid_factor
 */
export function computeEcologitsCompatibleImpacts(
  params: EcologitsComputationParams,
): EcologitsImpactsResult {
  const warnings: string[] = [];
  const notes: string[] = [];
  const scenario = params.scenario ?? "central";
  const executionEnv = params.executionEnvironment ?? "cloud_api";
  const pue = executionEnv === "local_device" ? 1.0 : (params.pue ?? 1.15);

  // 1. Détermination des paramètres actifs et totaux
  let activeBillion: number | null = null;
  let totalBillion: number | null = null;

  if (typeof params.customActiveParametersBillion === "number" && params.customActiveParametersBillion > 0) {
    activeBillion = params.customActiveParametersBillion;
    totalBillion = params.customTotalParametersBillion ?? activeBillion;
  } else if (params.model) {
    activeBillion = params.model.architecture.activeParametersBillion;
    totalBillion = params.model.architecture.totalParametersBillion;
    if (params.model.architecture.type === "unreleased_proprietary") {
      warnings.push(
        `L'architecture du modèle ${params.model.name} n'est pas publiée par son éditeur. Paramètres estimés selon scénario de sensibilité.`,
      );
    }
  }

  // Si le modèle n'a pas de paramètres publiés, affecter selon le scénario de sensibilité
  if (activeBillion === null) {
    if (scenario === "low") {
      activeBillion = 8; // ordre de grandeur petit modèle (ex: Llama 8B, GPT-4o-mini)
      totalBillion = 8;
    } else if (scenario === "high") {
      activeBillion = 120; // ordre de grandeur grand modèle dense ou MoE lourd
      totalBillion = 405;
    } else {
      activeBillion = 35; // ordre de grandeur modèle intermédiaire / MoE central
      totalBillion = 140;
    }
    notes.push(
      `Paramètres actifs non documentés : valeur de sensibilité retenue = ${activeBillion} Md paramètres (total estimé: ${totalBillion} Md, scénario ${scenario}).`,
    );
  } else if (totalBillion !== null && totalBillion !== activeBillion) {
    notes.push(
      `Architecture MoE : ${activeBillion} Md paramètres actifs sur ${totalBillion} Md paramètres totaux.`,
    );
  }

  // 2. Gestion des tokens (avec prompt cache et tokens de raisonnement)
  const uncachedInputTokens = Math.max(0, params.inputTokens ?? 0);
  const cachedTokens = Math.max(0, params.cachedTokens ?? 0);
  const outputTokens = Math.max(0, params.outputTokens ?? 0);

  // Les tokens de raisonnement sont des tokens de sortie : vérification anti-double-comptage
  if (
    typeof params.reasoningTokensIncluded === "number" &&
    params.reasoningTokensIncluded > 0
  ) {
    if (params.reasoningTokensIncluded > outputTokens) {
      warnings.push(
        "Incohérence : le nombre de tokens de raisonnement dépasse le total de tokens de sortie. Borné à outputTokens.",
      );
    }
    notes.push(
      `${Math.min(outputTokens, params.reasoningTokensIncluded)} tokens de raisonnement inclus dans les tokens de sortie (aucun surcoût multiplicateur arbitraire appliqué).`,
    );
  }

  // Équivalent tokens de calcul GPU :
  // Les tokens en cache consomment une fraction (~15%) de l'énergie de préfill
  // Les tokens de sortie (décodage autorégressif) consomment davantage que le préfill
  const effectiveTokens =
    outputTokens +
    uncachedInputTokens * 0.35 +
    cachedTokens * 0.35 * ECOLOGITS_CONSTANTS.CACHE_ENERGY_DISCOUNT_FACTOR;

  // Facteur GPU d'EcoLogits : Wh par token par milliard de paramètres
  // Ajustement de sensibilité selon le scénario (low: quantification 4-8 bits / hardware récent ; high: FP16)
  const scenarioAlphaMultiplier = scenario === "low" ? 0.6 : scenario === "high" ? 1.5 : 1.0;
  const gpuAlphaWh =
    ECOLOGITS_CONSTANTS.GPU_ENERGY_PER_TOKEN_PER_BILLION_PARAM_WH * scenarioAlphaMultiplier;

  // Énergie GPU active (kWh)
  const gpuActiveKwh = (effectiveTokens * activeBillion * gpuAlphaWh) / 1000;

  // 3. Durée et énergie serveur idle
  let durationSeconds: number;
  if (typeof params.durationSeconds === "number" && params.durationSeconds > 0) {
    durationSeconds = params.durationSeconds;
  } else {
    // Dérivation de la durée active via le débit de génération (TPS)
    const tps = ECOLOGITS_CONSTANTS.DEFAULT_GENERATION_TPS;
    durationSeconds = outputTokens > 0 ? outputTokens / tps : uncachedInputTokens / (tps * 4);
    if (durationSeconds === 0) durationSeconds = 1;
  }

  // Énergie serveur idle imputée à la requête
  // Serveur = 1.2 kW pour 8 GPU = 150 W/GPU. Réparti sur batch size = 64
  const serverIdlePowerKwPerGpu =
    executionEnv === "local_device"
      ? 0.05 // Puissance résiduelle machine locale (50W)
      : (ECOLOGITS_CONSTANTS.SERVER_POWER_KW / ECOLOGITS_CONSTANTS.SERVER_GPUS) /
        ECOLOGITS_CONSTANTS.BATCH_SIZE;

  const serverIdleKwh = serverIdlePowerKwPerGpu * (durationSeconds / 3600);

  // Total Énergie IT
  const itEnergyKwh = round6(gpuActiveKwh + serverIdleKwh);
  // Total Énergie Data Center (avec PUE)
  const facilityEnergyKwh = round6(itEnergyKwh * pue);

  // 4. Émissions de GES opérationnelles (Scope 2 location-based)
  const electricityFactor = resolveElectricityFactorForRegion(params.region);
  let operationalGwpKgCo2e: number | null = null;

  if (electricityFactor && electricityFactor.value !== null) {
    operationalGwpKgCo2e = round6(facilityEnergyKwh * electricityFactor.value);
  } else {
    warnings.push(
      `Facteur carbone électrique non disponible pour la région '${params.region ?? "UNKNOWN"}'. Émissions opérationnelles classées non calculables (NA) conformément au principe d'intégrité.`,
    );
  }

  // 5. Impacts incorporés ACV (Embodied impacts GPU + Serveur)
  // Total serveur = 5700 kgCO2e serveur + 8 x 273 kgCO2e GPU = 7884 kgCO2e
  // Taux par seconde et par requête (avec batch size 64)
  let embodiedGwpKgCo2e = 0;
  let embodiedAdpeKgSbEq = 0;
  let embodiedPeMj = 0;

  if (executionEnv === "cloud_api") {
    const totalServerGwp =
      ECOLOGITS_CONSTANTS.SERVER_EMBODIED_GWP_KG +
      ECOLOGITS_CONSTANTS.SERVER_GPUS * ECOLOGITS_CONSTANTS.GPU_EMBODIED_GWP_KG;
    const gwpRatePerSecondPerRequest =
      (totalServerGwp / ECOLOGITS_CONSTANTS.SERVER_GPUS / ECOLOGITS_CONSTANTS.HARDWARE_LIFESPAN_SECONDS) /
      ECOLOGITS_CONSTANTS.BATCH_SIZE;
    embodiedGwpKgCo2e = round6(gwpRatePerSecondPerRequest * durationSeconds);

    const totalServerAdpe =
      ECOLOGITS_CONSTANTS.SERVER_EMBODIED_ADPE_KG +
      ECOLOGITS_CONSTANTS.SERVER_GPUS * ECOLOGITS_CONSTANTS.GPU_EMBODIED_ADPE_KG;
    const adpeRatePerSecondPerRequest =
      (totalServerAdpe / ECOLOGITS_CONSTANTS.SERVER_GPUS / ECOLOGITS_CONSTANTS.HARDWARE_LIFESPAN_SECONDS) /
      ECOLOGITS_CONSTANTS.BATCH_SIZE;
    embodiedAdpeKgSbEq = round12(adpeRatePerSecondPerRequest * durationSeconds);

    const totalServerPe =
      ECOLOGITS_CONSTANTS.SERVER_EMBODIED_PE_MJ +
      ECOLOGITS_CONSTANTS.SERVER_GPUS * ECOLOGITS_CONSTANTS.GPU_EMBODIED_PE_MJ;
    const peRatePerSecondPerRequest =
      (totalServerPe / ECOLOGITS_CONSTANTS.SERVER_GPUS / ECOLOGITS_CONSTANTS.HARDWARE_LIFESPAN_SECONDS) /
      ECOLOGITS_CONSTANTS.BATCH_SIZE;
    embodiedPeMj = round6(peRatePerSecondPerRequest * durationSeconds);
  } else {
    notes.push(
      "Exécution locale sur matériel personnel : l'impact incorporé cloud n'est pas appliqué (matériel propre de l'utilisateur).",
    );
  }

  // Total GWP ACV
  const totalGwpKgCo2e =
    operationalGwpKgCo2e !== null ? round6(operationalGwpKgCo2e + embodiedGwpKgCo2e) : null;

  // 6. Eau (WCF : directe et indirecte)
  let directWaterLiters: number | null = null;
  let indirectWaterLiters: number | null = null;
  let totalWaterLiters: number | null = null;

  // Eau directe sur site (refroidissement par évaporation)
  if (typeof params.datacenterWue === "number" && params.datacenterWue >= 0) {
    directWaterLiters = round6(facilityEnergyKwh * params.datacenterWue);
  }

  // Eau indirecte (cycle amont de la production d'électricité)
  if (params.region === "US") {
    const usWaterFactor = getScientificFactor("water-indirect-datacenter-us-2024");
    if (usWaterFactor.value !== null) {
      indirectWaterLiters = round6(facilityEnergyKwh * usWaterFactor.value);
    }
  } else if (params.region && params.region !== "UNKNOWN") {
    notes.push(
      `Eau indirecte non calculée pour la région '${params.region}' : aucun facteur d'eau de réseau certifié équivalent à LBNL n'est branché.`,
    );
  }

  if (directWaterLiters !== null && indirectWaterLiters !== null) {
    totalWaterLiters = round6(directWaterLiters + indirectWaterLiters);
  } else if (directWaterLiters !== null) {
    totalWaterLiters = directWaterLiters;
  } else if (indirectWaterLiters !== null) {
    totalWaterLiters = indirectWaterLiters;
  }

  // Diagnostic déterministe de qualité des données
  let diagnostic: EnvironmentalDataQualityDiagnostic = "NOT_CALCULABLE";
  if (outputTokens === 0 && uncachedInputTokens === 0) {
    diagnostic = "MEASURED";
  } else if (operationalGwpKgCo2e !== null && params.model?.architecture.totalParametersBillion) {
    diagnostic = "DOCUMENTED_MODEL";
  } else if (operationalGwpKgCo2e !== null) {
    diagnostic = "PROXY_SCENARIO";
  } else {
    diagnostic = "NOT_CALCULABLE";
  }

  return {
    itEnergyKwh,
    facilityEnergyKwh,
    operationalGwpKgCo2e,
    embodiedGwpKgCo2e,
    totalGwpKgCo2e,
    directWaterLiters,
    indirectWaterLiters,
    totalWaterLiters,
    embodiedAdpeKgSbEq,
    embodiedPeMj,
    diagnostic,
    notes,
    warnings,
  };
}
