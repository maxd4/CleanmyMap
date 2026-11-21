import { findAiModel } from "./model-catalog";
import type { PersonalAiFootprintInput } from "./personal-ai-estimator";
import { isCountryCode } from "../user-location-preference";

export const PERSONAL_AI_DECLARATION_VERSION = "personal-ai-declaration-v1";

export type PersonalAiDeclarationDraft = {
  provider: "MANUAL" | "OPENAI" | "ANTHROPIC" | "GOOGLE" | "MISTRAL" | "OTHER";
  source: "MANUAL" | "PROVIDER_EXPORT" | "PROVIDER_DASHBOARD" | "LOCAL_LOG";
  sourceVersion: string | null;
  provenance: "USER_DECLARED" | "PROVIDER_REPORTED" | "DEVICE_MEASURED";
  granularity: "PER_REQUEST" | "AGGREGATE" | "UNKNOWN";
  periodStartUtc: string;
  periodEndUtc: string;
  modelRaw: string | null;
  modelCanonical: string | null;
  operator: string | null;
  execution: "CLOUD" | "LOCAL";
  inferenceRegion: string | null;
  access: "API" | "SUBSCRIPTION" | "LOCAL_OWNED";
  requestCount: number | null;
  tokens: {
    inputTotal: number | null;
    inputUncached: number | null;
    cacheRead: number | null;
    cacheWrite: number | null;
    outputVisible: number | null;
    outputReasoning: number | null;
    outputTotal: number | null;
    reasoningRelation: "INCLUDED" | "ADDITIONAL" | "UNKNOWN";
  };
  modality: {
    images: number | null;
    audioMinutes: number | null;
    videoSeconds: number | null;
  };
  energy: {
    kwh: number | null;
    boundary: "IT_FULL" | "FACILITY" | "LOCAL_WALL" | null;
    evidence: "MEASURED" | "DECLARED" | "ASSUMPTION" | null;
    averageWatts: number | null;
    durationSeconds: number | null;
    idleWatts: number | null;
  };
};

export type PersonalAiNormalizedDeclaration = PersonalAiDeclarationDraft & {
  normalizationVersion: typeof PERSONAL_AI_DECLARATION_VERSION;
  tokens: PersonalAiDeclarationDraft["tokens"] & { inputTotal: number | null; outputTotal: number | null; logicalTotal: number | null };
};

const SAFE_MAX = Number.MAX_SAFE_INTEGER;
const ID_PATTERN = /^(?!.*\/\/)[a-z0-9][a-z0-9._\/-]{0,79}$/i;

function assertCount(value: number | null, field: string): void {
  if (value !== null && (!Number.isSafeInteger(value) || value < 0 || value > SAFE_MAX)) {
    throw new Error(`${field}: entier sûr non négatif requis`);
  }
}

function assertMeasure(value: number | null, field: string): void {
  if (value !== null && (!Number.isFinite(value) || value < 0)) throw new Error(`${field}: nombre fini non négatif requis`);
}

function assertText(value: string | null, field: string, max = 160): void {
  if (value !== null && (value.trim() !== value || value.length > max || /[\u0000-\u001f\u007f]/.test(value))) {
    throw new Error(`${field}: texte invalide`);
  }
}

function assertShortLabel(value: string | null, field: string): void {
  const labelPattern = /^[A-Za-z0-9][A-Za-z0-9._+/-]*(?: [A-Za-z0-9][A-Za-z0-9._+/-]*){0,4}$/;
  const accountLike = /^(?:sk|key|acct|account|org|proj)[-_]?[a-z0-9_-]{8,}$/i.test(value ?? "")
    || /^\d{8,}$/.test(value ?? "")
    || /^[a-f0-9]{8}-[a-f0-9-]{27,}$/i.test(value ?? "");
  if (value !== null && (value.length > 80 || !labelPattern.test(value) || accountLike)) {
    throw new Error(`${field}: libellé court requis, sans URL ni identifiant de compte`);
  }
}

function assertInferenceRegion(value: string | null): void {
  if (value === null || value === "UNKNOWN" || isCountryCode(value)) return;
  throw new Error("inferenceRegion doit être null, UNKNOWN ou un code ISO 3166-1 alpha-2 valide");
}

function parseUtc(value: string, field: string): number {
  if (value.length > 30 || !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{1,3})?Z$/.test(value)) throw new Error(`${field}: date UTC ISO requise`);
  const time = Date.parse(value);
  const canonical = new Date(time).toISOString().replace(/(\.\d*?)0+Z$/, "$1Z").replace(/\.Z$/, "Z");
  const normalized = value.replace(/(\.\d*?)0+Z$/, "$1Z").replace(/\.Z$/, "Z");
  if (!Number.isFinite(time) || canonical !== normalized) {
    throw new Error(`${field}: date UTC invalide`);
  }
  return time;
}

function sumIfComplete(values: Array<number | null>): number | null {
  if (values.some((value) => value === null)) return null;
  const result = (values as number[]).reduce((total, value) => total + value, 0);
  if (!Number.isSafeInteger(result)) throw new Error("Total de tokens supérieur à la précision sûre");
  return result;
}

export function normalizePersonalAiDeclaration(draft: PersonalAiDeclarationDraft): PersonalAiNormalizedDeclaration {
  const start = parseUtc(draft.periodStartUtc, "periodStartUtc");
  const end = parseUtc(draft.periodEndUtc, "periodEndUtc");
  if (start >= end) throw new Error("La période UTC doit respecter [début, fin[");

  assertText(draft.sourceVersion, "sourceVersion", 80);
  assertShortLabel(draft.modelRaw, "modelRaw");
  assertShortLabel(draft.operator, "operator");
  assertInferenceRegion(draft.inferenceRegion);
  const canonicalModel = draft.modelCanonical === null ? null : findAiModel(draft.modelCanonical);
  if (draft.modelCanonical !== null && (!ID_PATTERN.test(draft.modelCanonical) || !canonicalModel)) {
    throw new Error("modelCanonical doit référencer un modèle du catalogue scientifique");
  }

  for (const [field, value] of Object.entries(draft.tokens)) {
    if (field !== "reasoningRelation") assertCount(value as number | null, `tokens.${field}`);
  }
  assertCount(draft.requestCount, "requestCount");
  assertCount(draft.modality.images, "modality.images");
  assertMeasure(draft.modality.audioMinutes, "modality.audioMinutes");
  assertMeasure(draft.modality.videoSeconds, "modality.videoSeconds");
  assertMeasure(draft.energy.kwh, "energy.kwh");
  assertMeasure(draft.energy.averageWatts, "energy.averageWatts");
  assertMeasure(draft.energy.durationSeconds, "energy.durationSeconds");
  assertMeasure(draft.energy.idleWatts, "energy.idleWatts");

  const cacheParts = sumIfComplete([draft.tokens.inputUncached, draft.tokens.cacheRead, draft.tokens.cacheWrite]);
  let inputTotal = draft.tokens.inputTotal;
  if (cacheParts !== null) {
    if (inputTotal !== null && inputTotal !== cacheParts) throw new Error("La ventilation entrée ne correspond pas au total déclaré");
    inputTotal ??= cacheParts;
  }
  if (inputTotal !== null && [draft.tokens.inputUncached, draft.tokens.cacheRead, draft.tokens.cacheWrite].some((value) => value !== null && value > inputTotal!)) {
    throw new Error("Une catégorie d'entrée dépasse inputTotal");
  }
  const cacheTotal = sumIfComplete([draft.tokens.cacheRead, draft.tokens.cacheWrite]);
  if (cacheTotal !== null && inputTotal !== null && cacheTotal > inputTotal) throw new Error("Les caches dépassent inputTotal");

  let outputTotal = draft.tokens.outputTotal;
  if (draft.tokens.reasoningRelation === "ADDITIONAL") {
    const reconstructed = sumIfComplete([draft.tokens.outputVisible, draft.tokens.outputReasoning]);
    if (reconstructed !== null && outputTotal !== null && reconstructed !== outputTotal) throw new Error("La ventilation de sortie ne correspond pas à outputTotal");
    outputTotal ??= reconstructed;
  } else if (draft.tokens.reasoningRelation === "INCLUDED") {
    if (outputTotal !== null && [draft.tokens.outputVisible, draft.tokens.outputReasoning].some((value) => value !== null && value > outputTotal!)) {
      throw new Error("Une catégorie incluse dépasse outputTotal");
    }
  }

  const declaredActivity = [
    inputTotal, outputTotal, draft.tokens.inputUncached, draft.tokens.cacheRead, draft.tokens.cacheWrite,
    draft.tokens.outputVisible, draft.tokens.outputReasoning, draft.modality.images,
    draft.modality.audioMinutes, draft.modality.videoSeconds, draft.energy.kwh,
    draft.energy.averageWatts, draft.energy.durationSeconds,
  ];
  if (draft.requestCount === 0 && declaredActivity.some((value) => value !== null && value > 0)) {
    throw new Error("Une activité positive ne peut pas avoir zéro requête");
  }
  const energyFields = [draft.energy.kwh, draft.energy.boundary, draft.energy.evidence];
  if (energyFields.some((value) => value !== null) && energyFields.some((value) => value === null)) {
    throw new Error("La mesure énergétique exige kWh, frontière et preuve qualifiés ensemble");
  }
  if (draft.energy.averageWatts !== null && draft.energy.durationSeconds === null) throw new Error("Une puissance déclarée exige sa durée");
  if (draft.energy.idleWatts !== null && draft.energy.averageWatts === null) throw new Error("La puissance à vide exige la puissance moyenne");
  if (draft.energy.kwh !== null && draft.energy.averageWatts !== null) throw new Error("Choisir une seule méthode de mesure énergétique");
  if (draft.execution === "LOCAL") {
    if (draft.energy.boundary !== null && draft.energy.boundary !== "LOCAL_WALL") throw new Error("Une mesure locale doit être qualifiée LOCAL_WALL");
    if (draft.access !== "LOCAL_OWNED") throw new Error("Un calcul local doit déclarer un accès LOCAL_OWNED");
  } else {
    if (draft.energy.boundary === "LOCAL_WALL") throw new Error("LOCAL_WALL ne qualifie pas une exécution cloud");
    if (draft.access === "LOCAL_OWNED") throw new Error("LOCAL_OWNED exige une exécution locale");
  }
  if ((draft.source === "PROVIDER_EXPORT" || draft.source === "PROVIDER_DASHBOARD") && draft.provenance !== "PROVIDER_REPORTED") {
    throw new Error("La provenance fournisseur doit être déclarée comme rapportée par le fournisseur");
  }
  if (draft.source === "LOCAL_LOG" && (draft.provenance !== "DEVICE_MEASURED" || draft.execution !== "LOCAL")) {
    throw new Error("Un journal local exige une mesure d'appareil en environnement local");
  }
  if (draft.provenance === "DEVICE_MEASURED" && draft.execution !== "LOCAL") throw new Error("Une mesure d'appareil exige un environnement local");

  const logicalTotal = sumIfComplete([inputTotal, outputTotal]);
  return {
    ...draft,
    modelCanonical: canonicalModel?.id ?? null,
    normalizationVersion: PERSONAL_AI_DECLARATION_VERSION,
    tokens: { ...draft.tokens, inputTotal, outputTotal, logicalTotal },
  };
}

export function toPersonalAiEstimatorInput(declaration: PersonalAiNormalizedDeclaration): PersonalAiFootprintInput {
  const knownModel = declaration.modelCanonical ? findAiModel(declaration.modelCanonical) : null;
  const region = declaration.inferenceRegion === "FR" || declaration.inferenceRegion === "US" ? declaration.inferenceRegion : "UNKNOWN";
  const perRequest = declaration.granularity === "PER_REQUEST" && (declaration.requestCount === null || declaration.requestCount === 1);
  const hasMeasuredEnergy = declaration.energy.kwh !== null && declaration.energy.boundary !== null && declaration.energy.evidence !== null;
  return {
    ...(knownModel ? { modelId: knownModel.id } : {}),
    executionEnvironment: declaration.execution === "LOCAL" ? "local_device" : "cloud_api",
    hosterOperator: declaration.operator,
    region,
    textUsage: {
      totalTokens: declaration.tokens.logicalTotal,
      inputTokens: declaration.tokens.inputTotal,
      outputTokens: declaration.tokens.outputTotal,
      cachedTokens: declaration.tokens.cacheRead === null || declaration.tokens.cacheWrite === null ? null : declaration.tokens.cacheRead + declaration.tokens.cacheWrite,
      reasoningTokensIncluded: declaration.tokens.reasoningRelation === "INCLUDED" ? declaration.tokens.outputReasoning : null,
      granularity: perRequest ? "PER_REQUEST" : declaration.granularity === "UNKNOWN" ? "UNKNOWN" : "AGGREGATE",
    },
    imageUsage: { imageCount: declaration.modality.images },
    audioUsage: { durationMinutes: declaration.modality.audioMinutes },
    videoUsage: { durationSeconds: declaration.modality.videoSeconds },
    requestCount: declaration.requestCount,
    ...(hasMeasuredEnergy ? { energyMeasurement: { kwh: declaration.energy.kwh!, boundary: declaration.energy.boundary!, evidence: declaration.energy.evidence! } } : {}),
    ...(declaration.execution === "LOCAL" && declaration.energy.averageWatts !== null && declaration.energy.durationSeconds !== null
      ? { localPower: { watts: declaration.energy.averageWatts, durationSeconds: declaration.energy.durationSeconds, ...(declaration.energy.idleWatts === null ? {} : { idleWatts: declaration.energy.idleWatts }) } }
      : {}),
  };
}
