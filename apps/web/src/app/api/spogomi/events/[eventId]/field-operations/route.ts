import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuthenticatedAccess } from "@/lib/authz";
import { forbiddenJsonResponse, unauthorizedJsonResponse } from "@/lib/http/auth-responses";
import { handleApiError, validationErrorResponse } from "@/lib/http/api-errors";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import {
  assertSpogomiFieldCapability,
  callSpogomiFieldOperation,
  loadSpogomiFieldOperationsAccess,
  loadSpogomiFieldOperationsDashboard,
} from "@/lib/spogomi/field-operations-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const paramsSchema = z.object({ eventId: z.string().uuid() });
const isoDate = z.coerce.date();
const baseSchema = z.object({ action: z.string().trim().min(1).max(64), divisionId: z.string().uuid() }).strict();
const configureSchema = baseSchema.extend({
  action: z.literal("configure"), timezoneName: z.string().trim().min(1).max(80), regulationVersion: z.string().trim().min(1).max(120),
  officialStartAt: isoDate.nullable(), collectionLimitAt: isoDate.nullable(), sortingLimitAt: isoDate.nullable(), weighingStartAt: isoDate.nullable(), weighingEndAt: isoDate.nullable(), reason: z.string().trim().min(1).max(500), provenance: z.string().trim().min(1).max(500),
});
const phaseSchema = baseSchema.extend({ action: z.literal("phase"), phase: z.enum(["collection", "sorting", "weighing", "closed"]), at: isoDate, reason: z.string().trim().min(1).max(500), provenance: z.string().trim().min(1).max(500) });
const returnSchema = baseSchema.extend({ action: z.literal("return"), teamId: z.string().uuid(), actualReturnAt: isoDate, note: z.string().trim().max(500).nullable().optional(), reason: z.string().trim().min(1).max(500) });
const incidentSchema = baseSchema.extend({ action: z.literal("incident"), teamId: z.string().uuid().nullable().optional(), category: z.enum(["delay", "warning", "boundary_violation", "safety", "sorting", "contest", "disqualification", "correction", "cancellation"]), observedAt: isoDate, location: z.string().trim().max(240).nullable().optional(), rawObservation: z.string().trim().min(1).max(4000), reason: z.string().trim().min(1).max(500) });
const incidentDecisionSchema = baseSchema.extend({ action: z.literal("incident_decision"), incidentId: z.string().uuid(), decisionKind: z.enum(["warning", "penalty", "disqualification", "correction", "cancelled"]), decisionPoints: z.number().nonnegative().nullable().optional(), ruleReference: z.string().trim().min(1).max(500), justification: z.string().trim().min(1).max(4000), scoreEffect: z.record(z.string(), z.unknown()).default({}) });
const measurementSchema = baseSchema.extend({ action: z.literal("measurement"), teamId: z.string().uuid(), categoryRuleId: z.string().uuid(), measurementKind: z.enum(["mass", "count", "volume"]), unit: z.string().trim().min(1).max(60), quantity: z.number().nonnegative().nullable().optional(), massGrams: z.number().nonnegative().nullable().optional(), objectCount: z.number().int().nonnegative().nullable().optional(), measurementMethod: z.string().trim().min(1).max(240), provenance: z.string().trim().min(1).max(500), sourceKind: z.enum(["field_entry", "import_excel"]).default("field_entry"), sourceReference: z.string().trim().max(500).nullable().optional(), reason: z.string().trim().min(1).max(500) });
const measurementDecisionSchema = baseSchema.extend({ action: z.literal("measurement_decision"), measurementId: z.string().uuid(), decision: z.enum(["certified", "rejected"]), rejectionReason: z.string().trim().max(1000).nullable().optional() });
const bodySchema = z.discriminatedUnion("action", [configureSchema, phaseSchema, returnSchema, incidentSchema, incidentDecisionSchema, measurementSchema, measurementDecisionSchema]);

export async function GET(request: Request, context: { params: Promise<{ eventId: string }> }) {
  const access = await requireAuthenticatedAccess();
  if (!access.ok) return unauthorizedJsonResponse();
  const eventId = (await context.params).eventId;
  const params = paramsSchema.safeParse({ eventId });
  if (!params.success) return validationErrorResponse({ body: ["L’événement SPOGOMI est invalide."] });
  try {
    const supabase = getSupabaseServerClient(true);
    const fieldAccess = await loadSpogomiFieldOperationsAccess({ supabase, eventId, userId: access.userId });
    if (!fieldAccess) return forbiddenJsonResponse();
    const divisionId = new URL(request.url).searchParams.get("divisionId");
    const dashboard = await loadSpogomiFieldOperationsDashboard({ supabase, eventId, divisionId });
    if (fieldAccess.isOrganizer) return NextResponse.json(dashboard);
    const canSeeIncidents = fieldAccess.capabilities.has("arbitration");
    const canSeeMeasurements = fieldAccess.capabilities.has("measurement_entry") || fieldAccess.capabilities.has("weighing") || fieldAccess.capabilities.has("certification");
    return NextResponse.json({ ...dashboard, incidents: canSeeIncidents ? dashboard.incidents : [], measurements: canSeeMeasurements ? dashboard.measurements : [], categories: canSeeMeasurements ? dashboard.categories : [], teams: dashboard.teams });
  } catch (error) {
    return handleApiError(error, "spogomi.field-operations.read");
  }
}

export async function POST(request: Request, context: { params: Promise<{ eventId: string }> }) {
  const access = await requireAuthenticatedAccess();
  if (!access.ok) return unauthorizedJsonResponse();
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return validationErrorResponse({ body: ["La décision opérationnelle SPOGOMI est invalide."] });
  const eventId = (await context.params).eventId;
  const params = paramsSchema.safeParse({ eventId });
  if (!params.success) return validationErrorResponse({ body: ["L’événement SPOGOMI est invalide."] });
  try {
    const supabase = getSupabaseServerClient(true);
    const fieldAccess = await loadSpogomiFieldOperationsAccess({ supabase, eventId, userId: access.userId });
    if (!fieldAccess) return forbiddenJsonResponse();
    const input = parsed.data;
    let rpc: string;
    let args: Record<string, unknown>;
    if (input.action === "configure") {
      assertSpogomiFieldCapability(fieldAccess, "timing");
      rpc = "spogomi_configure_field_operation";
      args = { p_event_id: eventId, p_division_id: input.divisionId, p_timezone_name: input.timezoneName, p_regulation_version: input.regulationVersion, p_official_start_at: input.officialStartAt?.toISOString() ?? null, p_collection_limit_at: input.collectionLimitAt?.toISOString() ?? null, p_sorting_limit_at: input.sortingLimitAt?.toISOString() ?? null, p_weighing_start_at: input.weighingStartAt?.toISOString() ?? null, p_weighing_end_at: input.weighingEndAt?.toISOString() ?? null, p_actor_clerk_id: access.userId, p_reason: input.reason, p_provenance: input.provenance };
    } else if (input.action === "phase") {
      assertSpogomiFieldCapability(fieldAccess, "timing");
      rpc = "spogomi_launch_field_phase";
      args = { p_event_id: eventId, p_division_id: input.divisionId, p_phase: input.phase, p_at: input.at.toISOString(), p_actor_clerk_id: access.userId, p_reason: input.reason, p_provenance: input.provenance };
    } else if (input.action === "return") {
      assertSpogomiFieldCapability(fieldAccess, "arrival");
      rpc = "spogomi_record_team_return";
      args = { p_event_id: eventId, p_division_id: input.divisionId, p_team_id: input.teamId, p_actual_return_at: input.actualReturnAt.toISOString(), p_note: input.note ?? null, p_actor_clerk_id: access.userId, p_reason: input.reason };
    } else if (input.action === "incident") {
      assertSpogomiFieldCapability(fieldAccess, "arbitration");
      rpc = "spogomi_record_field_incident";
      args = { p_event_id: eventId, p_division_id: input.divisionId, p_team_id: input.teamId ?? null, p_category: input.category, p_observed_at: input.observedAt.toISOString(), p_location: input.location ?? null, p_raw_observation: input.rawObservation, p_actor_clerk_id: access.userId, p_reason: input.reason };
    } else if (input.action === "incident_decision") {
      assertSpogomiFieldCapability(fieldAccess, "arbitration");
      rpc = "spogomi_decide_field_incident";
      args = { p_event_id: eventId, p_division_id: input.divisionId, p_incident_id: input.incidentId, p_decision_kind: input.decisionKind, p_decision_points: input.decisionPoints ?? null, p_rule_reference: input.ruleReference, p_justification: input.justification, p_score_effect: input.scoreEffect, p_actor_clerk_id: access.userId };
    } else if (input.action === "measurement") {
      if (!fieldAccess.capabilities.has("measurement_entry") && !fieldAccess.capabilities.has("weighing")) throw new Error("SPOGOMI field operation is forbidden.");
      rpc = "spogomi_upsert_operational_measurement";
      args = { p_event_id: eventId, p_division_id: input.divisionId, p_team_id: input.teamId, p_category_rule_id: input.categoryRuleId, p_measurement_kind: input.measurementKind, p_unit: input.unit, p_quantity: input.quantity ?? null, p_mass_grams: input.massGrams ?? null, p_object_count: input.objectCount ?? null, p_measurement_method: input.measurementMethod, p_provenance: input.provenance, p_source_kind: input.sourceKind, p_source_reference: input.sourceReference ?? null, p_actor_clerk_id: access.userId, p_reason: input.reason };
    } else {
      assertSpogomiFieldCapability(fieldAccess, "certification");
      rpc = "spogomi_decide_operational_measurement";
      args = { p_event_id: eventId, p_division_id: input.divisionId, p_measurement_id: input.measurementId, p_decision: input.decision, p_rejection_reason: input.rejectionReason ?? null, p_actor_clerk_id: access.userId };
    }
    return NextResponse.json({ result: await callSpogomiFieldOperation({ supabase, rpc, args }) }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && /forbidden/i.test(error.message)) return forbiddenJsonResponse();
    return handleApiError(error, "spogomi.field-operations.mutate");
  }
}
