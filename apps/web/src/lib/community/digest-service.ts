import type { SupabaseClient } from "@supabase/supabase-js";

import { fetchActionRows } from "@/lib/actions/store-queries";
import { isPublishedFuturePreAction } from "@/lib/actions/temporal";
import {
  isPublicActionReferenceAvailable,
  resolveActionTerritoryDestination,
} from "@/lib/chat/action-sharing";
import { getNeighbors } from "@/lib/geo/paris-neighborhood";
import type { ActionRow } from "@/types/database";
import {
  getActionNeedEffectiveStatus,
  type ActionNeedRow,
} from "./action-needs";
import { ACTION_NEED_SELECT_FIELDS } from "./action-needs-service";
import {
  COMMUNITY_SUBSCRIPTION_CADENCES,
  type CommunitySubscriptionCadence,
  type CommunitySubscriptionRow,
} from "./subscriptions";
import {
  getCommunityDigestPeriod,
  isDateInCommunityDigestPeriod,
  type CommunityDigestCadence,
  type CommunityDigestPeriod,
} from "./digest-periods";

const COMMUNITY_DIGEST_SOURCES = ["future_actions", "needs", "results"] as const;
type CommunityDigestSource = (typeof COMMUNITY_DIGEST_SOURCES)[number];

export type CommunityDigestReference = {
  type: CommunityDigestSource;
  id: string;
  actionId: string;
  title: string;
  actionDate: string;
  locationLabel: string;
  territoryZoneName: string | null;
  visibleAt: string;
};

export type CommunityDigestItem = Pick<
  CommunityDigestReference,
  "type" | "id" | "actionId" | "title" | "actionDate" | "locationLabel"
>;

export type CommunityDigestRun = {
  cadence: CommunityDigestCadence;
  periodKey: string;
  itemCount: number;
  notificationId: string | null;
  status: "generated" | "already_processed";
};

const MAX_ACTION_ROWS = 1000;
const MAX_NEED_ROWS = 2000;

function actionTitle(action: ActionRow): string {
  return action.preparation_data?.actionTitle?.trim() || action.location_label;
}

function actionTerritory(action: ActionRow): string | null {
  return resolveActionTerritoryDestination({ location_label: action.location_label })?.zoneName ?? null;
}

function isReferencePublicForDigest(action: ActionRow, now: Date): boolean {
  return action.access_mode !== "invite_link" && isPublicActionReferenceAvailable(action, now);
}

function isWithinAnyPeriod(value: string, periods: readonly CommunityDigestPeriod[]): boolean {
  return periods.some((period) => isDateInCommunityDigestPeriod(value, period));
}

function actionPublicVisibilityAt(action: ActionRow): string | null {
  return action.public_visibility_started_at ?? action.published_at ?? null;
}

function toActionReference(
  action: ActionRow,
  type: "future_actions" | "results",
  visibleAt: string | null,
): CommunityDigestReference | null {
  if (!visibleAt) return null;
  return {
    type,
    id: action.id,
    actionId: action.id,
    title: actionTitle(action),
    actionDate: action.action_date,
    locationLabel: action.location_label,
    territoryZoneName: actionTerritory(action),
    visibleAt,
  };
}

function toNeedReference(
  need: ActionNeedRow,
  action: ActionRow,
): CommunityDigestReference | null {
  const actionVisibleAt = actionPublicVisibilityAt(action);
  if (!actionVisibleAt) return null;
  const visibleAt = new Date(need.created_at).getTime() > new Date(actionVisibleAt).getTime()
    ? need.created_at
    : actionVisibleAt;
  return {
    type: "needs",
    id: need.id,
    actionId: action.id,
    title: need.title,
    actionDate: action.action_date,
    locationLabel: action.location_label,
    territoryZoneName: actionTerritory(action),
    visibleAt,
  };
}

function requestedSources(subscriptions: readonly CommunitySubscriptionRow[]): Set<CommunityDigestSource> {
  const sources = new Set<CommunityDigestSource>();
  for (const subscription of subscriptions) {
    if (!subscription.enabled) continue;
    if (subscription.kind === "topic" && subscription.topic_id) {
      sources.add(subscription.topic_id as CommunityDigestSource);
    } else if (subscription.kind === "territory") {
      for (const source of COMMUNITY_DIGEST_SOURCES) sources.add(source);
    }
  }
  return sources;
}

function collectActionDigestReferences(
  actions: readonly ActionRow[],
  periods: readonly CommunityDigestPeriod[],
  now: Date,
  source: "future_actions" | "results",
): CommunityDigestReference[] {
  const references: CommunityDigestReference[] = [];
  for (const action of actions) {
    const visibleAt = source === "future_actions" ? actionPublicVisibilityAt(action) : action.results_published_at ?? null;
    const visible = source === "future_actions"
      ? isPublishedFuturePreAction(action, now)
      : action.action_phase === "post_action_complete" && action.status === "approved";
    if (!visible || !visibleAt || !isWithinAnyPeriod(visibleAt, periods)) continue;
    const reference = toActionReference(action, source, visibleAt);
    if (reference) references.push(reference);
  }
  return references;
}

async function collectNeedDigestReferences(
  supabase: SupabaseClient,
  actions: readonly ActionRow[],
  periods: readonly CommunityDigestPeriod[],
  now: Date,
): Promise<CommunityDigestReference[]> {
  const futureActions = actions.filter((action) => isPublishedFuturePreAction(action, now));
  const actionById = new Map(futureActions.map((action) => [action.id, action]));
  if (actionById.size === 0) return [];
  const result = await supabase
    .from("action_needs")
    .select(ACTION_NEED_SELECT_FIELDS)
    .in("action_id", [...actionById.keys()])
    .eq("status", "open")
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .range(0, MAX_NEED_ROWS - 1);
  if (result.error) throw new Error(result.error.message);
  const references: CommunityDigestReference[] = [];
  for (const rawNeed of result.data ?? []) {
    const need = rawNeed as ActionNeedRow;
    const action = actionById.get(need.action_id);
    if (!action || getActionNeedEffectiveStatus(need, now) !== "open") continue;
    const reference = toNeedReference(need, action);
    if (reference && isWithinAnyPeriod(reference.visibleAt, periods)) references.push(reference);
  }
  return references;
}

export async function listEnabledCommunitySubscriptions(
  supabase: SupabaseClient,
  userId: string,
): Promise<CommunitySubscriptionRow[]> {
  const result = await supabase
    .from("community_subscriptions")
    .select("id, user_id, kind, territory_zone_name, topic_id, cadence, enabled, created_at, updated_at")
    .eq("user_id", userId)
    .eq("enabled", true)
    .order("created_at", { ascending: true })
    .order("id", { ascending: true });
  if (result.error) throw new Error(result.error.message);
  return (result.data ?? []) as CommunitySubscriptionRow[];
}

export function getDueCommunityDigestPeriods(
  subscriptions: readonly CommunitySubscriptionRow[],
  now = new Date(),
): CommunityDigestPeriod[] {
  const cadences = new Set<CommunitySubscriptionCadence>(
    subscriptions.filter((item) => item.enabled).map((item) => item.cadence),
  );
  return COMMUNITY_SUBSCRIPTION_CADENCES
    .filter((cadence) => cadences.has(cadence))
    .map((cadence) => getCommunityDigestPeriod(cadence, now));
}

export async function listProcessedCommunityDigestRuns(
  supabase: SupabaseClient,
  userId: string,
  periods: readonly CommunityDigestPeriod[],
): Promise<Set<string>> {
  if (periods.length === 0) return new Set();
  const result = await supabase
    .from("community_digest_runs")
    .select("cadence, period_key, item_count, notification_id")
    .eq("user_id", userId)
    .in("cadence", periods.map((period) => period.cadence))
    .in("period_key", periods.map((period) => period.periodKey));
  if (result.error) throw new Error(result.error.message);
  return new Set(
    (result.data ?? []).map((row) => `${String(row.cadence)}:${String(row.period_key)}`),
  );
}

export async function loadPublicCommunityDigestReferences(
  supabase: SupabaseClient,
  subscriptions: readonly CommunitySubscriptionRow[],
  periods: readonly CommunityDigestPeriod[],
  now = new Date(),
): Promise<CommunityDigestReference[]> {
  const sources = requestedSources(subscriptions);
  if (sources.size === 0 || periods.length === 0) return [];

  const actions = await fetchActionRows(supabase, {
    limit: MAX_ACTION_ROWS,
    status: "approved",
    includeFuturePublicActions: true,
  });
  const publicActions = actions.filter((action) => isReferencePublicForDigest(action, now));
  const references: CommunityDigestReference[] = [];

  if (sources.has("future_actions")) references.push(...collectActionDigestReferences(publicActions, periods, now, "future_actions"));
  if (sources.has("results")) references.push(...collectActionDigestReferences(publicActions, periods, now, "results"));
  if (sources.has("needs")) references.push(...await collectNeedDigestReferences(supabase, publicActions, periods, now));

  return references;
}

function territoryMatches(reference: CommunityDigestReference, target: string): boolean {
  if (!reference.territoryZoneName) return false;
  const targetLower = target.toLocaleLowerCase("fr-FR");
  const referenceLower = reference.territoryZoneName.toLocaleLowerCase("fr-FR");
  return referenceLower === targetLower || getNeighbors(target).some(
    (neighbor) => neighbor.toLocaleLowerCase("fr-FR") === referenceLower,
  );
}

export function buildCommunityDigestItems(
  references: readonly CommunityDigestReference[],
  subscriptions: readonly CommunitySubscriptionRow[],
  period: CommunityDigestPeriod,
): CommunityDigestItem[] {
  const matching = references.filter((reference) => {
    if (!isDateInCommunityDigestPeriod(reference.visibleAt, period)) return false;
    return subscriptions.some((subscription) => {
      if (!subscription.enabled || subscription.cadence !== period.cadence) return false;
      if (subscription.kind === "topic") return subscription.topic_id === reference.type;
      return subscription.territory_zone_name !== null && territoryMatches(reference, subscription.territory_zone_name);
    });
  });

  const unique = new Map<string, CommunityDigestReference>();
  for (const reference of matching) unique.set(`${reference.type}:${reference.id}`, reference);
  return [...unique.values()]
    .sort((left, right) =>
      left.visibleAt.localeCompare(right.visibleAt) ||
      left.type.localeCompare(right.type) ||
      left.id.localeCompare(right.id),
    )
    .slice(0, 10)
    .map(({ type, id, actionId, title, actionDate, locationLabel }) => ({
      type,
      id,
      actionId,
      title,
      actionDate,
      locationLabel,
    }));
}

export async function commitCommunityDigestRun(
  supabase: SupabaseClient,
  userId: string,
  period: CommunityDigestPeriod,
  items: readonly CommunityDigestItem[],
): Promise<CommunityDigestRun> {
  const result = await supabase.rpc("commit_community_digest_run", {
    p_user_id: userId,
    p_cadence: period.cadence,
    p_period_key: period.periodKey,
    p_items: items,
  });
  if (result.error) throw new Error(result.error.message);
  const row = (Array.isArray(result.data) ? result.data[0] : result.data) as {
    status?: CommunityDigestRun["status"];
    run_id?: string;
    notification_id?: string | null;
  } | null;
  if (!row?.status || !row.run_id) throw new Error("community_digest_invalid_rpc_response");
  return {
    cadence: period.cadence,
    periodKey: period.periodKey,
    itemCount: items.length,
    notificationId: row.notification_id ?? null,
    status: row.status,
  };
}
