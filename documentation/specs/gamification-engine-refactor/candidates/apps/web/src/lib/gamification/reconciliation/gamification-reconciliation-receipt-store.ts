import type { SupabaseClient } from "@supabase/supabase-js";
import type { GamificationReconciliationReceipt, ScientificImpactReceiptIntent } from "./gamification-reconciliation-receipt-types";

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isScientificImpactReceiptIntent(value: unknown): value is ScientificImpactReceiptIntent {
  if (!isRecord(value) || value.kind !== "scientific_impact_reconciliation_pending" || value.schemaVersion !== 1) {
    return false;
  }
  const impact = value.scientificImpact;
  return typeof value.reconciliationId === "string"
    && typeof value.userId === "string"
    && isRecord(impact)
    && typeof impact.methodVersion === "string"
    && typeof impact.sourceFingerprint === "string"
    && [impact.eventsAdded, impact.eventsUpdated, impact.eventsRemoved]
      .every((count) => typeof count === "number" && Number.isSafeInteger(count) && count >= 0);
}

function finalReceiptFromPayload(
  payload: unknown,
  userId: string,
): GamificationReconciliationReceipt | null {
  if (!isRecord(payload) || payload.kind !== "gamification_reconciliation_receipt") return null;
  const receipt = payload.receipt;
  if (!isRecord(receipt) || receipt.userId !== userId || receipt.hasUserVisibleChanges !== true) return null;
  return receipt as unknown as GamificationReconciliationReceipt;
}

type ReconciliationNotificationRecord = {
  id?: unknown;
  payload?: unknown;
};

async function findReconciliationNotification(
  supabase: SupabaseClient,
  userId: string,
  reconciliationId: string,
): Promise<{
  id: string;
  payload: unknown;
  pendingIntent: ScientificImpactReceiptIntent | null;
  receipt: GamificationReconciliationReceipt | null;
} | null> {
  const result = await supabase
    .from("app_notifications")
    .select("id, payload")
    .eq("user_id", userId)
    .eq("type", "gamification_reconciliation")
    .eq("payload->>reconciliationId", reconciliationId)
    .limit(2);
  if (result.error) throw new Error(result.error.message);

  for (const row of (result.data ?? []) as ReconciliationNotificationRecord[]) {
    if (typeof row.id !== "string" || !isRecord(row.payload)) continue;
    const payload = row.payload;
    if (payload.reconciliationId !== reconciliationId) continue;
    const pendingIntent = isScientificImpactReceiptIntent(payload) ? payload : null;
    const receipt = finalReceiptFromPayload(payload, userId);
    if (pendingIntent || receipt) {
      return { id: row.id, payload, pendingIntent, receipt };
    }
  }
  return null;
}

function scientificImpactMatches(
  left: GamificationReconciliationReceipt["scientificImpact"] | ScientificImpactReceiptIntent["scientificImpact"] | undefined,
  right: GamificationReconciliationReceipt["scientificImpact"] | ScientificImpactReceiptIntent["scientificImpact"] | undefined,
): boolean {
  if (!left || !right) return false;
  return left.methodVersion === right.methodVersion &&
    left.sourceFingerprint === right.sourceFingerprint &&
    left.eventsAdded === right.eventsAdded &&
    left.eventsUpdated === right.eventsUpdated &&
    left.eventsRemoved === right.eventsRemoved;
}

export async function loadPendingScientificImpactReceipt(
  supabase: SupabaseClient,
  userId: string,
  reconciliationId: string,
  legacyReconciliationIds: readonly string[] = [],
): Promise<ScientificImpactReceiptIntent | null> {
  const identities = [...new Set([reconciliationId, ...legacyReconciliationIds])];
  for (const identity of identities) {
    const existing = await findReconciliationNotification(supabase, userId, identity);
    if (existing?.pendingIntent) return existing.pendingIntent;
  }
  return null;
}

function finalReceiptPayload(receipt: GamificationReconciliationReceipt) {
  return {
    kind: "gamification_reconciliation_receipt",
    schemaVersion: 2,
    reconciliationId: receipt.reconciliationId,
    receipt,
  };
}

export async function persistGamificationReconciliationReceipt(
  supabase: SupabaseClient,
  receipt: GamificationReconciliationReceipt,
): Promise<void> {
  if (!receipt.hasUserVisibleChanges) return;
  const payload = finalReceiptPayload(receipt);
  const insertResult = await supabase.from("app_notifications").insert({
    user_id: receipt.userId,
    type: "gamification_reconciliation",
    title: "Votre progression CleanMyMap a été mise à jour.",
    content: "Voir les changements sur la page Gamification.",
    created_at: receipt.occurredAt,
    seen_at: null,
    acknowledged_at: null,
    payload,
  });
  if (!insertResult.error) return;
  if (insertResult.error.code !== "23505") throw new Error(insertResult.error.message);

  const existing = await findReconciliationNotification(
    supabase,
    receipt.userId,
    receipt.reconciliationId,
  );
  if (!existing) {
    throw new Error("Le reçu scientifique existant est introuvable après un conflit d'identité.");
  }
  if (existing.receipt) {
    if (
      existing.receipt.reconciliationId !== receipt.reconciliationId ||
      existing.receipt.userId !== receipt.userId ||
      receipt.scientificImpact && !scientificImpactMatches(existing.receipt.scientificImpact, receipt.scientificImpact)
    ) {
      throw new Error("Le reçu scientifique final concurrent ne correspond pas à l'intention demandée.");
    }
    return;
  }
  if (
    !existing.pendingIntent ||
    existing.pendingIntent.reconciliationId !== receipt.reconciliationId ||
    existing.pendingIntent.userId !== receipt.userId ||
    !scientificImpactMatches(existing.pendingIntent.scientificImpact, receipt.scientificImpact)
  ) {
    throw new Error("L'intention scientifique existante ne correspond pas au reçu à finaliser.");
  }
  const updateResult = await supabase
    .from("app_notifications")
    .update({
      title: "Votre progression CleanMyMap a été mise à jour.",
      content: "Voir les changements sur la page Gamification.",
      payload,
    })
    .eq("id", existing.id)
    .eq("user_id", receipt.userId)
    .eq("type", "gamification_reconciliation")
    .eq("payload->>kind", "scientific_impact_reconciliation_pending")
    .eq("payload->>userId", receipt.userId)
    .eq("payload->>reconciliationId", receipt.reconciliationId)
    .select("id");
  if (updateResult.error) throw new Error(updateResult.error.message);
  const updatedCount = updateResult.data?.length ?? 0;
  if (updatedCount === 1) return;
  if (updatedCount !== 0) {
    throw new Error("La finalisation du reçu scientifique a modifié un nombre de lignes inattendu.");
  }

  const winner = await findReconciliationNotification(
    supabase,
    receipt.userId,
    receipt.reconciliationId,
  );
  if (
    winner?.receipt &&
    winner.receipt.reconciliationId === receipt.reconciliationId &&
    winner.receipt.userId === receipt.userId &&
    receipt.scientificImpact &&
    scientificImpactMatches(winner.receipt.scientificImpact, receipt.scientificImpact)
  ) {
    return;
  }
  throw new Error("La finalisation du reçu scientifique a perdu sa transition conditionnelle.");
}
