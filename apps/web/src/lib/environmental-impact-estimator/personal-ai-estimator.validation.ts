type TextUsageInput = {
  totalTokens?: number | null;
  inputTokens?: number | null;
  outputTokens?: number | null;
  cachedTokens?: number | null;
  reasoningTokensIncluded?: number | null;
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

function validateTextUsageCoherence(text: TextUsageInput): void {
  assertNonNegativeInteger(text.totalTokens, "textUsage.totalTokens");
  assertNonNegativeInteger(text.inputTokens, "textUsage.inputTokens");
  assertNonNegativeInteger(text.outputTokens, "textUsage.outputTokens");
  assertNonNegativeInteger(text.cachedTokens, "textUsage.cachedTokens");
  assertNonNegativeInteger(text.reasoningTokensIncluded, "textUsage.reasoningTokensIncluded");

  if (text.cachedTokens != null) {
    if (text.inputTokens != null && text.cachedTokens > text.inputTokens) throw new Error("Déclaration incohérente : cachedTokens ne peut pas dépasser inputTokens.");
    if (text.inputTokens == null && text.totalTokens != null && text.cachedTokens > text.totalTokens) throw new Error("Déclaration incohérente : cachedTokens ne peut pas dépasser totalTokens.");
  }
  if (text.reasoningTokensIncluded != null) {
    if (text.outputTokens == null && text.reasoningTokensIncluded > 0) throw new Error("Déclaration incohérente : reasoningTokensIncluded requiert outputTokens.");
    if (text.outputTokens != null && text.reasoningTokensIncluded > text.outputTokens) throw new Error("Déclaration incohérente : reasoningTokensIncluded ne peut pas dépasser outputTokens.");
  }
  if (text.totalTokens != null) {
    if (text.inputTokens != null && text.outputTokens != null && text.totalTokens !== text.inputTokens + text.outputTokens) throw new Error("Déclaration incohérente : totalTokens doit égaler inputTokens + outputTokens.");
    if (text.inputTokens != null && text.totalTokens < text.inputTokens) throw new Error("Déclaration incohérente : inputTokens ne peut pas dépasser totalTokens.");
    if (text.outputTokens != null && text.totalTokens < text.outputTokens) throw new Error("Déclaration incohérente : outputTokens ne peut pas dépasser totalTokens.");
  }
}

export function validatePersonalAiInput(input: ValidationInput): void {
  if (input.pue != null && (typeof input.pue !== "number" || !Number.isFinite(input.pue) || input.pue < 1 || input.pue > MAX_REASONABLE_PUE)) {
    throw new Error(`Entrée invalide pour 'pue' : une valeur finie comprise entre 1.0 et ${MAX_REASONABLE_PUE} est attendue.`);
  }
  if (input.textUsage) validateTextUsageCoherence(input.textUsage);
  assertNonNegativeInteger(input.imageUsage?.imageCount, "imageUsage.imageCount");
  assertNonNegativeFinite(input.audioUsage?.durationMinutes, "audioUsage.durationMinutes");
  assertNonNegativeInteger(input.audioUsage?.requestCount, "audioUsage.requestCount");
  assertNonNegativeFinite(input.videoUsage?.durationSeconds, "videoUsage.durationSeconds");
  assertNonNegativeInteger(input.videoUsage?.generationCount, "videoUsage.generationCount");
  assertNonNegativeInteger(input.requestCount, "requestCount");
  assertNonNegativeFinite(input.measuredDurationSeconds, "measuredDurationSeconds");
  assertNonNegativeFinite(input.measuredEnergyKwh, "measuredEnergyKwh");
  assertNonNegativeFinite(input.datacenterWue, "datacenterWue");
  assertNonNegativeFinite(input.ttftSeconds, "ttftSeconds");
  assertNonNegativeFinite(input.marketBasedDeclaration?.claimedKgCo2ePerKwh, "marketBasedDeclaration.claimedKgCo2ePerKwh");
  if (input.tps != null && (typeof input.tps !== "number" || !Number.isFinite(input.tps) || input.tps <= 0)) throw new Error("Entrée invalide pour 'tps' : un nombre fini > 0 est attendu.");
  if (input.batchSize != null && (typeof input.batchSize !== "number" || !Number.isFinite(input.batchSize) || !Number.isInteger(input.batchSize) || input.batchSize < 1)) throw new Error("Entrée invalide pour 'batchSize' : un entier >= 1 est attendu.");
  const text = input.textUsage;
  const declaredTokens = text?.totalTokens ?? (text?.inputTokens ?? 0) + (text?.outputTokens ?? 0);
  const hasPositiveActivity = declaredTokens > 0 || (input.measuredEnergyKwh ?? 0) > 0 || (input.measuredDurationSeconds ?? 0) > 0;
  if (input.requestCount === 0 && hasPositiveActivity) throw new Error("Déclaration incohérente : requestCount ne peut pas être 0 lorsqu'une activité non nulle est déclarée.");
  if (input.measuredDurationSeconds === 0 && declaredTokens > 0) throw new Error("Déclaration incohérente : measuredDurationSeconds ne peut pas être 0 lorsqu'une activité de tokens non nulle est déclarée.");
}
