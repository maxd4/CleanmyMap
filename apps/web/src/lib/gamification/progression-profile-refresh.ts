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

async function upsertProgressionProfile(
  supabase: SupabaseClient,
  userId: string,
  totals: ProgressionTotals,
  currentLevel: number,
  potentialLevel: number,
): Promise<void> {
  const upsert = await supabase.from("progression_profiles").upsert(
    {
      user_id: userId,
      xp_total: totals.xpTotal,
      xp_pending: totals.xpPending,
      xp_validated: totals.xpValidated,
      current_level: currentLevel,
      potential_level: potentialLevel,
      current_applied_rules_revision: CURRENT_GAMIFICATION_RULES_REVISION,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );
  if (upsert.error) throw new Error(upsert.error.message);
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

async function finalizeProgressionRefresh(
  supabase: SupabaseClient,
  userId: string,
  totals: ProgressionTotals,
  currentLevel: number,
  potentialLevel: number,
  previousLevel: number,
  options: { reconciliationId?: string },
): Promise<void> {
  await notifyLevelUp(supabase, userId, previousLevel, currentLevel, options);
  await upsertProgressionProfile(supabase, userId, totals, currentLevel, potentialLevel);
  await announceLevelUp(supabase, userId, previousLevel, currentLevel);
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
  const previousLevel = await loadPreviousLevel(supabase, userId);
  await finalizeProgressionRefresh(
    supabase,
    userId,
    totals,
    currentLevel,
    potentialLevel,
    previousLevel,
    options,
  );
}
