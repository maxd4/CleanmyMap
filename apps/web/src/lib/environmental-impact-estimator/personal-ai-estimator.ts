import {
  findAiModel,
  resolveHosterForModel,
  type AiModelPublisher,
  type AiModelRecord,
  type ExecutionEnvironment,
  type WeightsAvailability,
} from "./model-catalog";
import {
  computeEcologitsCompatibleImpacts,
  evaluateEcologitsMethodology,
} from "./ecologits-adapter";
import {
  ANTI_DOUBLE_COUNTING_RULES,
  evaluateDataQualityDiagnostic,
  getScientificFactor,
  resolveElectricityFactorForRegion,
  type AccountingScopeType,
  type EnvironmentalDataQualityDiagnostic,
  type MultimodalCategory,
  type ScientificFactorRegion,
} from "./scientific-registry";

function round6(value: number): number {
  return Math.round(value * 1_000_000) / 1_000_000;
}

export type EnergyScenario = "low" | "central" | "high";
export type AccountingRegion = ScientificFactorRegion;

export type PersonalAiFootprintInput = {
  /** Période ou libellé descriptif (ex: "Septembre 2026", "Session d'audit") */
  periodLabel?: string;
  /** Identifiant du modèle dans le catalogue canonique (ex: "openai/gpt-4o", "meta-llama/llama-3.1-70b-instruct") */
  modelId?: string | null;
  /** Environnement d'exécution : API cloud ou machine locale */
  executionEnvironment?: ExecutionEnvironment;
  /** Opérateur ou hébergeur effectif (ex: "aws_bedrock", "azure", "openai", "local_self_hosted") */
  hosterOperator?: string | null;
  /** Utilisation de texte déclarée */
  textUsage?: {
    totalTokens?: number | null;
    inputTokens?: number | null;
    outputTokens?: number | null;
    cachedTokens?: number | null;
    /** Nombre de tokens de raisonnement inclus dans outputTokens (pour modèles type o1, DeepSeek-R1) */
    reasoningTokensIncluded?: number | null;
  };
  /** Utilisation d'images déclarée */
  imageUsage?: {
    imageCount?: number | null;
  };
  /** Utilisation d'audio déclarée */
  audioUsage?: {
    durationMinutes?: number | null;
    requestCount?: number | null;
  };
  /** Utilisation de vidéo déclarée */
  videoUsage?: {
    durationSeconds?: number | null;
    generationCount?: number | null;
  };
  /** Nombre total de requêtes déclarées */
  requestCount?: number | null;
  /** Durée ou latence mesurée (en secondes) si disponible */
  measuredDurationSeconds?: number | null;
  /** Consommation électrique mesurée directement aux bornes (kWh) */
  measuredEnergyKwh?: number | null;
  /** WUE direct de refroidissement sur site du data center (L/kWh) si connu */
  datacenterWue?: number | null;
  /** Déclaration contractuelle market-based (PPA / certificats ENR) */
  marketBasedDeclaration?: {
    claimedKgCo2ePerKwh?: number | null;
    providerCertificateNote?: string;
  };
  /** Scénario énergétique pour l'inférence de texte (par défaut: central) */
  energyScenario?: "low" | "central" | "high";
  /** Région d'infrastructure électrique */
  region?: ScientificFactorRegion;
  /** PUE du data center (défaut: 1.15 pour intégrer le refroidissement standard, 1.0 si local) */
  pue?: number;
};

export type ModalityEstimate = {
  category: MultimodalCategory;
  hasSourcedPhysicalMethod: boolean;
  activityCount: number | null;
  activityUnit: string;
  energyKwh: number | null;
  operationalKgCo2e: number | null;
  indirectWaterLiters: number | null;
  partialLcaKgCo2e: number | null;
  qualityDiagnostic: EnvironmentalDataQualityDiagnostic;
  methodologyNote: string;
};

export type PersonalAiFootprintEstimate = {
  accountingScope: AccountingScopeType;
  version: string;
  generatedAt: string;
  scenario: "low" | "central" | "high";
  region: ScientificFactorRegion;
  pue: number;
  dataQuality: EnvironmentalDataQualityDiagnostic;
  executionEnvironment: ExecutionEnvironment;
  modelDetails?: {
    id: string;
    name: string;
    publisher: AiModelPublisher;
    hoster: string;
    weightsAvailability: WeightsAvailability;
    architectureType: string;
    totalParametersBillion: number | null;
    activeParametersBillion: number | null;
    isReasoningModel: boolean;
  };
  modalities: {
    text: ModalityEstimate;
    image: ModalityEstimate;
    audio: ModalityEstimate;
    video: ModalityEstimate;
  };
  physicalTotals: {
    itEnergyKwh: number | null;
    facilityEnergyKwh: number | null;
    operationalKgCo2e: number | null;
    directWaterLiters: number | null;
    indirectWaterLiters: number | null;
    totalWaterLiters: number | null;
    embodiedKgCo2e: number | null;
    partialLcaKgCo2e: number | null;
    primaryEnergyMj?: number | null;
    abioticDepletionKgSbEq?: number | null;
  };
  marketBasedDisclosure?: {
    isReported: boolean;
    claimedKgCo2e: number | null;
    note: string;
  };
  antiDoubleCountingCompliance: {
    compliant: boolean;
    verifiedRules: string[];
  };
  methodologyTrace: {
    formula: string;
    sources: readonly string[];
    date: string;
    version: string;
    limitations: readonly string[];
  };
  methodologyNotes: string[];
};

interface ResolvedModelContext {
  modelRecord?: AiModelRecord;
  modelDetails?: PersonalAiFootprintEstimate["modelDetails"];
}

function resolveModelContext(
  input: PersonalAiFootprintInput,
  notes: string[],
): ResolvedModelContext {
  if (!input.modelId) {
    return {};
  }
  const modelRecord = findAiModel(input.modelId);
  const hoster = resolveHosterForModel(modelRecord, input.hosterOperator);

  if (modelRecord) {
    const modelDetails = {
      id: modelRecord.id,
      name: modelRecord.name,
      publisher: modelRecord.publisher,
      hoster: hoster.name,
      weightsAvailability: modelRecord.weightsAvailability,
      architectureType: modelRecord.architecture.type,
      totalParametersBillion: modelRecord.architecture.totalParametersBillion,
      activeParametersBillion: modelRecord.architecture.activeParametersBillion,
      isReasoningModel: modelRecord.architecture.isReasoningModel,
    };
    notes.push(
      `Modèle identifié : ${modelRecord.name} (Éditeur: ${modelRecord.publisher}, Opérateur/Hébergeur: ${hoster.name}, Licence: ${modelRecord.license}).`,
    );
    return { modelRecord, modelDetails };
  }

  notes.push(
    `Modèle "${input.modelId}" non répertorié dans le catalogue standard : calcul basé sur scénario générique.`,
  );
  return {};
}

interface TextImpactsResult {
  textModality: ModalityEstimate;
  totals: {
    itEnergyKwh: number | null;
    facilityEnergyKwh: number | null;
    operationalKgCo2e: number | null;
    directWaterLiters: number | null;
    indirectWaterLiters: number | null;
    totalWaterLiters: number | null;
    embodiedKgCo2e: number | null;
    partialLcaKgCo2e: number | null;
    primaryEnergyMj: number | null;
    abioticDepletionKgSbEq: number | null;
  };
  textDiagnostic: EnvironmentalDataQualityDiagnostic;
}

function computeDirectMeasuredTextImpacts(
  measuredEnergyKwh: number,
  pue: number,
  region: AccountingRegion,
): TextImpactsResult {
  const textItEnergyKwh = round6(measuredEnergyKwh);
  const textFacilityEnergyKwh = round6(textItEnergyKwh * pue);
  const electricityFactor = resolveElectricityFactorForRegion(region);

  let textOperationalKgCo2e: number | null = null;
  let textIndirectWaterLiters: number | null = null;
  let textPartialLcaKgCo2e: number | null = null;

  if (electricityFactor && electricityFactor.value !== null) {
    textOperationalKgCo2e = round6(textFacilityEnergyKwh * electricityFactor.value);
    if (region === "US") {
      const waterFactor = getScientificFactor("water-indirect-datacenter-us-2024");
      if (waterFactor.value !== null) {
        textIndirectWaterLiters = round6(textFacilityEnergyKwh * waterFactor.value);
      }
    }
    const lcaOverheadFactor = getScientificFactor("ai-partial-lca-overhead-v1");
    const overheadFraction = lcaOverheadFactor.value ?? 0.30;
    textPartialLcaKgCo2e = round6(textOperationalKgCo2e * (1 + overheadFraction));
  }

  const textDiagnostic: EnvironmentalDataQualityDiagnostic = "MEASURED";
  const textMethodNote = `Consommation électrique directe mesurée aux bornes (${textItEnergyKwh} kWh).`;

  return {
    textModality: {
      category: "text",
      hasSourcedPhysicalMethod: true,
      activityCount: null,
      activityUnit: "tokens",
      energyKwh: textFacilityEnergyKwh,
      operationalKgCo2e: textOperationalKgCo2e,
      indirectWaterLiters: textIndirectWaterLiters,
      partialLcaKgCo2e: textPartialLcaKgCo2e,
      qualityDiagnostic: textDiagnostic,
      methodologyNote: textMethodNote,
    },
    totals: {
      itEnergyKwh: textItEnergyKwh,
      facilityEnergyKwh: textFacilityEnergyKwh,
      operationalKgCo2e: textOperationalKgCo2e,
      directWaterLiters: null,
      indirectWaterLiters: textIndirectWaterLiters,
      totalWaterLiters: textIndirectWaterLiters,
      embodiedKgCo2e: null,
      partialLcaKgCo2e: textPartialLcaKgCo2e,
      primaryEnergyMj: null,
      abioticDepletionKgSbEq: null,
    },
    textDiagnostic,
  };
}

function computeEcologitsModelTextImpacts(
  input: PersonalAiFootprintInput,
  modelRecord: AiModelRecord,
  pue: number,
  region: AccountingRegion,
  scenario: EnergyScenario,
  executionEnv: ExecutionEnvironment,
  textTokens: number | null,
  notes: string[],
): TextImpactsResult {
  const textInput = input.textUsage;
  const ecologitsImpacts = computeEcologitsCompatibleImpacts({
    model: modelRecord,
    inputTokens: textInput?.inputTokens ?? 0,
    outputTokens: textInput?.outputTokens ?? textTokens ?? 0,
    cachedTokens: textInput?.cachedTokens ?? 0,
    reasoningTokensIncluded: textInput?.reasoningTokensIncluded ?? null,
    requestCount: input.requestCount,
    durationSeconds: input.measuredDurationSeconds,
    pue,
    datacenterWue: input.datacenterWue,
    region,
    scenario,
    executionEnvironment: executionEnv,
  });

  const textMethodNote = `Modèle documenté ${modelRecord.name} (${modelRecord.architecture.activeParametersBillion}B params actifs) évalué selon méthodologie EcoLogits v3.0.0.`;
  notes.push(...ecologitsImpacts.notes);

  return {
    textModality: {
      category: "text",
      hasSourcedPhysicalMethod: true,
      activityCount: textTokens,
      activityUnit: "tokens",
      energyKwh: ecologitsImpacts.facilityEnergyKwh,
      operationalKgCo2e: ecologitsImpacts.operationalGwpKgCo2e,
      indirectWaterLiters: ecologitsImpacts.indirectWaterLiters,
      partialLcaKgCo2e: ecologitsImpacts.totalGwpKgCo2e,
      qualityDiagnostic: ecologitsImpacts.diagnostic,
      methodologyNote: textMethodNote,
    },
    totals: {
      itEnergyKwh: ecologitsImpacts.itEnergyKwh,
      facilityEnergyKwh: ecologitsImpacts.facilityEnergyKwh,
      operationalKgCo2e: ecologitsImpacts.operationalGwpKgCo2e,
      directWaterLiters: ecologitsImpacts.directWaterLiters,
      indirectWaterLiters: ecologitsImpacts.indirectWaterLiters,
      totalWaterLiters: ecologitsImpacts.totalWaterLiters,
      embodiedKgCo2e: ecologitsImpacts.embodiedGwpKgCo2e,
      partialLcaKgCo2e: ecologitsImpacts.totalGwpKgCo2e,
      primaryEnergyMj: ecologitsImpacts.embodiedPeMj,
      abioticDepletionKgSbEq: ecologitsImpacts.embodiedAdpeKgSbEq,
    },
    textDiagnostic: ecologitsImpacts.diagnostic,
  };
}

function computeGenericScenarioTextImpacts(
  textTokens: number,
  scenario: EnergyScenario,
  region: AccountingRegion,
  pue: number,
  notes: string[],
): TextImpactsResult {
  const factorId =
    scenario === "low"
      ? "ai-inference-energy-scenario-low-v1"
      : scenario === "high"
        ? "ai-inference-energy-scenario-high-v1"
        : "ai-inference-energy-scenario-central-v1";

  const energyFactor = getScientificFactor(factorId);
  const kwhPerMillion = energyFactor.value ?? 0.30;

  const textItEnergyKwh = round6((textTokens / 1_000_000) * kwhPerMillion);
  const textFacilityEnergyKwh = round6(textItEnergyKwh * pue);

  const electricityFactor = resolveElectricityFactorForRegion(region);
  let textOperationalKgCo2e: number | null = null;
  let textIndirectWaterLiters: number | null = null;
  let textPartialLcaKgCo2e: number | null = null;
  let textDiagnostic: EnvironmentalDataQualityDiagnostic = "PROXY_SCENARIO";
  let textMethodNote: string;

  if (electricityFactor && electricityFactor.value !== null) {
    textOperationalKgCo2e = round6(textFacilityEnergyKwh * electricityFactor.value);

    if (region === "US") {
      const waterFactor = getScientificFactor("water-indirect-datacenter-us-2024");
      if (waterFactor.value !== null) {
        textIndirectWaterLiters = round6(textFacilityEnergyKwh * waterFactor.value);
      }
    } else {
      notes.push(
        `Eau indirecte non calculée pour la région ${region} : le facteur LBNL est spécifique aux États-Unis et n'est pas appliqué automatiquement.`,
      );
    }

    const lcaOverheadFactor = getScientificFactor("ai-partial-lca-overhead-v1");
    const overheadFraction = lcaOverheadFactor.value ?? 0.30;
    textPartialLcaKgCo2e = round6(textOperationalKgCo2e * (1 + overheadFraction));

    textDiagnostic = evaluateDataQualityDiagnostic({ isScenarioOrRegionalProxy: true });
    textMethodNote = `Calculé via scénario ${scenario} (${kwhPerMillion} kWh/M tokens), PUE ${pue}, facteur carbone ${region} (${electricityFactor.value} kgCO₂e/kWh) et ACV partielle +30%.`;
  } else {
    textDiagnostic = evaluateDataQualityDiagnostic({ isScenarioOrRegionalProxy: true });
    textMethodNote = `Énergie IT/facility calculée (${textFacilityEnergyKwh} kWh, scénario ${scenario}), mais carbone et eau non calculés : région d'infrastructure '${region}' inconnue ou non sourcée.`;
    notes.push(
      "Infrastructure électrique inconnue : les coefficients d'émission régionaux ne sont pas appliqués arbitrairement (conformité Invariant 5).",
    );
  }

  return {
    textModality: {
      category: "text",
      hasSourcedPhysicalMethod: true,
      activityCount: textTokens,
      activityUnit: "tokens",
      energyKwh: textFacilityEnergyKwh,
      operationalKgCo2e: textOperationalKgCo2e,
      indirectWaterLiters: textIndirectWaterLiters,
      partialLcaKgCo2e: textPartialLcaKgCo2e,
      qualityDiagnostic: textDiagnostic,
      methodologyNote: textMethodNote,
    },
    totals: {
      itEnergyKwh: textItEnergyKwh,
      facilityEnergyKwh: textFacilityEnergyKwh,
      operationalKgCo2e: textOperationalKgCo2e,
      directWaterLiters: null,
      indirectWaterLiters: textIndirectWaterLiters,
      totalWaterLiters: textIndirectWaterLiters,
      embodiedKgCo2e: null,
      partialLcaKgCo2e: textPartialLcaKgCo2e,
      primaryEnergyMj: null,
      abioticDepletionKgSbEq: null,
    },
    textDiagnostic,
  };
}

function computeZeroTokenTextImpacts(): TextImpactsResult {
  const textDiagnostic = evaluateDataQualityDiagnostic({ hasDirectMeasurement: true });
  return {
    textModality: {
      category: "text",
      hasSourcedPhysicalMethod: true,
      activityCount: 0,
      activityUnit: "tokens",
      energyKwh: 0,
      operationalKgCo2e: 0,
      indirectWaterLiters: 0,
      partialLcaKgCo2e: 0,
      qualityDiagnostic: textDiagnostic,
      methodologyNote: "Activité texte nulle déclarée : impact physique nul.",
    },
    totals: {
      itEnergyKwh: 0,
      facilityEnergyKwh: 0,
      operationalKgCo2e: 0,
      directWaterLiters: null,
      indirectWaterLiters: 0,
      totalWaterLiters: 0,
      embodiedKgCo2e: null,
      partialLcaKgCo2e: 0,
      primaryEnergyMj: null,
      abioticDepletionKgSbEq: null,
    },
    textDiagnostic,
  };
}

function computeTextImpacts(
  input: PersonalAiFootprintInput,
  modelRecord: AiModelRecord | undefined,
  pue: number,
  region: AccountingRegion,
  scenario: EnergyScenario,
  executionEnv: ExecutionEnvironment,
  notes: string[],
): TextImpactsResult {
  const textInput = input.textUsage;
  let textTokens: number | null = null;
  if (typeof textInput?.totalTokens === "number" && textInput.totalTokens >= 0) {
    textTokens = textInput.totalTokens;
  } else if (
    typeof textInput?.inputTokens === "number" ||
    typeof textInput?.outputTokens === "number"
  ) {
    textTokens = (textInput.inputTokens ?? 0) + (textInput.outputTokens ?? 0);
  }

  if (
    typeof textInput?.reasoningTokensIncluded === "number" &&
    textInput.reasoningTokensIncluded > 0
  ) {
    notes.push(
      `${textInput.reasoningTokensIncluded} tokens de raisonnement inclus dans le volume de génération (aucun surcoût multiplicateur arbitraire).`,
    );
  }

  if (typeof textInput?.cachedTokens === "number" && textInput.cachedTokens > 0) {
    notes.push(
      `${textInput.cachedTokens} tokens d'entrée servis depuis le cache (KV-cache réutilisé sans calcul complet de préfill).`,
    );
  }

  if (typeof input.measuredEnergyKwh === "number" && input.measuredEnergyKwh >= 0) {
    return computeDirectMeasuredTextImpacts(input.measuredEnergyKwh, pue, region);
  }
  if (modelRecord && modelRecord.architecture.activeParametersBillion) {
    return computeEcologitsModelTextImpacts(
      input,
      modelRecord,
      pue,
      region,
      scenario,
      executionEnv,
      textTokens,
      notes,
    );
  }
  if (textTokens !== null && textTokens > 0) {
    return computeGenericScenarioTextImpacts(textTokens, scenario, region, pue, notes);
  }
  if (textTokens === 0) {
    return computeZeroTokenTextImpacts();
  }

  return {
    textModality: {
      category: "text",
      hasSourcedPhysicalMethod: true,
      activityCount: null,
      activityUnit: "tokens",
      energyKwh: null,
      operationalKgCo2e: null,
      indirectWaterLiters: null,
      partialLcaKgCo2e: null,
      qualityDiagnostic: "NOT_CALCULABLE",
      methodologyNote: "Aucune activité texte renseignée (NA).",
    },
    totals: {
      itEnergyKwh: null,
      facilityEnergyKwh: null,
      operationalKgCo2e: null,
      directWaterLiters: null,
      indirectWaterLiters: null,
      totalWaterLiters: null,
      embodiedKgCo2e: null,
      partialLcaKgCo2e: null,
      primaryEnergyMj: null,
      abioticDepletionKgSbEq: null,
    },
    textDiagnostic: "NOT_CALCULABLE",
  };
}

function buildNonTextModalities(input: PersonalAiFootprintInput) {
  const imageCount = typeof input.imageUsage?.imageCount === "number" ? input.imageUsage.imageCount : null;
  const imageModality: ModalityEstimate = {
    category: "image",
    hasSourcedPhysicalMethod: false,
    activityCount: imageCount,
    activityUnit: "images",
    energyKwh: null,
    operationalKgCo2e: null,
    indirectWaterLiters: null,
    partialLcaKgCo2e: null,
    qualityDiagnostic: "NOT_CALCULABLE",
    methodologyNote:
      imageCount !== null
        ? `${imageCount} image(s) déclarée(s). Aucun facteur physique générique sourcé n'est applicable : impact physique NA conformément au protocole.`
        : "Aucune activité image déclarée (NA).",
  };

  const audioMinutes = typeof input.audioUsage?.durationMinutes === "number" ? input.audioUsage.durationMinutes : null;
  const audioModality: ModalityEstimate = {
    category: "audio",
    hasSourcedPhysicalMethod: false,
    activityCount: audioMinutes,
    activityUnit: "minutes",
    energyKwh: null,
    operationalKgCo2e: null,
    indirectWaterLiters: null,
    partialLcaKgCo2e: null,
    qualityDiagnostic: "NOT_CALCULABLE",
    methodologyNote:
      audioMinutes !== null
        ? `${audioMinutes} minute(s) audio déclarée(s). Facteur physique non calculable (NA).`
        : "Aucune activité audio déclarée (NA).",
  };

  const videoSeconds = typeof input.videoUsage?.durationSeconds === "number" ? input.videoUsage.durationSeconds : null;
  const videoModality: ModalityEstimate = {
    category: "video",
    hasSourcedPhysicalMethod: false,
    activityCount: videoSeconds,
    activityUnit: "seconds",
    energyKwh: null,
    operationalKgCo2e: null,
    indirectWaterLiters: null,
    partialLcaKgCo2e: null,
    qualityDiagnostic: "NOT_CALCULABLE",
    methodologyNote:
      videoSeconds !== null
        ? `${videoSeconds} seconde(s) vidéo déclarée(s). Facteur physique non calculable (NA).`
        : "Aucune activité vidéo déclarée (NA).",
  };

  return { imageModality, audioModality, videoModality };
}

function resolveMarketBasedDisclosure(
  input: PersonalAiFootprintInput,
  facilityEnergyKwh: number | null,
  notes: string[],
): PersonalAiFootprintEstimate["marketBasedDisclosure"] {
  if (!input.marketBasedDeclaration) {
    return undefined;
  }
  const claimedFactor = input.marketBasedDeclaration.claimedKgCo2ePerKwh;
  const claimedKgCo2e =
    facilityEnergyKwh !== null && typeof claimedFactor === "number"
      ? round6(facilityEnergyKwh * claimedFactor)
      : null;
  notes.push(
    "Divulgation contractuelle (market-based) enregistrée séparément de la réalité physique du réseau électrique local (location-based).",
  );
  return {
    isReported: true,
    claimedKgCo2e,
    note: input.marketBasedDeclaration.providerCertificateNote ?? "Déclaration contractuelle fournie par l'opérateur.",
  };
}

/**
 * Moteur d'estimation « Mon empreinte IA ».
 *
 * Calcule l'empreinte environnementale de l'utilisation personnelle déclarée d'IA,
 * dans un périmètre comptable strictement isolé de CleanMyMap (aucun double comptage
 * avec le fonctionnement du site ni avec le développement du projet).
 */
export function estimatePersonalAiFootprint(
  input: PersonalAiFootprintInput,
  generatedAt = new Date().toISOString(),
): PersonalAiFootprintEstimate {
  const scenario = input.energyScenario ?? "central";
  const region = input.region ?? "UNKNOWN";
  const executionEnv: ExecutionEnvironment = input.executionEnvironment ?? "cloud_api";
  const pue = executionEnv === "local_device" ? 1.0 : (typeof input.pue === "number" && input.pue >= 1.0 ? input.pue : 1.15);

  const notes: string[] = [
    "Périmètre comptable : utilisation personnelle déclarée d'IA (PERSONAL_AI_USAGE). Strictement isolé des métriques du site CleanMyMap.",
  ];

  // 1. RÉSOLUTION DU MODÈLE ET DE L'HÉBERGEUR
  const { modelRecord, modelDetails } = resolveModelContext(input, notes);

  // 2. MODALITÉ TEXTE (Dispose de méthodes physiques sourcées)
  const { textModality, totals, textDiagnostic } = computeTextImpacts(
    input,
    modelRecord,
    pue,
    region,
    scenario,
    executionEnv,
    notes,
  );

  // 3. MODALITÉS NON TEXTE (image, audio, vidéo)
  const { imageModality, audioModality, videoModality } = buildNonTextModalities(input);

  // Synthèse de la qualité globale (déterministe, sans pourcentage arbitraire)
  const overallQuality: EnvironmentalDataQualityDiagnostic = evaluateDataQualityDiagnostic({
    hasDirectMeasurement: textDiagnostic === "MEASURED",
    hasDocumentedModel: textDiagnostic === "DOCUMENTED_MODEL",
    isScenarioOrRegionalProxy: textDiagnostic === "PROXY_SCENARIO",
    isMissingOrUnmeasured: textDiagnostic === "NOT_CALCULABLE",
  });

  // Déclaration contractuelle market-based (strictement séparée du calcul physique location-based)
  const marketBasedDisclosure = resolveMarketBasedDisclosure(input, totals.facilityEnergyKwh, notes);

  // Traçabilité méthodologique
  const methodologyTrace = {
    formula:
      modelRecord && modelRecord.architecture.activeParametersBillion
        ? "E_IT = (Tokens_eff × P_active × alpha_GPU) + E_server_idle ; E_total = E_IT × PUE ; GWP = E_total × f_grid"
        : "E_total = (Tokens / 1M) × f_scenario × PUE ; GWP = E_total × f_grid ; LCA = GWP × 1,30",
    sources: [
      "EcoLogits v3.0.0 (Data For Good / GenAI Impact)",
      "EPA eGRID / EIA 2024",
      "RTE Bilan électrique 2024",
      "LBNL 2024 United States Data Center Energy Usage Report",
      "CleanMyMap Rapport impact_IA (Annexe B)",
    ],
    date: "2026-05",
    version: "personal-ai-estimator-2026.05-v2",
    limitations: [
      "Les facteurs physiques image, audio et vidéo restent NA faute de méthode sourcée reproductible.",
      "Le facteur électrique US n'est jamais propagé à une région inconnue ou non américaine.",
      "Les scénarios de sensibilité constituent des repères de simulation technique, pas des lois probabilistes.",
    ],
  };

  // Vérification des règles anti-double-comptage
  const verifiedRules = ANTI_DOUBLE_COUNTING_RULES.map((r) => r.id);

  return {
    accountingScope: "PERSONAL_AI_USAGE",
    version: "personal-ai-estimator-2026.05-v2",
    generatedAt,
    scenario,
    region,
    pue,
    dataQuality: overallQuality,
    executionEnvironment: executionEnv,
    modelDetails,
    modalities: {
      text: textModality,
      image: imageModality,
      audio: audioModality,
      video: videoModality,
    },
    physicalTotals: totals,
    marketBasedDisclosure,
    antiDoubleCountingCompliance: {
      compliant: true,
      verifiedRules,
    },
    methodologyTrace,
    methodologyNotes: notes,
  };
}

export { evaluateEcologitsMethodology };
