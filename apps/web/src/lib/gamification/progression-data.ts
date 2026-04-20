import type { SupabaseClient } from "@supabase/supabase-js";
import { extractActionMetadataFromNotes } from "@/lib/actions/metadata";
import type {
  ActionRow,
  EventInsertParams,
  SpotRow,
  UserLabelSummary,
  UserProgressionStats,
} from "./progression-types";
import {
  actionRowToListItem,
  clampWeight,
  eventFamilyMap,
  evaluateActionQualityScore,
  toFloat,
  toInt,
} from "./progression-utils";

export async function insertProgressionEvent(
  supabase: SupabaseClient,
  params: EventInsertParams,
): Promise<boolean> {
  const result = await supabase.from("progression_events").insert({
    user_id: params.userId,
    event_type: params.eventType,
    source_table: params.sourceTable,
    source_id: params.sourceId,
    status_phase: params.statusPhase,
    weight: clampWeight(params.weight),
    xp_base: Math.max(0, Math.round(params.xpBase)),
    xp_awarded: Math.max(0, Math.round(params.xpAwarded)),
    occurred_on: params.occurredOn,
    metadata: params.metadata ?? {},
  });

  if (!result.error) {
    return true;
  }
  if (result.error.code === "23505") {
    return false;
  }
  throw new Error(result.error.message);
}

export async function loadActionRowsForUser(
  supabase: SupabaseClient,
  userId: string,
): Promise<ActionRow[]> {
  const result = await supabase
    .from("actions")
    .select(
      "id, created_at, created_by_clerk_id, actor_name, action_date, location_label, latitude, longitude, waste_kg, cigarette_butts, volunteers_count, duration_minutes, status, notes, manual_drawing",
    )
    .eq("created_by_clerk_id", userId)
    .order("action_date", { ascending: false })
    .limit(6000);

  if (result.error) {
    throw new Error(result.error.message);
  }
  return (result.data ?? []) as ActionRow[];
}

export async function loadUserProgressionStats(
  supabase: SupabaseClient,
  userId: string,
): Promise<UserProgressionStats> {
  const [eventsResult, actionRows] = await Promise.all([
    supabase
      .from("progression_events")
      .select("event_type, status_phase, xp_awarded")
      .eq("user_id", userId)
      .limit(12000),
    loadActionRowsForUser(supabase, userId),
  ]);

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
    if (toInt(event.xp_awarded, 0) > 0) {
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

  let totalActions = 0;
  let approvedActions = 0;
  let qualitySum = 0;
  let totalKg = 0;
  let totalButts = 0;

  for (const row of actionRows) {
    totalActions += 1;
    if (row.status === "approved") {
      approvedActions += 1;
      qualitySum += evaluateActionQualityScore(row).score;
      totalKg += toFloat(row.waste_kg, 0);
      totalButts += toInt(row.cigarette_butts, 0);
    }
  }

  return {
    totalActions,
    approvedActions,
    validatedActions: approvedActions,
    qualityAverage:
      approvedActions > 0 ? Math.round((qualitySum / approvedActions) * 10) / 10 : 0,
    validationRatio: totalActions > 0 ? approvedActions / totalActions : 0,
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
  const result = await supabase
    .from("actions")
    .select(
      "id, created_at, created_by_clerk_id, actor_name, action_date, location_label, latitude, longitude, waste_kg, cigarette_butts, volunteers_count, duration_minutes, status, notes, manual_drawing",
    )
    .eq("id", actionId)
    .maybeSingle();

  if (result.error) {
    if ((result.error.message ?? "").toLowerCase().includes("actions")) {
      return null;
    }
    throw new Error(result.error.message);
  }
  return (result.data as ActionRow | null) ?? null;
}

export async function fetchSpotById(
  supabase: SupabaseClient,
  spotId: string,
): Promise<SpotRow | null> {
  const result = await supabase
    .from("spots")
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
  const result = await supabase
    .from("actions")
    .select("created_by_clerk_id, actor_name, notes, action_date")
    .order("action_date", { ascending: false })
    .limit(10000);

  if (result.error) {
    throw new Error(result.error.message);
  }

  const map = new Map<string, UserLabelSummary>();

  for (const row of (result.data ?? []) as Array<{
    created_by_clerk_id: string;
    actor_name: string | null;
    notes: string | null;
  }>) {
    if (map.has(row.created_by_clerk_id)) {
      continue;
    }
    const metadata = extractActionMetadataFromNotes(row.notes);
    map.set(row.created_by_clerk_id, {
      actorName: (row.actor_name ?? "").trim() || row.created_by_clerk_id || "Contributeur",
      associationName: metadata.associationName?.trim() || "Sans association",
    });
  }

  return map;
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
    }
  >
> {
  const result = await supabase
    .from("actions")
    .select(
      "id, created_at, created_by_clerk_id, actor_name, action_date, location_label, latitude, longitude, waste_kg, cigarette_butts, volunteers_count, duration_minutes, status, notes, manual_drawing",
    )
    .eq("status", "approved")
    .limit(10000);

  if (result.error) {
    throw new Error(result.error.message);
  }

  const grouped = new Map<
    string,
    {
      qualitySum: number;
      validatedActions: number;
      wasteKg: number;
    }
  >();

  for (const row of (result.data ?? []) as ActionRow[]) {
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
