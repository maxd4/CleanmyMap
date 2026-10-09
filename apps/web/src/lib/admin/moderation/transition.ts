import { runSingleActionQuery } from "@/lib/actions/query";
import { type ModerationSupabaseClient } from "@/app/api/admin/moderation/route.shared";
import {
  trackActionRejection,
  trackActionValidationBonus,
} from "@/lib/gamification/progression";
import {
  notifyActionRejection,
  notifyActionValidation,
} from "@/lib/admin/moderation/moderation-notifications";
import { logFailure } from "@/lib/logging/failure-log";

async function runActionRejectionSideEffects(
  supabase: ModerationSupabaseClient,
  params: {
    actionId: string;
    actorUserId: string;
    reason: string | null;
    revision: string | null;
  },
): Promise<void> {
  const actionDetails = await runSingleActionQuery<{
    created_by_clerk_id: string | null;
  }>(supabase, (query) =>
    query.select("created_by_clerk_id").eq("id", params.actionId).maybeSingle(),
  );

  try {
    await trackActionRejection(supabase, { actionId: params.actionId });
  } catch (error) {
    logFailure(
      "Moderation/Action",
      "Action rejection progression failed",
      error,
      { actionId: params.actionId, actorUserId: params.actorUserId },
    );
  }

  if (!params.revision) {
    logFailure(
      "Moderation/Action",
      "Action rejection notification skipped because the persisted revision is unavailable",
      undefined,
      { actionId: params.actionId },
    );
    return;
  }

  try {
    await notifyActionRejection(supabase, {
      actionId: params.actionId,
      userId: actionDetails?.created_by_clerk_id ?? null,
      reason: params.reason,
      revision: params.revision,
    });
  } catch (error) {
    logFailure(
      "Moderation/Action",
      "Action rejection notification failed",
      error,
      { actionId: params.actionId },
    );
  }
}

export async function runActionTransitionSideEffects(
  supabase: ModerationSupabaseClient,
  params: {
    actionId: string;
    actorUserId: string;
    approvalTransition: boolean;
    rejectionTransition: boolean;
    reason: string | null;
    revision: string | null;
  },
): Promise<void> {
  if (params.approvalTransition) {
    const actionDetails = await runSingleActionQuery<{
      created_by_clerk_id: string | null;
    }>(supabase, (query) =>
      query.select("created_by_clerk_id").eq("id", params.actionId).maybeSingle(),
    );

    try {
      await trackActionValidationBonus(supabase, { actionId: params.actionId });
    } catch (error) {
      logFailure(
        "Moderation/Action",
        "Action validation progression failed",
        error,
        { actionId: params.actionId, actorUserId: params.actorUserId },
      );
    }

    if (!params.revision) {
      logFailure(
        "Moderation/Action",
        "Action validation notification skipped because the persisted revision is unavailable",
        undefined,
        { actionId: params.actionId },
      );
      return;
    }

    try {
      await notifyActionValidation(supabase, {
        actionId: params.actionId,
        userId: actionDetails?.created_by_clerk_id ?? null,
        revision: params.revision,
      });
    } catch (error) {
      logFailure(
        "Moderation/Action",
        "Action validation notification failed",
        error,
        { actionId: params.actionId },
      );
    }
    return;
  }

  if (params.rejectionTransition) {
    await runActionRejectionSideEffects(supabase, params);
  }
}
