import type { SupabaseClient } from "@supabase/supabase-js";
import { runActionQuery, runSingleActionQuery } from "@/lib/actions/query";
import { logFailure } from "@/lib/logging/failure-log";
import { isCurrentActionValidated } from "./action-milestones";
import {
  completeActionCount,
  isSpontaneousActionNotes,
} from "./progression-action-projections";
import type { ActionRow, SpotRow } from "./progression-types";

export const ACTION_APPROVED_COLUMNS =
  "id, created_at, created_by_clerk_id, type, actor_name, organizer_type, organizer_id, organizer_name, action_date, location_label, latitude, longitude, waste_kg, cigarette_butts, volunteers_count, duration_minutes, status, notes, derived_geometry_kind, derived_geometry_geojson, geometry_confidence, geometry_source, action_phase, preparation_data, published_at";
const ACTION_FULL_COLUMNS = ACTION_APPROVED_COLUMNS;

type LoadValidatedActionIdsOptions = {
  actionRows?: ActionRow[];
};

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

  if (organizerResult.error) throw new Error(organizerResult.error.message);

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
    if (!rowsById.has(row.id)) rowsById.set(row.id, row);
  }
  for (const row of ownedActions) {
    if (isSpontaneousActionNotes(row.notes) && !rowsById.has(row.id)) {
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
  const approvedActionIds = actions.filter((row) => row.status === "approved").map((row) => row.id);
  if (approvedActionIds.length === 0) return new Set();

  const result = await supabase
    .from("forms")
    .select("action_id, group_id, status, created_at, validated_by_admin, is_duplicate, is_deleted, is_test")
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
    logFailure("Gamification", "Validated action forms load failed", result.error, { userId });
    return new Set();
  }

  return new Set(
    ((result.data ?? []) as Array<{ action_id: string | null }>)
      .map((row) => row.action_id)
      .filter((actionId): actionId is string => Boolean(actionId)),
  );
}

export async function loadCurrentValidatedActionIdsForUser(
  supabase: SupabaseClient,
  userId: string,
  options?: LoadValidatedActionIdsOptions,
): Promise<Set<string>> {
  const actions = options?.actionRows ?? (await loadActionRowsForUser(supabase, userId));
  return new Set(actions.filter(isCurrentActionValidated).map((action) => action.id));
}

export async function loadValidatedCompleteActionCountForUser(
  supabase: SupabaseClient,
  userId: string,
  options?: LoadValidatedActionIdsOptions,
): Promise<number> {
  const actionRows = options?.actionRows ?? await runActionQuery<ActionRow>(supabase, (query) =>
    query
      .select(ACTION_APPROVED_COLUMNS)
      .eq("created_by_clerk_id", userId)
      .eq("status", "approved")
      .order("action_date", { ascending: false })
      .limit(6000),
  );
  const validatedActionIds = await loadCurrentValidatedActionIdsForUser(supabase, userId, { actionRows });
  return completeActionCount(actionRows, validatedActionIds);
}

export async function loadApprovedActionRows(
  supabase: SupabaseClient,
  limit = 10000,
  floorDate?: string | null,
): Promise<ActionRow[]> {
  const rows = await runActionQuery<ActionRow>(supabase, (query) => {
    let nextQuery = query.select(ACTION_APPROVED_COLUMNS).eq("status", "approved");
    if (floorDate) nextQuery = nextQuery.gte("action_date", floorDate);
    return nextQuery.order("action_date", { ascending: false }).limit(limit);
  });
  return rows.filter((row) => isSpontaneousActionNotes(row.notes));
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
  if (result.error) throw new Error(result.error.message);
  return (result.data as SpotRow | null) ?? null;
}
