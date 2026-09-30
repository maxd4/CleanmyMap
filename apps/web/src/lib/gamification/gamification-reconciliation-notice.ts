import type { SupabaseClient } from "@supabase/supabase-js";
import type { GamificationReconciliationReceipt } from "./gamification-reconciliation-receipt";

export type PendingGamificationReconciliation = {
  notificationId: string;
  createdAt: string;
  receipt: GamificationReconciliationReceipt;
};

type UnknownRecord = Record<string, unknown>;

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

export async function loadPendingGamificationReconciliation(
  supabase: SupabaseClient,
  userId: string,
): Promise<PendingGamificationReconciliation | null> {
  const result = await supabase
    .from("app_notifications")
    .select("id, created_at, acknowledged_at, payload")
    .eq("user_id", userId)
    .eq("type", "gamification_reconciliation")
    .is("acknowledged_at", null)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(20);

  if (result.error) throw new Error(result.error.message);
  const rows = (result.data ?? []) as Array<{
    id?: unknown;
    created_at?: unknown;
    acknowledged_at?: unknown;
    payload?: unknown;
  }>;
  for (const row of rows) {
    if (typeof row.id !== "string" || typeof row.created_at !== "string" || row.acknowledged_at !== null) continue;
    const receipt = receiptFromPayload(row.payload, userId);
    if (receipt) return { notificationId: row.id, createdAt: row.created_at, receipt };
  }
  return null;
}
