import { NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { normalizeActionId } from "@/lib/actions/action-id";
import { requireAuthenticatedAccess } from "@/lib/authz";
import { unauthorizedJsonResponse } from "@/lib/http/auth-responses";
import { handleApiError, validationErrorResponse } from "@/lib/http/api-errors";
import { appendActionModerationAudit } from "@/lib/actions/moderation-audit";
import { canOverrideActionParticipants } from "@/lib/actions/permissions";
import { ACTION_WASTE_MEASUREMENT_METHODS } from "@/lib/waste/measurement";
import { MAX_CIGARETTE_BUTTS_COUNT } from "@/lib/waste/cigarette-butts";
import { individualCigaretteButtsLotsSchema } from "@/lib/validation/action-measurements";
import {
  buildStoredIndividualImpactMeasurement,
  toIndividualImpactMeasurement,
  REVIEW_SELECT,
  type IndividualImpactRow,
} from "@/lib/actions/participation/individual-impact";
import { resolveReviewerAccess } from "../group-join/route";
import { refreshProgressionProfile } from "@/lib/gamification/reconciliation/progression-tracking";
import {
  captureActionParticipantImpactSnapshot,
  emitActionParticipantImpactNotifications,
} from "@/lib/actions/action-participant-impact-notifications";
import {
  type ActionParticipantImpactSnapshot,
} from "@/lib/actions/participation/group-participation-read";

const wasteSchema = z.object({
  kg: z.number().min(0).max(100_000),
  condition: z.enum(["sec", "humide", "mouille"]),
  measurementMethod: z.enum(ACTION_WASTE_MEASUREMENT_METHODS),
});

const legacyButtsSchema = z
  .object({
    count: z.number().int().min(0).max(MAX_CIGARETTE_BUTTS_COUNT).nullable().optional(),
    massKg: z.number().min(0).max(100_000).nullable().optional(),
    condition: z.enum(["propre", "humide", "mouille"]),
  })
  .strict()
  .refine((value) => value.count !== null && value.count !== undefined || value.massKg !== null && value.massKg !== undefined, {
    message: "Un comptage ou une masse de mégots est requis.",
  });

const buttsSchema = z.union([
  z.object({ lots: individualCigaretteButtsLotsSchema }).strict(),
  legacyButtsSchema,
]);

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
  updated_at?: string | null;
};

type ImpactContext = {
  participant: ImpactParticipant;
  current: ReturnType<typeof toIndividualImpactMeasurement>;
  reviewerUserId: string;
  reviewerCanOverride: boolean;
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
    .select(REVIEW_SELECT)
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
    reviewerCanOverride: canOverrideActionParticipants(reviewer.identity),
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
    condition: current.wasteCondition,
    measurementMethod: current.wasteMeasurementMethod,
  };
}

function resolveButtsMeasurement(
  payload: ParticipantImpactPayload,
  current: ReturnType<typeof toIndividualImpactMeasurement>,
) {
  if (payload.butts !== undefined) return payload.butts;
  if (current?.cigaretteButtsLots) {
    return { lots: current.cigaretteButtsLots.lots };
  }
  const hasButts = current?.cigaretteButtsCount !== null && current?.cigaretteButtsCount !== undefined
    || current?.cigaretteButtsMassKg !== null && current?.cigaretteButtsMassKg !== undefined;
  if (!hasButts) return null;
  return {
    count: current?.cigaretteButtsCount ?? null,
    massKg: current?.cigaretteButtsMassKg ?? null,
    condition: current?.cigaretteButtsCondition,
  };
}

function rejectAmbiguousLegacyReplacement(
  payload: ParticipantImpactPayload,
  current: ReturnType<typeof toIndividualImpactMeasurement>,
): NextResponse | null {
  if (
    payload.butts !== undefined &&
    payload.butts !== null &&
    !("lots" in payload.butts) &&
    current?.cigaretteButtsLots
  ) {
    return validationErrorResponse({
      butts: ["Cette participation possède déjà des lots ; envoyez explicitement lots pour les remplacer."],
    });
  }
  return null;
}

function buildMeasurementUpdate(
  payload: ParticipantImpactPayload,
  current: ReturnType<typeof toIndividualImpactMeasurement>,
  actorUserId: string,
): { measuredAt: string | null; updatePayload: IndividualImpactRow } {
  const nextWaste = resolveWasteMeasurement(payload, current);
  const nextButts = resolveButtsMeasurement(payload, current);
  const preservesExistingButts = payload.butts === undefined;
  const explicitLots = payload.butts !== undefined && payload.butts !== null && "lots" in payload.butts
    ? payload.butts.lots
    : null;
  const hasButtsMeasurement = nextButts !== null &&
    ("lots" in nextButts ? nextButts.lots.length > 0 : nextButts.count !== null || nextButts.massKg !== null);
  const hasMeasurement = nextWaste !== null || hasButtsMeasurement;
  const nextLegacyButts = nextButts && "lots" in nextButts ? null : nextButts;
  const measuredAt = hasMeasurement ? new Date().toISOString() : null;
  const stored = buildStoredIndividualImpactMeasurement({
    wasteKg: nextWaste?.kg ?? null,
    wasteCondition: nextWaste?.condition ?? null,
    wasteMeasurementMethod: nextWaste?.measurementMethod ?? null,
    wasteNormalizationVersion: payload.waste === undefined
      ? current?.wasteNormalizationVersion
      : undefined,
    cigaretteButtsCount: nextLegacyButts?.count ?? null,
    cigaretteButtsMassKg: nextLegacyButts?.massKg ?? null,
    cigaretteButtsCondition: nextLegacyButts?.condition ?? null,
    cigaretteButtsLots: explicitLots,
    cigaretteButtsProvenance: preservesExistingButts ? current?.cigaretteButtsProvenance : undefined,
    cigaretteButtsConversionVersion: preservesExistingButts ? current?.cigaretteButtsConversionVersion : undefined,
    measuredBy: hasMeasurement ? actorUserId : null,
    measuredAt,
  }, {
    preservedCigaretteButtsLots: preservesExistingButts ? current?.cigaretteButtsLots : undefined,
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
      individual_cigarette_butts_lots: stored.cigaretteButtsLots,
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
  let currentContext = context;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const previousImpactSnapshot: ActionParticipantImpactSnapshot | null =
      await captureActionParticipantImpactSnapshot(supabase, actionId);
    const measurementUpdate = buildMeasurementUpdate(
      payload,
      currentContext.current,
      currentContext.reviewerUserId,
    );
    const atomicResult = await supabase.rpc("persist_action_participant_individual_impact", {
      p_action_id: actionId,
      p_participant_id: participantId,
      p_reviewer_user_id: currentContext.reviewerUserId,
      p_admin_override: currentContext.reviewerCanOverride,
      p_expected_participant_updated_at: currentContext.participant.updated_at ?? null,
      p_individual_waste_kg: measurementUpdate.updatePayload.individual_waste_kg,
      p_individual_waste_condition: measurementUpdate.updatePayload.individual_waste_condition,
      p_individual_waste_measurement_method: measurementUpdate.updatePayload.individual_waste_measurement_method,
      p_individual_waste_normalization_version: measurementUpdate.updatePayload.individual_waste_normalization_version,
      p_individual_cigarette_butts_count: measurementUpdate.updatePayload.individual_cigarette_butts_count,
      p_individual_cigarette_butts_mass_kg: measurementUpdate.updatePayload.individual_cigarette_butts_mass_kg,
      p_individual_cigarette_butts_condition: measurementUpdate.updatePayload.individual_cigarette_butts_condition,
      p_individual_cigarette_butts_provenance: measurementUpdate.updatePayload.individual_cigarette_butts_provenance,
      p_individual_cigarette_butts_conversion_version: measurementUpdate.updatePayload.individual_cigarette_butts_conversion_version,
      p_individual_cigarette_butts_lots: measurementUpdate.updatePayload.individual_cigarette_butts_lots,
      p_individual_impact_measured_by: measurementUpdate.updatePayload.individual_impact_measured_by,
      p_individual_impact_measured_at: measurementUpdate.updatePayload.individual_impact_measured_at,
    });
    if (atomicResult.error) throw new Error(atomicResult.error.message);
    const persisted = atomicResult.data as {
      ok?: unknown;
      code?: unknown;
      changed?: unknown;
      id?: unknown;
      updatedAt?: unknown;
      userId?: unknown;
    } | null;
    if (persisted?.ok !== true) {
      if (persisted?.code === "revision_conflict" && attempt === 0) {
        const refreshed = await loadImpactContext(
          supabase,
          actionId,
          participantId,
          currentContext.reviewerUserId,
        );
        if (refreshed instanceof NextResponse) return refreshed;
        const ambiguity = rejectAmbiguousLegacyReplacement(payload, refreshed.current);
        if (ambiguity) return ambiguity;
        currentContext = refreshed;
        continue;
      }
      return NextResponse.json(
        {
          error: persisted?.code === "revision_conflict"
            ? "La mesure a été modifiée en parallèle. Rechargez la participation puis réessayez."
            : "La participation ou l'autorisation n'est plus éligible à cette mesure.",
          code: persisted?.code === "revision_conflict" ? "revision_conflict" : "impact_target_not_eligible",
        },
        { status: 409 },
      );
    }
    if (persisted.changed === false) {
      return NextResponse.json({
        status: "ok",
        actionId,
        participantId,
        participantUserId: currentContext.participant.user_id,
        individualImpact: currentContext.current,
      });
    }
    const nextMeasurement = toIndividualImpactMeasurement(
      measurementUpdate.updatePayload,
    );
    await appendActionModerationAudit({
      operationId: `action-participant-impact-${actionId}-${participantId}-${Date.now()}`,
      actorUserId: currentContext.reviewerUserId,
      targetActionId: actionId,
      targetUserId: currentContext.participant.user_id,
      operation: "record_individual_impact_measurement",
      outcome: "success",
      reason: payload.reason ?? null,
      previousValue: currentContext.current,
      newValue: nextMeasurement,
      details: { participantId, actionId, measuredAt: measurementUpdate.measuredAt },
    });
    if (previousImpactSnapshot) {
      await emitActionParticipantImpactNotifications({
        supabase,
        actionId,
        previousSnapshot: previousImpactSnapshot,
        persistedRevision:
          typeof persisted.updatedAt === "string" && typeof persisted.id === "string"
            ? `participant:${persisted.id}:${persisted.updatedAt}`
            : null,
      });
    }
    await refreshProgressionProfile(supabase, currentContext.participant.user_id, {
      reconcileLegacyImpact: true,
    }).catch(() => null);
    return NextResponse.json({
      status: "ok",
      actionId,
      participantId,
      participantUserId: currentContext.participant.user_id,
      individualImpact: nextMeasurement,
    });
  }
  return NextResponse.json(
    { error: "La mesure a été modifiée en parallèle. Rechargez la participation puis réessayez.", code: "revision_conflict" },
    { status: 409 },
  );
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
    const ambiguity = rejectAmbiguousLegacyReplacement(parsed.data, context.current);
    if (ambiguity) return ambiguity;
    return await persistParticipantImpact(supabase, trimmedActionId, parsed.data.participantId, parsed.data, context);
  } catch (error) {
    return handleApiError(error, "PATCH /api/actions/:actionId/participant-impact");
  }
}
