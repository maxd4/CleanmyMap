import type { SupabaseClient } from "@supabase/supabase-js";
import { loadActionRowsForUser, loadValidatedCompleteActionCountForUser } from "@/lib/gamification/progression-data";
import { collectEligibleCleanZoneSources } from "@/lib/gamification/clean-zones";
import { auditXpAttribution } from "@/lib/gamification/notifications";
import { logFailure } from "@/lib/logging/failure-log";
import { writeProgressionEventWithPolicy } from "@/lib/gamification/progression-event-write-policy";
import type { ActionRow } from "@/lib/gamification/progression-types";
import { runActionQuery } from "@/lib/actions/query";
import {
  buildCleanZonesBadges,
  buildExplorerFamily,
  EXPLORER_TIERS,
  FORM_SUBMISSION_TIERS,
  buildFormsBadges,
  buildLegacyBadges,
  PARTICIPANT_TIERS,
  buildParticipantBadges,
  type GamificationBadgeEntry,
  type GamificationExplorerSummary,
} from "./families";

export type GamificationBadgesListPayload = {
  totalPoints: number;
  badges: GamificationBadgeEntry[];
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

    if (input.notifyPayload) {
      await bestEffort(undefined, async () => {
        await supabase.rpc("notify_gamification", {
          channel: "gamification",
          payload: input.notifyPayload,
        });
        return undefined;
      });
    }
  }

  return writeResult.inserted;
}

async function loadEligibleFormsCount(supabase: SupabaseClient): Promise<number> {
  return bestEffort(0, async () => {
    const { data: formsData, error: formsError } = await supabase
      .from("forms")
      .select("action_id, group_id, status, is_test, validated_by_admin, is_duplicate, is_deleted")
      .neq("status", "draft")
      .neq("status", "deleted")
      .neq("status", "incomplete")
      .eq("validated_by_admin", true)
      .is("is_duplicate", false)
      .is("is_deleted", false)
      .is("is_test", false);

    if (formsError || !Array.isArray(formsData)) {
      return 0;
    }

    const actionIds = Array.from(
      new Set(formsData.map((form) => form.action_id).filter(Boolean)),
    );

    const actionsMap = await runActionQuery<{ id: string; type: string }>(supabase, (query) =>
      query.select("id, type").in("id", actionIds).eq("status", "approved"),
    );

    const actionById: Record<string, { id: string; type: string }> = {};
    actionsMap.forEach((action) => {
      actionById[action.id] = action;
    });

    const counted = new Set<string>();
    for (const form of formsData) {
      const action = actionById[form.action_id];
      if (!action) {
        continue;
      }
      if (action.type === "zone_propre") {
        continue;
      }
      if (form.status === "draft" || form.status === "deleted" || form.is_test) {
        continue;
      }

      const key = `${form.action_id}::${form.group_id || "null"}`;
      counted.add(key);
    }

    return counted.size;
  });
}

async function loadEligibleFormsCountFromActionRows(
  supabase: SupabaseClient,
  actionRows: ActionRow[],
): Promise<number> {
  return bestEffort(0, async () => {
    const actionById = new Map(
      actionRows
        .filter((action) => action.status === "approved")
        .map((action) => [action.id, { id: action.id, type: action.type }] as const),
    );

    if (actionById.size === 0) {
      return 0;
    }

    const actionIds = [...actionById.keys()];
    const { data: formsData, error: formsError } = await supabase
      .from("forms")
      .select("action_id, group_id, status, is_test, validated_by_admin, is_duplicate, is_deleted")
      .neq("status", "draft")
      .neq("status", "deleted")
      .neq("status", "incomplete")
      .eq("validated_by_admin", true)
      .is("is_duplicate", false)
      .is("is_deleted", false)
      .is("is_test", false)
      .in("action_id", actionIds);

    if (formsError || !Array.isArray(formsData)) {
      return 0;
    }

    const counted = new Set<string>();
    for (const form of formsData) {
      const action = actionById.get(form.action_id);
      if (!action || action.type === "zone_propre") {
        continue;
      }

      const key = `${form.action_id}::${form.group_id || "null"}`;
      counted.add(key);
    }

    return counted.size;
  });
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

    let otherSpots: any[] = [];
    const { data: spots } = await supabase
      .from("spots")
      .select("id, status, latitude, longitude, notes, cleaned_at, validated_at")
      .eq("created_by_clerk_id", userId)
      .in("status", ["validated", "cleaned"])
      .not("latitude", "is", null)
      .not("longitude", "is", null)
      .not("notes", "is", null)
      .or(`validated_at.lte.${cooldownCutoff},cleaned_at.lte.${cooldownCutoff}`);

    if (Array.isArray(spots)) {
      otherSpots = spots;
    }

    return collectEligibleCleanZoneSources({
      cleanPlaces: (cleanPlaces ?? []) as any[],
      otherSpots,
      now,
    });
  });
}

export async function loadGamificationBadgesList(
  supabase: SupabaseClient,
  userId: string,
): Promise<GamificationBadgesListPayload> {
  const actionRows = await bestEffort<ActionRow[]>([], async () => loadActionRowsForUser(supabase, userId));
  const [
    pointsData,
    actionsCount,
    completeActionsCount,
    placesCount,
    eligibleFormsCount,
    cleanZoneSources,
    participationCount,
  ] = await Promise.all([
    bestEffort<number>(0, async () => {
      const { data } = await supabase
        .from("user_points")
        .select("total_points")
        .eq("user_id", userId)
        .maybeSingle();
      return data?.total_points ?? 0;
    }),
    bestEffort<number>(0, async () => {
      return Number(
        actionRows.filter(
          (action) => action.created_by_clerk_id === userId && action.status === "approved",
        ).length,
      );
    }),
    loadValidatedCompleteActionCountForUser(supabase, userId, { actionRows }).catch(() => 0),
    bestEffort<number>(0, async () => {
      const { count } = await supabase
        .from("user_visited_places")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId);
      return Number(count ?? 0);
    }),
    loadEligibleFormsCountFromActionRows(supabase, actionRows),
    loadCleanZoneSourcesForUser(supabase, userId),
    bestEffort<number>(0, async () => {
      const { count } = await supabase
        .from("action_participants")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId);
      return Number(count ?? 0);
    }),
  ]);

  const totalPoints = pointsData;
  const badges: GamificationBadgeEntry[] = [];

  const explorerFamily = buildExplorerFamily(placesCount);
  badges.push(...explorerFamily.badges);

  for (const tier of buildFormsBadges(eligibleFormsCount)) {
    badges.push(tier);
  }

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
      },
    });
  }

  const cleanZoneBadges = buildCleanZonesBadges(cleanZoneSources.length);
  for (const tier of cleanZoneBadges) {
    badges.push(tier);
  }

  const participantBadges = buildParticipantBadges(participationCount);
  for (const tier of participantBadges) {
    badges.push(tier);
  }

  const legacyBadges = buildLegacyBadges(totalPoints, actionsCount, completeActionsCount);
  badges.push(...legacyBadges);

  const formsBadges = buildFormsBadges(eligibleFormsCount);
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
      },
    });
  }

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
      },
    });
  }

  const firstTraceBadge = legacyBadges.find((badge) => badge.id === "first_trace_utile");
  if (firstTraceBadge?.unlocked) {
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
      },
    });
  }

  for (const tier of EXPLORER_TIERS) {
    if (tier.min === 0 || explorerFamily.summary.currentPlaces < tier.min) {
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
      },
    });
  }

  const unlockedCount = badges.filter((badge) => badge.unlocked).length;

  return {
    totalPoints,
    badges,
    unlockedCount,
    totalBadges: badges.length,
    explorer: explorerFamily.summary,
  };
}
