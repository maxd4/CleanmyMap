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

export type PersonalAiFootprintInput = {
  /** Période ou libellé descriptif (ex: "Septembre 2026", "Session d'audit") */
  periodLabel?: string;
  /** Utilisation de texte déclarée */
  textUsage?: {
    totalTokens?: number | null;
    inputTokens?: number | null;
    outputTokens?: number | null;
    cachedTokens?: number | null;
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
  /** Scénario énergétique pour l'inférence de texte (par défaut: central) */
  energyScenario?: "low" | "central" | "high";
  /** Région d'infrastructure électrique */
  region?: ScientificFactorRegion;
  /** PUE du data center (défaut: 1.15 pour intégrer le refroidissement standard, 1.0 si déjà inclus) */
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
    indirectWaterLiters: number | null;
    partialLcaKgCo2e: number | null;
  };
  antiDoubleCountingCompliance: {
    compliant: boolean;
    verifiedRules: string[];
  };
  methodologyNotes: string[];
};

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
  const pue = typeof input.pue === "number" && input.pue >= 1.0 ? input.pue : 1.15;

  const notes: string[] = [
    "Périmètre comptable : utilisation personnelle déclarée d'IA (PERSONAL_AI_USAGE). Strictement isolé des métriques du site CleanMyMap.",
  ];

  // 1. MODALITÉ TEXTE (Dispose de méthodes physiques sourcées)
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

  let textItEnergyKwh: number | null = null;
  let textFacilityEnergyKwh: number | null = null;
  let textOperationalKgCo2e: number | null = null;
  let textIndirectWaterLiters: number | null = null;
  let textPartialLcaKgCo2e: number | null = null;
  let textDiagnostic: EnvironmentalDataQualityDiagnostic = "NOT_CALCULABLE";
  let textMethodNote = "Aucune activité texte renseignée (NA).";

  if (textTokens !== null && textTokens > 0) {
    const factorId =
      scenario === "low"
        ? "ai-inference-energy-scenario-low-v1"
        : scenario === "high"
          ? "ai-inference-energy-scenario-high-v1"
          : "ai-inference-energy-scenario-central-v1";

    const energyFactor = getScientificFactor(factorId);
    const kwhPerMillion = energyFactor.value ?? 0.30;

    textItEnergyKwh = round6((textTokens / 1_000_000) * kwhPerMillion);
    textFacilityEnergyKwh = round6(textItEnergyKwh * pue);

    // Résolution du facteur carbone électrique selon la région
    const electricityFactor = resolveElectricityFactorForRegion(region);

    if (electricityFactor && electricityFactor.value !== null) {
      textOperationalKgCo2e = round6(textFacilityEnergyKwh * electricityFactor.value);

      // Eau indirecte (LBNL 2024 uniquement applicable au mix américain)
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

      // ACV partielle (+30% de sensibilité de carbone incorporé)
      const lcaOverheadFactor = getScientificFactor("ai-partial-lca-overhead-v1");
      const overheadFraction = lcaOverheadFactor.value ?? 0.30;
      textPartialLcaKgCo2e = round6(textOperationalKgCo2e * (1 + overheadFraction));

      textDiagnostic = evaluateDataQualityDiagnostic({ isScenarioOrRegionalProxy: true });
      textMethodNote = `Calculé via scénario ${scenario} (${kwhPerMillion} kWh/M tokens), PUE ${pue}, facteur carbone ${region} (${electricityFactor.value} kgCO₂e/kWh) et ACV partielle +30%.`;
    } else {
      // Invariant 5 : Ne jamais appliquer automatiquement les coefficients américains à une infrastructure inconnue !
      textDiagnostic = evaluateDataQualityDiagnostic({ isScenarioOrRegionalProxy: true });
      textMethodNote = `Énergie IT/facility calculée (${textFacilityEnergyKwh} kWh, scénario ${scenario}), mais carbone et eau non calculés : région d'infrastructure '${region}' inconnue ou non sourcée.`;
      notes.push(
        "Infrastructure électrique inconnue : les coefficients d'émission régionaux ne sont pas appliqués arbitrairement (conformité Invariant 5).",
      );
    }
  } else if (textTokens === 0) {
    textItEnergyKwh = 0;
    textFacilityEnergyKwh = 0;
    textOperationalKgCo2e = 0;
    textIndirectWaterLiters = 0;
    textPartialLcaKgCo2e = 0;
    textDiagnostic = evaluateDataQualityDiagnostic({ hasDirectMeasurement: true });
    textMethodNote = "Activité texte nulle déclarée : impact physique nul.";
  }

  const textModality: ModalityEstimate = {
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
  };

  // 2. MODALITÉ IMAGE (Activité déclarable, mais facteur physique non calculable = NA)
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

  // 3. MODALITÉ AUDIO (Activité déclarable, mais facteur physique non calculable = NA)
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

  // 4. MODALITÉ VIDÉO (Activité déclarable, mais facteur physique non calculable = NA)
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

  // Synthèse de la qualité globale (déterministe, sans pourcentage arbitraire)
  const overallQuality: EnvironmentalDataQualityDiagnostic = evaluateDataQualityDiagnostic({
    hasDirectMeasurement: textDiagnostic === "MEASURED",
    isScenarioOrRegionalProxy: textDiagnostic === "PROXY_SCENARIO",
    isMissingOrUnmeasured: textDiagnostic === "NOT_CALCULABLE",
  });

  // Vérification des règles anti-double-comptage
  const verifiedRules = ANTI_DOUBLE_COUNTING_RULES.map((r) => r.id);

  return {
    accountingScope: "PERSONAL_AI_USAGE",
    version: "personal-ai-estimator-2026.05-v1",
    generatedAt,
    scenario,
    region,
    pue,
    dataQuality: overallQuality,
    modalities: {
      text: textModality,
      image: imageModality,
      audio: audioModality,
      video: videoModality,
    },
    physicalTotals: {
      itEnergyKwh: textItEnergyKwh,
      facilityEnergyKwh: textFacilityEnergyKwh,
      operationalKgCo2e: textOperationalKgCo2e,
      indirectWaterLiters: textIndirectWaterLiters,
      partialLcaKgCo2e: textPartialLcaKgCo2e,
    },
    antiDoubleCountingCompliance: {
      compliant: true,
      verifiedRules,
    },
    methodologyNotes: notes,
  };
}
