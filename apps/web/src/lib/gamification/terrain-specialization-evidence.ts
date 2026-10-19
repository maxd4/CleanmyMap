import type { SupabaseClient } from "@supabase/supabase-js";
import { isActionFinalizedForRoleAttestation, type ActionRoleAttestationProvenance } from "@/lib/actions/role-attestations";
import { TERRAIN_SPECIALIZATIONS, type TerrainSpecializationDefinition, type TerrainSpecializationEvidence } from "./terrain-specializations";

type AttestationRow = {
  id: string;
  action_id: string;
  user_id: string;
  role_code: string;
  verification_status: string;
  responsibility_provenance: ActionRoleAttestationProvenance;
  provenance_snapshot: Record<string, unknown>;
  revision: number;
};

type ActionEvidenceRow = {
  id: string;
  action_date: string;
  created_at: string;
  status: "pending" | "approved" | "rejected" | "cancelled";
  action_phase: "pre_action" | "post_action_draft" | "post_action_complete";
  published_at: string | null;
  moderation_visibility?: "visible" | "hidden" | null;
};

const SPECIALIZATION_BY_ROLE_CODE = new Map<string, TerrainSpecializationDefinition>(
  TERRAIN_SPECIALIZATIONS.map((definition) => [definition.roleCode, definition]),
);

function organizerSnapshotMatches(
  evidence: AttestationRow,
  specialization: TerrainSpecializationDefinition,
  userId: string,
): boolean {
  if (specialization.id !== "organizer_primary" && specialization.id !== "coorganizer") return true;
  const snapshot = evidence.provenance_snapshot?.targetOrganizer;
  if (!snapshot || typeof snapshot !== "object") return false;
  const organizer = snapshot as Record<string, unknown>;
  return organizer.organizer_clerk_id === userId &&
    typeof organizer.is_primary === "boolean" &&
    organizer.is_primary === (specialization.id === "organizer_primary");
}

export async function loadTerrainSpecializationEvidence(
  supabase: SupabaseClient,
  userId: string,
): Promise<TerrainSpecializationEvidence[]> {
  const attestationsResult = await supabase
    .from("action_role_attestations")
    .select("id, action_id, user_id, role_code, verification_status, responsibility_provenance, provenance_snapshot, revision")
    .eq("user_id", userId)
    .eq("verification_status", "confirmed")
    .limit(10000);
  if (attestationsResult.error) throw new Error(attestationsResult.error.message);

  const attestations = (attestationsResult.data ?? []) as AttestationRow[];
  const eligibleAttestations = attestations.filter((row) => {
    const definition = SPECIALIZATION_BY_ROLE_CODE.get(row.role_code);
    return Boolean(definition) && organizerSnapshotMatches(row, definition!, userId);
  });
  const actionIds = [...new Set(eligibleAttestations.map((row) => row.action_id))];
  if (actionIds.length === 0) return [];

  const [actionsResult, participantsResult] = await Promise.all([
    supabase
      .from("actions")
      .select("id, action_date, created_at, status, action_phase, published_at, moderation_visibility")
      .in("id", actionIds),
    supabase
      .from("action_participants")
      .select("action_id")
      .in("action_id", actionIds)
      .eq("user_id", userId)
      .eq("participation_status", "confirmed"),
  ]);
  if (actionsResult.error) throw new Error(actionsResult.error.message);
  if (participantsResult.error) throw new Error(participantsResult.error.message);

  const actions = new Map(
    ((actionsResult.data ?? []) as ActionEvidenceRow[]).map((action) => [action.id, action]),
  );
  const confirmedActionIds = new Set(
    ((participantsResult.data ?? []) as Array<{ action_id?: string }>).map((row) => row.action_id).filter(Boolean),
  );
  return eligibleAttestations.flatMap((attestation) => {
    const action = actions.get(attestation.action_id);
    const definition = SPECIALIZATION_BY_ROLE_CODE.get(attestation.role_code);
    if (!action || !definition || !confirmedActionIds.has(action.id) || !isActionFinalizedForRoleAttestation({
      ...action,
      moderation_visibility: action.moderation_visibility ?? undefined,
    })) return [];
    return [{
      actionId: action.id,
      actionDate: action.action_date,
      actionCreatedAt: action.created_at,
      specializationId: definition.id,
      roleCode: definition.roleCode,
      attestationId: attestation.id,
      attestationRevision: Number(attestation.revision) || 1,
      provenance: attestation.responsibility_provenance,
    }];
  });
}
