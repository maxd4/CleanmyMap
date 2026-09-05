import type {
  CleaningSurfaceClass,
  MunicipalCleaningServiceabilityZone,
} from "./municipal-cleaning-serviceability-contract";
import {
  VOLUNTEER_ADDITIONALITY_MODEL_VERSION,
  type MunicipalInterventionSignal,
  type SignalAudit,
  type VolunteerAdditionalityInput,
  type VolunteerAdditionalityResult,
  type VolunteerSafetyAssessment,
} from "./volunteer-additionality-contract";

export const VOLUNTEER_ADDITIONALITY_MODEL_CONFIG = {
  modelVersion: VOLUNTEER_ADDITIONALITY_MODEL_VERSION,
  weights: {
    need: {
      pollutionRisk: 0.65,
      historicalCleanliness: 0.35,
    },
    coverageGap: {
      documentedCoverage: 0.65,
      mechanizedAccessibilityGap: 0.15,
      manualIntervention: 0.12,
      surfaceComplexity: 0.08,
    },
  },
  normalization: {
    maximumDocumentedVisitsPerWeek: 14,
  },
  intervention: {
    maximumPenalty: 0.85,
  },
  confidence: {
    neutral: 0.5,
    levelThresholds: { medium: 0.4, high: 0.75 },
  },
  surfaceComplexity: {
    standard_sidewalk: 0,
    pedestrian_area: 0.3,
    stairs: 0.85,
    tree_surround: 0.55,
    planter_edge: 0.55,
    street_furniture_cluster: 0.65,
    barrier_edge: 0.75,
    bridge_or_footbridge: 0.45,
    underpass: 0.7,
    embankment: 0.8,
    other_complex_public_space: 0.55,
  } satisfies Record<CleaningSurfaceClass, number>,
} as const;

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function finiteOrNull(value: number | null | undefined): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function round(value: number, digits = 3): number {
  return Number(value.toFixed(digits));
}

function confidenceLimited(value: number | null, confidence: number): number {
  if (value === null) return VOLUNTEER_ADDITIONALITY_MODEL_CONFIG.confidence.neutral;
  const boundedConfidence = clamp01(confidence);
  return round(
    VOLUNTEER_ADDITIONALITY_MODEL_CONFIG.confidence.neutral +
      (clamp01(value) - VOLUNTEER_ADDITIONALITY_MODEL_CONFIG.confidence.neutral) *
        boundedConfidence,
  );
}

function average(values: number[]): number | null {
  return values.length === 0
    ? null
    : values.reduce((sum, value) => sum + value, 0) / values.length;
}

function weightedAvailable(
  values: Array<{ value: number | null; confidence: number; weight: number }>,
): { raw: number | null; confidence: number } {
  const available = values.filter((item) => item.value !== null);
  const totalWeight = available.reduce((sum, item) => sum + item.weight, 0);
  if (totalWeight === 0) return { raw: null, confidence: 0 };
  return {
    raw: available.reduce((sum, item) => sum + item.value! * item.weight, 0) / totalWeight,
    confidence: available.reduce(
      (sum, item) => sum + item.confidence * item.weight,
      0,
    ) / totalWeight,
  };
}

function audit(
  value: number | null,
  confidence: number,
  evidenceKind: SignalAudit["evidenceKind"],
): SignalAudit {
  return {
    value: value === null ? null : round(value),
    normalized: value === null ? null : round(clamp01(value)),
    confidence: round(clamp01(confidence)),
    evidenceKind,
    available: value !== null,
  };
}

function contributionAudit(
  contributions: VolunteerAdditionalityInput["risk"]["waste"]["contributions"],
  keys: string[],
  evidenceKind: SignalAudit["evidenceKind"],
): SignalAudit {
  const matches = contributions.filter((item) => keys.includes(item.key) && item.available);
  if (matches.length === 0) return audit(null, 0, "unknown");
  const value = average(matches.map((item) => item.normalized!));
  const confidence = average(matches.map((item) => item.sourceReliability)) ?? 0;
  return audit(value, confidence, evidenceKind);
}

function pollutionNeed(input: VolunteerAdditionalityInput): VolunteerAdditionalityResult["pollutionRisk"] {
  const wasteConfidence = input.risk.confidence.waste.score;
  const cigaretteConfidence = input.risk.confidence.cigaretteButts.score;
  const risk = weightedAvailable([
    { value: input.risk.wasteRisk / 100, confidence: wasteConfidence, weight: 0.55 },
    { value: input.risk.cigaretteButtRisk / 100, confidence: cigaretteConfidence, weight: 0.45 },
  ]);
  const events = contributionAudit(
    [...input.risk.waste.contributions, ...input.risk.cigaretteButts.contributions],
    ["eventPressure"],
    "recent_event",
  );
  const observedReports = contributionAudit(
    [...input.risk.waste.contributions, ...input.risk.cigaretteButts.contributions],
    ["validatedWastePressure", "validatedCigarettePressure"],
    "observed_report",
  );
  const predictedSignals = contributionAudit(
    [...input.risk.waste.contributions, ...input.risk.cigaretteButts.contributions],
    [
      "residentialPressure",
      "transportPressure",
      "stationPressure",
      "tourismPressure",
      "publicPlacesPressure",
      "terracePressure",
      "marketPressure",
    ],
    "prediction",
  );
  return {
    value: confidenceLimited(risk.raw, risk.confidence),
    wasteRisk: round(input.risk.wasteRisk, 2),
    cigaretteButtRisk: round(input.risk.cigaretteButtRisk, 2),
    confidence: round(risk.confidence),
    recentEvents: events,
    observedReports,
    predictedSignals,
  };
}

function cleanlinessFactor(
  input: VolunteerAdditionalityInput,
): VolunteerAdditionalityResult["historicalCleanliness"] {
  const prior = finiteOrNull(input.zone.signals.cleanlinessPrior.normalized);
  const correction = input.risk.waste.cleanlinessCorrection;
  const cigaretteCorrection = input.risk.cigaretteButts.cleanlinessCorrection;
  const confidence = Math.max(
    correction.sourceReliability,
    cigaretteCorrection.sourceReliability,
  );
  const effective = confidenceLimited(prior, confidence);
  return {
    raw: prior,
    effective,
    confidence: round(confidence),
    influence: VOLUNTEER_ADDITIONALITY_MODEL_CONFIG.weights.need.historicalCleanliness,
    normalizedPressure: prior,
    resolution: input.zone.signals.cleanlinessPrior.resolution ?? "unknown",
    note:
      prior === null
        ? "Propreté historique indisponible : facteur maintenu à une valeur neutre."
        : "Prior de propreté interprété comme pression d'anomalie ; confiance appliquée.",
  };
}

function directCoverage(
  serviceability: MunicipalCleaningServiceabilityZone | null,
): { value: number | null; confidence: number; frequency: VolunteerAdditionalityResult["municipalCleaning"]["documentedFrequency"] } {
  if (!serviceability) {
    return { value: null, confidence: 0, frequency: { visitsPerWeek: null, normalized: null, confidence: 0 } };
  }
  const direct = finiteOrNull(serviceability.municipalCleaningServiceLevel);
  const directConfidence = serviceability.municipalCleaningServiceLevelEvidence.confidence;
  const frequency = serviceability.documentedCleaningFrequency;
  const frequencyValue = frequency
    ? clamp01(frequency.visitsPerWeek / VOLUNTEER_ADDITIONALITY_MODEL_CONFIG.normalization.maximumDocumentedVisitsPerWeek)
    : null;
  const frequencyConfidence = frequency
    ? serviceability.serviceabilityConfidence.signalConfidence.municipalCleaningServiceLevel.confidence
    : 0;
  const chosen = direct !== null
    ? { value: direct / 100, confidence: directConfidence }
    : { value: frequencyValue, confidence: frequencyConfidence };
  return {
    value: chosen.value,
    confidence: chosen.confidence,
    frequency: {
      visitsPerWeek: frequency?.visitsPerWeek ?? null,
      normalized: frequencyValue,
      confidence: frequencyConfidence,
    },
  };
}

function surfaceComplexity(
  serviceability: MunicipalCleaningServiceabilityZone | null,
): { value: number | null; confidence: number } {
  const classes = serviceability?.surfaceClasses ?? [];
  if (classes.length === 0) return { value: null, confidence: 0 };
  const totalShare = classes.reduce((sum, item) => sum + item.share, 0);
  if (totalShare <= 0) return { value: null, confidence: 0 };
  const value = classes.reduce(
    (sum, item) =>
      sum +
      (item.share / totalShare) *
        VOLUNTEER_ADDITIONALITY_MODEL_CONFIG.surfaceComplexity[item.surfaceClass],
    0,
  );
  return {
    value: clamp01(value),
    confidence: serviceability?.geometryServiceabilityProxyEvidence.confidence ?? 0,
  };
}

function municipalFactor(
  input: VolunteerAdditionalityInput,
): VolunteerAdditionalityResult["municipalCleaning"] {
  const serviceability = input.municipalCleaning;
  const direct = directCoverage(serviceability);
  const documentedCoverage = audit(
    direct.value,
    direct.confidence,
    direct.value === null ? "unknown" : "documented",
  );
  const mechanizedValue = serviceability?.mechanizedCleaningAccessibility == null
    ? null
    : 1 - clamp01(serviceability.mechanizedCleaningAccessibility / 100);
  const mechanizedConfidence = serviceability?.serviceabilityConfidence.signalConfidence.mechanizedCleaningAccessibility.confidence ?? 0;
  const mechanizedAccessibility = audit(
    mechanizedValue,
    mechanizedConfidence,
    mechanizedValue === null ? "unknown" : serviceability?.mechanizedAccessibilityBasis === "source_documented" ? "documented" : "inference",
  );
  const manualValue = serviceability?.manualCleaningLikely.value === true
    ? 0.8
    : serviceability?.manualCleaningLikely.value === false
      ? 0.2
      : null;
  const manualConfidence = serviceability?.manualCleaningLikely.evidence.confidence ?? 0;
  const manualIntervention = audit(
    manualValue,
    manualConfidence,
    manualValue === null ? "unknown" : serviceability?.manualCleaningLikely.basis === "documented" ? "documented" : "inference",
  );
  const complexity = surfaceComplexity(serviceability);
  const surfaceComplexityAudit = audit(
    complexity.value,
    complexity.confidence,
    complexity.value === null ? "unknown" : "inference",
  );
  const lowCoverage = weightedAvailable([
    { value: direct.value === null ? null : 1 - direct.value, confidence: direct.confidence, weight: VOLUNTEER_ADDITIONALITY_MODEL_CONFIG.weights.coverageGap.documentedCoverage },
    { value: mechanizedValue, confidence: mechanizedConfidence, weight: VOLUNTEER_ADDITIONALITY_MODEL_CONFIG.weights.coverageGap.mechanizedAccessibilityGap },
    { value: manualValue, confidence: manualConfidence, weight: VOLUNTEER_ADDITIONALITY_MODEL_CONFIG.weights.coverageGap.manualIntervention },
    { value: complexity.value, confidence: complexity.confidence, weight: VOLUNTEER_ADDITIONALITY_MODEL_CONFIG.weights.coverageGap.surfaceComplexity },
  ]);
  const intervention = strongestIntervention(input.municipalInterventions ?? []);
  return {
    lowRelativeCoverage: {
      raw: lowCoverage.raw,
      effective: confidenceLimited(lowCoverage.raw, lowCoverage.confidence),
      confidence: round(lowCoverage.confidence),
      influence: 1,
      note:
        direct.value === null
          ? "Aucune couverture municipale documentée : les proxys restent limités par leur confiance."
          : "La couverture/fréquence municipale documentée prévaut sur les proxys géométriques.",
    },
    documentedCoverage,
    documentedFrequency: direct.frequency,
    mechanizedAccessibility,
    manualIntervention,
    surfaceComplexity: surfaceComplexityAudit,
    scheduledInterventionMultiplier: intervention.multiplier,
    scheduledInterventionPenalty: intervention.penalty,
  };
}

function strongestIntervention(
  interventions: readonly MunicipalInterventionSignal[],
): { multiplier: number; penalty: number } {
  const strongest = interventions
    .map((signal) => clamp01(signal.strength) * clamp01(signal.confidence))
    .reduce((max, value) => Math.max(max, value), 0);
  const penalty = round(strongest * VOLUNTEER_ADDITIONALITY_MODEL_CONFIG.intervention.maximumPenalty);
  return { multiplier: round(1 - penalty), penalty };
}

function safetyFactor(
  safety: VolunteerSafetyAssessment,
): VolunteerAdditionalityResult["volunteerSuitability"] {
  const exclusionReasons = [...new Set(safety.exclusionReasons ?? [])].sort();
  const safe = safety.status === "safe" && exclusionReasons.length === 0;
  return {
    value: safe ? clamp01(safety.suitability ?? 0) : 0,
    confidence: round(clamp01(safety.confidence)),
    status: safety.status,
    exclusionReasons,
  };
}

function pollutionLabels(
  pollution: VolunteerAdditionalityResult["pollutionRisk"],
): string[] {
  const labels: string[] = [];
  if (pollution.wasteRisk >= 60) labels.push("forte probabilité de déchets");
  if (pollution.cigaretteButtRisk >= 60) labels.push("forte probabilité de mégots");
  if (pollution.recentEvents.available) labels.push("événement récent documenté");
  if (pollution.observedReports.available) labels.push("signalement réellement observé");
  return labels;
}

export function calculateVolunteerAdditionality(
  input: VolunteerAdditionalityInput,
): VolunteerAdditionalityResult {
  const pollution = pollutionNeed(input);
  const cleanliness = cleanlinessFactor(input);
  const municipal = municipalFactor(input);
  const suitability = safetyFactor(input.volunteerSafety);
  const need = round(
    pollution.value * VOLUNTEER_ADDITIONALITY_MODEL_CONFIG.weights.need.pollutionRisk +
      cleanliness.effective * VOLUNTEER_ADDITIONALITY_MODEL_CONFIG.weights.need.historicalCleanliness,
  );
  const eligible = suitability.value > 0;
  const finalScore = eligible
    ? round(
        100 *
          need *
          municipal.lowRelativeCoverage.effective *
          suitability.value *
          municipal.scheduledInterventionMultiplier,
        2,
      )
    : 0;
  const confidence = {
    pollution: pollution.confidence,
    cleanliness: cleanliness.confidence,
    municipalCleaning: municipal.lowRelativeCoverage.confidence,
    volunteerSuitability: suitability.confidence,
    overall: round(
      Math.min(
        pollution.confidence,
        cleanliness.confidence,
        municipal.lowRelativeCoverage.confidence,
        suitability.confidence,
      ),
    ),
  };
  const bonuses = [
    ...pollutionLabels(pollution),
    municipal.surfaceComplexity.available && municipal.surfaceComplexity.normalized! >= 0.55
      ? "surface géométriquement complexe : influence limitée et documentée"
      : null,
  ].filter((value): value is string => value !== null);
  const maluses = [
    municipal.scheduledInterventionPenalty > 0
      ? "intervention municipale forte ou imminente détectée"
      : null,
    !municipal.documentedCoverage.available
      ? "couverture municipale non documentée : facteur ramené vers le neutre"
      : null,
    !eligible ? "ciblage bénévole exclu par la doctrine de sécurité" : null,
  ].filter((value): value is string => value !== null);
  const explanation = !eligible
    ? "Ciblage bénévole exclu : l'aptitude de la zone n'est pas compatible avec la doctrine de sécurité."
    : `Priorité bénévole ${finalScore >= 60 ? "élevée" : finalScore >= 30 ? "modérée" : "limitée"} : ${[
        ...pollutionLabels(pollution),
        cleanliness.effective >= 0.6 ? "pression de propreté historique" : null,
        municipal.lowRelativeCoverage.effective >= 0.6 ? "couverture relative limitée ou nettoyage mécanisé difficile" : null,
        "zone piétonne déclarée sûre",
      ].filter((value): value is string => value !== null).join(", ") || "signaux disponibles limités"}.`;
  return {
    modelVersion: VOLUNTEER_ADDITIONALITY_MODEL_VERSION,
    volunteerAdditionality: Math.min(100, Math.max(0, finalScore)),
    eligible,
    pollutionRisk: pollution,
    historicalCleanliness: cleanliness,
    municipalCleaning: municipal,
    volunteerSuitability: suitability,
    confidence,
    adjustments: { bonuses, maluses },
    explanation,
  };
}
