import type { SupabaseClient } from "@supabase/supabase-js";
import { loadActionById } from "@/lib/actions/store";
import { fetchActionRows } from "@/lib/actions/store-queries";
import { isPublishedFuturePreAction } from "@/lib/actions/temporal";
import { loadCanonicalActionOrganizerIdsForAction } from "@/lib/actions/participation/organizers";
import {
  getActionNeedEffectiveStatus,
  type ActionNeedEffectiveStatus,
  type ActionNeedRow,
  type CommunityHelpCategory,
} from "@/lib/community/action-needs";
import type { ActionRow } from "@/types/database";

const ACTION_NEED_SELECT_FIELDS =
  "id, action_id, created_by_clerk_id, category, title, description, quantity_label, expires_at, status, fulfilled_at, created_at, updated_at";
const MAX_ACTION_NEED_QUERY_ROWS = 2000;
const MAX_ACTION_CONTEXT_ROWS = 1000;

export type ActionNeedActionSummary = {
  id: string;
  title: string;
  actionDate: string;
  eventStartTime: string | null;
  locationLabel: string;
};

export type ActionNeedItem = {
  id: string;
  actionId: string;
  category: CommunityHelpCategory;
  title: string;
  description: string;
  quantityLabel: string | null;
  expiresAt: string | null;
  status: ActionNeedRow["status"];
  effectiveStatus: ActionNeedEffectiveStatus;
  fulfilledAt: string | null;
  createdAt: string;
  updatedAt: string;
  action: ActionNeedActionSummary;
  canManage: boolean;
};

export type ActionNeedListResult = {
  items: ActionNeedItem[];
  managerActions: ActionNeedActionSummary[];
  limit: number;
  offset: number;
  hasMore: boolean;
};

type ActionNeedListFilters = {
  actionId?: string | null;
  category?: CommunityHelpCategory | null;
  effectiveStatus?: ActionNeedEffectiveStatus | null;
  limit: number;
  offset: number;
};

type ActionContext = {
  action: ActionRow;
  canManage: boolean;
};

function actionTitle(action: ActionRow): string {
  return action.preparation_data?.actionTitle?.trim() || action.location_label;
}

function toActionSummary(action: ActionRow): ActionNeedActionSummary {
  return {
    id: action.id,
    title: actionTitle(action),
    actionDate: action.action_date,
    eventStartTime: action.event_start_time ?? null,
    locationLabel: action.location_label,
  };
}

function isPublicNeedAction(action: ActionRow, now: Date): boolean {
  return action.access_mode !== "invite_link" && isPublishedFuturePreAction(action, now);
}

function toActionNeedItem(
  row: ActionNeedRow,
  context: ActionContext,
  now: Date,
): ActionNeedItem {
  return {
    id: row.id,
    actionId: row.action_id,
    category: row.category,
    title: row.title,
    description: row.description,
    quantityLabel: row.quantity_label,
    expiresAt: row.expires_at,
    status: row.status,
    effectiveStatus: getActionNeedEffectiveStatus(row, now),
    fulfilledAt: row.fulfilled_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    action: toActionSummary(context.action),
    canManage: context.canManage,
  };
}

async function loadManagedActionIds(
  supabase: SupabaseClient,
  userId: string,
): Promise<string[]> {
  const [createdActions, organizedActions] = await Promise.all([
    supabase.from("actions").select("id").eq("created_by_clerk_id", userId).limit(MAX_ACTION_CONTEXT_ROWS),
    supabase.from("action_organizers").select("action_id").eq("organizer_clerk_id", userId).limit(MAX_ACTION_CONTEXT_ROWS),
  ]);

  if (createdActions.error) throw new Error(createdActions.error.message);
  if (organizedActions.error) throw new Error(organizedActions.error.message);

  return [
    ...new Set([
      ...(createdActions.data ?? []).map((row) => String(row.id)),
      ...(organizedActions.data ?? []).map((row) => String(row.action_id)),
    ].filter(Boolean)),
  ].slice(0, MAX_ACTION_CONTEXT_ROWS);
}

async function loadPublicActions(
  supabase: SupabaseClient,
  now: Date,
): Promise<ActionRow[]> {
  const actions = await fetchActionRows(supabase, {
    limit: MAX_ACTION_CONTEXT_ROWS,
    status: "approved",
    includeFuturePublicActions: true,
  });
  return actions.filter((action) => isPublicNeedAction(action, now));
}

export async function loadActionContexts(
  supabase: SupabaseClient,
  userId: string | null,
  now: Date,
): Promise<{ contexts: Map<string, ActionContext>; managerActions: ActionNeedActionSummary[] }> {
  const publicActions = await loadPublicActions(supabase, now);
  const managedActionIds = userId ? await loadManagedActionIds(supabase, userId) : [];
  const managedActions = managedActionIds.length > 0
    ? (await Promise.all(managedActionIds.map((actionId) => loadActionById(supabase, actionId)))).filter(
        (action): action is ActionRow => action !== null,
      )
    : [];

  const contexts = new Map<string, ActionContext>();
  for (const action of publicActions) {
    contexts.set(action.id, { action, canManage: false });
  }
  for (const action of managedActions) {
    contexts.set(action.id, { action, canManage: true });
  }

  const managerActions = managedActions
    .map(toActionSummary)
    .sort((left, right) =>
      left.actionDate.localeCompare(right.actionDate) || left.id.localeCompare(right.id),
    );

  return { contexts, managerActions };
}

export async function listActionNeeds(
  supabase: SupabaseClient,
  userId: string | null,
  filters: ActionNeedListFilters,
  now = new Date(),
): Promise<ActionNeedListResult> {
  const { contexts, managerActions } = await loadActionContexts(supabase, userId, now);
  if (filters.actionId && !contexts.has(filters.actionId)) {
    return { items: [], managerActions, limit: filters.limit, offset: filters.offset, hasMore: false };
  }

  const actionIds = [...contexts.keys()];
  if (actionIds.length === 0) {
    return { items: [], managerActions, limit: filters.limit, offset: filters.offset, hasMore: false };
  }

  let query = supabase
    .from("action_needs")
    .select(ACTION_NEED_SELECT_FIELDS)
    .in("action_id", actionIds)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .range(0, MAX_ACTION_NEED_QUERY_ROWS - 1);

  if (filters.actionId) query = query.eq("action_id", filters.actionId);
  if (filters.category) query = query.eq("category", filters.category);
  if (filters.effectiveStatus === "fulfilled" || filters.effectiveStatus === "cancelled") {
    query = query.eq("status", filters.effectiveStatus);
  } else if (filters.effectiveStatus === "open" || filters.effectiveStatus === "expired") {
    query = query.eq("status", "open");
  }

  const result = await query;
  if (result.error) throw new Error(result.error.message);

  const rows = (result.data ?? []) as ActionNeedRow[];
  const filteredItems = rows
    .map((row) => {
      const context = contexts.get(row.action_id);
      return context ? toActionNeedItem(row, context, now) : null;
    })
    .filter((item): item is ActionNeedItem => item !== null)
    .filter((item) => item.canManage || item.status !== "cancelled")
    .filter((item) => !filters.effectiveStatus || item.effectiveStatus === filters.effectiveStatus);

  return {
    items: filteredItems.slice(filters.offset, filters.offset + filters.limit),
    managerActions,
    limit: filters.limit,
    offset: filters.offset,
    hasMore: filteredItems.length > filters.offset + filters.limit || rows.length === MAX_ACTION_NEED_QUERY_ROWS,
  };
}

export async function loadActionNeedById(
  supabase: SupabaseClient,
  needId: string,
): Promise<{ need: ActionNeedRow; action: ActionRow } | null> {
  const result = await supabase
    .from("action_needs")
    .select(ACTION_NEED_SELECT_FIELDS)
    .eq("id", needId)
    .maybeSingle();
  if (result.error) throw new Error(result.error.message);
  if (!result.data) return null;

  const need = result.data as ActionNeedRow;
  const action = await loadActionById(supabase, need.action_id);
  return action ? { need, action } : null;
}

export async function canManageActionNeed(
  supabase: SupabaseClient,
  userId: string,
  action: Pick<ActionRow, "id" | "created_by_clerk_id">,
): Promise<boolean> {
  if (action.created_by_clerk_id === userId) return true;
  const organizerIds = await loadCanonicalActionOrganizerIdsForAction(supabase, action.id);
  return organizerIds.includes(userId);
}

export function toActionNeedItemForContext(
  need: ActionNeedRow,
  action: ActionRow,
  canManage: boolean,
  now = new Date(),
): ActionNeedItem {
  return toActionNeedItem(need, { action, canManage }, now);
}

export { ACTION_NEED_SELECT_FIELDS };
