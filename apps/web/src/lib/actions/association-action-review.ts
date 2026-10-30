import type { SupabaseClient } from "@supabase/supabase-js";
import type { ActionRow } from "@/types/database";

export type AssociationActionReviewState = NonNullable<ActionRow["review_state"]>;

export function isAssociationActionReviewRequired(
  action: Pick<ActionRow, "organizer_type" | "action_phase">,
): boolean {
  return action.action_phase === "pre_action" &&
    (action.organizer_type === "association" || action.organizer_type === "student_association");
}

export type AssociationActionReviewRpcResult = {
  status?: string;
  review_state?: AssociationActionReviewState | null;
  published_at?: string | null;
  updated_at?: string | null;
  idempotent?: boolean;
};

export async function submitAssociationActionReview(params: {
  supabase: SupabaseClient;
  actionId: string;
  actorUserId: string;
  expectedUpdatedAt?: string | null;
}): Promise<AssociationActionReviewRpcResult> {
  const result = await params.supabase.rpc("submit_association_action_review", {
    p_action_id: params.actionId,
    p_actor_user_id: params.actorUserId,
    p_expected_updated_at: params.expectedUpdatedAt ?? null,
  });
  if (result.error) throw new Error(result.error.message);
  return (result.data ?? {}) as AssociationActionReviewRpcResult;
}

export async function decideAssociationActionReview(params: {
  supabase: SupabaseClient;
  actionId: string;
  decision: "approve" | "reject";
  actorUserId: string;
  operationId: string;
  reason: string;
  expectedReviewState?: AssociationActionReviewState;
  expectedUpdatedAt?: string | null;
}): Promise<AssociationActionReviewRpcResult> {
  const result = await params.supabase.rpc("decide_association_action_review", {
    p_action_id: params.actionId,
    p_decision: params.decision,
    p_actor_user_id: params.actorUserId,
    p_operation_id: params.operationId,
    p_reason: params.reason,
    p_expected_review_state: params.expectedReviewState ?? "pending_review",
    p_expected_updated_at: params.expectedUpdatedAt ?? null,
  });
  if (result.error) throw new Error(result.error.message);
  return (result.data ?? {}) as AssociationActionReviewRpcResult;
}
