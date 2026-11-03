import type { SupabaseClient } from "@supabase/supabase-js";
import type { GamificationReconciliationReceipt } from "./gamification-reconciliation-receipt";

export type PendingGamificationReconciliation = {
  notificationId: string;
  createdAt: string;
  seenAt: string | null;
  acknowledgedAt: string | null;
  unacknowledgedCount: number;
  unseenCount: number;
  receipt: GamificationReconciliationReceipt;
};

export type GamificationReconciliationHistoryEntry = {
  notificationId: string;
  createdAt: string;
  seenAt: string | null;
  acknowledgedAt: string | null;
  receipt: GamificationReconciliationReceipt;
};

export type GamificationReconciliationInbox = {
  history: GamificationReconciliationHistoryEntry[];
  pending: PendingGamificationReconciliation | null;
  targeted: GamificationReconciliationHistoryEntry | null;
};

const GAMIFICATION_RECONCILIATION_HISTORY_LIMIT = 50;
const RECONCILIATION_NOTIFICATION_SELECT = "id, created_at, seen_at, acknowledged_at, payload";
const OPAQUE_NOTIFICATION_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type UnknownRecord = Record<string, unknown>;
type ReconciliationNotificationRow = {
  id?: unknown;
  created_at?: unknown;
  seen_at?: unknown;
  acknowledged_at?: unknown;
  payload?: unknown;
};

export function isGamificationReconciliationNotificationId(value: unknown): value is string {
  return typeof value === "string" && OPAQUE_NOTIFICATION_ID_PATTERN.test(value);
}

function isRecord(value: unknown): value is UnknownRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function hasValidXp(value: UnknownRecord): boolean {
  return isRecord(value.xp)
    && isNumber(value.xp.before)
    && isNumber(value.xp.after)
    && isNumber(value.xp.delta);
}

function hasValidLevel(value: UnknownRecord): boolean {
  return isRecord(value.level)
    && (isNumber(value.level.before) || value.level.before === null)
    && (isNumber(value.level.after) || value.level.after === null);
}

function hasValidChangeCollections(value: UnknownRecord): boolean {
  if (!isRecord(value.progressions) || !isRecord(value.badges) || !isRecord(value.milestones)) return false;
  return Array.isArray(value.progressions.added)
    && Array.isArray(value.progressions.removed)
    && Array.isArray(value.progressions.changed)
    && Array.isArray(value.badges.unlocked)
    && Array.isArray(value.badges.removed)
    && Array.isArray(value.badges.upgraded)
    && Array.isArray(value.badges.downgraded)
    && Array.isArray(value.milestones.unlocked)
    && Array.isArray(value.milestones.removed);
}

function isReceipt(value: unknown): value is GamificationReconciliationReceipt {
  if (!isRecord(value)) return false;
  if (typeof value.reconciliationId !== "string" || typeof value.userId !== "string") return false;
  if (typeof value.occurredAt !== "string" || typeof value.currentRulesVersion !== "string") return false;
  return hasValidXp(value) && hasValidLevel(value) && hasValidChangeCollections(value)
    && typeof value.hasUserVisibleChanges === "boolean"
    && value.hasUserVisibleChanges;
}

function receiptFromPayload(payload: unknown, userId: string): GamificationReconciliationReceipt | null {
  if (!isRecord(payload) || payload.kind !== "gamification_reconciliation_receipt") return null;
  if (!isReceipt(payload.receipt) || payload.receipt.userId !== userId) return null;
  return payload.receipt;
}

async function loadReconciliationRows(
  supabase: SupabaseClient,
  userId: string,
  options: { onlyUnacknowledged?: boolean; limit?: number } = {},
): Promise<ReconciliationNotificationRow[]> {
  let query = supabase
    .from("app_notifications")
    .select(RECONCILIATION_NOTIFICATION_SELECT)
    .eq("user_id", userId)
    .eq("type", "gamification_reconciliation");

  if (options.onlyUnacknowledged) query = query.is("acknowledged_at", null);

  query = query.order("created_at", { ascending: false }).order("id", { ascending: false });
  if (options.limit !== undefined) query = query.limit(options.limit);

  const result = await query;
  if (result.error) throw new Error(result.error.message);
  return (result.data ?? []) as ReconciliationNotificationRow[];
}

export async function loadGamificationReconciliationTarget(
  supabase: SupabaseClient,
  userId: string,
  notificationId: string | null,
): Promise<GamificationReconciliationHistoryEntry | null> {
  if (!isGamificationReconciliationNotificationId(notificationId)) return null;

  const { data, error } = await supabase
    .from("app_notifications")
    .select(RECONCILIATION_NOTIFICATION_SELECT)
    .eq("id", notificationId)
    .eq("user_id", userId)
    .eq("type", "gamification_reconciliation")
    .maybeSingle();
  if (error) throw new Error(error.message);

  return parseReconciliationRows(data ? [data as ReconciliationNotificationRow] : [], userId)[0] ?? null;
}

function parseReconciliationRows(
  rows: ReconciliationNotificationRow[],
  userId: string,
): GamificationReconciliationHistoryEntry[] {
  const entries: GamificationReconciliationHistoryEntry[] = [];
  for (const row of rows) {
    if (typeof row.id !== "string" || typeof row.created_at !== "string") continue;
    const receipt = receiptFromPayload(row.payload, userId);
    if (!receipt) continue;
    entries.push({
      notificationId: row.id,
      createdAt: row.created_at,
      seenAt: typeof row.seen_at === "string" ? row.seen_at : null,
      acknowledgedAt: typeof row.acknowledged_at === "string" ? row.acknowledged_at : null,
      receipt,
    });
  }
  return entries;
}

export async function loadPendingGamificationReconciliation(
  supabase: SupabaseClient,
  userId: string,
): Promise<PendingGamificationReconciliation | null> {
  return (await loadGamificationReconciliationInbox(supabase, userId)).pending;
}

export async function loadGamificationReconciliationHistory(
  supabase: SupabaseClient,
  userId: string,
): Promise<GamificationReconciliationHistoryEntry[]> {
  const rows = await loadReconciliationRows(supabase, userId, {
    limit: GAMIFICATION_RECONCILIATION_HISTORY_LIMIT,
  });
  return parseReconciliationRows(rows, userId);
}

export async function loadGamificationReconciliationInbox(
  supabase: SupabaseClient,
  userId: string,
  targetNotificationId: string | null = null,
): Promise<GamificationReconciliationInbox> {
  const [historyRows, pendingRows, targeted] = await Promise.all([
    loadReconciliationRows(supabase, userId, { limit: GAMIFICATION_RECONCILIATION_HISTORY_LIMIT }),
    loadReconciliationRows(supabase, userId, { onlyUnacknowledged: true }),
    loadGamificationReconciliationTarget(supabase, userId, targetNotificationId),
  ]);
  const history = parseReconciliationRows(historyRows, userId);
  const pendingEntries = parseReconciliationRows(pendingRows, userId)
    .filter((entry) => entry.acknowledgedAt === null);
  const latest = pendingEntries[0];

  return {
    history,
    targeted,
    pending: latest
      ? {
          ...latest,
          unacknowledgedCount: pendingEntries.length,
          unseenCount: pendingEntries.filter((entry) => entry.seenAt === null).length,
        }
      : null,
  };
}
