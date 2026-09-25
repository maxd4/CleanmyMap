import type { SupabaseClient } from "@supabase/supabase-js";
import {
  collectEligibleCleanZoneSources,
  type CleanZoneCanonicalRow,
  type CleanZoneProgressionEvent,
} from "@/lib/gamification/clean-zones";
import { loadGamificationUserCounters } from "../counters";
import {
  buildCleanZonesBadges,
  buildExplorerFamily,
  buildFormsBadges,
  buildActionBadges,
  buildQuizBalanceProgression,
  buildQuizTypeProgression,
  buildParticipantBadges,
  type GamificationBadgeEntry,
  type GamificationExplorerSummary,
  type LearningMilestoneFamily,
} from "./families";

const CLEAN_ZONE_SOURCE_LIMIT = 1000;

export type GamificationBadgesListPayload = {
  badges: GamificationBadgeEntry[];
  /** Compatibility payload: nested learning milestones, not top-level progressions. */
  quizProgressions: LearningMilestoneFamily[];
  unlockedCount: number;
  totalBadges: number;
  explorer: GamificationExplorerSummary;
};

async function bestEffort<T>(fallback: T, task: () => Promise<T>): Promise<T> {
  try {
    return await task();
  } catch {
    return fallback;
  }
}

export async function loadCleanZoneSourcesForUser(
  supabase: SupabaseClient,
  userId: string,
): Promise<ReturnType<typeof collectEligibleCleanZoneSources>> {
  return bestEffort<ReturnType<typeof collectEligibleCleanZoneSources>>([], async () => {
    const now = new Date();
    const cooldownCutoff = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();

    const [cleanPlacesResult, progressionEventsResult] = await Promise.all([
      supabase
        .from("trash_spotter_spots")
        .select("id, status, latitude, longitude, notes, validated_at, cleaned_at")
        .eq("user_id", userId)
        .eq("spot_type", "clean_place")
        .in("status", ["validated", "cleaned"])
        .not("latitude", "is", null)
        .not("longitude", "is", null)
        .not("notes", "is", null)
        .or(`validated_at.lte.${cooldownCutoff},cleaned_at.lte.${cooldownCutoff}`)
        .limit(CLEAN_ZONE_SOURCE_LIMIT),
      supabase
        .from("progression_events")
        .select("source_table, source_id")
        .eq("user_id", userId)
        .eq("event_type", "clean_zone_task")
        .or("source_table.eq.clean_zones,source_table.eq.trash_spotter_spots,source_table.eq.spots"),
    ]);

    return collectEligibleCleanZoneSources({
      cleanPlaces: toCanonicalCleanZoneRows(cleanPlacesResult.data),
      progressionEvents: toCleanZoneProgressionEvents(progressionEventsResult.data),
      now,
    });
  });
}

function toCanonicalCleanZoneRows(rows: unknown): CleanZoneCanonicalRow[] {
  return Array.isArray(rows) ? (rows as CleanZoneCanonicalRow[]) : [];
}

function toCleanZoneProgressionEvents(rows: unknown): CleanZoneProgressionEvent[] {
  if (!Array.isArray(rows)) {
    return [];
  }

  return rows.filter(
    (row): row is { source_table: string; source_id: string } =>
      Boolean(
        row &&
          typeof row === "object" &&
          typeof (row as { source_table?: unknown }).source_table === "string" &&
          typeof (row as { source_id?: unknown }).source_id === "string",
      ),
  ).map((row) => ({
    sourceTable: row.source_table,
    sourceId: row.source_id,
  }));
}

function appendBadges(
  target: GamificationBadgeEntry[],
  source: GamificationBadgeEntry[],
): void {
  target.push(...source);
}

export async function loadGamificationBadgesList(
  supabase: SupabaseClient,
  userId: string,
): Promise<GamificationBadgesListPayload> {
  const [counters, cleanZoneSources] = await Promise.all([
    loadGamificationUserCounters(supabase, userId),
    loadCleanZoneSourcesForUser(supabase, userId),
  ]);

  const {
    approvedActionsCount: actionsCount,
    completeActionsCount,
    visitedPlacesCount: placesCount,
    eligibleFormsCount,
    participationCount,
  } = counters;
  const badges: GamificationBadgeEntry[] = [];
  const quizProgressions = [buildQuizTypeProgression(), buildQuizBalanceProgression()];

  const explorerFamily = buildExplorerFamily(placesCount);
  appendBadges(badges, explorerFamily.badges);

  const formsBadges = buildFormsBadges(eligibleFormsCount);
  appendBadges(badges, formsBadges);

  appendBadges(badges, buildCleanZonesBadges(cleanZoneSources.length));

  const participantBadges = buildParticipantBadges(participationCount);
  appendBadges(badges, participantBadges);

  const legacyBadges = buildActionBadges(actionsCount, completeActionsCount);
  appendBadges(badges, legacyBadges);

  const unlockedCount = badges.filter((badge) => badge.unlocked).length;

  return {
    badges,
    quizProgressions,
    unlockedCount,
    totalBadges: badges.length,
    explorer: explorerFamily.summary,
  };
}
