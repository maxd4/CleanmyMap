import type { SupabaseClient } from "@supabase/supabase-js";
import { computeCurrentLevel, computePotentialLevel } from "./progression-formulas";
import {
  CURRENT_GAMIFICATION_RULES_REVISION,
  type ProgressionStatusPhase,
  type UserProgressionStats,
} from "./progression-types";
import { toFloat } from "./progression-utils";
import { broadcastGamificationAnnouncement } from "@/lib/gamification/announcements";
import { loadPreviousLevel, notifyLevelUp } from "./progression-level-refresh";

type ProgressionTotals = {
  xpTotal: number;
  xpPending: number;
  xpValidated: number;
};

function calculateProgressionTotals(
  rows: Array<{ status_phase: ProgressionStatusPhase; xp_awarded: number }>,
): ProgressionTotals {
  return rows.reduce(
    (totals, row) => {
      const xp = toFloat(row.xp_awarded, 0);
      totals.xpTotal += xp;
      if (row.status_phase === "pending") totals.xpPending += xp;
      if (row.status_phase === "validated") totals.xpValidated += xp;
      return totals;
    },
    { xpTotal: 0, xpPending: 0, xpValidated: 0 },
  );
}

async function announceLevelUp(
  supabase: SupabaseClient,
  userId: string,
  previousLevel: number,
  currentLevel: number,
): Promise<void> {
  if (currentLevel <= previousLevel) return;
  await broadcastGamificationAnnouncement(supabase, {
    type: "level_up",
    userId,
    previousLevel,
    newLevel: currentLevel,
    title: "Niveau Supérieur ! 🏆",
    message: `Félicitations ! Vous avez atteint le niveau ${currentLevel}. Votre impact sur CleanMyMap grandit !`,
    icon: "🏆",
    source: "progression-tracking",
    dedupeKey: `level_up:${userId}:${currentLevel}`,
  });
}

export class ProgressionProfileConflictError extends Error {
  constructor() {
    super("Le profil de progression a changé pendant son recalcul et doit être rejoué.");
    this.name = "ProgressionProfileConflictError";
  }
}

export async function persistProgressionProfileRefresh(
  supabase: SupabaseClient,
  userId: string,
  rows: Array<{ status_phase: ProgressionStatusPhase; xp_awarded: number }>,
  stats: UserProgressionStats,
  options: { reconciliationId?: string } = {},
): Promise<void> {
  const totals = calculateProgressionTotals(rows);
  const potentialLevel = computePotentialLevel(totals.xpValidated);
  const currentLevel = computeCurrentLevel(totals.xpValidated, stats);
  const previousProfile = await loadPreviousLevel(supabase, userId);
  const result = await supabase.rpc("refresh_gamification_profile", {
    p_user_id: userId,
    p_expected_updated_at: previousProfile.updatedAt,
    p_current_level: currentLevel,
    p_potential_level: potentialLevel,
    p_current_applied_rules_revision: CURRENT_GAMIFICATION_RULES_REVISION,
  });
  if (result.error) throw new Error(result.error.message);
  const payload = result.data as { status?: string; previous_level?: number } | null;
  if (payload?.status === "conflict") throw new ProgressionProfileConflictError();
  if (payload?.status !== "applied") throw new Error("La RPC de profil de progression a renvoyé une réponse invalide.");

  const previousLevel = Number(payload.previous_level ?? previousProfile.level);
  await notifyLevelUp(supabase, userId, previousLevel, currentLevel, options);
  await announceLevelUp(supabase, userId, previousLevel, currentLevel);
}
