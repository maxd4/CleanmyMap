import type { AppNotification } from "./client";

export type NotificationDisplayState =
  | "unread"
  | "read"
  | "decision_pending"
  | "treated"
  | "unavailable";

export type NotificationDecisionDescriptor = {
  kind:
    | "action_share"
    | "action_invitation"
    | "action_registration_request"
    | "action_result"
    | "action_post_action_claim";
  requestId: string;
  actionId?: string;
};

export type NotificationDecisionOutcome =
  | "accepted"
  | "rejected"
  | "withdrawn"
  | "claimed"
  | "not_participated";

function readString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function getActionEventDecisionDescriptor(
  raw: Record<string, unknown>,
): NotificationDecisionDescriptor | null {
  if (raw.eventType !== "action_event") return null;
  if (raw.subtype === "invitation") {
    const registrationId = readString(raw.registrationId);
    return registrationId ? { kind: "action_invitation", requestId: registrationId } : null;
  }
  if (raw.subtype === "registration_request" && raw.requestKind === "registration_request") {
    const registrationId = readString(raw.registrationId);
    const actionId = readString(raw.actionId);
    return registrationId && actionId
      ? { kind: "action_registration_request", requestId: registrationId, actionId }
      : null;
  }
  if (raw.subtype === "action_result") {
    const actionId = readString(raw.actionId);
    return actionId ? { kind: "action_result", requestId: actionId, actionId } : null;
  }
  if (raw.subtype === "post_action_claim") {
    const participationId = readString(raw.participationId);
    const actionId = readString(raw.actionId);
    return participationId && actionId
      ? { kind: "action_post_action_claim", requestId: participationId, actionId }
      : null;
  }
  return null;
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
  return getActionEventDecisionDescriptor(raw);
}

function getPersistedDecisionState(payload: unknown): "treated" | "unavailable" | null {
  if (!payload || typeof payload !== "object") return null;
  const state = readString((payload as Record<string, unknown>).decisionState);
  return state === "treated" || state === "unavailable" ? state : null;
}

export function getNotificationDecisionOutcome(payload: unknown): NotificationDecisionOutcome | null {
  if (!payload || typeof payload !== "object") return null;
  const decision = readString((payload as Record<string, unknown>).decision);
  if (decision === "accept" || decision === "accepted") return "accepted";
  if (decision === "reject" || decision === "rejected") return "rejected";
  if (decision === "withdrawn") return "withdrawn";
  if (decision === "claim" || decision === "claimed") return "claimed";
  if (decision === "not_participated") return "not_participated";
  return null;
}

export function resolveNotificationDisplayState(params: {
  notification: AppNotification;
  pendingRequestIds: ReadonlySet<string>;
  treatedNotificationIds?: ReadonlySet<string>;
}): NotificationDisplayState {
  const { notification, pendingRequestIds, treatedNotificationIds } = params;
  const decision = getNotificationDecisionDescriptor(notification.payload);
  if (decision) {
    const persistedState = getPersistedDecisionState(notification.payload);
    if (persistedState) return persistedState;
    if (treatedNotificationIds?.has(notification.id)) return "treated";
    if (pendingRequestIds.has(decision.requestId)) return "decision_pending";
    return "unavailable";
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

export function prioritizeNotificationPreview(
  pendingNotifications: readonly AppNotification[],
  chronologicalNotifications: readonly AppNotification[],
  limit = 4,
): AppNotification[] {
  const result: AppNotification[] = [];
  const seen = new Set<string>();
  for (const notification of [...pendingNotifications, ...chronologicalNotifications]) {
    if (seen.has(notification.id)) continue;
    seen.add(notification.id);
    result.push(notification);
    if (result.length >= limit) break;
  }
  return result;
}
