import type { SupabaseClient } from "@supabase/supabase-js";

export const ACTION_FIELD_ROLE_OPTIONS = [
  {
    code: "organizer_primary",
    label: "Organisateur référent",
    description: "Responsabilité d’organisation principale attestée après l’action.",
  },
  {
    code: "coorganizer",
    label: "Coorganisateur",
    description: "Responsabilité de coorganisation attestée après l’action.",
  },
  {
    code: "group_lead",
    label: "Responsable du groupe",
    description: "Coordination du groupe et du déroulé terrain.",
  },
  {
    code: "cigarette_bag_lead",
    label: "Référent sacs mégots",
    description: "Organisation et suivi des sacs dédiés aux mégots.",
  },
  {
    code: "recyclable_bag_lead",
    label: "Référent sacs recyclables",
    description: "Organisation et suivi des sacs de recyclables.",
  },
  {
    code: "household_waste_bag_lead",
    label: "Référent sacs déchets ménagers",
    description: "Organisation et suivi des sacs de déchets ménagers.",
  },
  {
    code: "glass_bag_lead",
    label: "Référent sacs verre",
    description: "Organisation et suivi des sacs de verre.",
  },
] as const;

export type ActionFieldRoleCode = (typeof ACTION_FIELD_ROLE_OPTIONS)[number]["code"];
export type ActionFieldRoleAssignmentStatus = "active" | "revoked";
export type ActionFieldRoleTransferStatus =
  | "pending"
  | "accepted"
  | "rejected"
  | "cancelled"
  | "expired";

export type ActionFieldRoleAssignment = {
  id: string;
  action_id: string;
  user_id: string;
  role_code: ActionFieldRoleCode;
  assignment_status: ActionFieldRoleAssignmentStatus;
  assigned_by_clerk_id: string;
  created_at: string;
  updated_at: string;
};

export type ActionFieldRoleTransferProposal = {
  id: string;
  action_id: string;
  current_primary_user_id: string;
  successor_user_id: string;
  proposed_by_clerk_id: string;
  status: ActionFieldRoleTransferStatus;
  expires_at: string;
  created_at: string;
  updated_at: string;
  decided_at: string | null;
  decided_by_clerk_id: string | null;
  decision_reason: string | null;
};

export type ActionFieldRoleState = {
  assignments: ActionFieldRoleAssignment[];
  pendingTransfer: ActionFieldRoleTransferProposal | null;
  transferProposals: ActionFieldRoleTransferProposal[];
};

const ASSIGNMENT_COLUMNS =
  "id, action_id, user_id, role_code, assignment_status, assigned_by_clerk_id, created_at, updated_at";
const TRANSFER_COLUMNS =
  "id, action_id, current_primary_user_id, successor_user_id, proposed_by_clerk_id, status, expires_at, created_at, updated_at, decided_at, decided_by_clerk_id, decision_reason";

export function isActionFieldRoleCode(value: string): value is ActionFieldRoleCode {
  return ACTION_FIELD_ROLE_OPTIONS.some((option) => option.code === value);
}

export function normalizeActionFieldRoleCodes(values: readonly string[]): ActionFieldRoleCode[] {
  return [...new Set(values.map((value) => value.trim()).filter(isActionFieldRoleCode))];
}

export function actionFieldRoleLabel(code: ActionFieldRoleCode): string {
  return ACTION_FIELD_ROLE_OPTIONS.find((option) => option.code === code)?.label ?? code;
}

export async function loadActionFieldRoleState(
  supabase: SupabaseClient,
  actionId: string,
): Promise<ActionFieldRoleState> {
  const [assignmentsResult, transferResult] = await Promise.all([
    supabase
      .from("action_field_role_assignments")
      .select(ASSIGNMENT_COLUMNS)
      .eq("action_id", actionId)
      .eq("assignment_status", "active")
      .order("user_id", { ascending: true })
      .order("role_code", { ascending: true }),
    supabase
      .from("action_field_role_transfer_proposals")
      .select(TRANSFER_COLUMNS)
      .eq("action_id", actionId)
      .order("created_at", { ascending: false })
      .limit(20),
  ]);
  if (assignmentsResult.error) throw new Error(assignmentsResult.error.message);
  if (transferResult.error) throw new Error(transferResult.error.message);

  const transferProposals = (transferResult.data ?? []) as ActionFieldRoleTransferProposal[];
  return {
    assignments: (assignmentsResult.data ?? []) as ActionFieldRoleAssignment[],
    pendingTransfer: transferProposals.find((proposal) => proposal.status === "pending") ?? null,
    transferProposals,
  };
}

export async function replaceActionFieldRoles(
  supabase: SupabaseClient,
  params: { actionId: string; userId: string; roleCodes: readonly ActionFieldRoleCode[]; actorId: string },
): Promise<ActionFieldRoleAssignment[]> {
  const result = await supabase.rpc("assign_action_field_roles", {
    p_action_id: params.actionId,
    p_user_id: params.userId,
    p_role_codes: params.roleCodes,
    p_actor_id: params.actorId,
  });
  if (result.error) throw new Error(result.error.message);
  return (result.data ?? []) as ActionFieldRoleAssignment[];
}

export async function proposeActionFieldRoleTransfer(
  supabase: SupabaseClient,
  params: { actionId: string; successorUserId: string; actorId: string; actorIsGlobalAdmin: boolean },
): Promise<ActionFieldRoleTransferProposal> {
  const result = await supabase.rpc("propose_action_field_role_transfer", {
    p_action_id: params.actionId,
    p_successor_user_id: params.successorUserId,
    p_actor_id: params.actorId,
    p_actor_is_global_admin: params.actorIsGlobalAdmin,
  });
  if (result.error) throw new Error(result.error.message);
  return (Array.isArray(result.data) ? result.data[0] : result.data) as ActionFieldRoleTransferProposal;
}

export async function respondToActionFieldRoleTransfer(
  supabase: SupabaseClient,
  params: { actionId: string; proposalId: string; actorId: string; decision: "accept" | "reject"; actorIsGlobalAdmin: boolean; reason?: string | null },
): Promise<ActionFieldRoleTransferProposal> {
  const result = await supabase.rpc("respond_action_field_role_transfer", {
    p_action_id: params.actionId,
    p_proposal_id: params.proposalId,
    p_actor_id: params.actorId,
    p_decision: params.decision,
    p_actor_is_global_admin: params.actorIsGlobalAdmin,
    p_reason: params.reason ?? null,
  });
  if (result.error) throw new Error(result.error.message);
  return (Array.isArray(result.data) ? result.data[0] : result.data) as ActionFieldRoleTransferProposal;
}
