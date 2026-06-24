import type { SupabaseClient } from "@supabase/supabase-js";
import { collectEligibleCleanZoneSources } from "@/lib/gamification/clean-zones";
import { auditXpAttribution } from "@/lib/gamification/notifications";
import { broadcastGamificationAnnouncement } from "@/lib/gamification/announcements";
import { logFailure } from "@/lib/logging/failure-log";
import { writeProgressionEventWithPolicy } from "@/lib/gamification/progression-event-write-policy";
import { loadGamificationUserCounters } from "../counters";
import {
  buildCleanZonesBadges,
  buildExplorerFamily,
  EXPLORER_TIERS,
  FORM_SUBMISSION_TIERS,
  buildFormsBadges,
  buildLegacyBadges,
  buildQuizBalanceProgression,
  buildQuizTypeProgression,
  PARTICIPANT_TIERS,
  buildParticipantBadges,
  type GamificationBadgeEntry,
  type GamificationExplorerSummary,
  type QuizProgressionFamily,
} from "./families";
import type { CleanZoneSpotRow } from "../clean-zones";

export type GamificationBadgesListPayload = {
  totalPoints: number;
  badges: GamificationBadgeEntry[];
  quizProgressions: QuizProgressionFamily[];
  unlockedCount: number;
  totalBadges: number;
  explorer: GamificationExplorerSummary;
};

type AwardProgressionEventInput = {
  userId: string;
  sourceTable: string;
  sourceId: string;
  eventType: string;
  statusPhase: string;
  xp: number;
  occurredOn?: string;
  metadata?: Record<string, unknown>;
  auditLabel: string;
  notifyPayload?: Record<string, unknown>;
};

async function bestEffort<T>(fallback: T, task: () => Promise<T>): Promise<T> {
  try {
    return await task();
  } catch {
    return fallback;
  }
}

async function awardProgressionEventIfMissing(
  supabase: SupabaseClient,
  input: AwardProgressionEventInput,
): Promise<boolean> {
  let existing;
  try {
    existing = await supabase
      .from("progression_events")
      .select("id")
      .eq("user_id", input.userId)
      .eq("source_table", input.sourceTable)
      .eq("source_id", input.sourceId)
      .maybeSingle();
  } catch (error) {
    logFailure("Gamification/Badges", "Progression event existence check failed", error, {
      userId: input.userId,
      sourceTable: input.sourceTable,
      sourceId: input.sourceId,
    });
    return false;
  }

  if (existing.data) {
    return false;
  }

  const occurredOn = input.occurredOn ?? new Date().toISOString().slice(0, 10);

  const writeResult = await writeProgressionEventWithPolicy(
    async () =>
      supabase.from("progression_events").insert({
        user_id: input.userId,
        event_type: input.eventType,
        source_table: input.sourceTable,
        source_id: input.sourceId,
        status_phase: input.statusPhase,
        weight: 1,
        xp_base: input.xp,
        xp_awarded: input.xp,
        occurred_on: occurredOn,
        metadata: input.metadata ?? {},
      }),
    {
      mode: "best_effort",
      logger: (message, details) => {
        logFailure("Gamification/Badges", message, undefined, details);
      },
    },
  );

  if (writeResult.inserted) {
    await bestEffort(undefined, async () => {
      await auditXpAttribution(
        supabase,
        input.userId,
        null,
        input.auditLabel,
        input.xp,
        input.sourceTable,
        input.sourceId,
        input.metadata ?? {},
      );
      return undefined;
    });

    const notifyPayload = input.notifyPayload;
    if (notifyPayload) {
      await bestEffort(undefined, async () => {
        await broadcastGamificationAnnouncement(supabase, notifyPayload);
        return undefined;
      });
    }
  }

  return writeResult.inserted;
}

async function loadCleanZoneSourcesForUser(
  supabase: SupabaseClient,
  userId: string,
): Promise<ReturnType<typeof collectEligibleCleanZoneSources>> {
  return bestEffort<ReturnType<typeof collectEligibleCleanZoneSources>>([], async () => {
    const now = new Date();
    const cooldownCutoff = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();

    const { data: cleanPlaces } = await supabase
      .from("trash_spotter_spots")
      .select("id, status, latitude, longitude, notes, validated_at, cleaned_at")
      .eq("user_id", userId)
      .eq("spot_type", "clean_place")
      .in("status", ["validated", "cleaned"])
      .not("latitude", "is", null)
      .not("longitude", "is", null)
      .not("notes", "is", null)
      .or(`validated_at.lte.${cooldownCutoff},cleaned_at.lte.${cooldownCutoff}`);

    const cleanPlaceRows = toCleanZoneSpotRows(cleanPlaces);
    const { data: spots } = await supabase
      .from("spots")
      .select("id, status, latitude, longitude, notes, cleaned_at, validated_at")
      .eq("created_by_clerk_id", userId)
      .in("status", ["validated", "cleaned"])
      .not("latitude", "is", null)
      .not("longitude", "is", null)
      .not("notes", "is", null)
      .or(`validated_at.lte.${cooldownCutoff},cleaned_at.lte.${cooldownCutoff}`);

    return collectEligibleCleanZoneSources({
      cleanPlaces: cleanPlaceRows,
      otherSpots: toCleanZoneSpotRows(spots),
      now,
    });
  });
}

function toCleanZoneSpotRows(rows: unknown): CleanZoneSpotRow[] {
  return Array.isArray(rows) ? (rows as CleanZoneSpotRow[]) : [];
}

function appendBadges(
  target: GamificationBadgeEntry[],
  source: GamificationBadgeEntry[],
): void {
  target.push(...source);
}

async function awardCleanZoneSourceProgressionEvents(
  supabase: SupabaseClient,
  userId: string,
  cleanZoneSources: ReturnType<typeof collectEligibleCleanZoneSources>,
): Promise<void> {
  for (const source of cleanZoneSources) {
    await awardProgressionEventIfMissing(supabase, {
      userId,
      sourceTable: source.sourceTable,
      sourceId: source.sourceId,
      eventType: "clean_zone_task",
      statusPhase: "validated",
      xp: 1,
      metadata: {
        origin: source.key.startsWith("clean:") ? "clean" : "spot",
        spot_id: source.sourceId.replace(/^[^-]+-id:/, ""),
      },
      auditLabel: `Clean zone task ${source.sourceId} awarded`,
      notifyPayload: {
        type: "clean_zone_task_awarded",
        userId,
        sourceTable: source.sourceTable,
        sourceId: source.sourceId,
        xp: 1,
        dedupeKey: `clean_zone_task_awarded:${source.sourceTable}:${source.sourceId}`,
      },
    });
  }
}

async function awardFormProgressionEvents(
  supabase: SupabaseClient,
  userId: string,
  eligibleFormsCount: number,
  formsBadges: GamificationBadgeEntry[],
): Promise<void> {
  for (const tier of FORM_SUBMISSION_TIERS) {
    const matchingBadge = formsBadges.find((item) => item.id === tier.id);
    if (!matchingBadge?.unlocked) {
      continue;
    }

    await awardProgressionEventIfMissing(supabase, {
      userId,
      sourceTable: "forms",
      sourceId: `forms:${tier.id}`,
      eventType: "form_tier_unlock",
      statusPhase: "pending",
      xp: 1,
      metadata: { tier: tier.id, threshold: tier.threshold },
      auditLabel: `Form tier ${tier.id} unlocked`,
      notifyPayload: {
        type: "form_tier_unlocked",
        userId,
        tierId: tier.id,
        threshold: tier.threshold,
        xp: 1,
        dedupeKey: `form_tier_unlocked:${tier.id}`,
      },
    });
  }

  const bonusCount = Math.floor(eligibleFormsCount / 10);
  for (let i = 1; i <= bonusCount; i++) {
    await awardProgressionEventIfMissing(supabase, {
      userId,
      sourceTable: "forms_bonus",
      sourceId: `forms:bonus:${i * 10}`,
      eventType: "form_bonus",
      statusPhase: "validated",
      xp: 2,
      metadata: { bonus_for: i * 10 },
      auditLabel: `Forms decade bonus ${i * 10}`,
      notifyPayload: {
        type: "form_bonus_unlocked",
        userId,
        bonus: i * 10,
        xp: 2,
        dedupeKey: `form_bonus_unlocked:${i * 10}`,
      },
    });
  }
}

async function awardParticipantTierProgressionEvents(
  supabase: SupabaseClient,
  userId: string,
  participationCount: number,
): Promise<void> {
  for (const tier of PARTICIPANT_TIERS) {
    if (tier.threshold === 0 || participationCount < tier.threshold) {
      continue;
    }

    await awardProgressionEventIfMissing(supabase, {
      userId,
      sourceTable: "action_participants",
      sourceId: `participant:${tier.id}`,
      eventType: "participant_tier_unlock",
      statusPhase: "pending",
      xp: 1,
      metadata: { tier: tier.id, threshold: tier.threshold },
      auditLabel: `Participant tier ${tier.id} unlocked`,
      notifyPayload: {
        type: "participant_tier_unlocked",
        userId,
        tierId: tier.id,
        threshold: tier.threshold,
        xp: 1,
        dedupeKey: `participant_tier_unlocked:${tier.id}`,
      },
    });
  }
}

async function awardExplorerTierProgressionEvents(
  supabase: SupabaseClient,
  userId: string,
  currentPlaces: number,
): Promise<void> {
  for (const tier of EXPLORER_TIERS) {
    if (tier.min === 0 || currentPlaces < tier.min) {
      continue;
    }

    await awardProgressionEventIfMissing(supabase, {
      userId,
      sourceTable: "user_visited_places",
      sourceId: `tier:${tier.id}`,
      eventType: "explorer_tier_unlock",
      statusPhase: "validated",
      xp: 1,
      metadata: { tier: tier.id },
      auditLabel: `Explorer tier ${tier.id} unlocked`,
      notifyPayload: {
        type: "tier_unlocked",
        userId,
        tierId: tier.id,
        title: tier.title,
        xp: 1,
        dedupeKey: `tier_unlocked:${tier.id}`,
      },
    });
  }
}

async function awardFirstTraceBadgeProgressionEvent(
  supabase: SupabaseClient,
  userId: string,
  completeActionsCount: number,
  legacyBadges: GamificationBadgeEntry[],
): Promise<void> {
  const firstTraceBadge = legacyBadges.find((badge) => badge.id === "first_trace_utile");
  if (!firstTraceBadge?.unlocked) {
    return;
  }

  await awardProgressionEventIfMissing(supabase, {
    userId,
    sourceTable: "actions",
    sourceId: "first_trace_utile",
    eventType: "action_declare_validation",
    statusPhase: "validated",
    xp: 1,
    metadata: { badge: "first_trace_utile", completeActionsCount },
    auditLabel: "Première trace utile débloquée",
    notifyPayload: {
      type: "first_trace_utile_unlocked",
      userId,
      badgeId: "first_trace_utile",
      xp: 1,
      dedupeKey: "first_trace_utile_unlocked:first_trace_utile",
    },
  });
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
    totalPoints,
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

  await awardCleanZoneSourceProgressionEvents(supabase, userId, cleanZoneSources);

  appendBadges(badges, buildCleanZonesBadges(cleanZoneSources.length));

  const participantBadges = buildParticipantBadges(participationCount);
  appendBadges(badges, participantBadges);

  const legacyBadges = buildLegacyBadges(totalPoints, actionsCount, completeActionsCount);
  appendBadges(badges, legacyBadges);

  await awardFormProgressionEvents(supabase, userId, eligibleFormsCount, formsBadges);
  await awardParticipantTierProgressionEvents(supabase, userId, participationCount);
  await awardFirstTraceBadgeProgressionEvent(supabase, userId, completeActionsCount, legacyBadges);
  await awardExplorerTierProgressionEvents(supabase, userId, explorerFamily.summary.currentPlaces);

  const unlockedCount = badges.filter((badge) => badge.unlocked).length;

  return {
    totalPoints,
    badges,
    quizProgressions,
    unlockedCount,
    totalBadges: badges.length,
    explorer: explorerFamily.summary,
  };
}
