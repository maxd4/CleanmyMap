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

const MAX_REASONABLE_PUE = 5.0;

function roundPhysicalOutput(value: number): number {
  if (!Number.isFinite(value) || value === 0) return 0;
  if (Math.abs(value) >= 0.001) {
    return Math.round(value * 1_000_000) / 1_000_000;
  }
  return Number(value.toPrecision(6));
}

function assertNonNegativeFinite(value: number | null | undefined, fieldName: string): void {
  if (value === undefined || value === null) return;
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    throw new Error(`Entrée invalide pour '${fieldName}' : un nombre fini >= 0 est attendu.`);
  }
}

function assertNonNegativeInteger(value: number | null | undefined, fieldName: string): void {
  assertNonNegativeFinite(value, fieldName);
  if (value !== undefined && value !== null && !Number.isInteger(value)) {
    throw new Error(`Entrée invalide pour '${fieldName}' : un entier >= 0 est attendu.`);
  }
}

function validatePersonalAiInput(input: PersonalAiFootprintInput): void {
  if (input.pue !== undefined && input.pue !== null) {
    if (
      typeof input.pue !== "number" ||
      !Number.isFinite(input.pue) ||
      input.pue < 1.0 ||
      input.pue > MAX_REASONABLE_PUE
    ) {
      throw new Error(
        `Entrée invalide pour 'pue' : une valeur finie comprise entre 1.0 et ${MAX_REASONABLE_PUE} est attendue.`,
      );
    }
  }

  const text = input.textUsage;
  if (text) {
    assertNonNegativeInteger(text.totalTokens, "textUsage.totalTokens");
    assertNonNegativeInteger(text.inputTokens, "textUsage.inputTokens");
    assertNonNegativeInteger(text.outputTokens, "textUsage.outputTokens");
    assertNonNegativeInteger(text.cachedTokens, "textUsage.cachedTokens");
    assertNonNegativeInteger(text.reasoningTokensIncluded, "textUsage.reasoningTokensIncluded");

    if (
      typeof text.inputTokens === "number" &&
      typeof text.cachedTokens === "number" &&
      text.cachedTokens > text.inputTokens
    ) {
      throw new Error(
        "Déclaration incohérente : 'textUsage.cachedTokens' ne peut pas dépasser 'textUsage.inputTokens'.",
      );
    }

    if (
      typeof text.outputTokens === "number" &&
      typeof text.reasoningTokensIncluded === "number" &&
      text.reasoningTokensIncluded > text.outputTokens
    ) {
      throw new Error(
        "Déclaration incohérente : 'textUsage.reasoningTokensIncluded' ne peut pas dépasser 'textUsage.outputTokens'.",
      );
    }

    if (typeof text.totalTokens === "number") {
      if (typeof text.inputTokens === "number" && typeof text.outputTokens === "number") {
        if (text.totalTokens !== text.inputTokens + text.outputTokens) {
          throw new Error(
            "Déclaration incohérente : 'textUsage.totalTokens' doit égaler 'inputTokens + outputTokens'.",
          );
        }
      } else {
        const minExpected = (text.inputTokens ?? 0) + (text.outputTokens ?? 0);
        if (text.totalTokens < minExpected) {
          throw new Error(
            "Déclaration incohérente : 'textUsage.totalTokens' ne peut pas être inférieur à la sous-répartition fournie.",
          );
        }
        if (typeof text.cachedTokens === "number" && text.cachedTokens > text.totalTokens) {
          throw new Error(
            "Déclaration incohérente : 'textUsage.cachedTokens' ne peut pas dépasser 'textUsage.totalTokens'.",
          );
        }
      }
    } else if (
      typeof text.cachedTokens === "number" &&
      text.cachedTokens > 0 &&
      typeof text.inputTokens !== "number"
    ) {
      throw new Error(
        "Déclaration incohérente : 'textUsage.cachedTokens' requiert 'textUsage.inputTokens' ou 'textUsage.totalTokens'.",
      );
    }
  }

  assertNonNegativeInteger(input.imageUsage?.imageCount, "imageUsage.imageCount");
  assertNonNegativeFinite(input.audioUsage?.durationMinutes, "audioUsage.durationMinutes");
  assertNonNegativeInteger(input.audioUsage?.requestCount, "audioUsage.requestCount");
  assertNonNegativeFinite(input.videoUsage?.durationSeconds, "videoUsage.durationSeconds");
  assertNonNegativeInteger(input.videoUsage?.generationCount, "videoUsage.generationCount");
  assertNonNegativeInteger(input.requestCount, "requestCount");
  assertNonNegativeFinite(input.measuredDurationSeconds, "measuredDurationSeconds");
  assertNonNegativeFinite(input.measuredEnergyKwh, "measuredEnergyKwh");
  assertNonNegativeFinite(input.datacenterWue, "datacenterWue");
  assertNonNegativeFinite(
    input.marketBasedDeclaration?.claimedKgCo2ePerKwh,
    "marketBasedDeclaration.claimedKgCo2ePerKwh",
  );
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
  modalityCoverage: {
    status: "NONE" | "TEXT_ONLY" | "PARTIAL_MULTIMODAL";
    calculableModalities: MultimodalCategory[];
    nonCalculableDeclaredModalities: MultimodalCategory[];
    coversAllDeclaredActivity: boolean;
  };
  antiDoubleCountingCompliance: {
    compliant: boolean;
    verifiedRules: string[];
    notApplicableRules: string[];
    unverifiableLimits: string[];
    ruleEvaluations: Array<{
      id: string;
      status: "ENFORCED" | "NOT_APPLICABLE" | "UNVERIFIABLE_EXTERNAL";
      reason: string;
    }>;
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
  const textItEnergyKwhRaw = measuredEnergyKwh;
  const textFacilityEnergyKwhRaw = textItEnergyKwhRaw * pue;
  const electricityFactor = resolveElectricityFactorForRegion(region);

  let textOperationalKgCo2eRaw: number | null = null;
  let textIndirectWaterLitersRaw: number | null = null;
  let textPartialLcaKgCo2eRaw: number | null = null;

  if (electricityFactor && electricityFactor.value !== null) {
    textOperationalKgCo2eRaw = textFacilityEnergyKwhRaw * electricityFactor.value;
    if (region === "US") {
      const waterFactor = getScientificFactor("water-indirect-datacenter-us-2024");
      if (waterFactor.value !== null) {
        textIndirectWaterLitersRaw = textFacilityEnergyKwhRaw * waterFactor.value;
      }
    }
    const lcaOverheadFactor = getScientificFactor("ai-partial-lca-overhead-v1");
    const overheadFraction = lcaOverheadFactor.value ?? 0.30;
    textPartialLcaKgCo2eRaw = textOperationalKgCo2eRaw * (1 + overheadFraction);
  }

  const textItEnergyKwh = roundPhysicalOutput(textItEnergyKwhRaw);
  const textFacilityEnergyKwh = roundPhysicalOutput(textFacilityEnergyKwhRaw);
  const textOperationalKgCo2e =
    textOperationalKgCo2eRaw !== null ? roundPhysicalOutput(textOperationalKgCo2eRaw) : null;
  const textIndirectWaterLiters =
    textIndirectWaterLitersRaw !== null ? roundPhysicalOutput(textIndirectWaterLitersRaw) : null;
  const textPartialLcaKgCo2e =
    textPartialLcaKgCo2eRaw !== null ? roundPhysicalOutput(textPartialLcaKgCo2eRaw) : null;

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
  const cachedTokens = textInput?.cachedTokens ?? 0;
  const uncachedInputTokens =
    typeof textInput?.inputTokens === "number"
      ? Math.max(0, textInput.inputTokens - cachedTokens)
      : 0;
  const outputTokens =
    typeof textInput?.outputTokens === "number"
      ? textInput.outputTokens
      : typeof textInput?.inputTokens === "number"
        ? 0
        : (textTokens ?? 0);

  const ecologitsImpacts = computeEcologitsCompatibleImpacts({
    model: modelRecord,
    inputTokens: uncachedInputTokens,
    outputTokens,
    cachedTokens,
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

  const textItEnergyKwhRaw = (textTokens / 1_000_000) * kwhPerMillion;
  const textFacilityEnergyKwhRaw = textItEnergyKwhRaw * pue;

  const electricityFactor = resolveElectricityFactorForRegion(region);
  let textOperationalKgCo2eRaw: number | null = null;
  let textIndirectWaterLitersRaw: number | null = null;
  let textPartialLcaKgCo2eRaw: number | null = null;
  let textDiagnostic: EnvironmentalDataQualityDiagnostic = "PROXY_SCENARIO";
  let textMethodNote: string;

  if (electricityFactor && electricityFactor.value !== null) {
    textOperationalKgCo2eRaw = textFacilityEnergyKwhRaw * electricityFactor.value;

    if (region === "US") {
      const waterFactor = getScientificFactor("water-indirect-datacenter-us-2024");
      if (waterFactor.value !== null) {
        textIndirectWaterLitersRaw = textFacilityEnergyKwhRaw * waterFactor.value;
      }
    } else {
      notes.push(
        `Eau indirecte non calculée pour la région ${region} : le facteur LBNL est spécifique aux États-Unis et n'est pas appliqué automatiquement.`,
      );
    }

    const lcaOverheadFactor = getScientificFactor("ai-partial-lca-overhead-v1");
    const overheadFraction = lcaOverheadFactor.value ?? 0.30;
    textPartialLcaKgCo2eRaw = textOperationalKgCo2eRaw * (1 + overheadFraction);

    textDiagnostic = evaluateDataQualityDiagnostic({ isScenarioOrRegionalProxy: true });
    textMethodNote = `Calculé via scénario ${scenario} (${kwhPerMillion} kWh/M tokens), PUE ${pue}, facteur carbone ${region} (${electricityFactor.value} kgCO₂e/kWh) et ACV partielle +30%.`;
  } else {
    textDiagnostic = evaluateDataQualityDiagnostic({ isScenarioOrRegionalProxy: true });
    textMethodNote = `Énergie IT/facility calculée (${roundPhysicalOutput(textFacilityEnergyKwhRaw)} kWh, scénario ${scenario}), mais carbone et eau non calculés : région d'infrastructure '${region}' inconnue ou non sourcée.`;
    notes.push(
      "Infrastructure électrique inconnue : les coefficients d'émission régionaux ne sont pas appliqués arbitrairement (conformité Invariant 5).",
    );
  }

  const textItEnergyKwh = roundPhysicalOutput(textItEnergyKwhRaw);
  const textFacilityEnergyKwh = roundPhysicalOutput(textFacilityEnergyKwhRaw);
  const textOperationalKgCo2e =
    textOperationalKgCo2eRaw !== null ? roundPhysicalOutput(textOperationalKgCo2eRaw) : null;
  const textIndirectWaterLiters =
    textIndirectWaterLitersRaw !== null ? roundPhysicalOutput(textIndirectWaterLitersRaw) : null;
  const textPartialLcaKgCo2e =
    textPartialLcaKgCo2eRaw !== null ? roundPhysicalOutput(textPartialLcaKgCo2eRaw) : null;

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

function computeZeroTokenTextImpacts(
  region: AccountingRegion,
  notes: string[],
): TextImpactsResult {
  const hasRegionalFactor = resolveElectricityFactorForRegion(region) !== null;
  const textDiagnostic = hasRegionalFactor
    ? evaluateDataQualityDiagnostic({ isScenarioOrRegionalProxy: true })
    : evaluateDataQualityDiagnostic({ isMissingOrUnmeasured: true });
  const textOperationalKgCo2e = hasRegionalFactor ? 0 : null;
  const textIndirectWaterLiters = region === "US" ? 0 : null;
  const textPartialLcaKgCo2e = hasRegionalFactor ? 0 : null;
  notes.push(
    "Activité texte déclarée à zéro (0 token, sans mesure électrique directe aux bornes) : le zéro résulte d'une déclaration utilisateur.",
  );

  return {
    textModality: {
      category: "text",
      hasSourcedPhysicalMethod: true,
      activityCount: 0,
      activityUnit: "tokens",
      energyKwh: 0,
      operationalKgCo2e: textOperationalKgCo2e,
      indirectWaterLiters: textIndirectWaterLiters,
      partialLcaKgCo2e: textPartialLcaKgCo2e,
      qualityDiagnostic: textDiagnostic,
      methodologyNote:
        "Activité texte nulle déclarée (0 token, sans mesure électrique directe aux bornes).",
    },
    totals: {
      itEnergyKwh: 0,
      facilityEnergyKwh: 0,
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
    return computeZeroTokenTextImpacts(region, notes);
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
      ? roundPhysicalOutput(facilityEnergyKwh * claimedFactor)
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

function evaluateAntiDoubleCountingCompliance(params: {
  input: PersonalAiFootprintInput;
  totals: TextImpactsResult["totals"];
  hasTextActivity: boolean;
}): PersonalAiFootprintEstimate["antiDoubleCountingCompliance"] {
  const { input, totals, hasTextActivity } = params;
  const hasEnergy = totals.facilityEnergyKwh !== null;
  const hasOperationalCo2e = totals.operationalKgCo2e !== null;
  const hasDirectWater = totals.directWaterLiters !== null;
  const hasIndirectWater = totals.indirectWaterLiters !== null;
  const hasLcaOrEmbodied =
    totals.embodiedKgCo2e !== null || totals.partialLcaKgCo2e !== null;
  const hasDuration =
    typeof input.measuredDurationSeconds === "number" && input.measuredDurationSeconds > 0;

  const ruleEvaluations = ANTI_DOUBLE_COUNTING_RULES.map((rule) => {
    switch (rule.id) {
      case "NO_IT_FACILITY_DOUBLE_COUNT":
        return hasEnergy
          ? {
              id: rule.id,
              status: "ENFORCED" as const,
              reason: "PUE appliqué à l'énergie IT sans additionner E_IT et E_facility.",
            }
          : {
              id: rule.id,
              status: "NOT_APPLICABLE" as const,
              reason: "Aucune énergie physique calculée pour cette requête.",
            };
      case "NO_WATER_DOUBLE_COUNT":
        if (!hasDirectWater && !hasIndirectWater) {
          return {
            id: rule.id,
            status: "NOT_APPLICABLE" as const,
            reason: "Aucun poste d'eau physique calculé pour cette requête.",
          };
        }
        if (hasDirectWater && hasIndirectWater) {
          return {
            id: rule.id,
            status: "UNVERIFIABLE_EXTERNAL" as const,
            reason:
              "Eau directe (WUE opérateur) et eau indirecte (proxy réseau US) affichées séparément, mais l'absence de recoupement dans le WUE déclaré par l'opérateur n'est pas vérifiable localement.",
          };
        }
        return {
          id: rule.id,
          status: "ENFORCED" as const,
          reason: "Un seul poste hydrique calculé sans double imputation directe/indirecte.",
        };
      case "NO_ACV_EMBODIED_DOUBLE_COUNT":
        return hasLcaOrEmbodied
          ? {
              id: rule.id,
              status: "ENFORCED" as const,
              reason:
                "Une seule branche d'impact incorporé/ACV appliquée (EcoLogits ou majoration partielle +30 %, jamais cumulées).",
            }
          : {
              id: rule.id,
              status: "NOT_APPLICABLE" as const,
              reason: "Aucun poste ACV/incorporé calculé pour cette requête.",
            };
      case "NO_CROSS_SCOPE_DOUBLE_COUNT":
        return {
          id: rule.id,
          status: "UNVERIFIABLE_EXTERNAL" as const,
          reason:
            "Le calcul est cloisonné dans PERSONAL_AI_USAGE, mais l'absence de comptage parallèle dans des bilans externes CleanMyMap ne peut pas être vérifiée dans ce module.",
        };
      case "NO_TOKEN_TIME_DOUBLE_COUNT":
        return hasTextActivity || hasDuration
          ? {
              id: rule.id,
              status: "ENFORCED" as const,
              reason:
                "Aucune addition d'une énergie par tokens et d'une énergie par durée sur une même charge.",
            }
          : {
              id: rule.id,
              status: "NOT_APPLICABLE" as const,
              reason: "Aucune charge texte ou durée mesurée déclarée.",
            };
      case "NO_REVERSE_CO2_TO_KWH":
        return hasOperationalCo2e
          ? {
              id: rule.id,
              status: "ENFORCED" as const,
              reason: "Conversion unidirectionnelle stricte kWh -> kgCO2e uniquement.",
            }
          : {
              id: rule.id,
              status: "NOT_APPLICABLE" as const,
              reason: "Aucune émission opérationnelle calculée.",
            };
    }
  });

  const verifiedRules = ruleEvaluations
    .filter((item) => item.status === "ENFORCED")
    .map((item) => item.id);
  const notApplicableRules = ruleEvaluations
    .filter((item) => item.status === "NOT_APPLICABLE")
    .map((item) => item.id);
  const unverifiableLimits = ruleEvaluations
    .filter((item) => item.status === "UNVERIFIABLE_EXTERNAL")
    .map((item) => item.id);

  return {
    compliant: verifiedRules.length > 0 || notApplicableRules.length === ruleEvaluations.length,
    verifiedRules,
    notApplicableRules,
    unverifiableLimits,
    ruleEvaluations,
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
  validatePersonalAiInput(input);

  const scenario = input.energyScenario ?? "central";
  const region = input.region ?? "UNKNOWN";
  const executionEnv: ExecutionEnvironment = input.executionEnvironment ?? "cloud_api";
  const pue =
    executionEnv === "local_device"
      ? 1.0
      : typeof input.pue === "number"
        ? input.pue
        : 1.15;

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

  const nonCalculableDeclaredModalities: MultimodalCategory[] = [];
  if ((input.imageUsage?.imageCount ?? 0) > 0) {
    nonCalculableDeclaredModalities.push("image");
  }
  if (
    (input.audioUsage?.durationMinutes ?? 0) > 0 ||
    (input.audioUsage?.requestCount ?? 0) > 0
  ) {
    nonCalculableDeclaredModalities.push("audio");
  }
  if (
    (input.videoUsage?.durationSeconds ?? 0) > 0 ||
    (input.videoUsage?.generationCount ?? 0) > 0
  ) {
    nonCalculableDeclaredModalities.push("video");
  }

  const hasCalculableText = totals.itEnergyKwh !== null;
  const calculableModalities: MultimodalCategory[] = hasCalculableText ? ["text"] : [];
  const modalityCoverage: PersonalAiFootprintEstimate["modalityCoverage"] = {
    status:
      nonCalculableDeclaredModalities.length > 0
        ? hasCalculableText
          ? "PARTIAL_MULTIMODAL"
          : "NONE"
        : hasCalculableText
          ? "TEXT_ONLY"
          : "NONE",
    calculableModalities,
    nonCalculableDeclaredModalities,
    coversAllDeclaredActivity: nonCalculableDeclaredModalities.length === 0 && hasCalculableText,
  };

  if (nonCalculableDeclaredModalities.length > 0) {
    notes.push(
      `Couverture partielle : les totaux physiques (physicalTotals) ne couvrent que la modalité texte ; les modalités multimodales déclarées (${nonCalculableDeclaredModalities.join(", ")}) restent non calculables (NA) faute de méthode physique sourcée.`,
    );
  }

  // Synthèse de la qualité globale (déterministe, sans pourcentage arbitraire)
  const overallQuality: EnvironmentalDataQualityDiagnostic =
    nonCalculableDeclaredModalities.length > 0
      ? "NOT_CALCULABLE"
      : evaluateDataQualityDiagnostic({
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
      "RTE Bilan électrique 2024 (émissions directes de production)",
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

  // Vérification honnête des règles anti-double-comptage
  const antiDoubleCountingCompliance = evaluateAntiDoubleCountingCompliance({
    input,
    totals,
    hasTextActivity: (textModality.activityCount ?? 0) > 0,
  });

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
    modalityCoverage,
    antiDoubleCountingCompliance,
    methodologyTrace,
    methodologyNotes: notes,
  };
}

export { evaluateEcologitsMethodology };
