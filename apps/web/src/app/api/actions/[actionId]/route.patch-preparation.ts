import { NextResponse } from "next/server";
import { getCurrentUserIdentity } from "@/lib/authz";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { canEditValidatedImpact, canManageActionsGlobally } from "@/lib/actions/permissions";
import {
  isModerationReasonRequired,
  normalizeModerationReason,
} from "@/lib/actions/moderation-audit";
import { hasActionImpactUpdate } from "@/lib/actions/action-update-impact";
import {
  ActionUpdateValidationError,
  prepareActionUpdate,
  type PreparedActionUpdate,
} from "@/lib/actions/action-update-persistence";
import type { ActionUpdateInput } from "@/lib/actions/action-update-audit";
import { resolveActionUpdateOrganizer } from "@/lib/actions/action-update-organizer";
import type { ActionRow } from "@/types/database";
import {
  validatePatchOrganizerAccounts,
  validateSpontaneousOrganizerPatch,
} from "./route.patch-organizers";
import { validationErrorResponse } from "@/lib/http/api-errors";
import { loadActionOrganizerRowsForAction } from "@/lib/actions/participation/organizers";
import { SPONTANEOUS_PENDING_ORGANIZER_LABEL } from "@/lib/actions/organizer-type";
import { isActionFinalizationEligible } from "@/lib/actions/finalization-eligibility";

export type PreparedPatchMutation = {
  preparedUpdate: PreparedActionUpdate;
  shouldAuditModeration: boolean;
  adminAuditActorUserId: string;
  adminAuditTargetUserId: string | null;
  moderationOperation: string;
  moderationReason: string | null;
};

export function shouldSyncOrganizersBeforeFinalization(params: {
  body: ActionUpdateInput;
  current: ActionRow;
  updateData: Record<string, unknown>;
}): boolean {
  return (
    params.body.organizerAccounts !== undefined
  );
}

async function canonicalizePersistedPrimaryOrganizerName({
  supabase,
  actionId,
  current,
  parsed,
  organizerName,
}: {
  supabase: ReturnType<typeof getSupabaseServerClient>;
  actionId: string;
  current: ActionRow;
  parsed: ActionUpdateInput;
  organizerName?: string;
}): Promise<Response | ActionUpdateInput> {
  const nextOrganizerType = parsed.organizerType ?? current.organizer_type;
  if (nextOrganizerType !== "spontaneous" || parsed.organizerName === undefined) return parsed;
  const primary = (await loadActionOrganizerRowsForAction(supabase, actionId)).find((row) => row.is_primary);
  const normalizedName = organizerName?.trim() ?? "";
  const normalizedPrimaryName = primary?.organizer_label?.trim();
  if (!normalizedPrimaryName) return parsed;
  if (
    normalizedName &&
    normalizedName !== normalizedPrimaryName &&
    normalizedName !== SPONTANEOUS_PENDING_ORGANIZER_LABEL
  ) {
    return validationErrorResponse({
      organizerName: [
        `Le référent principal actuel est « ${normalizedPrimaryName} ». Pour changer de référent principal, utilisez le workflow de transfert explicite.`,
      ],
    });
  }
  return { ...parsed, organizerName: normalizedPrimaryName };
}

async function preparePatchOrganizerFields({
  supabase,
  actionId,
  userId,
  current,
  identity,
  organizerIds,
  parsed,
}: {
  supabase: ReturnType<typeof getSupabaseServerClient>;
  actionId: string;
  userId: string;
  current: ActionRow;
  identity: Awaited<ReturnType<typeof getCurrentUserIdentity>>;
  organizerIds: string[];
  parsed: ActionUpdateInput;
}): Promise<Response | ActionUpdateInput> {
  const nextOrganizerType = parsed.organizerType ?? current.organizer_type;
  const organizerIdentityUnchanged =
    parsed.organizerAccounts === undefined
    &&
    (parsed.organizerType === undefined || parsed.organizerType === current.organizer_type)
    && (parsed.organizerId === undefined
      || (parsed.organizerId?.trim() || null) === (current.organizer_id?.trim() || null))
    && (parsed.organizerName === undefined
      || parsed.organizerName.trim() === (current.organizer_name ?? "").trim());
  const currentPreparationData = current.preparation_data && typeof current.preparation_data === "object"
    ? current.preparation_data as { organizerReferenceStatus?: unknown }
    : {};
  if (
    organizerIdentityUnchanged
    && parsed.preparationData?.organizerReferenceStatus !== undefined
    && parsed.preparationData.organizerReferenceStatus !== currentPreparationData.organizerReferenceStatus
  ) {
    return validationErrorResponse({
      preparationData: ["La provenance de l'organisateur ne peut pas être modifiée sans résoudre à nouveau son identité."],
    });
  }
  if (parsed.organizerAccounts?.length === 0 && nextOrganizerType !== "spontaneous") {
    return validationErrorResponse({
      organizerAccounts: [
        "Une action structurée doit conserver au moins un compte organisateur réel.",
      ],
    });
  }
  const spontaneousOrganizerError = validateSpontaneousOrganizerPatch(
    current,
    parsed,
    organizerIds,
  );
  if (spontaneousOrganizerError) return spontaneousOrganizerError;
  const canonicalizedBody = await canonicalizePersistedPrimaryOrganizerName({
    supabase,
    actionId,
    current,
    parsed,
    organizerName: parsed.organizerName,
  });
  if (canonicalizedBody instanceof Response) return canonicalizedBody;

  const validatedOrganizerAccountCount = await validatePatchOrganizerAccounts({
    supabase,
    userId,
    identity,
    organizerAccounts: canonicalizedBody.organizerAccounts,
  });
  if (validatedOrganizerAccountCount instanceof Response) return validatedOrganizerAccountCount;
  const resolvedOrganizerAccountCount = canonicalizedBody.organizerAccounts === undefined
    ? organizerIds.length
    : validatedOrganizerAccountCount;
  return await resolveActionUpdateOrganizer({
    supabase,
    body: canonicalizedBody,
    current,
    resolvedOrganizerAccountCount,
  });
}
export async function preparePatchMutation({
  supabase,
  actionId,
  userId,
  current,
  identity,
  organizerIds,
  parsed,
}: {
  supabase: ReturnType<typeof getSupabaseServerClient>;
  actionId: string;
  userId: string;
  current: ActionRow;
  identity: Awaited<ReturnType<typeof getCurrentUserIdentity>>;
  organizerIds: string[];
  parsed: ActionUpdateInput;
}): Promise<Response | PreparedPatchMutation> {
  const parsedBodyResult = await preparePatchOrganizerFields({
    supabase,
    actionId,
    userId,
    current,
    identity,
    organizerIds,
    parsed,
  });
  if (parsedBodyResult instanceof Response) return parsedBodyResult;
  const parsedBody = parsedBodyResult;

  const preparedUpdate = await prepareActionUpdate({ current, parsedBody, userId }).catch((error: unknown) => {
    if (error instanceof ActionUpdateValidationError) {
      return validationErrorResponse({ [error.field]: [error.message] });
    }
    throw error;
  });
  if (preparedUpdate instanceof Response) return preparedUpdate;

  const nextPhase = preparedUpdate.updateData.action_phase as ActionRow["action_phase"] | undefined
    ?? current.action_phase;
  if (current.action_phase === "post_action_complete" && nextPhase !== "post_action_complete") {
    return NextResponse.json(
      { error: "Une action finalisée ne peut pas revenir à une phase antérieure.", code: "state_conflict" },
      { status: 409 },
    );
  }
  const hasFinalResults = hasFinalReportFields(parsedBody);
  const isFinalizationWork =
    current.action_phase !== "post_action_complete" &&
    (nextPhase === "post_action_draft" || nextPhase === "post_action_complete") &&
    (parsedBody.actionPhase !== undefined || hasFinalResults);
  const effectiveTemporalAction = {
    ...current,
    action_date: typeof preparedUpdate.updateData.action_date === "string"
      ? preparedUpdate.updateData.action_date
      : current.action_date,
    action_timezone: typeof preparedUpdate.updateData.action_timezone === "string"
      ? preparedUpdate.updateData.action_timezone
      : current.action_timezone,
    event_end_at: Object.prototype.hasOwnProperty.call(preparedUpdate.updateData, "event_end_at")
      ? preparedUpdate.updateData.event_end_at as string | null
      : current.event_end_at,
  };
  if (isFinalizationWork && !isActionFinalizationEligible(effectiveTemporalAction)) {
    return NextResponse.json(
      {
        error: "Le bilan ne peut être complété qu'après la fin de l'action.",
        code: "finalization_not_eligible",
      },
      { status: 409 },
    );
  }
  if (current.action_phase === "pre_action" && nextPhase === "pre_action" && hasFinalResults) {
    return NextResponse.json(
      {
        error: "Les résultats terrain doivent être enregistrés dans le bilan après l'action.",
        code: "final_results_require_post_action_phase",
      },
      { status: 409 },
    );
  }

  const isFirstFinalization =
    current.action_phase !== "post_action_complete" &&
    preparedUpdate.updateData.action_phase === "post_action_complete";
  const validatedImpactCorrection =
    !isFirstFinalization &&
    current.action_phase === "post_action_complete" &&
    current.status === "approved" &&
    hasActionImpactUpdate(parsedBody);
  if (validatedImpactCorrection && !canEditValidatedImpact(identity)) {
    return NextResponse.json(
      { error: "La correction d'un impact validé est réservée aux administrateurs autorisés." },
      { status: 403 },
    );
  }
  const moderationReason = validatedImpactCorrection
    ? normalizeModerationReason(parsedBody.reason, { required: isModerationReasonRequired("correct_impact") })
    : null;
  if (validatedImpactCorrection && !moderationReason) {
    return validationErrorResponse({ reason: ["Un motif d'au moins 5 caractères est requis pour corriger un impact validé."] });
  }

  return {
    preparedUpdate,
    shouldAuditModeration: validatedImpactCorrection || (
      Boolean(identity) &&
      userId !== current.created_by_clerk_id &&
      canManageActionsGlobally(identity)
    ),
    adminAuditActorUserId: identity?.userId ?? userId,
    adminAuditTargetUserId: current.created_by_clerk_id.trim() || null,
    moderationOperation: validatedImpactCorrection ? "correct_impact" : "edit_action",
    moderationReason,
  };
}

function hasFinalReportFields(body: ActionUpdateInput): boolean {
  return body.wasteKg !== undefined ||
    body.cigaretteButts !== undefined ||
    body.cigaretteButtsKg !== undefined ||
    body.cigaretteButtsMeasurements !== undefined ||
    body.cigaretteButtsMassKg !== undefined ||
    body.cigaretteButtsVolumeLiters !== undefined ||
    body.cigaretteButtsCondition !== undefined ||
    body.volunteersCount !== undefined ||
    body.volunteerParticipation !== undefined ||
    body.collectorsCount !== undefined ||
    body.wasteBreakdown !== undefined ||
    body.wasteMeasurementMethod !== undefined ||
    body.photos !== undefined ||
    body.visionEstimate !== undefined;
}
