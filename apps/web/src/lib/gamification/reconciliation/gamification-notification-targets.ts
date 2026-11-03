const OPAQUE_NOTIFICATION_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isOpaqueNotificationId(value: unknown): value is string {
  return typeof value === "string" && OPAQUE_NOTIFICATION_ID_PATTERN.test(value);
}

export function buildGamificationReconciliationHref(
  payload: unknown,
  notificationId?: unknown,
): string | null {
  if (!payload || typeof payload !== "object") return null;
  const raw = payload as Record<string, unknown>;
  if (raw.kind !== "gamification_reconciliation_receipt") return null;
  if (!isOpaqueNotificationId(notificationId)) return null;
  return `/sections/gamification?receipt=${encodeURIComponent(notificationId)}`;
}
