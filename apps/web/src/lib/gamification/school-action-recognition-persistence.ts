import type { SupabaseClient } from "@supabase/supabase-js";
import { loadActionById } from "@/lib/actions/store";
import { loadCanonicalActionOrganizerIdsForAction } from "@/lib/actions/participation/organizers";
import { logFailure } from "@/lib/logging/failure-log";
import {
  assessSchoolActionRecognitions,
  schoolActionRecognitionSourceId,
} from "./school-action-recognition";

const RECONCILIATION_RPC = "reconcile_school_action_collective_recognitions";
const MAX_RECONCILIATION_ATTEMPTS = 2;

type ReconciliationRpcRow = {
  reconciliation_status?: string | null;
};

function isMissingRecognitionPersistence(error: { code?: string | null; message?: string | null } | null): boolean {
  return error?.code === "42P01" || error?.code === "42883" || error?.code === "PGRST202";
}

function firstRpcRow(data: unknown): ReconciliationRpcRow | null {
  if (Array.isArray(data)) return (data[0] ?? null) as ReconciliationRpcRow | null;
  return data && typeof data === "object" ? data as ReconciliationRpcRow : null;
}

/**
 * Reconcile action-scoped school recognitions through one PostgreSQL boundary.
 * The RPC locks the action, compares updated_at, rechecks the active lifecycle,
 * and upserts all recognition rows in the same transaction. A stale snapshot
 * is reloaded at most once; no unsafe client-side fallback is allowed.
 */
export async function reconcileSchoolActionRecognitions(params: {
  supabase: SupabaseClient;
  actionId: string;
  actorUserId?: string | null;
}): Promise<{
  status: "reconciled" | "unavailable" | "not_found" | "skipped";
  activeIds: string[];
}> {
  const { supabase, actionId, actorUserId = null } = params;

  for (let attempt = 0; attempt < MAX_RECONCILIATION_ATTEMPTS; attempt += 1) {
    const action = await loadActionById(supabase, actionId).catch((error) => {
      logFailure("Gamification", "School recognition action load failed", error, { actionId });
      return null;
    });
    if (!action) return { status: "not_found", activeIds: [] };
    if (!action.updated_at) {
      logFailure("Gamification", "School recognition action has no concurrency revision", null, { actionId });
      return { status: "unavailable", activeIds: [] };
    }

    let organizerIds: string[];
    try {
      organizerIds = await loadCanonicalActionOrganizerIdsForAction(supabase, actionId);
    } catch (error) {
      logFailure("Gamification", "School recognition organizer state unavailable", error, { actionId });
      return { status: "unavailable", activeIds: [] };
    }

    const assessments = assessSchoolActionRecognitions({
      action,
      canonicalOrganizerIds: organizerIds,
    });
    const evaluatedAt = new Date().toISOString();
    const rows = assessments.map((assessment) => ({
      action_id: actionId,
      recognition_id: assessment.id,
      status: assessment.qualified ? "active" : "invalidated",
      proof_snapshot: {
        sourceId: schoolActionRecognitionSourceId(actionId, assessment.id),
        evidence: assessment.evidence,
        xpAwarded: 0,
      },
      invalidated_reason: assessment.qualified ? null : assessment.reason,
      evaluated_at: evaluatedAt,
      evaluated_by_clerk_id: actorUserId,
    }));

    let rpcResult: { data: unknown; error: { code?: string | null; message?: string | null } | null };
    try {
      rpcResult = await supabase.rpc(RECONCILIATION_RPC, {
        p_action_id: actionId,
        p_expected_action_updated_at: action.updated_at,
        p_rows: rows,
        p_actor_user_id: actorUserId,
      });
    } catch (error) {
      logFailure("Gamification", "School recognition reconciliation unavailable", error, { actionId });
      return { status: "unavailable", activeIds: [] };
    }

    if (rpcResult.error) {
      if (!isMissingRecognitionPersistence(rpcResult.error)) {
        logFailure("Gamification", "School recognition reconciliation failed", rpcResult.error, { actionId });
      }
      return { status: "unavailable", activeIds: [] };
    }

    const status = firstRpcRow(rpcResult.data)?.reconciliation_status;
    if (status === "stale") continue;
    if (status === "skipped") return { status: "skipped", activeIds: [] };
    if (status !== "reconciled") {
      logFailure("Gamification", "School recognition reconciliation returned an invalid state", null, { actionId, status });
      return { status: "unavailable", activeIds: [] };
    }

    return {
      status: "reconciled",
      activeIds: assessments.filter((assessment) => assessment.qualified).map((assessment) => assessment.id),
    };
  }

  logFailure("Gamification", "School recognition reconciliation remained stale after retry", null, { actionId });
  return { status: "unavailable", activeIds: [] };
}
