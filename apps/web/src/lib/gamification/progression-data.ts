import { unstable_cache } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import { extractActionMetadataFromNotes } from "@/lib/actions/metadata";
import { evaluateActionQuality } from "@/lib/actions/quality";
import type {
  ActionRow,
  EventInsertParams,
  SpotRow,
  UserLabelSummary,
  UserProgressionStats,
} from "./progression-types";
import {
  loadActionOrganizerIdsForAction,
} from "@/lib/actions/organizers";
import {
  actionRowToListItem,
  clampWeight,
  computeActionPendingAward,
  computeActionValidationAward,
  eventFamilyMap,
  evaluateActionQualityScore,
  inferActionWeight,
  toFloat,
  toInt,
  toIsoDate,
} from "./progression-utils";
import { awardPointsOnce } from "./points/system";
import { computeMonthlyRegularityAwards } from "./monthly-regularity";
import { loadGamificationUserCounters } from "./counters";
import { logFailure } from "@/lib/logging/failure-log";
import { writeProgressionEventWithPolicy } from "./progression-event-write-policy";
import { runActionQuery, runSingleActionQuery } from "@/lib/actions/query";

const SPONTANEOUS_ASSOCIATION_KEY = "action spontanee";
const ACTION_FULL_COLUMNS =
  "id, created_at, created_by_clerk_id, type, actor_name, action_date, location_label, latitude, longitude, waste_kg, cigarette_butts, volunteers_count, duration_minutes, status, notes, manual_drawing";
const ACTION_APPROVED_COLUMNS =
  "id, created_at, created_by_clerk_id, actor_name, action_date, location_label, latitude, longitude, waste_kg, cigarette_butts, volunteers_count, duration_minutes, status, notes, manual_drawing";
const ACTION_LABEL_COLUMNS = "created_by_clerk_id, actor_name, notes, action_date";
const USER_LABEL_SUMMARY_CACHE_REVALIDATE_SECONDS = 120;
const USER_LABEL_SUMMARY_CACHE_TAG = "gamification-user-label-summary";
const USER_LABEL_SUMMARY_LIMIT = 10000;

type LoadValidatedActionIdsOptions = {
  actionRows?: ActionRow[];
};

type LoadValidatedCompleteActionCountOptions = {
  actionRows?: ActionRow[];
};

function normalizeAssociationName(raw: string | null | undefined): string {
  return (raw ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

export function isSpontaneousActionAssociationName(
  associationName: string | null | undefined,
): boolean {
  return normalizeAssociationName(associationName) === SPONTANEOUS_ASSOCIATION_KEY;
}

export function isSpontaneousActionNotes(notes: string | null | undefined): boolean {
  return isSpontaneousActionAssociationName(
    extractActionMetadataFromNotes(notes).associationName,
  );
}

export async function insertProgressionEvent(
  supabase: SupabaseClient,
  params: EventInsertParams,
): Promise<boolean> {
  const result = await writeProgressionEventWithPolicy(
    async () =>
      supabase.from("progression_events").insert({
        user_id: params.userId,
        event_type: params.eventType,
        source_table: params.sourceTable,
        source_id: params.sourceId,
        status_phase: params.statusPhase,
        weight: clampWeight(params.weight),
        xp_base: Math.max(0, params.xpBase),
        xp_awarded: Math.max(0, params.xpAwarded),
        occurred_on: params.occurredOn,
        metadata: params.metadata ?? {},
      }),
    { mode: "strict" },
  );

  if (result.duplicate) {
    return false;
  }

  return true;
}

export async function loadActionRowsForUser(
  supabase: SupabaseClient,
  userId: string,
): Promise<ActionRow[]> {
  const [ownedActions, organizerResult] = await Promise.all([
    runActionQuery<ActionRow>(supabase, (query) =>
      query
        .select(ACTION_FULL_COLUMNS)
        .eq("created_by_clerk_id", userId)
        .order("action_date", { ascending: false })
        .limit(6000),
    ),
    supabase
      .from("action_organizers")
      .select("action_id")
      .eq("organizer_clerk_id", userId)
      .limit(6000),
  ]);

  if (organizerResult.error) {
    throw new Error(organizerResult.error.message);
  }

  const organizedActionIds = [...new Set(
    (organizerResult.data ?? [])
      .map((row) => (row as { action_id?: string | null }).action_id)
      .filter((actionId): actionId is string => typeof actionId === "string" && actionId.length > 0),
  )];

  let organizedActions: ActionRow[] = [];
  if (organizedActionIds.length > 0) {
    organizedActions = await runActionQuery<ActionRow>(supabase, (query) =>
      query
        .select(ACTION_FULL_COLUMNS)
        .in("id", organizedActionIds)
        .order("action_date", { ascending: false })
        .limit(6000),
    );
  }

  const rowsById = new Map<string, ActionRow>();
  for (const row of organizedActions) {
    if (!rowsById.has(row.id)) {
      rowsById.set(row.id, row);
    }
  }

  for (const row of ownedActions) {
    if (!isSpontaneousActionNotes(row.notes)) {
      continue;
    }
    if (!rowsById.has(row.id)) {
      rowsById.set(row.id, row);
    }
  }

  return [...rowsById.values()];
}

export async function loadValidatedActionIdsForUser(
  supabase: SupabaseClient,
  userId: string,
  options?: LoadValidatedActionIdsOptions,
): Promise<Set<string>> {
  const actions = options?.actionRows ?? (await loadActionRowsForUser(supabase, userId));
  const approvedActionIds = actions
    .filter((row) => row.status === "approved")
    .map((row) => row.id);

  if (approvedActionIds.length === 0) {
    return new Set();
  }

  const result = await supabase
    .from("forms")
    .select(
      "action_id, group_id, status, created_at, validated_by_admin, is_duplicate, is_deleted, is_test",
    )
    .in("action_id", approvedActionIds)
    .neq("status", "draft")
    .neq("status", "deleted")
    .neq("status", "incomplete")
    .eq("validated_by_admin", true)
    .is("is_duplicate", false)
    .is("is_deleted", false)
    .is("is_test", false)
    .order("created_at", { ascending: true });

  if (result.error) {
    logFailure("Gamification", "Validated action forms load failed", result.error, {
      userId,
    });
    return new Set();
  }

  const validatedActionIds = new Set<string>();
  for (const row of (result.data ?? []) as Array<{ action_id: string | null }>) {
    if (row.action_id) {
      validatedActionIds.add(row.action_id);
    }
  }

  return validatedActionIds;
}

export async function loadValidatedCompleteActionCountForUser(
  supabase: SupabaseClient,
  userId: string,
  options?: LoadValidatedCompleteActionCountOptions,
): Promise<number> {
  let ownedActions = options?.actionRows ?? null;
  if (!ownedActions) {
    ownedActions = await runActionQuery<ActionRow>(supabase, (query) =>
      query
        .select(ACTION_APPROVED_COLUMNS)
        .eq("created_by_clerk_id", userId)
        .eq("status", "approved")
        .order("action_date", { ascending: false })
        .limit(6000),
    );
  }

  const validatedActionIds = await loadValidatedActionIdsForUser(supabase, userId, {
    actionRows: ownedActions,
  });

  let count = 0;
  for (const row of ownedActions) {
    if (!validatedActionIds.has(row.id)) {
      continue;
    }
    const quality = evaluateActionQuality(actionRowToListItem(row));
    if (quality.breakdown.completeness >= 100) {
      count += 1;
    }
  }

  return count;
}

export async function loadApprovedActionRows(
  supabase: SupabaseClient,
  limit = 10000,
  floorDate?: string | null,
): Promise<ActionRow[]> {
  const rows = await runActionQuery<ActionRow>(supabase, (query) => {
    let nextQuery = query.select(ACTION_APPROVED_COLUMNS).eq("status", "approved");
    if (floorDate) {
      nextQuery = nextQuery.gte("action_date", floorDate);
    }
    return nextQuery.order("action_date", { ascending: false }).limit(limit);
  });

  return rows.filter((row) => isSpontaneousActionNotes(row.notes));
}

export async function loadUserProgressionStats(
  supabase: SupabaseClient,
  userId: string,
): Promise<UserProgressionStats> {
  const actionRowsPromise = loadActionRowsForUser(supabase, userId);
  const [eventsResult, counters] = await Promise.all([
    supabase
      .from("progression_events")
      .select("event_type, status_phase, xp_awarded")
      .eq("user_id", userId)
      .limit(12000),
    loadGamificationUserCounters(supabase, userId),
  ]);

  const actionRows = await actionRowsPromise;
  const validatedActionIds = await loadValidatedActionIdsForUser(supabase, userId, {
    actionRows,
  });

  if (eventsResult.error) {
    throw new Error(eventsResult.error.message);
  }

  const events =
    (eventsResult.data ??
      []) as Array<{ event_type: keyof ReturnType<typeof eventFamilyMap>; status_phase: string; xp_awarded: number }>;

  const diversitySet = new Set<string>();
  let collectiveEvents = 0;
  const families = eventFamilyMap();

  for (const event of events) {
    if (toFloat(event.xp_awarded, 0) > 0) {
      const family = families[event.event_type];
      if (family) {
        diversitySet.add(family);
      }
    }
    if (
      event.event_type === "collective_attendance_confirmed" &&
      event.status_phase === "validated"
    ) {
      collectiveEvents += 1;
    }
  }

  collectiveEvents += counters.participationCount;

  let totalActions = 0;
  let approvedActions = 0;
  let validatedActions = 0;
  let qualitySum = 0;
  let totalKg = 0;
  let totalButts = 0;

  for (const row of actionRows) {
    totalActions += 1;
    if (row.status === "approved") {
      approvedActions += 1;
    }
    if (row.status === "approved" && validatedActionIds.has(row.id)) {
      validatedActions += 1;
      qualitySum += evaluateActionQualityScore(row).score;
      totalKg += toFloat(row.waste_kg, 0);
      totalButts += toInt(row.cigarette_butts, 0);
    }
  }

  return {
    totalActions,
    approvedActions,
    validatedActions,
    qualityAverage:
      validatedActions > 0 ? Math.round((qualitySum / validatedActions) * 10) / 10 : 0,
    validationRatio: totalActions > 0 ? validatedActions / totalActions : 0,
    diversityTypes: diversitySet.size,
    collectiveEvents,
    totalKg,
    totalButts,
  };
}

export async function fetchActionById(
  supabase: SupabaseClient,
  actionId: string,
): Promise<ActionRow | null> {
  return runSingleActionQuery<ActionRow>(supabase, (query) =>
    query.select(ACTION_APPROVED_COLUMNS).eq("id", actionId).maybeSingle(),
  );
}

export async function fetchSpotById(
  supabase: SupabaseClient,
  spotId: string,
): Promise<SpotRow | null> {
  const result = await supabase
    .from("trash_spotter_spots")
    .select("id, created_at, created_by_clerk_id, status, label, notes")
    .eq("id", spotId)
    .maybeSingle();

  if (result.error) {
    throw new Error(result.error.message);
  }
  return (result.data as SpotRow | null) ?? null;
}

export async function loadUserLabelSummary(
  supabase: SupabaseClient,
): Promise<Map<string, UserLabelSummary>> {
  const cached = unstable_cache(
    async () => {
      const rows = await runActionQuery<{
        created_by_clerk_id: string;
        actor_name: string | null;
        notes: string | null;
        action_date: string;
      }>(supabase, (query) =>
        query
          .select(ACTION_LABEL_COLUMNS)
          .order("action_date", { ascending: false })
          .limit(USER_LABEL_SUMMARY_LIMIT),
      );

      const map = new Map<string, UserLabelSummary>();

      for (const row of rows) {
        if (!isSpontaneousActionNotes(row.notes)) {
          continue;
        }
        if (map.has(row.created_by_clerk_id)) {
          continue;
        }
        const metadata = extractActionMetadataFromNotes(row.notes);
        map.set(row.created_by_clerk_id, {
          actorName:
            (row.actor_name ?? "").trim() || row.created_by_clerk_id || "Contributeur",
          associationName: metadata.associationName?.trim() || "Sans association",
        });
      }

      return map;
    },
    ["gamification-user-label-summary", `limit:${USER_LABEL_SUMMARY_LIMIT}`],
    {
      revalidate: USER_LABEL_SUMMARY_CACHE_REVALIDATE_SECONDS,
      tags: [USER_LABEL_SUMMARY_CACHE_TAG],
    },
  );

  return cached();
}

export async function loadUserImpactStats(
  supabase: SupabaseClient,
): Promise<
  Map<
    string,
    {
      qualityAverage: number;
      validatedActions: number;
      wasteKg: number;
      totalButts: number;
    }
  >
> {
  const rows = await runActionQuery<ActionRow>(supabase, (query) =>
    query.select(ACTION_APPROVED_COLUMNS).eq("status", "approved").limit(10000),
  );

  const grouped = new Map<
    string,
    {
      qualitySum: number;
      validatedActions: number;
      wasteKg: number;
      totalButts: number;
    }
  >();

  for (const row of rows) {
    if (!isSpontaneousActionNotes(row.notes)) {
      continue;
    }
    const quality = evaluateActionQualityScore(row).score;
    const previous = grouped.get(row.created_by_clerk_id) ?? {
      qualitySum: 0,
      validatedActions: 0,
      wasteKg: 0,
      totalButts: 0,
    };
    previous.qualitySum += quality;
    previous.validatedActions += 1;
    previous.wasteKg += toFloat(row.waste_kg, 0);
    previous.totalButts += toInt(row.cigarette_butts, 0);
    grouped.set(row.created_by_clerk_id, previous);
  }

  const output = new Map<
    string,
    {
      qualityAverage: number;
      validatedActions: number;
      wasteKg: number;
      totalButts: number;
    }
  >();

  for (const [userId, value] of grouped.entries()) {
    output.set(userId, {
      qualityAverage:
        value.validatedActions > 0
          ? Math.round((value.qualitySum / value.validatedActions) * 10) / 10
          : 0,
      validatedActions: value.validatedActions,
      wasteKg: Math.round(value.wasteKg * 10) / 10,
      totalButts: value.totalButts,
    });
  }

  return output;
}

export function actionQualityScoreFromRow(row: ActionRow): number {
  return evaluateActionQualityScore(row).score;
}

export function parseAssociationNameFromActionNotes(notes: string | null): string {
  const metadata = extractActionMetadataFromNotes(notes);
  return metadata.associationName?.trim() || "Sans association";
}

export function actionListItemFromRow(row: ActionRow) {
  return actionRowToListItem(row);
}

export async function syncUserActionProgression(
  supabase: SupabaseClient,
  userId: string,
): Promise<number> {
  const deleted = await supabase
    .from("progression_events")
    .delete()
    .eq("user_id", userId)
    .eq("source_table", "actions");

  if (deleted.error) {
    throw new Error(deleted.error.message);
  }

  const actions = await loadActionRowsForUser(supabase, userId);
  const validatedActionIds = await loadValidatedActionIdsForUser(supabase, userId, {
    actionRows: actions,
  });
  let validatedActionCount = 0;

  for (const action of actions) {
    const associationName = parseAssociationNameFromActionNotes(action.notes);
    const organizerIds = await loadActionOrganizerIdsForAction(
      supabase,
      action.id,
      action.created_by_clerk_id,
    ).catch(() => [action.created_by_clerk_id].filter((value): value is string => typeof value === "string" && value.trim().length > 0));
    const organizerCount = Math.max(1, organizerIds.length);
    const weight = inferActionWeight(action);
    const pendingAward = computeActionPendingAward(weight);
    await insertProgressionEvent(supabase, {
      userId,
      eventType: "action_declare_pending",
      sourceTable: "actions",
      sourceId: action.id,
      statusPhase: "pending",
      weight,
      xpBase: pendingAward.xpBase,
      xpAwarded: pendingAward.xpAwarded,
      occurredOn: toIsoDate(action.action_date || action.created_at),
      metadata: {
        associationName,
      },
    });

    if (action.status !== "approved" || !validatedActionIds.has(action.id)) {
      continue;
    }

    const quality = evaluateActionQualityScore(action);
    const validatedAward = computeActionValidationAward(
      weight,
      quality.grade,
      organizerCount,
    );
    await insertProgressionEvent(supabase, {
      userId,
      eventType: "action_declare_validation",
      sourceTable: "actions",
      sourceId: action.id,
      statusPhase: "validated",
      weight,
      xpBase: validatedAward.xpBase,
      xpAwarded: validatedAward.xpAwarded,
      occurredOn: toIsoDate(action.action_date || action.created_at),
      metadata: {
        qualityGrade: quality.grade,
        qualityScore: quality.score,
        associationName,
        hasValidatedForm: true,
        organizerCount,
        organizerShare: validatedAward.xpAwarded,
      },
    });

    if (organizerCount === 1) {
      await awardPointsOnce(supabase, {
        userId,
        xpEarned: validatedAward.xpAwarded,
        sourceEvent: "action_validated_form",
        sourceId: action.id,
        reason: "Action validée avec formulaire",
      });
    }

    try {
      const { auditXpAttribution } = await import("./notifications");
      await auditXpAttribution(
        supabase,
        userId,
        null,
        "Action validée avec formulaire",
        validatedAward.xpAwarded,
        "actions",
        action.id,
        {
          qualityGrade: quality.grade,
          qualityScore: quality.score,
          sourceEvent: "action_validated_form",
          organizerCount,
          organizerShare: validatedAward.xpAwarded,
        },
      );
    } catch {
      // Audit best-effort only.
    }

    validatedActionCount += 1;
  }

  const monthlyAwards = computeMonthlyRegularityAwards(actions);
  for (const award of monthlyAwards) {
    await insertProgressionEvent(supabase, {
      userId,
      eventType: "action_monthly_regularity",
      sourceTable: "actions",
      sourceId: award.sourceId,
      statusPhase: "validated",
      weight: 1,
      xpBase: award.xpAwarded,
      xpAwarded: award.xpAwarded,
      occurredOn: award.occurredOn,
      metadata: {
        monthKey: award.monthKey,
        actionCount: award.actionCount,
        streak: award.streak,
      },
    });
  }

  return validatedActionCount;
}
