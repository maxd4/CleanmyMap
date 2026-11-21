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
  isEcologitsRequestGranularityQualified,
  type EcologitsUsageGranularity,
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
import { roundPhysicalOutput } from "./physical-rounding";
import { validatePersonalAiInput } from "./personal-ai-estimator.validation";
import { type AiEnergyBoundary, type AiEnergyEvidence } from "./ai-cleanwalk-science";
import { calculateQualifiedEnergyImpacts } from "./ai-qualified-energy-impacts";

export type EnergyScenario = "low" | "central" | "high";
export type AccountingRegion = ScientificFactorRegion;

export type PersonalAiFootprintInput = {
  periodLabel?: string;
  modelId?: string | null;
  executionEnvironment?: ExecutionEnvironment;
  hosterOperator?: string | null;
  textUsage?: {
    totalTokens?: number | null;
    inputTokens?: number | null;
    outputTokens?: number | null;
    cachedTokens?: number | null;
    reasoningTokensIncluded?: number | null;
    /** Granularité de la donnée : seuls les tokens d'une requête identifiée peuvent alimenter EcoLogits. */
    granularity?: EcologitsUsageGranularity;
  };
  imageUsage?: { imageCount?: number | null };
  audioUsage?: { durationMinutes?: number | null; requestCount?: number | null };
  videoUsage?: { durationSeconds?: number | null; generationCount?: number | null };
  requestCount?: number | null;
  measuredDurationSeconds?: number | null;
  tps?: number | null;
  ttftSeconds?: number | null;
  batchSize?: number | null;
  measuredEnergyKwh?: number | null;
  energyMeasurement?: { kwh: number; boundary: AiEnergyBoundary; evidence: AiEnergyEvidence };
  localPower?: { watts: number; durationSeconds: number; idleWatts?: number };
  datacenterWue?: number | null;
  marketBasedDeclaration?: { claimedKgCo2ePerKwh?: number | null; providerCertificateNote?: string };
  energyScenario?: "low" | "central" | "high";
  region?: ScientificFactorRegion;
  /** Opt-in factor version. Omitting it preserves the historical regional default. */
  electricityFactorId?: string;
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
  pueApplied: boolean;
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
  modalities: { text: ModalityEstimate; image: ModalityEstimate; audio: ModalityEstimate; video: ModalityEstimate };
  physicalTotals: {
    itEnergyKwh: number | null;
    facilityEnergyKwh: number | null;
    localWallEnergyKwh?: number | null;
    localIncrementalEnergyKwh?: number | null;
    operationalKgCo2e: number | null;
    directWaterLiters: number | null;
    indirectWaterLiters: number | null;
    totalWaterLiters: number | null;
    embodiedKgCo2e: number | null;
    partialLcaKgCo2e: number | null;
    primaryEnergyMj?: number | null;
    abioticDepletionKgSbEq?: number | null;
  };
  marketBasedDisclosure?: { isReported: boolean; claimedKgCo2e: number | null; note: string };
  modalityCoverage: {
    status: "NONE" | "TEXT_ONLY" | "PARTIAL_MULTIMODAL";
    calculableModalities: MultimodalCategory[];
    nonCalculableDeclaredModalities: MultimodalCategory[];
    coversAllDeclaredActivity: boolean;
  };
  antiDoubleCountingCompliance: {
    status: "VERIFIED" | "PARTIAL" | "UNPROVEN";
    compliant: boolean;
    verifiedRules: string[];
    notApplicableRules: string[];
    unverifiableLimits: string[];
    ruleEvaluations: Array<{ id: string; status: "ENFORCED" | "NOT_APPLICABLE" | "UNVERIFIABLE_EXTERNAL"; reason: string }>;
  };
  methodologyTrace: { formula: string; sources: readonly string[]; date: string; version: string; limitations: readonly string[] };
  methodologyNotes: string[];
};

const EMPTY_PHYSICAL_TOTALS: PersonalAiFootprintEstimate["physicalTotals"] = {
  itEnergyKwh: null, facilityEnergyKwh: null, localWallEnergyKwh: null, operationalKgCo2e: null, directWaterLiters: null, indirectWaterLiters: null,
  totalWaterLiters: null, embodiedKgCo2e: null, partialLcaKgCo2e: null, primaryEnergyMj: null, abioticDepletionKgSbEq: null,
};

interface ResolvedModelContext {
  modelRecord?: AiModelRecord;
  modelDetails?: PersonalAiFootprintEstimate["modelDetails"];
}

function resolveModelContext(input: PersonalAiFootprintInput, notes: string[]): ResolvedModelContext {
  if (!input.modelId) return {};
  const modelRecord = findAiModel(input.modelId);
  const hoster = resolveHosterForModel(modelRecord, input.hosterOperator);

  if (modelRecord) {
    notes.push(`Modèle identifié : ${modelRecord.name} (Éditeur: ${modelRecord.publisher}, Opérateur/Hébergeur: ${hoster.name}, Licence: ${modelRecord.license}).`);
    return {
      modelRecord,
      modelDetails: {
        id: modelRecord.id, name: modelRecord.name, publisher: modelRecord.publisher, hoster: hoster.name,
        weightsAvailability: modelRecord.weightsAvailability, architectureType: modelRecord.architecture.type,
        totalParametersBillion: modelRecord.architecture.totalParametersBillion,
        activeParametersBillion: modelRecord.architecture.activeParametersBillion,
        isReasoningModel: modelRecord.architecture.isReasoningModel,
      },
    };
  }

  notes.push(`Modèle "${input.modelId}" non répertorié dans le catalogue standard : calcul basé sur scénario générique.`);
  return {};
}

interface TextImpactsResult {
  textModality: ModalityEstimate;
  totals: PersonalAiFootprintEstimate["physicalTotals"];
  textDiagnostic: EnvironmentalDataQualityDiagnostic;
  usedOfficialEcologitsFormula: boolean;
}

function buildTextImpactsResult(params: {
  activityCount: number | null;
  totals: PersonalAiFootprintEstimate["physicalTotals"];
  textDiagnostic: EnvironmentalDataQualityDiagnostic;
  methodologyNote: string;
  usedOfficialEcologitsFormula?: boolean;
}): TextImpactsResult {
  const { activityCount, totals, textDiagnostic, methodologyNote } = params;
  return {
    textModality: {
      category: "text", hasSourcedPhysicalMethod: true, activityCount, activityUnit: "tokens",
      energyKwh: totals.facilityEnergyKwh ?? totals.localWallEnergyKwh ?? totals.itEnergyKwh, operationalKgCo2e: totals.operationalKgCo2e,
      indirectWaterLiters: totals.indirectWaterLiters, partialLcaKgCo2e: totals.partialLcaKgCo2e,
      qualityDiagnostic: textDiagnostic, methodologyNote,
    },
    totals,
    textDiagnostic,
    usedOfficialEcologitsFormula: params.usedOfficialEcologitsFormula ?? false,
  };
}

function buildUnmeasuredTextImpacts(activityCount: number | null, methodologyNote: string): TextImpactsResult {
  return buildTextImpactsResult({
    activityCount,
    totals: { ...EMPTY_PHYSICAL_TOTALS },
    textDiagnostic: evaluateDataQualityDiagnostic({ isMissingOrUnmeasured: true }),
    methodologyNote,
  });
}

function computeRegionalPhysicalTotals(params: {
  itEnergyKwhRaw: number;
  pue: number;
  region: AccountingRegion;
  datacenterWue: number | null;
  includeCloudPartialLca: boolean;
  recordRegionalWaterGapNote: boolean;
  electricityFactorId?: string;
  notes: string[];
}): { totals: PersonalAiFootprintEstimate["physicalTotals"]; electricityFactorValue: number | null } {
  const { itEnergyKwhRaw, pue, region, datacenterWue, includeCloudPartialLca, notes } = params;
  const facilityEnergyKwhRaw = itEnergyKwhRaw * pue;
  const electricityFactor = resolveElectricityFactorForRegion(region, params.electricityFactorId);
  const directWaterRaw = typeof datacenterWue === "number" ? itEnergyKwhRaw * datacenterWue : null;
  let operationalCo2eRaw: number | null = null;
  let indirectWaterRaw: number | null = null;
  let partialLcaCo2eRaw: number | null = null;

  if (electricityFactor && electricityFactor.value !== null) {
    operationalCo2eRaw = facilityEnergyKwhRaw * electricityFactor.value;
    if (region === "US") {
      const waterFactor = getScientificFactor("water-indirect-datacenter-us-2024");
      if (waterFactor.value !== null) indirectWaterRaw = facilityEnergyKwhRaw * waterFactor.value;
    } else if (params.recordRegionalWaterGapNote) {
      notes.push(`Eau indirecte non calculée pour la région ${region} : le facteur LBNL est spécifique aux États-Unis et n'est pas appliqué automatiquement.`);
    }
    if (includeCloudPartialLca) {
      const overheadFraction = getScientificFactor("ai-partial-lca-overhead-v1").value ?? 0.30;
      partialLcaCo2eRaw = operationalCo2eRaw * (1 + overheadFraction);
    }
  }

  return {
    electricityFactorValue: electricityFactor?.value ?? null,
    totals: {
      itEnergyKwh: roundPhysicalOutput(itEnergyKwhRaw),
      facilityEnergyKwh: roundPhysicalOutput(facilityEnergyKwhRaw),
      operationalKgCo2e: operationalCo2eRaw !== null ? roundPhysicalOutput(operationalCo2eRaw) : null,
      directWaterLiters: directWaterRaw !== null ? roundPhysicalOutput(directWaterRaw) : null,
      indirectWaterLiters: indirectWaterRaw !== null ? roundPhysicalOutput(indirectWaterRaw) : null,
      totalWaterLiters: directWaterRaw !== null && indirectWaterRaw !== null ? roundPhysicalOutput(directWaterRaw + indirectWaterRaw) : null,
      embodiedKgCo2e: null,
      partialLcaKgCo2e: partialLcaCo2eRaw !== null ? roundPhysicalOutput(partialLcaCo2eRaw) : null,
      primaryEnergyMj: null,
      abioticDepletionKgSbEq: null,
    },
  };
}

function computeDirectMeasuredTextImpacts(
  measuredEnergyKwh: number,
  pue: number,
  region: AccountingRegion,
  executionEnv: ExecutionEnvironment,
  datacenterWue: number | null,
  activityCount: number | null,
  electricityFactorId: string | undefined,
  evidence: AiEnergyEvidence,
  notes: string[],
): TextImpactsResult {
  const { totals } = computeRegionalPhysicalTotals({
    itEnergyKwhRaw: measuredEnergyKwh,
    pue,
    region,
    datacenterWue: executionEnv === "cloud_api" ? datacenterWue : null,
    includeCloudPartialLca: executionEnv === "cloud_api",
    recordRegionalWaterGapNote: false,
    electricityFactorId,
    notes,
  });

  return buildTextImpactsResult({
    activityCount,
    totals,
    textDiagnostic: evidence === "MEASURED" ? "MEASURED" : evidence === "DECLARED" ? "DECLARED" : "PROXY_SCENARIO",
    methodologyNote: evidence === "MEASURED"
      ? `Consommation électrique directe mesurée aux bornes (${totals.itEnergyKwh} kWh).`
      : evidence === "DECLARED"
        ? `Consommation électrique IT déclarée (${totals.itEnergyKwh} kWh).`
        : `Consommation électrique IT issue d'une hypothèse (${totals.itEnergyKwh} kWh).`,
  });
}

function computeEcologitsModelTextImpacts(
  input: PersonalAiFootprintInput,
  modelRecord: AiModelRecord,
  pue: number,
  region: AccountingRegion,
  scenario: EnergyScenario,
  executionEnv: ExecutionEnvironment,
  textTokens: number,
  outputTokens: number,
  notes: string[],
): TextImpactsResult {
  const textInput = input.textUsage;
  const ecologitsImpacts = computeEcologitsCompatibleImpacts({
    model: modelRecord,
    inputTokens: textInput?.inputTokens ?? 0,
    outputTokens,
    cachedTokens: textInput?.cachedTokens ?? 0,
    reasoningTokensIncluded: textInput?.reasoningTokensIncluded ?? null,
    usageGranularity: textInput?.granularity,
    requestCount: input.requestCount,
    durationSeconds: input.measuredDurationSeconds,
    tps: input.tps,
    ttft: input.ttftSeconds,
    batchSize: input.batchSize,
    pue,
    datacenterWue: input.datacenterWue,
    region,
    electricityFactorId: input.electricityFactorId,
    scenario,
    executionEnvironment: executionEnv,
  });

  notes.push(...ecologitsImpacts.notes, ...ecologitsImpacts.warnings);

  return buildTextImpactsResult({
    activityCount: textTokens,
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
    methodologyNote: `Modèle documenté ${modelRecord.name} (${modelRecord.architecture.activeParametersBillion}B params actifs / ${modelRecord.architecture.totalParametersBillion}B totaux, N_GPU=${ecologitsImpacts.gpuRequiredCount ?? "NA"}) évalué sur ${outputTokens} tokens générés selon les équations officielles EcoLogits v3.0.0.`,
    usedOfficialEcologitsFormula: ecologitsImpacts.isEcologitsCompliant,
  });
}

function computeGenericScenarioTextImpacts(
  textTokens: number,
  scenario: EnergyScenario,
  region: AccountingRegion,
  pue: number,
  datacenterWue: number | null,
  electricityFactorId: string | undefined,
  notes: string[],
): TextImpactsResult {
  const factorId =
    scenario === "low"
      ? "ai-inference-energy-scenario-low-v1"
      : scenario === "high"
        ? "ai-inference-energy-scenario-high-v1"
        : "ai-inference-energy-scenario-central-v1";
  const kwhPerMillion = getScientificFactor(factorId).value ?? 0.30;
  const { totals, electricityFactorValue } = computeRegionalPhysicalTotals({
    itEnergyKwhRaw: (textTokens / 1_000_000) * kwhPerMillion,
    pue,
    region,
    datacenterWue,
    includeCloudPartialLca: true,
    recordRegionalWaterGapNote: true,
    electricityFactorId,
    notes,
  });

  if (electricityFactorValue === null) {
    notes.push("Infrastructure électrique inconnue : les coefficients d'émission régionaux ne sont pas appliqués arbitrairement (conformité Invariant 5).");
  }
  const textMethodNote =
    electricityFactorValue !== null
      ? `Calculé via scénario hypothétique ${scenario} (${kwhPerMillion} kWh/M tokens), PUE ${pue}, facteur carbone ${region} (${electricityFactorValue} kgCO₂e/kWh) et ACV partielle +30%.`
      : `Énergie IT/facility calculée (${totals.facilityEnergyKwh} kWh, scénario ${scenario}), mais carbone et eau non calculés : région d'infrastructure '${region}' inconnue ou non sourcée.`;

  return buildTextImpactsResult({
    activityCount: textTokens,
    totals,
    textDiagnostic: evaluateDataQualityDiagnostic({ isScenarioOrRegionalProxy: true }),
    methodologyNote: textMethodNote,
  });
}

function computeZeroTokenTextImpacts(
  region: AccountingRegion,
  hasDocumentedModel: boolean,
  datacenterWue: number | null,
  notes: string[],
): TextImpactsResult {
  const hasRegionalFactor = resolveElectricityFactorForRegion(region) !== null;
  const textDiagnostic = !hasRegionalFactor
    ? evaluateDataQualityDiagnostic({ isMissingOrUnmeasured: true })
    : hasDocumentedModel
      ? evaluateDataQualityDiagnostic({ hasDocumentedModel: true })
      : evaluateDataQualityDiagnostic({ isScenarioOrRegionalProxy: true });
  const textOperationalKgCo2e = hasRegionalFactor ? 0 : null;
  const textDirectWaterLiters = typeof datacenterWue === "number" ? 0 : null;
  const textIndirectWaterLiters = region === "US" ? 0 : null;
  const textTotalWaterLiters = textDirectWaterLiters !== null && textIndirectWaterLiters !== null ? 0 : null;
  const textPartialLcaKgCo2e = hasRegionalFactor ? 0 : null;
  notes.push("Activité texte déclarée à zéro (0 token, sans mesure électrique directe aux bornes) : le zéro résulte d'une déclaration utilisateur.");

  return buildTextImpactsResult({
    activityCount: 0,
    totals: {
      itEnergyKwh: 0,
      facilityEnergyKwh: 0,
      operationalKgCo2e: textOperationalKgCo2e,
      directWaterLiters: textDirectWaterLiters,
      indirectWaterLiters: textIndirectWaterLiters,
      totalWaterLiters: textTotalWaterLiters,
      embodiedKgCo2e: hasDocumentedModel ? 0 : null,
      partialLcaKgCo2e: textPartialLcaKgCo2e,
      primaryEnergyMj: hasDocumentedModel ? 0 : null,
      abioticDepletionKgSbEq: hasDocumentedModel ? 0 : null,
    },
    textDiagnostic,
    methodologyNote: "Activité texte nulle déclarée (0 token, sans mesure électrique directe aux bornes).",
  });
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
  const resolvedInputTokens = textInput?.inputTokens;
  const resolvedOutputTokens = textInput?.outputTokens;
  if (typeof textInput?.totalTokens === "number") {
    textTokens = textInput.totalTokens;
  } else if (typeof textInput?.inputTokens === "number" || typeof textInput?.outputTokens === "number") {
    textTokens = (textInput.inputTokens ?? 0) + (textInput.outputTokens ?? 0);
  }

  if (typeof textInput?.reasoningTokensIncluded === "number" && textInput.reasoningTokensIncluded > 0) {
    notes.push(`${textInput.reasoningTokensIncluded} tokens de raisonnement inclus dans le volume de génération (aucun surcoût multiplicateur arbitraire).`);
  }
  if (typeof textInput?.cachedTokens === "number" && textInput.cachedTokens > 0) {
    notes.push(typeof resolvedInputTokens === "number"
      ? `${textInput.cachedTokens} tokens d'entrée servis depuis le cache (sous-ensemble de inputTokens, non additionné).`
      : `${textInput.cachedTokens} tokens servis depuis le cache, mais leur ventilation entrée/sortie est inconnue ; non ajoutés au total ni utilisés pour EcoLogits.`);
  }

  if (input.energyMeasurement || input.localPower) {
    if (input.localPower && executionEnv !== "local_device") throw new Error("Une mesure de puissance locale requiert local_device.");
    if (executionEnv === "local_device") notes.push("Énergie locale mesurée ou déclarée : aucune consommation de serveur distant ni empreinte matérielle n'est inférée.");
    const measured = calculateQualifiedEnergyImpacts({ input, region, activityCount: textTokens });
    notes.push(...measured.notes);
    return buildTextImpactsResult({
      activityCount: textTokens,
      totals: measured.totals,
      textDiagnostic: measured.diagnostic,
      methodologyNote: measured.methodologyNote,
    });
  }

  if (typeof input.measuredEnergyKwh === "number" && input.measuredEnergyKwh >= 0) {
    if (executionEnv === "local_device") {
      const localBoundaryNote = "Mesure énergétique historique associée à local_device sans frontière physique qualifiée : elle n'est attribuée ni à IT_FULL, ni à FACILITY, ni à LOCAL_WALL ; impacts énergétiques et dérivés laissés à NA (null). Utiliser energyMeasurement avec une frontière explicitement établie.";
      notes.push(localBoundaryNote);
      return buildUnmeasuredTextImpacts(textTokens, localBoundaryNote);
    }
    return computeDirectMeasuredTextImpacts(
      input.measuredEnergyKwh,
      pue,
      region,
      executionEnv,
      input.datacenterWue ?? null,
      textTokens,
      input.electricityFactorId,
      "MEASURED",
      notes,
    );
  }

  if (executionEnv === "local_device") {
    const localNote = "Exécution locale (local_device) sans mesure électrique directe (measuredEnergyKwh) ni profil matériel local sourcé : aucune extrapolation de serveur cloud H100 n'est appliquée et les impacts (énergie, carbone opérationnel et matériel incorporé) restent non calculables (NA / null).";
    notes.push(localNote);
    return buildUnmeasuredTextImpacts(textTokens, localNote);
  }

  if (textTokens === null) {
    return buildUnmeasuredTextImpacts(null, "Aucune donnée de consommation de texte ni mesure électrique fournie.");
  }

  const hasDocumentedModel = Boolean(
    modelRecord &&
      typeof modelRecord.architecture.activeParametersBillion === "number" &&
      modelRecord.architecture.activeParametersBillion > 0 &&
      typeof modelRecord.architecture.totalParametersBillion === "number" &&
      modelRecord.architecture.totalParametersBillion > 0,
  );

  if (textTokens === 0) {
    return computeZeroTokenTextImpacts(region, hasDocumentedModel, input.datacenterWue ?? null, notes);
  }

  if (modelRecord && hasDocumentedModel) {
    if (
      typeof resolvedOutputTokens === "number" &&
      resolvedOutputTokens > 0 &&
      isEcologitsRequestGranularityQualified({
        usageGranularity: textInput?.granularity,
        requestCount: input.requestCount,
      })
    ) {
      const resolvedInput = { ...input, textUsage: { ...textInput, inputTokens: resolvedInputTokens, outputTokens: resolvedOutputTokens } };
      return computeEcologitsModelTextImpacts(resolvedInput, modelRecord, pue, region, scenario, executionEnv, textTokens, resolvedOutputTokens, notes);
    }
    if (typeof resolvedOutputTokens === "number" && resolvedOutputTokens > 0) {
      notes.push(`EcoLogits par requête non appliqué : seuls les ${resolvedOutputTokens} tokens générés sont pris comme volume de sortie, mais ils ne sont pas explicitement qualifiés PER_REQUEST pour une seule requête. L'agrégat non ventilé reste un scénario générique hypothétique (PROXY_SCENARIO).`);
    } else {
      notes.push(`Modèle ${modelRecord.name} sélectionné sans nombre de tokens générés explicite (outputTokens absent ou nul) : les tokens d'entrée ou totaux (${textTokens} tokens) ne sont jamais assimilés à des tokens de sortie dans EcoLogits v3.0.0. Bascule sur le scénario énergétique générique hypothétique (${scenario}, PROXY_SCENARIO).`);
    }
  } else if (modelRecord && !hasDocumentedModel) {
    notes.push(`L'architecture du modèle ${modelRecord.name} n'est pas publiée par son éditeur : aucune conformité EcoLogits v3.0.0 n'est revendiquée ; bascule sur le scénario énergétique générique hypothétique (${scenario}, PROXY_SCENARIO).`);
  }

  return computeGenericScenarioTextImpacts(textTokens, scenario, region, pue, input.datacenterWue ?? null, input.electricityFactorId, notes);
}

function buildUnmeasuredModality(
  category: MultimodalCategory,
  activityCount: number | null,
  activityUnit: string,
  activeLabel: string,
  emptyLabel: string,
): ModalityEstimate {
  return {
    category, hasSourcedPhysicalMethod: false, activityCount, activityUnit,
    energyKwh: null, operationalKgCo2e: null, indirectWaterLiters: null, partialLcaKgCo2e: null,
    qualityDiagnostic: "NOT_CALCULABLE",
    methodologyNote: activityCount !== null ? activeLabel : emptyLabel,
  };
}

function buildNonTextModalities(input: PersonalAiFootprintInput): {
  imageModality: ModalityEstimate;
  audioModality: ModalityEstimate;
  videoModality: ModalityEstimate;
} {
  const imageCount = typeof input.imageUsage?.imageCount === "number" ? input.imageUsage.imageCount : null;
  const audioMinutes = typeof input.audioUsage?.durationMinutes === "number" ? input.audioUsage.durationMinutes : null;
  const videoSeconds = typeof input.videoUsage?.durationSeconds === "number" ? input.videoUsage.durationSeconds : null;

  return {
    imageModality: buildUnmeasuredModality(
      "image",
      imageCount,
      "images",
      `${imageCount} image(s) déclarée(s). Aucun facteur physique générique sourcé n'est applicable : impact physique NA conformément au protocole.`,
      "Aucune activité image déclarée (NA).",
    ),
    audioModality: buildUnmeasuredModality(
      "audio",
      audioMinutes,
      "minutes",
      `${audioMinutes} minute(s) audio déclarée(s). Facteur physique non calculable (NA).`,
      "Aucune activité audio déclarée (NA).",
    ),
    videoModality: buildUnmeasuredModality(
      "video",
      videoSeconds,
      "seconds",
      `${videoSeconds} seconde(s) vidéo déclarée(s). Facteur physique non calculable (NA).`,
      "Aucune activité vidéo déclarée (NA).",
    ),
  };
}

function resolveMarketBasedDisclosure(
  input: PersonalAiFootprintInput,
  facilityEnergyKwh: number | null,
  notes: string[],
): PersonalAiFootprintEstimate["marketBasedDisclosure"] {
  if (!input.marketBasedDeclaration) return undefined;
  const claimedFactor = input.marketBasedDeclaration.claimedKgCo2ePerKwh;
  const claimedKgCo2e =
    facilityEnergyKwh !== null && typeof claimedFactor === "number"
      ? roundPhysicalOutput(facilityEnergyKwh * claimedFactor)
      : null;
  notes.push("Divulgation contractuelle (market-based) enregistrée séparément de la réalité physique du réseau électrique local (location-based).");
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
  const hasLcaOrEmbodied = totals.embodiedKgCo2e !== null || totals.partialLcaKgCo2e !== null;
  const hasDuration = typeof input.measuredDurationSeconds === "number" && input.measuredDurationSeconds > 0;
  const check = (id: string, status: "ENFORCED" | "NOT_APPLICABLE" | "UNVERIFIABLE_EXTERNAL", reason: string) => ({ id, status, reason });

  const ruleEvaluations = ANTI_DOUBLE_COUNTING_RULES.map((rule) => {
    switch (rule.id) {
      case "NO_IT_FACILITY_DOUBLE_COUNT":
        return hasEnergy
          ? check(rule.id, "ENFORCED", "PUE appliqué à l'énergie IT sans additionner E_IT et E_facility.")
          : check(rule.id, "NOT_APPLICABLE", "Aucune énergie physique calculée pour cette requête.");
      case "NO_WATER_DOUBLE_COUNT":
        if (!hasDirectWater && !hasIndirectWater) return check(rule.id, "NOT_APPLICABLE", "Aucun poste d'eau physique calculé pour cette requête.");
        if (hasDirectWater && hasIndirectWater) {
          return check(rule.id, "UNVERIFIABLE_EXTERNAL", "Eau directe (WUE opérateur) et eau indirecte (proxy réseau US) affichées séparément, mais l'absence de recoupement dans le WUE déclaré par l'opérateur n'est pas vérifiable localement.");
        }
        return check(rule.id, "ENFORCED", "Un seul poste hydrique calculé sans double imputation directe/indirecte.");
      case "NO_ACV_EMBODIED_DOUBLE_COUNT":
        return hasLcaOrEmbodied
          ? check(rule.id, "ENFORCED", "Une seule branche d'impact incorporé/ACV appliquée (EcoLogits ou majoration partielle +30 %, jamais cumulées).")
          : check(rule.id, "NOT_APPLICABLE", "Aucun poste ACV/incorporé calculé pour cette requête.");
      case "NO_CROSS_SCOPE_DOUBLE_COUNT":
        return check(rule.id, "UNVERIFIABLE_EXTERNAL", "Le calcul est cloisonné dans PERSONAL_AI_USAGE, mais l'absence de comptage parallèle dans des bilans externes CleanMyMap ne peut pas être vérifiée dans ce module.");
      case "NO_TOKEN_TIME_DOUBLE_COUNT":
        return hasTextActivity || hasDuration
          ? check(rule.id, "ENFORCED", "Aucune addition d'une énergie par tokens et d'une énergie par durée sur une même charge.")
          : check(rule.id, "NOT_APPLICABLE", "Aucune charge texte ou durée mesurée déclarée.");
      case "NO_REVERSE_CO2_TO_KWH":
        return hasOperationalCo2e
          ? check(rule.id, "ENFORCED", "Conversion unidirectionnelle stricte kWh -> kgCO2e uniquement.")
          : check(rule.id, "NOT_APPLICABLE", "Aucune émission opérationnelle calculée.");
    }
  });

  const verifiedRules = ruleEvaluations.filter((item) => item.status === "ENFORCED").map((item) => item.id);
  const notApplicableRules = ruleEvaluations.filter((item) => item.status === "NOT_APPLICABLE").map((item) => item.id);
  const unverifiableLimits = ruleEvaluations.filter((item) => item.status === "UNVERIFIABLE_EXTERNAL").map((item) => item.id);
  const status = unverifiableLimits.length > 0
    ? verifiedRules.length > 0 ? "PARTIAL" as const : "UNPROVEN" as const
    : "VERIFIED" as const;

  return {
    status,
    compliant: status === "VERIFIED",
    verifiedRules,
    notApplicableRules,
    unverifiableLimits,
    ruleEvaluations,
  };
}

export function estimatePersonalAiFootprint(
  input: PersonalAiFootprintInput,
  generatedAt = new Date().toISOString(),
): PersonalAiFootprintEstimate {
  input = validatePersonalAiInput(input);

  const scenario = input.energyScenario ?? "central";
  const region = input.region ?? "UNKNOWN";
  if (input.electricityFactorId && !resolveElectricityFactorForRegion(region, input.electricityFactorId)) {
    throw new Error("Le facteur électrique sélectionné ne correspond pas à la région déclarée.");
  }
  const executionEnv: ExecutionEnvironment = input.executionEnvironment ?? "cloud_api";
  const pue = executionEnv === "local_device" ? 1.0 : typeof input.pue === "number" ? input.pue : 1.15;

  const notes: string[] = [
    "Périmètre comptable : utilisation personnelle déclarée d'IA (PERSONAL_AI_USAGE). Strictement isolé des métriques du site CleanMyMap.",
  ];

  const { modelRecord, modelDetails } = resolveModelContext(input, notes);
  const { textModality, totals, textDiagnostic, usedOfficialEcologitsFormula } =
    computeTextImpacts(input, modelRecord, pue, region, scenario, executionEnv, notes);
  const { imageModality, audioModality, videoModality } = buildNonTextModalities(input);

  const nonCalculableDeclaredModalities: MultimodalCategory[] = [];
  if ((input.imageUsage?.imageCount ?? 0) > 0) nonCalculableDeclaredModalities.push("image");
  if ((input.audioUsage?.durationMinutes ?? 0) > 0 || (input.audioUsage?.requestCount ?? 0) > 0) {
    nonCalculableDeclaredModalities.push("audio");
  }
  if ((input.videoUsage?.durationSeconds ?? 0) > 0 || (input.videoUsage?.generationCount ?? 0) > 0) {
    nonCalculableDeclaredModalities.push("video");
  }

  const hasCalculableText = totals.itEnergyKwh !== null || totals.facilityEnergyKwh !== null || totals.localWallEnergyKwh != null;
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
    notes.push(`Couverture partielle : les totaux physiques (physicalTotals) ne couvrent que la modalité texte ; les modalités multimodales déclarées (${nonCalculableDeclaredModalities.join(", ")}) restent non calculables (NA) faute de méthode physique sourcée.`);
  }

  const overallQuality: EnvironmentalDataQualityDiagnostic =
    nonCalculableDeclaredModalities.length > 0
      ? "NOT_CALCULABLE"
      : evaluateDataQualityDiagnostic({
          hasDirectMeasurement: textDiagnostic === "MEASURED",
          hasDeclaredInput: textDiagnostic === "DECLARED",
          hasDocumentedModel: textDiagnostic === "DOCUMENTED_MODEL",
          isScenarioOrRegionalProxy: textDiagnostic === "PROXY_SCENARIO",
          isMissingOrUnmeasured: textDiagnostic === "NOT_CALCULABLE",
        });

  const marketBasedDisclosure = resolveMarketBasedDisclosure(input, totals.facilityEnergyKwh, notes);

  let formulaTrace: string;
  if (input.energyMeasurement || input.localPower) {
    formulaTrace = input.localPower
      ? "E_local,murale = P_moyenne × durée ; E_incrémentale = max(0, P_charge − P_idle) × durée"
      : input.energyMeasurement?.boundary === "FACILITY"
        ? "E_site mesurée directement ; aucun PUE supplémentaire"
        : input.energyMeasurement?.boundary === "LOCAL_WALL"
          ? "E_locale,prise = énergie mesurée à la prise ; part incrémentale inconnue sans puissance à vide"
          : "E_site = E_IT mesurée × PUE"
  } else if (typeof input.measuredEnergyKwh === "number" && executionEnv === "local_device") {
    formulaTrace = "NA (mesure locale historique sans frontière énergétique qualifiée)";
  } else if (typeof input.measuredEnergyKwh === "number") {
    formulaTrace = "E_total = E_IT_mesurée × PUE ; GWP = E_total × f_grid";
  } else if (usedOfficialEcologitsFormula) {
    formulaTrace = "E_GPU = N_output × ((alpha × exp(beta × batch) × P_active + gamma) / 1000) × N_GPU ; E_IT = E_server + E_GPU ; E_total = E_IT × PUE ; GWP = E_total × f_grid + Embodied_GWP";
  } else if (totals.itEnergyKwh !== null) {
    formulaTrace = "E_total = (Tokens / 1M) × f_scenario × PUE ; GWP = E_total × f_grid ; LCA = GWP × 1,30";
  } else {
    formulaTrace = "NA (données physiques ou ventilation requises absentes : aucune extrapolation appliquée)";
  }

  const methodologyTrace = {
    formula: formulaTrace,
    sources: [
      "EcoLogits v3.0.0 (Data For Good / GenAI Impact — packages/ecologits.js/src/impacts/llm.ts)",
      "EPA eGRID / EIA 2024",
      "RTE Bilan électrique 2024 (émissions directes de production)",
      "LBNL 2024 United States Data Center Energy Usage Report",
      "CleanMyMap Rapport impact_IA (Annexe B)",
    ],
    date: "2026-05",
    version: "personal-ai-estimator-2026.11-v4",
    limitations: [
      "Les équations EcoLogits v3.0.0 exigent des paramètres actifs/totaux publiés et un volume explicite de tokens générés (outputTokens > 0) ; à défaut, l'estimateur bascule sur un scénario générique ou NA sans substituer inputTokens à outputTokens.",
      "La conformité EcoLogits exige une donnée textuelle explicitement qualifiée PER_REQUEST pour une seule requête ; tout agrégat non ventilé reste PROXY_SCENARIO ou NA.",
      "La mesure historique measuredEnergyKwh avec local_device n'a pas de frontière connue et n'est attribuée ni à l'IT, ni au site d'un datacenter, ni à LOCAL_WALL.",
      "Les frontières énergétiques IT_FULL, FACILITY et LOCAL_WALL sont distinctes; le facteur PUE n'est appliqué qu'à une mesure IT cloud avec une valeur de PUE disponible.",
      "L'eau totale (totalWaterLiters) n'est renseignée que lorsque l'eau directe sur site et l'eau indirecte réseau sont toutes deux calculables.",
      "Les facteurs physiques image, audio et vidéo restent NA faute de méthode sourcée reproductible.",
      "Le facteur électrique US n'est jamais propagé à une région inconnue ou non américaine.",
    ],
  };

  const antiDoubleCountingCompliance = evaluateAntiDoubleCountingCompliance({
    input,
    totals,
    hasTextActivity: (textModality.activityCount ?? 0) > 0,
  });

  return {
    accountingScope: "PERSONAL_AI_USAGE",
    version: "personal-ai-estimator-2026.11-v4",
    generatedAt,
    scenario,
    region,
    pue,
    pueApplied: executionEnv === "cloud_api" && totals.itEnergyKwh !== null && totals.facilityEnergyKwh !== null,
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
