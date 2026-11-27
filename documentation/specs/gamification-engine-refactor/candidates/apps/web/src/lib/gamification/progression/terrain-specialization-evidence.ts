import type { SupabaseClient } from "@supabase/supabase-js";
import { loadCompleteGamificationRows, loadCompleteGamificationRowsByIds } from "./gamification-evidence-pagination";
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
  data_provenance: "unknown" | "real" | "test";
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

function readEvidenceRows<T>(result: { data: unknown; error: { message: string } | null }): T[] {
  if (result.error) throw new Error(result.error.message);
  return (result.data ?? []) as T[];
}

export async function loadTerrainSpecializationEvidence(
  supabase: SupabaseClient,
  userId: string,
  options: { complete?: boolean } = {},
): Promise<TerrainSpecializationEvidence[]> {
  const queryOptions = options.complete ? { count: "exact" as const } : undefined;
  const attestationQuery = () => supabase
    .from("action_role_attestations")
    .select("id, action_id, user_id, role_code, verification_status, responsibility_provenance, provenance_snapshot, revision", queryOptions)
    .eq("user_id", userId)
    .eq("verification_status", "confirmed");
  const attestations = options.complete
    ? await loadCompleteGamificationRows<AttestationRow>("action_role_attestations", (from, to) =>
      attestationQuery().order("id", { ascending: true }).range(from, to))
    : readEvidenceRows<AttestationRow>(await attestationQuery().limit(10000));
  const eligibleAttestations = attestations.filter((row) => {
    const definition = SPECIALIZATION_BY_ROLE_CODE.get(row.role_code);
    return Boolean(definition) && organizerSnapshotMatches(row, definition!, userId);
  });
  const actionIds = [...new Set(eligibleAttestations.map((row) => row.action_id))];
  if (actionIds.length === 0) return [];

  const actionQuery = (ids: string[]) => supabase
    .from("actions")
    .select("id, action_date, created_at, status, action_phase, published_at, moderation_visibility, data_provenance", queryOptions)
    .in("id", ids);
  const participantQuery = (ids: string[]) => supabase
    .from("action_participants")
    .select("id, action_id", queryOptions)
    .in("action_id", ids)
    .eq("user_id", userId)
    .eq("participation_status", "confirmed");
  type ParticipantEvidenceRow = { id: string; action_id: string };
  const [actionRows, participantRows] = options.complete
    ? await Promise.all([
      loadCompleteGamificationRowsByIds<ActionEvidenceRow>("terrain specialization actions", actionIds, (ids, from, to) =>
        actionQuery(ids).order("id", { ascending: true }).range(from, to)),
      loadCompleteGamificationRowsByIds<ParticipantEvidenceRow>("terrain specialization participants", actionIds, (ids, from, to) =>
        participantQuery(ids).order("id", { ascending: true }).range(from, to)),
    ])
    : await Promise.all([
      actionQuery(actionIds).then(readEvidenceRows<ActionEvidenceRow>),
      participantQuery(actionIds).then(readEvidenceRows<ParticipantEvidenceRow>),
    ]);

  const actions = new Map(actionRows.map((action) => [action.id, action]));
  if (options.complete && actionIds.some((id) => !actions.has(id))) {
    throw new Error("Incomplete gamification evidence (terrain specialization): missing related action");
  }
  const confirmedActionIds = new Set(participantRows.map((row) => row.action_id).filter(Boolean));
  return eligibleAttestations.flatMap((attestation) => {
    const action = actions.get(attestation.action_id);
    const definition = SPECIALIZATION_BY_ROLE_CODE.get(attestation.role_code);
    if (!action || action.data_provenance === "test" || !definition || !confirmedActionIds.has(action.id) || !isActionFinalizedForRoleAttestation({
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
