import type { SupabaseClient } from "@supabase/supabase-js";
import { logFailure } from "@/lib/logging/failure-log";
import { insertProgressionEvent } from "./progression-data";
import { toIsoDate } from "./progression-utils";

export type ConfirmedParticipationProofRow = {
  action_id?: string | null;
  participation_status?: string | null;
  participation_source?: string | null;
  joined_at?: string | null;
  updated_at?: string | null;
};

export function findRecoveredParticipationProof(
  rows: readonly ConfirmedParticipationProofRow[],
): ConfirmedParticipationProofRow | null {
  return rows.find((row) =>
    row.participation_status === "confirmed" &&
    row.participation_source === "post_action_claim" &&
    typeof row.action_id === "string" &&
    row.action_id.trim().length > 0,
  ) ?? null;
}

/**
 * Records the badge-only proof once a post-action claim has been accepted.
 * The confirmed participant row is the proof; registrations are deliberately
 * not consulted because they represent future intent only.
 */
export async function awardRecoveredParticipationMilestone(
  supabase: SupabaseClient,
  userId: string,
): Promise<boolean> {
  try {
    const result = await supabase
      .from("action_participants")
      .select("action_id, participation_status, participation_source, joined_at, updated_at")
      .eq("user_id", userId)
      .eq("participation_status", "confirmed")
      .eq("participation_source", "post_action_claim")
      .order("joined_at", { ascending: true })
      .limit(1);

    if (result.error) {
      logFailure("Gamification", "Recovered participation proof load failed", result.error, {
        userId,
      });
      return false;
    }

    const proof = findRecoveredParticipationProof(
      (result.data ?? []) as ConfirmedParticipationProofRow[],
    );
    if (!proof?.action_id) return false;

    return await insertProgressionEvent(supabase, {
      userId,
      eventType: "action_participation_recovered",
      sourceTable: "action_participants",
      sourceId: `participation-retrieved:${userId}`,
      statusPhase: "validated",
      weight: 1,
      xpBase: 0,
      xpAwarded: 0,
      occurredOn: toIsoDate(proof.joined_at ?? proof.updated_at),
      metadata: {
        actionId: proof.action_id,
        participationSource: "post_action_claim",
      },
    });
  } catch (error) {
    logFailure("Gamification", "Recovered participation milestone failed", error, {
      userId,
    });
    return false;
  }
}
