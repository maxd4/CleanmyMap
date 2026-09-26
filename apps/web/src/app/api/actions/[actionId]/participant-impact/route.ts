import { NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { normalizeActionId } from "@/lib/actions/action-id";
import { requireAuthenticatedAccess } from "@/lib/authz";
import { unauthorizedJsonResponse } from "@/lib/http/auth-responses";
import { handleApiError, validationErrorResponse } from "@/lib/http/api-errors";
import { appendActionModerationAudit } from "@/lib/actions/moderation-audit";
import { ACTION_WASTE_MEASUREMENT_METHODS } from "@/lib/waste/measurement";
import { MAX_CIGARETTE_BUTTS_COUNT } from "@/lib/waste/cigarette-butts";
import {
  buildStoredIndividualImpactMeasurement,
  toIndividualImpactMeasurement,
  INDIVIDUAL_IMPACT_SELECT,
  type IndividualImpactRow,
} from "@/lib/actions/participation/individual-impact";
import { resolveReviewerAccess } from "../group-join/route";
import { refreshProgressionProfile } from "@/lib/gamification/progression-tracking";

const wasteSchema = z.object({
  kg: z.number().min(0).max(100_000),
  condition: z.enum(["sec", "humide", "mouille"]),
  measurementMethod: z.enum(ACTION_WASTE_MEASUREMENT_METHODS),
});

const buttsSchema = z
  .object({
    count: z.number().int().min(0).max(MAX_CIGARETTE_BUTTS_COUNT).nullable().optional(),
    massKg: z.number().min(0).max(100_000).nullable().optional(),
    condition: z.enum(["propre", "humide", "mouille"]),
  })
  .refine((value) => value.count !== null && value.count !== undefined || value.massKg !== null && value.massKg !== undefined, {
    message: "Un comptage ou une masse de mégots est requis.",
  });

const participantImpactSchema = z
  .object({
    participantId: z.string().trim().min(1),
    waste: wasteSchema.nullable().optional(),
    butts: buttsSchema.nullable().optional(),
    reason: z.string().trim().max(500).optional(),
  })
  .strict()
  .refine((value) => value.waste !== undefined || value.butts !== undefined, {
    message: "Une mesure de déchets ou de mégots est requise.",
    path: ["participantId"],
  });

type ParticipantImpactRouteContext = {
  params: Promise<{ actionId: string }>;
};

type ParticipantImpactPayload = z.infer<typeof participantImpactSchema>;
type ImpactParticipant = Record<string, unknown> & {
  user_id: string;
  participation_status: "pending" | "confirmed" | "cancelled";
};

type ImpactContext = {
  participant: ImpactParticipant;
  current: ReturnType<typeof toIndividualImpactMeasurement>;
  reviewerUserId: string;
};

async function loadImpactContext(
  supabase: ReturnType<typeof getSupabaseServerClient>,
  actionId: string,
  participantId: string,
  actorUserId: string,
): Promise<ImpactContext | NextResponse> {
  const actionResult = await supabase
    .from("actions")
    .select("id, created_by_clerk_id, status, action_phase")
    .eq("id", actionId)
    .maybeSingle();
  if (actionResult.error) throw new Error(actionResult.error.message);
  const action = actionResult.data as { created_by_clerk_id: string | null; status: string } | null;
  if (!action || action.status !== "approved") {
    return NextResponse.json({ error: "Action introuvable." }, { status: 404 });
  }

  const reviewer = await resolveReviewerAccess({
    supabase,
    actionId,
    creatorUserId: action.created_by_clerk_id,
    actorUserId,
  });
  if (!reviewer.ok) {
    return NextResponse.json({ error: "Vous n'êtes pas autorisé à mesurer cette participation." }, { status: 403 });
  }

  const participantResult = await supabase
    .from("action_participants")
    .select(`id, action_id, user_id, participation_status, ${INDIVIDUAL_IMPACT_SELECT}`)
    .eq("action_id", actionId)
    .eq("id", participantId)
    .maybeSingle();
  if (participantResult.error) throw new Error(participantResult.error.message);
  const participant = participantResult.data as ImpactParticipant | null;
  if (!participant) return NextResponse.json({ error: "Participation introuvable." }, { status: 404 });
  if (participant.participation_status !== "confirmed") {
    return validationErrorResponse({ participantId: ["Seule une participation confirmée peut recevoir une mesure individuelle."] });
  }

  return {
    participant,
    current: toIndividualImpactMeasurement(participant as unknown as IndividualImpactRow),
    reviewerUserId: reviewer.identity?.userId ?? actorUserId,
  };
}

function resolveWasteMeasurement(
  payload: ParticipantImpactPayload,
  current: ReturnType<typeof toIndividualImpactMeasurement>,
) {
  if (payload.waste !== undefined) return payload.waste;
  if (current?.wasteKg === null || current?.wasteKg === undefined) return null;
  return {
    kg: current.wasteKg,
    condition: current.wasteCondition ?? "sec",
    measurementMethod: current.wasteMeasurementMethod ?? "inconnue",
  };
}

function resolveButtsMeasurement(
  payload: ParticipantImpactPayload,
  current: ReturnType<typeof toIndividualImpactMeasurement>,
) {
  if (payload.butts !== undefined) return payload.butts;
  const hasButts = current?.cigaretteButtsCount !== null && current?.cigaretteButtsCount !== undefined
    || current?.cigaretteButtsMassKg !== null && current?.cigaretteButtsMassKg !== undefined;
  if (!hasButts) return null;
  return {
    count: current?.cigaretteButtsCount ?? null,
    massKg: current?.cigaretteButtsMassKg ?? null,
    condition: current?.cigaretteButtsCondition ?? "propre",
  };
}

function buildMeasurementUpdate(
  payload: ParticipantImpactPayload,
  current: ReturnType<typeof toIndividualImpactMeasurement>,
  actorUserId: string,
) {
  const nextWaste = resolveWasteMeasurement(payload, current);
  const nextButts = resolveButtsMeasurement(payload, current);
  const hasMeasurement = nextWaste !== null || nextButts !== null;
  const measuredAt = hasMeasurement ? new Date().toISOString() : null;
  const stored = buildStoredIndividualImpactMeasurement({
    wasteKg: nextWaste?.kg ?? null,
    wasteCondition: nextWaste?.condition ?? null,
    wasteMeasurementMethod: nextWaste?.measurementMethod ?? null,
    cigaretteButtsCount: nextButts?.count ?? null,
    cigaretteButtsMassKg: nextButts?.massKg ?? null,
    cigaretteButtsCondition: nextButts?.condition ?? null,
    measuredBy: hasMeasurement ? actorUserId : null,
    measuredAt,
  });
  return {
    measuredAt,
    updatePayload: {
      individual_waste_kg: stored.wasteKg,
      individual_waste_condition: stored.wasteCondition,
      individual_waste_measurement_method: stored.wasteMeasurementMethod,
      individual_waste_normalization_version: stored.wasteNormalizationVersion,
      individual_cigarette_butts_count: stored.cigaretteButtsCount,
      individual_cigarette_butts_mass_kg: stored.cigaretteButtsMassKg,
      individual_cigarette_butts_condition: stored.cigaretteButtsCondition,
      individual_cigarette_butts_provenance: stored.cigaretteButtsProvenance,
      individual_cigarette_butts_conversion_version: stored.cigaretteButtsConversionVersion,
      individual_impact_measured_by: stored.measuredBy,
      individual_impact_measured_at: stored.measuredAt,
    },
  };
}

async function persistParticipantImpact(
  supabase: ReturnType<typeof getSupabaseServerClient>,
  actionId: string,
  participantId: string,
  payload: ParticipantImpactPayload,
  context: ImpactContext,
) {
  const measurementUpdate = buildMeasurementUpdate(payload, context.current, context.reviewerUserId);
  const updateResult = await supabase
    .from("action_participants")
    .update(measurementUpdate.updatePayload)
    .eq("action_id", actionId)
    .eq("id", participantId)
    .select(`id, action_id, user_id, participation_status, ${INDIVIDUAL_IMPACT_SELECT}`)
    .single();
  if (updateResult.error) throw new Error(updateResult.error.message);
  const nextMeasurement = toIndividualImpactMeasurement(updateResult.data as unknown as IndividualImpactRow);
  await appendActionModerationAudit({
    operationId: `action-participant-impact-${actionId}-${participantId}-${Date.now()}`,
    actorUserId: context.reviewerUserId,
    targetActionId: actionId,
    targetUserId: context.participant.user_id,
    operation: "record_individual_impact_measurement",
    outcome: "success",
    reason: payload.reason ?? null,
    previousValue: context.current,
    newValue: nextMeasurement,
    details: { participantId, actionId, measuredAt: measurementUpdate.measuredAt },
  });
  await refreshProgressionProfile(supabase, context.participant.user_id).catch(() => null);
  return NextResponse.json({
    status: "ok",
    actionId,
    participantId,
    participantUserId: context.participant.user_id,
    individualImpact: nextMeasurement,
  });
}

export async function PATCH(request: Request, ctx: ParticipantImpactRouteContext) {
  const access = await requireAuthenticatedAccess();
  if (!access.ok) return unauthorizedJsonResponse();

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const parsed = participantImpactSchema.safeParse(payload);
  if (!parsed.success) {
    return validationErrorResponse(parsed.error.flatten().fieldErrors);
  }

  const { actionId } = await ctx.params;
  const trimmedActionId = normalizeActionId(actionId);
  if (!trimmedActionId) {
    return validationErrorResponse({ actionId: ["Identifiant d'action manquant."] });
  }

  try {
    const supabase = getSupabaseServerClient(true);
    const context = await loadImpactContext(supabase, trimmedActionId, parsed.data.participantId, access.userId);
    if (context instanceof NextResponse) return context;
    return persistParticipantImpact(supabase, trimmedActionId, parsed.data.participantId, parsed.data, context);
  } catch (error) {
    return handleApiError(error, "PATCH /api/actions/:actionId/participant-impact");
  }
}
