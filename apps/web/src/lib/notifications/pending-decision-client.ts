import type { AppNotification } from "./client";

export type PendingDecisionKind =
  | "action_share"
  | "action_invitation"
  | "action_registration_request"
  | "action_result"
  | "action_post_action_claim";

export type PendingDecisionRequest = {
  kind: PendingDecisionKind;
  requestId: string;
};

export function getPendingDecisionRequestKey(kind: PendingDecisionKind, requestId: string): string {
  return `${kind}:${requestId}`;
}

export function readPendingDecisionRequest(
  payload: Record<string, unknown> | null,
): PendingDecisionRequest | null {
  if (!payload) return null;
  if (payload.requestKind === "action_share") {
    return typeof payload.requestId === "string" && payload.requestId.trim()
      ? { kind: "action_share", requestId: payload.requestId.trim() }
      : null;
  }
  if (payload.eventType === "action_event" && payload.subtype === "invitation") {
    return typeof payload.registrationId === "string" && payload.registrationId.trim()
      ? { kind: "action_invitation", requestId: payload.registrationId.trim() }
      : null;
  }
  if (
    payload.eventType === "action_event"
    && payload.subtype === "registration_request"
    && payload.requestKind === "registration_request"
  ) {
    return typeof payload.registrationId === "string" && payload.registrationId.trim()
      ? { kind: "action_registration_request", requestId: payload.registrationId.trim() }
      : null;
  }
  if (payload.eventType === "action_event" && payload.subtype === "action_result") {
    const actionId = readPendingDecisionString(payload.actionId);
    return actionId ? { kind: "action_result", requestId: actionId } : null;
  }
  if (payload.eventType === "action_event" && payload.subtype === "post_action_claim") {
    const participationId = readPendingDecisionString(payload.participationId);
    return participationId ? { kind: "action_post_action_claim", requestId: participationId } : null;
  }
  return null;
}

function readPendingDecisionString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export function isActionablePendingDecisionNotification(notification: AppNotification): boolean {
  const state = notification.payload?.decisionState;
  return state !== "treated" && state !== "unavailable";
}

function escapePostgrestFilterValue(value: string): string {
  return value.replaceAll("\\", "\\\\").replaceAll(",", "\\,");
}

export function normalizePendingDecisionRequests(
  pendingRequests: readonly PendingDecisionRequest[],
): PendingDecisionRequest[] {
  const seen = new Set<string>();
  return pendingRequests.flatMap((request) => {
    const requestId = request.requestId.trim();
    if (!requestId) return [];
    const key = getPendingDecisionRequestKey(request.kind, requestId);
    if (seen.has(key)) return [];
    seen.add(key);
    return [{ kind: request.kind, requestId }];
  });
}

export function buildPendingDecisionFilter(request: PendingDecisionRequest): string {
  const escaped = escapePostgrestFilterValue(request.requestId);
  switch (request.kind) {
    case "action_share":
      return `and(payload->>requestId.eq.${escaped},payload->>requestKind.eq.action_share)`;
    case "action_invitation":
      return `and(payload->>registrationId.eq.${escaped},payload->>subtype.eq.invitation)`;
    case "action_registration_request":
      return `and(payload->>registrationId.eq.${escaped},payload->>subtype.eq.registration_request,payload->>requestKind.eq.registration_request)`;
    case "action_result":
      return `and(payload->>actionId.eq.${escaped},payload->>subtype.eq.action_result)`;
    case "action_post_action_claim":
      return `and(payload->>participationId.eq.${escaped},payload->>subtype.eq.post_action_claim)`;
  }
}
