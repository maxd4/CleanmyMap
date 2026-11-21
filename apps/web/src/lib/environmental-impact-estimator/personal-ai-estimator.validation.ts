import type { EcologitsUsageGranularity } from "./ecologits-adapter";

type TextUsageInput = {
  totalTokens?: number | null;
  inputTokens?: number | null;
  outputTokens?: number | null;
  cachedTokens?: number | null;
  reasoningTokensIncluded?: number | null;
  granularity?: EcologitsUsageGranularity;
};
type ValidationInput = {
  pue?: number | null;
  textUsage?: TextUsageInput;
  imageUsage?: { imageCount?: number | null };
  audioUsage?: { durationMinutes?: number | null; requestCount?: number | null };
  videoUsage?: { durationSeconds?: number | null; generationCount?: number | null };
  requestCount?: number | null;
  measuredDurationSeconds?: number | null;
  measuredEnergyKwh?: number | null;
  energyMeasurement?: { kwh: number; boundary: "IT_FULL" | "FACILITY" | "LOCAL_WALL"; evidence: "MEASURED" | "DECLARED" | "ASSUMPTION" };
  localPower?: { watts: number; durationSeconds: number; idleWatts?: number };
  electricityFactorId?: string;
  datacenterWue?: number | null;
  ttftSeconds?: number | null;
  marketBasedDeclaration?: { claimedKgCo2ePerKwh?: number | null };
  tps?: number | null;
  batchSize?: number | null;
};

const MAX_REASONABLE_PUE = 5;

function assertNonNegativeFinite(value: number | null | undefined, fieldName: string): void {
  if (value == null) return;
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    throw new Error(`Entrée invalide pour '${fieldName}' : un nombre fini >= 0 est attendu.`);
  }
}

function assertNonNegativeInteger(value: number | null | undefined, fieldName: string): void {
  assertNonNegativeFinite(value, fieldName);
  if (value != null && !Number.isInteger(value)) {
    throw new Error(`Entrée invalide pour '${fieldName}' : un entier >= 0 est attendu.`);
  }
}

function normalizeTextUsage(text: TextUsageInput): TextUsageInput {
  const normalized = { ...text };
  if (normalized.granularity != null && !["PER_REQUEST", "AGGREGATE", "UNKNOWN"].includes(normalized.granularity)) {
    throw new Error("Entrée invalide pour 'textUsage.granularity'.");
  }
  if (typeof normalized.totalTokens === "number") {
    if (typeof normalized.inputTokens === "number" && normalized.outputTokens == null) {
      normalized.outputTokens = normalized.totalTokens - normalized.inputTokens;
    } else if (typeof normalized.outputTokens === "number" && normalized.inputTokens == null) {
      normalized.inputTokens = normalized.totalTokens - normalized.outputTokens;
    }
  }
  return normalized;
}

function validateTextUsageCoherence(text: TextUsageInput): TextUsageInput {
  assertNonNegativeInteger(text.totalTokens, "textUsage.totalTokens");
  assertNonNegativeInteger(text.inputTokens, "textUsage.inputTokens");
  assertNonNegativeInteger(text.outputTokens, "textUsage.outputTokens");
  assertNonNegativeInteger(text.cachedTokens, "textUsage.cachedTokens");
  assertNonNegativeInteger(text.reasoningTokensIncluded, "textUsage.reasoningTokensIncluded");

  const normalized = normalizeTextUsage(text);
  assertNonNegativeInteger(normalized.inputTokens, "textUsage.inputTokens");
  assertNonNegativeInteger(normalized.outputTokens, "textUsage.outputTokens");

  if (normalized.cachedTokens != null) {
    if (normalized.inputTokens != null && normalized.cachedTokens > normalized.inputTokens) throw new Error("Déclaration incohérente : cachedTokens ne peut pas dépasser inputTokens.");
    if (normalized.inputTokens == null && normalized.totalTokens != null && normalized.cachedTokens > normalized.totalTokens) throw new Error("Déclaration incohérente : cachedTokens ne peut pas dépasser totalTokens.");
  }
  if (normalized.reasoningTokensIncluded != null) {
    if (normalized.outputTokens == null && normalized.reasoningTokensIncluded > 0) throw new Error("Déclaration incohérente : reasoningTokensIncluded requiert outputTokens.");
    if (normalized.outputTokens != null && normalized.reasoningTokensIncluded > normalized.outputTokens) throw new Error("Déclaration incohérente : reasoningTokensIncluded ne peut pas dépasser outputTokens.");
  }
  if (normalized.totalTokens != null) {
    if (normalized.inputTokens != null && normalized.outputTokens != null && normalized.totalTokens !== normalized.inputTokens + normalized.outputTokens) throw new Error("Déclaration incohérente : totalTokens doit égaler inputTokens + outputTokens.");
    if (normalized.inputTokens != null && normalized.totalTokens < normalized.inputTokens) throw new Error("Déclaration incohérente : inputTokens ne peut pas dépasser totalTokens.");
    if (normalized.outputTokens != null && normalized.totalTokens < normalized.outputTokens) throw new Error("Déclaration incohérente : outputTokens ne peut pas dépasser totalTokens.");
  }
  return normalized;
}

export function validatePersonalAiInput<T extends ValidationInput>(input: T): T {
  if (input.pue != null && (typeof input.pue !== "number" || !Number.isFinite(input.pue) || input.pue < 1 || input.pue > MAX_REASONABLE_PUE)) {
    throw new Error(`Entrée invalide pour 'pue' : une valeur finie comprise entre 1.0 et ${MAX_REASONABLE_PUE} est attendue.`);
  }
  const normalizedInput = input.textUsage
    ? { ...input, textUsage: validateTextUsageCoherence(input.textUsage) }
    : input;
  assertNonNegativeInteger(input.imageUsage?.imageCount, "imageUsage.imageCount");
  assertNonNegativeFinite(input.audioUsage?.durationMinutes, "audioUsage.durationMinutes");
  assertNonNegativeInteger(input.audioUsage?.requestCount, "audioUsage.requestCount");
  assertNonNegativeFinite(input.videoUsage?.durationSeconds, "videoUsage.durationSeconds");
  assertNonNegativeInteger(input.videoUsage?.generationCount, "videoUsage.generationCount");
  assertNonNegativeInteger(input.requestCount, "requestCount");
  assertNonNegativeFinite(input.measuredDurationSeconds, "measuredDurationSeconds");
  assertNonNegativeFinite(input.measuredEnergyKwh, "measuredEnergyKwh");
  assertNonNegativeFinite(input.energyMeasurement?.kwh, "energyMeasurement.kwh");
  assertNonNegativeFinite(input.localPower?.watts, "localPower.watts");
  assertNonNegativeFinite(input.localPower?.durationSeconds, "localPower.durationSeconds");
  assertNonNegativeFinite(input.localPower?.idleWatts, "localPower.idleWatts");
  if (input.energyMeasurement && (input.measuredEnergyKwh != null || input.localPower)) throw new Error("Une seule origine énergétique peut être déclarée.");
  if (input.localPower && input.measuredEnergyKwh != null) throw new Error("Une seule origine énergétique peut être déclarée.");
  assertNonNegativeFinite(input.datacenterWue, "datacenterWue");
  assertNonNegativeFinite(input.ttftSeconds, "ttftSeconds");
  assertNonNegativeFinite(input.marketBasedDeclaration?.claimedKgCo2ePerKwh, "marketBasedDeclaration.claimedKgCo2ePerKwh");
  if (input.tps != null && (typeof input.tps !== "number" || !Number.isFinite(input.tps) || input.tps <= 0)) throw new Error("Entrée invalide pour 'tps' : un nombre fini > 0 est attendu.");
  if (input.batchSize != null && (typeof input.batchSize !== "number" || !Number.isFinite(input.batchSize) || !Number.isInteger(input.batchSize) || input.batchSize < 1)) throw new Error("Entrée invalide pour 'batchSize' : un entier >= 1 est attendu.");
  const text = normalizedInput.textUsage;
  const declaredTokens = text?.totalTokens ?? (text?.inputTokens ?? 0) + (text?.outputTokens ?? 0);
  const hasPositiveActivity = declaredTokens > 0 || (input.measuredEnergyKwh ?? 0) > 0 || (input.energyMeasurement?.kwh ?? 0) > 0 || (input.localPower?.watts ?? 0) > 0 || (input.measuredDurationSeconds ?? 0) > 0;
  if (input.requestCount === 0 && hasPositiveActivity) throw new Error("Déclaration incohérente : requestCount ne peut pas être 0 lorsqu'une activité non nulle est déclarée.");
  if (input.measuredDurationSeconds === 0 && declaredTokens > 0) throw new Error("Déclaration incohérente : measuredDurationSeconds ne peut pas être 0 lorsqu'une activité de tokens non nulle est déclarée.");
  return normalizedInput;
}
