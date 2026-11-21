import { z } from "zod";
import { estimatePersonalAiFootprint } from "./personal-ai-estimator";
import {
  normalizePersonalAiDeclaration,
  toPersonalAiEstimatorInput,
  type PersonalAiDeclarationDraft,
} from "./personal-ai-usage-normalization";

const nullableCount = z.number().int().safe().nonnegative().nullable();
const nullableMeasure = z.number().finite().nonnegative().nullable();
const nullableLabel = (max: number) => z.string().max(max).nullable();

export const personalAiDeclarationSchema = z.object({
  provider: z.enum(["MANUAL", "OPENAI", "ANTHROPIC", "GOOGLE", "MISTRAL", "OTHER"]),
  source: z.enum(["MANUAL", "PROVIDER_EXPORT", "PROVIDER_DASHBOARD", "LOCAL_LOG"]),
  sourceVersion: nullableLabel(80),
  provenance: z.enum(["USER_DECLARED", "PROVIDER_REPORTED", "DEVICE_MEASURED"]),
  granularity: z.enum(["PER_REQUEST", "AGGREGATE", "UNKNOWN"]),
  periodStartUtc: z.string().max(30),
  periodEndUtc: z.string().max(30),
  modelRaw: nullableLabel(120),
  modelCanonical: nullableLabel(80),
  operator: nullableLabel(120),
  execution: z.enum(["CLOUD", "LOCAL"]),
  inferenceRegion: nullableLabel(7),
  access: z.enum(["API", "SUBSCRIPTION", "LOCAL_OWNED"]),
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

export function calculatePersonalAiDeclaration(payload: StoredPersonalAiDeclaration) {
  const estimate = estimatePersonalAiFootprint(toPersonalAiEstimatorInput(payload));
  return {
    methodologyVersion: estimate.version,
    factorVersion: estimate.methodologyTrace.version,
    snapshot: estimate,
  };
}

export function isPersonalAiId(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}
