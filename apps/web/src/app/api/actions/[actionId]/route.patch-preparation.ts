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
    (params.body.organizerType ?? params.current.organizer_type) === "spontaneous" &&
    params.updateData.action_phase === "post_action_complete" &&
    params.body.organizerAccounts !== undefined
  );
}

async function preparePatchOrganizerFields({
  supabase,
  userId,
  current,
  identity,
  organizerIds,
  parsed,
}: {
  supabase: ReturnType<typeof getSupabaseServerClient>;
  userId: string;
  current: ActionRow;
  identity: Awaited<ReturnType<typeof getCurrentUserIdentity>>;
  organizerIds: string[];
  parsed: ActionUpdateInput;
}): Promise<Response | ActionUpdateInput> {
  const nextOrganizerType = parsed.organizerType ?? current.organizer_type;
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

  const parsedBody = await resolveActionUpdateOrganizer({ supabase, body: parsed, current });
  return await validatePatchOrganizerAccounts({
    supabase,
    userId,
    identity,
    organizerAccounts: parsedBody.organizerAccounts,
  }) ?? parsedBody;
}
export async function preparePatchMutation({
  supabase,
  userId,
  current,
  identity,
  organizerIds,
  parsed,
}: {
  supabase: ReturnType<typeof getSupabaseServerClient>;
  userId: string;
  current: ActionRow;
  identity: Awaited<ReturnType<typeof getCurrentUserIdentity>>;
  organizerIds: string[];
  parsed: ActionUpdateInput;
}): Promise<Response | PreparedPatchMutation> {
  const parsedBodyResult = await preparePatchOrganizerFields({
    supabase,
    userId,
    current,
    identity,
    organizerIds,
    parsed,
  });
  if (parsedBodyResult instanceof Response) return parsedBodyResult;
  const parsedBody = parsedBodyResult;
  const validatedImpactCorrection = current.status === "approved" && hasActionImpactUpdate(parsedBody);
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

  const preparedUpdate = await prepareActionUpdate({ current, parsedBody }).catch((error: unknown) => {
    if (error instanceof ActionUpdateValidationError) {
      return validationErrorResponse({ [error.field]: [error.message] });
    }
    throw error;
  });
  if (preparedUpdate instanceof Response) return preparedUpdate;

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
