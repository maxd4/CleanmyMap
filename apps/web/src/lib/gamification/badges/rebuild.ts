import type { SupabaseClient } from "@supabase/supabase-js";
import { auditXpAttribution } from "@/lib/gamification/notifications";
import { broadcastGamificationAnnouncement } from "@/lib/gamification/announcements";
import { logFailure } from "@/lib/logging/failure-log";
import { writeProgressionEventWithPolicy } from "@/lib/gamification/progression-event-write-policy";
import type {
  ProgressionEventType,
  ProgressionStatusPhase,
} from "@/lib/gamification/progression-types";
import { loadGamificationUserCounters } from "../counters";
import {
  EXPLORER_TIERS,
  FORM_SUBMISSION_TIERS,
  PARTICIPANT_TIERS,
  buildActionBadges,
  buildFormsBadges,
} from "./families";
import { loadCleanZoneSourcesForUser } from "./listing";

type AwardProgressionEventInput = {
  userId: string;
  sourceTable: string;
  sourceId: string;
  eventType: ProgressionEventType;
  statusPhase: ProgressionStatusPhase;
  xp: number;
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
  const occurredOn = new Date().toISOString().slice(0, 10);
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
        logFailure("Gamification/BadgeRebuild", message, undefined, details);
      },
    },
  );

  if (!writeResult.inserted) {
    return false;
  }

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

  if (input.notifyPayload) {
    await bestEffort(undefined, async () => {
      await broadcastGamificationAnnouncement(supabase, input.notifyPayload!);
      return undefined;
    });
  }

  return true;
}

async function awardCleanZoneEvents(
  supabase: SupabaseClient,
  userId: string,
): Promise<number> {
  const sources = await loadCleanZoneSourcesForUser(supabase, userId);
  let inserted = 0;

  for (const source of sources) {
    if (source.progressionEventRecorded) {
      continue;
    }

    inserted += Number(await awardProgressionEventIfMissing(supabase, {
      userId,
      sourceTable: source.progressionSourceTable,
      sourceId: source.progressionSourceId,
      eventType: "clean_zone_task",
      statusPhase: "validated",
      xp: 1,
      metadata: {
        origin: "canonical",
        canonical_place_key: source.canonicalPlaceKey,
        spot_id: source.sourceId,
        provenance: source.provenance,
      },
      auditLabel: `Clean zone task ${source.key} awarded`,
      notifyPayload: {
        type: "clean_zone_task_awarded",
        userId,
        sourceTable: source.progressionSourceTable,
        sourceId: source.progressionSourceId,
        xp: 1,
        dedupeKey: `clean_zone_task_awarded:${source.progressionSourceTable}:${source.progressionSourceId}`,
      },
    }));
  }

  return inserted;
}

async function awardFormEvents(
  supabase: SupabaseClient,
  userId: string,
  eligibleFormsCount: number,
): Promise<number> {
  const formsBadges = buildFormsBadges(eligibleFormsCount);
  let inserted = 0;

  for (const tier of FORM_SUBMISSION_TIERS) {
    if (!formsBadges.find((item) => item.id === tier.id)?.unlocked) {
      continue;
    }

    inserted += Number(await awardProgressionEventIfMissing(supabase, {
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
    }));
  }

  const bonusCount = Math.floor(eligibleFormsCount / 10);
  for (let index = 1; index <= bonusCount; index += 1) {
    const bonus = index * 10;
    inserted += Number(await awardProgressionEventIfMissing(supabase, {
      userId,
      sourceTable: "forms_bonus",
      sourceId: `forms:bonus:${bonus}`,
      eventType: "form_bonus",
      statusPhase: "validated",
      xp: 2,
      metadata: { bonus_for: bonus },
      auditLabel: `Forms decade bonus ${bonus}`,
      notifyPayload: {
        type: "form_bonus_unlocked",
        userId,
        bonus,
        xp: 2,
        dedupeKey: `form_bonus_unlocked:${bonus}`,
      },
    }));
  }

  return inserted;
}

async function awardParticipantEvents(
  supabase: SupabaseClient,
  userId: string,
  participationCount: number,
): Promise<number> {
  let inserted = 0;

  for (const tier of PARTICIPANT_TIERS) {
    if (tier.threshold === 0 || participationCount < tier.threshold) {
      continue;
    }

    inserted += Number(await awardProgressionEventIfMissing(supabase, {
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
    }));
  }

  return inserted;
}

async function awardExplorerEvents(
  supabase: SupabaseClient,
  userId: string,
  currentPlaces: number,
): Promise<number> {
  let inserted = 0;

  for (const tier of EXPLORER_TIERS) {
    if (tier.min === 0 || currentPlaces < tier.min) {
      continue;
    }

    inserted += Number(await awardProgressionEventIfMissing(supabase, {
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
    }));
  }

  return inserted;
}

async function awardActionBadges(
  supabase: SupabaseClient,
  userId: string,
  completeActionsCount: number,
): Promise<number> {
  const firstTrace = buildActionBadges(0, completeActionsCount).find(
    (badge) => badge.id === "first_trace_utile",
  );
  if (!firstTrace?.unlocked) {
    return 0;
  }

  return Number(await awardProgressionEventIfMissing(supabase, {
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
  }));
}

/** Explicit repair only. Never call this from a GET or page loader. */
export async function rebuildUserGamificationBadges(
  supabase: SupabaseClient,
  userId: string,
): Promise<{ inserted: number }> {
  const counters = await loadGamificationUserCounters(supabase, userId);

  const inserted = await Promise.all([
    awardCleanZoneEvents(supabase, userId),
    awardFormEvents(supabase, userId, counters.eligibleFormsCount),
    awardParticipantEvents(supabase, userId, counters.participationCount),
    awardExplorerEvents(supabase, userId, counters.visitedPlacesCount),
    awardActionBadges(supabase, userId, counters.completeActionsCount),
  ]);

  return { inserted: inserted.reduce((total, count) => total + count, 0) };
}
