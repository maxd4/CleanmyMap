import { z } from "zod";
import { estimatePersonalAiFootprint } from "./personal-ai-estimator";
import {
  PERSONAL_AI_DECLARATION_VERSION,
  normalizePersonalAiDeclaration,
  toPersonalAiEstimatorInput,
  type PersonalAiDeclarationDraft,
} from "./personal-ai-usage-normalization";
import { getScientificFactor, resolveElectricityFactorForRegion } from "./scientific-registry";

const nullableCount = z.number().int().safe().nonnegative().nullable();
const nullableMeasure = z.number().finite().nonnegative().nullable();
const nullableLabel = (max: number) => z.string().max(max).nullable();

export const personalAiDeclarationSchema = z.object({
  provider: z.enum(["MANUAL", "OPENAI", "ANTHROPIC", "GOOGLE", "MISTRAL", "OTHER"]),
  source: z.enum(["MANUAL", "PROVIDER_EXPORT", "PROVIDER_DASHBOARD", "LOCAL_LOG"]),
  sourceVersion: nullableLabel(80),
  provenance: z.enum(["USER_DECLARED", "PROVIDER_REPORTED", "DEVICE_MEASURED"]),
  granularity: z.enum(["PER_REQUEST", "AGGREGATE", "UNKNOWN"]),
  periodStartUtc: z.string().max(30).nullable(),
  periodEndUtc: z.string().max(30).nullable(),
  modelRaw: nullableLabel(120),
  modelCanonical: nullableLabel(80),
  operator: nullableLabel(120),
  execution: z.enum(["CLOUD", "LOCAL"]),
  inferenceRegion: nullableLabel(7),
  access: z.enum(["API", "SUBSCRIPTION", "LOCAL_OWNED", "UNKNOWN"]),
  requestCount: nullableCount,
  tokens: z.object({
    inputTotal: nullableCount,
    inputUncached: nullableCount,
    cacheRead: nullableCount,
    cacheWrite: nullableCount,
    outputVisible: nullableCount,
    outputReasoning: nullableCount,
    outputTotal: nullableCount,
    reasoningRelation: z.enum(["INCLUDED", "ADDITIONAL", "UNKNOWN"]),
  }).strict(),
  modality: z.object({
    images: nullableCount,
    audioMinutes: nullableMeasure,
    videoSeconds: nullableMeasure,
  }).strict(),
  energy: z.object({
    kwh: nullableMeasure,
    boundary: z.enum(["IT_FULL", "FACILITY", "LOCAL_WALL"]).nullable(),
    evidence: z.enum(["MEASURED", "DECLARED", "ASSUMPTION"]).nullable(),
    averageWatts: nullableMeasure,
    durationSeconds: nullableMeasure,
    idleWatts: nullableMeasure,
  }).strict(),
}).strict();

export type StoredPersonalAiDeclaration = ReturnType<typeof normalizePersonalAiDeclaration>;

export class PersonalAiDeclarationInputError extends Error {
  constructor() {
    super("Déclaration invalide");
    this.name = "PersonalAiDeclarationInputError";
  }
}

export function parsePersonalAiDeclaration(payload: unknown): StoredPersonalAiDeclaration {
  try {
    return normalizePersonalAiDeclaration(personalAiDeclarationSchema.parse(payload) as PersonalAiDeclarationDraft);
  } catch {
    throw new PersonalAiDeclarationInputError();
  }
}

export function parsePersonalAiNormalizedDeclaration(payload: unknown): StoredPersonalAiDeclaration {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) throw new PersonalAiDeclarationInputError();
  const normalized = payload as Record<string, unknown>;
  if (normalized.normalizationVersion !== PERSONAL_AI_DECLARATION_VERSION
    || !normalized.tokens || typeof normalized.tokens !== "object" || Array.isArray(normalized.tokens)
    || !("logicalTotal" in normalized.tokens)) throw new PersonalAiDeclarationInputError();
  const declaration = { ...normalized };
  delete declaration.normalizationVersion;
  const tokens = { ...(normalized.tokens as Record<string, unknown>) };
  delete tokens.logicalTotal;
  declaration.tokens = tokens;
  return parsePersonalAiDeclaration(declaration);
}

export function calculatePersonalAiDeclaration(payload: StoredPersonalAiDeclaration) {
  const estimate = estimatePersonalAiFootprint(toPersonalAiEstimatorInput(payload));
  const factorVersion = getAppliedFactorVersion(estimate, payload.inferenceRegion);
  return {
    methodologyVersion: estimate.version,
    factorVersion,
    snapshot: estimate,
  };
}

function getAppliedFactorVersion(
  estimate: ReturnType<typeof estimatePersonalAiFootprint>,
  declaredRegion: string | null,
): string {
  const applied = new Set<string>();
  const unavailable: string[] = [];
  const addFactor = (id: string) => {
    const factor = getScientificFactor(id);
    applied.add(`${factor.id}@${factor.version}`);
  };
  const totals = estimate.physicalTotals;
  const hasEnergy = totals.itEnergyKwh !== null || totals.facilityEnergyKwh !== null || totals.localWallEnergyKwh != null;
  const hasTextActivity = (estimate.modalities.text.activityCount ?? 0) > 0;
  const formula = estimate.methodologyTrace.formula;
  const usesEcologits = formula.includes("E_GPU");

  if (hasTextActivity && formula.includes("Tokens / 1M")) {
    const scenarioFactorId = estimate.scenario === "low"
      ? "ai-inference-energy-scenario-low-v1"
      : estimate.scenario === "high"
        ? "ai-inference-energy-scenario-high-v1"
        : "ai-inference-energy-scenario-central-v1";
    addFactor(scenarioFactorId);
  }

  if (totals.operationalKgCo2e !== null) {
    const electricityFactor = resolveElectricityFactorForRegion(estimate.region);
    if (electricityFactor && typeof electricityFactor.value === "number") {
      applied.add(`${electricityFactor.id}@${electricityFactor.version}`);
    } else {
      unavailable.push(`location-based electricity: no numeric registry factor for ${declaredRegion ?? "UNKNOWN"}`);
    }
  } else if (hasEnergy || hasTextActivity) {
    unavailable.push(`location-based electricity: no compatible regional factor for ${declaredRegion ?? "UNKNOWN"}`);
  }

  if (totals.indirectWaterLiters !== null && estimate.region === "US") {
    addFactor("water-indirect-datacenter-us-2024");
  } else if (hasEnergy && estimate.region !== "US") {
    unavailable.push(`indirect water: no registered factor for ${declaredRegion ?? "UNKNOWN"}`);
  }

  if (totals.partialLcaKgCo2e !== null) {
    if (usesEcologits) {
      unavailable.push("EcoLogits embodied factors are bundled with the method and have no separate scientific-registry factor ID");
    } else {
      addFactor("ai-partial-lca-overhead-v1");
    }
  }

  if (applied.size === 0 && unavailable.length === 0) {
    unavailable.push("no scientific-registry factor applied by the selected calculation branch");
  }

  return JSON.stringify({ applied: [...applied].sort(), unavailable });
}

export function isPersonalAiId(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}
