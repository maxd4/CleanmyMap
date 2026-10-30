import type { SupabaseClient } from "@supabase/supabase-js";

import { resolveActionTerritoryDestination } from "@/lib/chat/action-sharing";
import { getNeighbors } from "@/lib/geo/paris-neighborhood";
import {
  loadActionContexts,
  toActionNeedItemForContext,
  ACTION_NEED_SELECT_FIELDS,
  type ActionNeedItem,
} from "./action-needs-service";
import type { ActionNeedRow, CommunityHelpCategory } from "./action-needs";

const MAX_SUGGESTION_QUERY_ROWS = 2000;

function territoryName(locationLabel: string | null | undefined): string | null {
  return locationLabel
    ? resolveActionTerritoryDestination({ location_label: locationLabel })?.zoneName ?? null
    : null;
}

function territoryRank(
  actionLocationLabel: string,
  preferredTerritoryLabel: string | null,
): number {
  const actionTerritory = territoryName(actionLocationLabel);
  const preferredTerritory = territoryName(preferredTerritoryLabel);
  if (!preferredTerritory || !actionTerritory) return 2;
  if (actionTerritory.toLowerCase() === preferredTerritory.toLowerCase()) return 0;
  return getNeighbors(preferredTerritory).some(
    (neighbor) => neighbor.toLowerCase() === actionTerritory.toLowerCase(),
  ) ? 1 : 2;
}

export async function listSuggestedActionNeeds(
  supabase: SupabaseClient,
  categories: readonly CommunityHelpCategory[],
  preferredTerritoryLabel: string | null,
  limit: number,
  now = new Date(),
): Promise<ActionNeedItem[]> {
  if (categories.length === 0) return [];

  const { contexts } = await loadActionContexts(supabase, null, now);
  const actionIds = [...contexts.keys()];
  if (actionIds.length === 0) return [];

  const result = await supabase
    .from("action_needs")
    .select(ACTION_NEED_SELECT_FIELDS)
    .in("action_id", actionIds)
    .in("category", [...categories])
    .eq("status", "open")
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .range(0, MAX_SUGGESTION_QUERY_ROWS - 1);
  if (result.error) throw new Error(result.error.message);

  return (result.data ?? [])
    .map((row) => {
      const context = contexts.get(String(row.action_id));
      return context ? toActionNeedItemForContext(row as ActionNeedRow, context.action, false, now) : null;
    })
    .filter((item): item is ActionNeedItem => item !== null)
    .filter((item) => item.effectiveStatus === "open")
    .sort((left, right) => {
      const rankDifference = territoryRank(left.action.locationLabel, preferredTerritoryLabel) -
        territoryRank(right.action.locationLabel, preferredTerritoryLabel);
      return rankDifference ||
        left.action.actionDate.localeCompare(right.action.actionDate) ||
        right.createdAt.localeCompare(left.createdAt) ||
        left.id.localeCompare(right.id);
    })
    .slice(0, limit);
}
