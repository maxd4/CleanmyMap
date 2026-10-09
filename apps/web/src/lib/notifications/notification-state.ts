import type { AppNotification } from "./client";

export type NotificationDisplayState =
  | "unread"
  | "read"
  | "decision_pending"
  | "treated"
  | "unavailable";

export type NotificationDecisionDescriptor = {
  kind: "action_share" | "action_invitation";
  requestId: string;
};

function readString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

export function getNotificationDecisionDescriptor(
  payload: unknown,
): NotificationDecisionDescriptor | null {
  if (!payload || typeof payload !== "object") return null;
  const raw = payload as Record<string, unknown>;
  const requestKind = readString(raw.requestKind);
  if (requestKind === "action_share") {
    const requestId = readString(raw.requestId);
    return requestId ? { kind: "action_share", requestId } : null;
  }
  if (raw.eventType === "action_event" && raw.subtype === "invitation") {
    const registrationId = readString(raw.registrationId);
    return registrationId ? { kind: "action_invitation", requestId: registrationId } : null;
  }
  return null;
}

function getPersistedDecisionState(payload: unknown): "treated" | "unavailable" | null {
  if (!payload || typeof payload !== "object") return null;
  const state = readString((payload as Record<string, unknown>).decisionState);
  return state === "treated" || state === "unavailable" ? state : null;
}

export function resolveNotificationDisplayState(params: {
  notification: AppNotification;
  pendingRequestIds: ReadonlySet<string>;
  treatedNotificationIds?: ReadonlySet<string>;
}): NotificationDisplayState {
  const { notification, pendingRequestIds, treatedNotificationIds } = params;
  const decision = getNotificationDecisionDescriptor(notification.payload);
  if (decision) {
    if (treatedNotificationIds?.has(notification.id)) return "treated";
    if (pendingRequestIds.has(decision.requestId)) return "decision_pending";
    return getPersistedDecisionState(notification.payload) ?? "unavailable";
  }

  return notification.read_at ? "read" : "unread";
}

export function countPendingNotificationDecisions(
  notifications: readonly AppNotification[],
  pendingRequestIds: ReadonlySet<string>,
): number {
  return notifications.reduce((count, notification) => {
    const decision = getNotificationDecisionDescriptor(notification.payload);
    return decision && pendingRequestIds.has(decision.requestId) ? count + 1 : count;
  }, 0);
}
