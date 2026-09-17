import type { SupabaseClient } from "@supabase/supabase-js";
import type { ActionRow } from "@/types/database";
import {
  isFutureActionCancellationEligible,
} from "./temporal";
import { loadActionById } from "./store";
import {
  ActionCancellationError,
  type ActionCancellationReason,
  type ActionCancellationResult,
} from "./cancellation-contract";

export {
  ACTION_CANCELLATION_CONFIRMATION,
  ACTION_CANCELLATION_REASONS,
  ActionCancellationError,
} from "./cancellation-contract";
export type {
  ActionCancellationReason,
  ActionCancellationResult,
} from "./cancellation-contract";

function cancellationResultFromAction(
  action: ActionRow,
  alreadyCancelled: boolean,
): ActionCancellationResult {
  if (
    action.status !== "cancelled" ||
    !action.cancelled_at ||
    !action.cancelled_by_clerk_id ||
    (action.cancelled_from_status !== "pending" &&
      action.cancelled_from_status !== "approved")
  ) {
    throw new ActionCancellationError(
      "conflict",
      "L'état d'annulation de cette action est incomplet.",
    );
  }

  return {
    id: action.id,
    status: "cancelled",
    alreadyCancelled,
    cancelledAt: action.cancelled_at,
    cancelledBy: action.cancelled_by_clerk_id,
    cancellationReason: action.cancellation_reason ?? null,
    previousStatus: action.cancelled_from_status,
  };
}

export async function cancelFutureAction(
  supabase: SupabaseClient,
  params: {
    actionId: string;
    actorUserId: string;
    reason?: ActionCancellationReason | null;
    now?: Date;
  },
): Promise<ActionCancellationResult> {
  const current = await loadActionById(supabase, params.actionId);
  if (!current) {
    throw new ActionCancellationError("not_found", "Action introuvable.");
  }

  if (current.status === "cancelled") {
    return cancellationResultFromAction(current, true);
  }

  if (!isFutureActionCancellationEligible(current, params.now)) {
    throw new ActionCancellationError(
      "not_eligible",
      "Seule une action future pré-action déjà publiée peut être annulée.",
    );
  }

  const cancelledAt = (params.now ?? new Date()).toISOString();
  const result = await supabase
    .from("actions")
    .update({
      status: "cancelled",
      cancelled_at: cancelledAt,
      cancelled_by_clerk_id: params.actorUserId,
      cancellation_reason: params.reason ?? null,
      cancelled_from_status: current.status,
    })
    .eq("id", params.actionId)
    .in("status", ["pending", "approved"])
    .eq("action_phase", "pre_action")
    .not("published_at", "is", null)
    .select(
      "id, status, cancelled_at, cancelled_by_clerk_id, cancellation_reason, cancelled_from_status",
    )
    .maybeSingle();

  if (result.error) {
    throw result.error;
  }

  if (result.data) {
    return cancellationResultFromAction(
      result.data as ActionRow,
      false,
    );
  }

  const afterRace = await loadActionById(supabase, params.actionId);
  if (afterRace?.status === "cancelled") {
    return cancellationResultFromAction(afterRace, true);
  }

  throw new ActionCancellationError(
    "conflict",
    "L'action a changé avant la confirmation de son annulation.",
  );
}
