function readString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

export function buildGamificationReconciliationHref(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;
  const raw = payload as Record<string, unknown>;
  if (raw.kind !== "gamification_reconciliation_receipt") return null;
  const reconciliationId = readString(raw.reconciliationId)
    ?? (raw.receipt && typeof raw.receipt === "object"
      ? readString((raw.receipt as Record<string, unknown>).reconciliationId)
      : null);
  return reconciliationId
    ? `/sections/gamification?receipt=${encodeURIComponent(reconciliationId)}`
    : null;
}
