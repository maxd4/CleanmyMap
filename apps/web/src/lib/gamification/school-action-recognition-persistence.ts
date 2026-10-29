import type { SupabaseClient } from "@supabase/supabase-js";
import { loadActionById } from "@/lib/actions/store";
import { loadCanonicalActionOrganizerIdsForAction } from "@/lib/actions/participation/organizers";
import { logFailure } from "@/lib/logging/failure-log";
import {
  assessSchoolActionRecognitions,
  isConfirmedSchoolAction,
  schoolActionRecognitionSourceId,
} from "./school-action-recognition";

const RECOGNITION_TABLE = "action_school_collective_recognitions";

type RecognitionRow = {
  recognition_id?: string | null;
};

function isMissingRecognitionTable(error: { code?: string | null; message?: string | null } | null): boolean {
  return error?.code === "42P01" || error?.code === "PGRST205" ||
    error?.message?.toLowerCase().includes(RECOGNITION_TABLE) === true;
}

/**
 * Reconcile action-scoped school recognitions after an action or moderation
 * mutation. The operation is intentionally fail-closed for awards and uses a
 * composite-key upsert so retries and concurrent writers converge.
 */
export async function reconcileSchoolActionRecognitions(params: {
  supabase: SupabaseClient;
  actionId: string;
  actorUserId?: string | null;
}): Promise<{ status: "reconciled" | "unavailable" | "not_found" | "skipped"; activeIds: string[] }> {
  const { supabase, actionId, actorUserId = null } = params;
  const action = await loadActionById(supabase, actionId).catch((error) => {
    logFailure("Gamification", "School recognition action load failed", error, { actionId });
    return null;
  });
  if (!action) return { status: "not_found", activeIds: [] };

  let existingQuery: { data: unknown; error: { code?: string | null; message?: string | null } | null };
  try {
    existingQuery = await supabase
      .from(RECOGNITION_TABLE)
      .select("recognition_id")
      .eq("action_id", actionId);
  } catch (error) {
    logFailure("Gamification", "School recognition state query unavailable", error, { actionId });
    return { status: "unavailable", activeIds: [] };
  }
  if (existingQuery.error) {
    if (!isMissingRecognitionTable(existingQuery.error)) {
      logFailure("Gamification", "School recognition state load failed", existingQuery.error, { actionId });
    }
    return { status: "unavailable", activeIds: [] };
  }

  const existingIds = new Set(
    ((existingQuery.data ?? []) as RecognitionRow[])
      .map((row) => row.recognition_id)
      .filter((id): id is string => Boolean(id)),
  );
  const organizerIds = await loadCanonicalActionOrganizerIdsForAction(supabase, actionId).catch(() => []);
  const confirmedSchoolFrame = isConfirmedSchoolAction(action, organizerIds);
  if (!confirmedSchoolFrame && existingIds.size === 0) {
    return { status: "skipped", activeIds: [] };
  }

  const assessments = assessSchoolActionRecognitions({ action, canonicalOrganizerIds: organizerIds });
  const now = new Date().toISOString();
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
    evaluated_at: now,
    evaluated_by_clerk_id: actorUserId,
  }));
  const upsert = await supabase
    .from(RECOGNITION_TABLE)
    .upsert(rows, { onConflict: "action_id,recognition_id" });
  if (upsert.error) {
    logFailure("Gamification", "School recognition reconciliation failed", upsert.error, { actionId });
    return { status: "unavailable", activeIds: [] };
  }

  return {
    status: "reconciled",
    activeIds: assessments.filter((assessment) => assessment.qualified).map((assessment) => assessment.id),
  };
}
