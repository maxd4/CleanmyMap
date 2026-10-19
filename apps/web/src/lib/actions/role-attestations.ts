import type { SupabaseClient } from "@supabase/supabase-js";
import type { ActionFieldRoleCode, ActionFieldRoleAssignment } from "./field-roles";
import type { ActionRow } from "@/types/database";

export type ActionRoleAttestationStatus = "pending" | "confirmed" | "rejected";
export type ActionRoleAttestationProvenance = "planned_assignment" | "retrospective";

export type ActionRoleAttestation = {
  id: string;
  action_id: string;
  user_id: string;
  role_code: ActionFieldRoleCode;
  verification_status: ActionRoleAttestationStatus;
  reviewer_clerk_id: string | null;
  decided_at: string | null;
  decision_reason: string | null;
  responsibility_provenance: ActionRoleAttestationProvenance;
  provenance_snapshot: Record<string, unknown>;
  revision: number;
  created_at: string;
  updated_at: string;
};

export type ActionRoleAttestationAudit = {
  id: string;
  action_id: string;
  attestation_id: string | null;
  user_id: string;
  role_code: string;
  event_code: string;
  actor_clerk_id: string;
  reviewer_clerk_id: string | null;
  previous_status: string | null;
  next_status: string;
  decision_reason: string | null;
  responsibility_provenance: ActionRoleAttestationProvenance;
  provenance_snapshot: Record<string, unknown>;
  revision: number;
  created_at: string;
};

export type ActionRoleAttestationState = {
  assignments: ActionFieldRoleAssignment[];
  attestations: ActionRoleAttestation[];
};

const ASSIGNMENT_COLUMNS =
  "id, action_id, user_id, role_code, assignment_status, assigned_by_clerk_id, created_at, updated_at";
const ATTESTATION_COLUMNS =
  "id, action_id, user_id, role_code, verification_status, reviewer_clerk_id, decided_at, decision_reason, responsibility_provenance, provenance_snapshot, revision, created_at, updated_at";

export function isActionFinalizedForRoleAttestation(action: Pick<ActionRow, "status" | "action_phase" | "published_at" | "moderation_visibility">): boolean {
  return action.status === "approved"
    && action.action_phase === "post_action_complete"
    && Boolean(action.published_at)
    && action.moderation_visibility !== "hidden";
}

export async function loadActionRoleAttestationState(
  supabase: SupabaseClient,
  actionId: string,
): Promise<ActionRoleAttestationState> {
  const [assignmentsResult, attestationsResult] = await Promise.all([
    supabase
      .from("action_field_role_assignments")
      .select(ASSIGNMENT_COLUMNS)
      .eq("action_id", actionId)
      .eq("assignment_status", "active")
      .order("user_id", { ascending: true })
      .order("role_code", { ascending: true }),
    supabase
      .from("action_role_attestations")
      .select(ATTESTATION_COLUMNS)
      .eq("action_id", actionId)
      .order("user_id", { ascending: true })
      .order("role_code", { ascending: true }),
  ]);
  if (assignmentsResult.error) throw new Error(assignmentsResult.error.message);
  if (attestationsResult.error) throw new Error(attestationsResult.error.message);
  return {
    assignments: (assignmentsResult.data ?? []) as ActionFieldRoleAssignment[],
    attestations: (attestationsResult.data ?? []) as ActionRoleAttestation[],
  };
}

export async function reviewActionRoleAttestation(
  supabase: SupabaseClient,
  params: {
    actionId: string;
    userId: string;
    roleCode: ActionFieldRoleCode;
    decision: "confirm" | "reject";
    reviewerClerkId: string;
    reason?: string | null;
    reviewerIsGlobalAdmin: boolean;
  },
): Promise<ActionRoleAttestation> {
  const result = await supabase.rpc("review_action_role_attestation", {
    p_action_id: params.actionId,
    p_user_id: params.userId,
    p_role_code: params.roleCode,
    p_decision: params.decision,
    p_reviewer_clerk_id: params.reviewerClerkId,
    p_reason: params.reason?.trim() || null,
    p_reviewer_is_global_admin: params.reviewerIsGlobalAdmin,
  });
  if (result.error) throw new Error(result.error.message);
  return (Array.isArray(result.data) ? result.data[0] : result.data) as ActionRoleAttestation;
}
