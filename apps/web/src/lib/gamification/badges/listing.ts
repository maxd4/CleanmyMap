import type { SupabaseClient } from "@supabase/supabase-js";
import {
  collectEligibleCleanZoneSources,
  type CleanZoneCanonicalRow,
  type CleanZoneProgressionEvent,
} from "@/lib/gamification/progression/clean-zones";
import { loadGamificationUserCounters } from "../progression/counters";
import {
  buildCleanZonesBadges,
  buildExplorerFamily,
  buildOrganisationBadges,
  buildActionBadges,
  buildParticipantBadges,
  type GamificationBadgeEntry,
  type GamificationExplorerSummary,
} from "./families";
import {
  loadQuizLearningProgression,
  type LearningProgressionSummary,
} from "../progression/quiz-learning-progression";
import { PERSONAL_BADGE_DEFINITIONS } from "../progression/badge-catalog";
import {
  buildTerrainSpecializationProgressions,
  TERRAIN_SPECIALIZATION_EVENT_TYPE,
} from "../progression/terrain-specializations";
import { loadTerrainSpecializationEvidence } from "../progression/terrain-specialization-evidence";
import { loadGamificationLedgerEvents, type GamificationLedgerEvent } from "../progression/gamification-summary-loader";
import {
  loadTerritorialLegendAwardProofs,
} from "../territorial-legends/award-facts";
import {
  TERRITORIAL_LEGEND_LONGEVITY_THRESHOLDS,
  territorialLegendFamilyId,
} from "../territorial-legends/rewards";
import { TERRITORIAL_LEGEND_LEVELS } from "../territorial-legends/types";

const CLEAN_ZONE_SOURCE_LIMIT = 1000;

export type GamificationBadgesListPayload = {
  badges: GamificationBadgeEntry[];
  badgeCatalog: typeof PERSONAL_BADGE_DEFINITIONS;
  /** Canonical user-facing quiz progression: one learning axis. */
  learningProgression: LearningProgressionSummary;
  /** Compatibility field retained for clients that still read the old plural key. */
  quizProgressions: LearningProgressionSummary[];
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
    const [cleanPlaces, progressionEventsResult] = await Promise.all([
      loadCleanZoneRowsForUser(supabase, userId),
      supabase
        .from("progression_events")
        .select("source_table, source_id")
        .eq("user_id", userId)
        .eq("event_type", "clean_zone_task")
        .or("source_table.eq.clean_zones,source_table.eq.trash_spotter_spots,source_table.eq.spots"),
    ]);

    return collectEligibleCleanZoneSources({
      cleanPlaces,
      progressionEvents: toCleanZoneProgressionEvents(progressionEventsResult.data),
      now,
    });
  });
}

export async function loadCleanZoneRowsForUser(
  supabase: SupabaseClient,
  userId: string,
): Promise<CleanZoneCanonicalRow[]> {
  return bestEffort<CleanZoneCanonicalRow[]>([], async () => {
    const cooldownCutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const result = await supabase
      .from("trash_spotter_spots")
      .select("id, status, latitude, longitude, notes, validated_at, cleaned_at")
      .eq("user_id", userId)
      .eq("spot_type", "clean_place")
      .in("status", ["validated", "cleaned"])
      .not("latitude", "is", null)
      .not("longitude", "is", null)
      .not("notes", "is", null)
      .or(`validated_at.lte.${cooldownCutoff},cleaned_at.lte.${cooldownCutoff}`)
      .limit(CLEAN_ZONE_SOURCE_LIMIT);
    return toCanonicalCleanZoneRows(result.data);
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

function buildTerrainSpecializationBadges(
  evidence: Awaited<ReturnType<typeof loadTerrainSpecializationEvidence>>,
  events: GamificationLedgerEvent[],
): GamificationBadgeEntry[] {
  const progressions = buildTerrainSpecializationProgressions(
    evidence,
    events
      .filter((event) => event.event_type === TERRAIN_SPECIALIZATION_EVENT_TYPE)
      .map((event) => ({
        specializationId: event.metadata && typeof event.metadata.specializationId === "string"
          ? event.metadata.specializationId
          : undefined,
        xp_awarded: event.xp_awarded,
      })),
  );
  return progressions.map((progression) => ({
    id: `${progression.badgeId}:current`,
    definitionId: progression.badgeId,
    family: `terrain-specialization:${progression.id}`,
    status: "CURRENT" as const,
    scale: progression.parentProgressionId === "organisation" ? "gem" : "participant",
    name: progression.label,
    description: progression.description,
    icon: "🛡️",
    unlocked: progression.started,
    progress: { current: progression.verifiedActionCount, target: progression.nextThreshold },
    visualVariant: "terrain-specialization",
    tooltip: `Palier ${progression.currentTier || 0} · ${progression.verifiedActionCount} action(s) vérifiée(s)`,
  }));
}

function buildTerritorialLegendBadges(
  proofs: Awaited<ReturnType<typeof loadTerritorialLegendAwardProofs>>,
): GamificationBadgeEntry[] {
  return TERRITORIAL_LEGEND_LEVELS.map((level) => {
    const familyProofs = proofs.filter((proof) => proof.level === level);
    const current = familyProofs.reduce((max, proof) => Math.max(max, proof.thresholdDays), 0);
    const next = TERRITORIAL_LEGEND_LONGEVITY_THRESHOLDS.find((threshold) => threshold > current) ?? null;
    const definitionId = territorialLegendFamilyId(level);
    return {
      id: `${definitionId}:current`,
      definitionId,
      family: definitionId,
      status: "CURRENT",
      scale: "territorial",
      name: `Légende territoriale — ${level}`,
      description: "Conquête one-shot puis détention continue à 7, 30, 90, 180, 365 et 730 jours.",
      icon: "🗺️",
      unlocked: familyProofs.length > 0,
      progress: { current, target: next },
      visualVariant: "territorial",
      tooltip: next ? `Palier actuel ${current} jour(s) · prochain palier ${next} jour(s)` : `Palier maximal acquis: ${current} jour(s)`,
    } satisfies GamificationBadgeEntry;
  });
}

export async function loadGamificationBadgesList(
  supabase: SupabaseClient,
  userId: string,
): Promise<GamificationBadgesListPayload> {
  const [counters, cleanZoneSources, learningProgression, terrainEvidence, ledgerEvents, territorialProofs] = await Promise.all([
    loadGamificationUserCounters(supabase, userId),
    loadCleanZoneSourcesForUser(supabase, userId),
    loadQuizLearningProgression(supabase, userId),
    loadTerrainSpecializationEvidence(supabase, userId),
    loadGamificationLedgerEvents(supabase, userId),
    loadTerritorialLegendAwardProofs(supabase, userId),
  ]);

  const {
    approvedActionsCount: actionsCount,
    completeActionsCount,
    visitedPlacesCount: placesCount,
    participationCount,
  } = counters;
  const badges: GamificationBadgeEntry[] = [];

  const explorerFamily = buildExplorerFamily(placesCount);
  appendBadges(badges, explorerFamily.badges);

  appendBadges(badges, buildCleanZonesBadges(cleanZoneSources.length));

  const participantBadges = buildParticipantBadges(participationCount);
  appendBadges(badges, participantBadges);

  appendBadges(badges, buildOrganisationBadges(completeActionsCount));
  appendBadges(badges, buildTerrainSpecializationBadges(terrainEvidence, ledgerEvents));
  appendBadges(badges, buildTerritorialLegendBadges(territorialProofs));

  const legacyBadges = buildActionBadges(actionsCount, completeActionsCount);
  appendBadges(badges, legacyBadges);

  const unlockedCount = badges.filter((badge) => badge.unlocked).length;

  return {
    badges,
    badgeCatalog: PERSONAL_BADGE_DEFINITIONS,
    learningProgression,
    quizProgressions: [learningProgression],
    unlockedCount,
    totalBadges: badges.length,
    explorer: explorerFamily.summary,
  };
}
