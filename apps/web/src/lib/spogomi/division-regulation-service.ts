import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { loadSpogomiEventForOrganizer } from "./preparation/preparation-event-access";
import type { SpogomiRegulation } from "./types";
import { validateSpogomiRegulation } from "./validation";

const nullableTrimmedString = z.string().trim().max(500).nullable();
const finiteNumber = z.number().finite();

const categorySchema = z.object({
  id: z.string().uuid().nullable().optional(),
  code: z.string().trim().min(1).max(80),
  label: z.string().trim().min(1).max(160),
  measurementKind: z.enum(["mass", "count", "volume"]),
  unit: z.string().trim().min(1).max(40),
  coefficient: finiteNumber.nullable(),
  coefficientStatus: z.enum(["unknown", "confirmed", "not_applicable"]),
  environmentalCategorySlug: z.string().trim().max(120).nullable(),
  displayOrder: z.number().int().nonnegative().max(999),
  isComplete: z.boolean(),
}).strict();

const mappingSchema = z.object({
  id: z.string().uuid().nullable().optional(),
  categoryRuleId: z.string().uuid().nullable().optional(),
  categoryCode: z.string().trim().min(1).max(80),
  environmentalCategorySlug: z.string().trim().max(120).nullable(),
  sourceField: z.enum(["mass_grams", "object_count", "quantity"]).nullable(),
  sourceUnit: z.string().trim().max(40),
  targetUnit: z.enum(["grams", "count", "quantity"]).nullable(),
  unitFactorToTarget: finiteNumber.nullable(),
  countsTowardTotal: z.boolean(),
  isMegots: z.boolean(),
  mappingStatus: z.enum(["mapped", "excluded", "unmapped"]),
  exclusionReason: z.string().trim().max(500).nullable(),
}).strict();

export const divisionRegulationInputSchema = z.object({
  expectedRevision: z.number().int().nonnegative(),
  regulationVersion: z.string().trim().min(1).max(120),
  regulationStatus: z.enum(["incomplete", "complete"]),
  regulationSourceReference: nullableTrimmedString,
  teamSize: z.object({
    casual: z.object({
      minMembers: z.number().int().positive().nullable(),
      maxMembers: z.number().int().positive().nullable(),
    }).strict(),
  }).strict(),
  rounding: z.object({ decimals: z.number().int().min(0).max(6), mode: z.enum(["half_up", "down", "up"]) }).strict().nullable(),
  penalties: z.array(z.object({ code: z.string().trim().min(1).max(80), label: z.string().trim().min(1).max(160), points: finiteNumber }).strict()).max(100),
  eligibility: z.object({ minimumPresentParticipants: z.number().int().nonnegative().nullable(), requiresAllCategories: z.boolean() }).strict().nullable(),
  tiebreakers: z.array(z.enum(["sporting_score", "mass_grams", "counted_objects"])).max(3),
  categories: z.array(categorySchema).max(100),
  environmentMappings: z.array(mappingSchema).max(100),
}).strict();

export type DivisionRegulationInput = z.infer<typeof divisionRegulationInputSchema>;

function toDomainRegulation(divisionId: string, input: DivisionRegulationInput): SpogomiRegulation {
  return {
    divisionId,
    version: input.regulationVersion,
    sourceReference: input.regulationSourceReference,
    status: input.regulationStatus,
    teamSize: input.teamSize,
    categories: input.categories.map((category) => ({
      code: category.code,
      label: category.label,
      measurementKind: category.measurementKind,
      unit: category.unit,
      coefficient: category.coefficient,
      coefficientStatus: category.coefficientStatus,
      environmentalCategorySlug: category.environmentalCategorySlug,
      isComplete: category.isComplete,
    })),
    ...(input.rounding ? { rounding: input.rounding } : {}),
    penalties: input.penalties,
    ...(input.eligibility ? { eligibility: input.eligibility } : {}),
    tiebreakers: input.tiebreakers,
    environmentMappings: input.environmentMappings,
  };
}

function translateRpcError(error: { code?: string; message?: string }) {
  if (error.code === "40001") throw new Error("Conflict: la révision de préparation a changé.");
  if (error.code === "23514" || error.code === "22023") throw new Error(`Validation: ${error.message ?? "le règlement est incohérent."}`);
  if (error.code === "42501") throw new Error("Forbidden: la configuration du règlement est réservée à l’organisateur.");
  throw error;
}

export async function updateSpogomiDivisionRegulation(params: {
  supabase: SupabaseClient;
  eventId: string;
  divisionId: string;
  userId: string;
  input: DivisionRegulationInput;
}) {
  const event = await loadSpogomiEventForOrganizer(params.supabase, params.eventId, params.userId);
  if (event === false) throw new Error("Forbidden: l’organisateur n’a pas accès à cette édition.");
  if (!event) throw new Error("Not found: édition SPOGOMI introuvable.");
  const regulation = toDomainRegulation(params.divisionId, params.input);
  const validation = validateSpogomiRegulation(regulation);
  if (!validation.ok) throw new Error(`Validation: ${validation.reason}`);

  const result = await params.supabase.rpc("spogomi_update_division_regulation", {
    p_event_id: params.eventId,
    p_division_id: params.divisionId,
    p_expected_revision: params.input.expectedRevision,
    p_actor_clerk_id: params.userId,
    p_regulation_version: params.input.regulationVersion,
    p_regulation_status: params.input.regulationStatus,
    p_regulation_source_reference: params.input.regulationSourceReference,
    p_regulation_config: {
      rounding: params.input.rounding,
      penalties: params.input.penalties,
      eligibility: params.input.eligibility,
      tiebreakers: params.input.tiebreakers,
    },
    p_team_size_config: params.input.teamSize,
    p_categories: params.input.categories,
    p_environment_mappings: params.input.environmentMappings,
  });
  if (result.error) translateRpcError(result.error);
  return result.data;
}
