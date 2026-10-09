"use client";

import type { SupabaseClient } from "@supabase/supabase-js";
import { buildRequiredClerkSupabaseAccessTokenProvider } from "@/lib/clerk-supabase-token";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  buildPendingDecisionFilter,
  getPendingDecisionRequestKey,
  isActionablePendingDecisionNotification,
  normalizePendingDecisionRequests,
  readPendingDecisionRequest,
} from "./pending-decision-client";
import type { PendingDecisionRequest } from "./pending-decision-client";
export {
  getPendingDecisionRequestKey,
} from "./pending-decision-client";
export type {
  PendingDecisionRequest,
} from "./pending-decision-client";

export type AppNotification = {
  id: string;
  type: "validation" | "community" | "system" | "security" | "chat" | "action_discussion" | "gamification_reconciliation" | "action_event";
  title: string;
  content: string;
  read_at: string | null;
  seen_at?: string | null;
  acknowledged_at?: string | null;
  created_at: string;
  payload: Record<string, unknown> | null;
};

const notificationColumns =
  "id, type, title, content, read_at, seen_at, acknowledged_at, created_at, payload" as const;

const NOTIFICATIONS_PAGE_SIZE = 20;
const PENDING_NOTIFICATION_REQUEST_BATCH_SIZE = 50;
const PENDING_NOTIFICATION_PAGE_SIZE = 50;
const PENDING_NOTIFICATION_MAX_PAGES = 20;

export type NotificationPageCursor = {
  createdAt: string;
  id: string;
};

export type NotificationsPage = {
  notifications: AppNotification[];
  nextCursor: NotificationPageCursor | null;
};

export type PendingDecisionNotifications = {
  notifications: AppNotification[];
  missingRequestIds: string[];
  unresolvedRequestIds: string[];
};

export type NotificationDecision = "accept" | "reject" | "claim" | "not_participated";

export type NotificationDecisionResponse = {
  status: "accepted" | "rejected" | "ignored" | "unavailable";
  messageId: string | null;
  actionId: string | null;
  senderId: string | null;
};

export type ActionInvitationDecisionResponse = {
  status: "accepted" | "rejected" | "unavailable";
  registrationId: string;
  actionId: string | null;
};

export type ActionRegistrationRequestDecisionResponse = {
  status: "accepted" | "rejected" | "unavailable";
  registrationId: string;
  actionId: string | null;
};

async function getNotificationsClient(
  getToken: () => Promise<string | null>,
): Promise<SupabaseClient> {
  const token = await buildRequiredClerkSupabaseAccessTokenProvider(getToken)();

  // Do not let a missing Clerk token fall back to the anon role. The table
  // intentionally revokes anon access, and an anonymous request would turn
  // a session-readiness race into a misleading RLS/PostgREST error.
  return getSupabaseBrowserClient(async () => token);
}

export async function loadNotificationsForCurrentUser(
  userId: string,
  getToken: () => Promise<string | null>,
): Promise<AppNotification[]> {
  const page = await loadNotificationsPageForCurrentUser(userId, getToken);
  return page.notifications;
}

export async function loadUnreadNotificationCountForCurrentUser(
  userId: string,
  getToken: () => Promise<string | null>,
): Promise<number> {
  const supabase = await getNotificationsClient(getToken);
  const { count, error } = await supabase
    .from("app_notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .is("read_at", null);

  if (error) {
    throw error;
  }

  return count ?? 0;
}

function parseContactRequestIds(payload: unknown): string[] {
  if (!payload || typeof payload !== "object") return [];
  const requests = (payload as { requests?: unknown }).requests;
  if (!Array.isArray(requests)) return [];

  return requests.flatMap((request) => {
    if (!request || typeof request !== "object") return [];
    const id = (request as { id?: unknown }).id;
    return typeof id === "string" && id.trim().length > 0 ? [id.trim()] : [];
  });
}

export async function readContactRequestsResponse(response: Response): Promise<unknown> {
  let payload: unknown = null;
  try {
    payload = await response.json();
  } catch {
    // Keep the generic error below for non-JSON responses.
  }

  if (!response.ok) {
    const message =
      payload && typeof payload === "object" && typeof (payload as { error?: unknown }).error === "string"
        ? (payload as { error: string }).error
        : "La décision de notification n'a pas pu être traitée.";
    const error = new Error(message);
    Object.assign(error, { status: response.status });
    throw error;
  }

  return payload;
}

export async function loadPendingNotificationDecisionIds(): Promise<string[]> {
  const response = await fetch("/api/chat/contact-requests", {
    cache: "no-store",
    credentials: "same-origin",
    headers: { Accept: "application/json" },
  });
  return parseContactRequestIds(await readContactRequestsResponse(response));
}

export async function respondToNotificationDecision(
  requestId: string,
  decision: NotificationDecision,
): Promise<NotificationDecisionResponse> {
  const response = await fetch("/api/chat/contact-requests", {
    method: "PATCH",
    cache: "no-store",
    credentials: "same-origin",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ requestId, decision }),
  });
  const payload = await readContactRequestsResponse(response);
  if (!payload || typeof payload !== "object") {
    throw new Error("La décision de notification n'a pas renvoyé d'état valide.");
  }

  const raw = payload as Record<string, unknown>;
  const status = raw.status;
  if (status !== "accepted" && status !== "rejected" && status !== "ignored" && status !== "unavailable") {
    throw new Error("La décision de notification n'a pas renvoyé d'état valide.");
  }

  return {
    status,
    messageId: typeof raw.messageId === "string" ? raw.messageId : null,
    actionId: typeof raw.actionId === "string" ? raw.actionId : null,
    senderId: typeof raw.senderId === "string" ? raw.senderId : null,
  };
}

function parseInvitationIds(payload: unknown): string[] {
  if (!payload || typeof payload !== "object") return [];
  const invitations = (payload as { invitations?: unknown }).invitations;
  if (!Array.isArray(invitations)) return [];
  return invitations.flatMap((invitation) => {
    if (!invitation || typeof invitation !== "object") return [];
    const id = (invitation as { registration_id?: unknown }).registration_id;
    return typeof id === "string" && id.trim() ? [id.trim()] : [];
  });
}

export async function loadPendingActionInvitationIds(): Promise<string[]> {
  const response = await fetch("/api/actions/invitations", {
    cache: "no-store",
    credentials: "same-origin",
    headers: { Accept: "application/json" },
  });
  return parseInvitationIds(await readContactRequestsResponse(response));
}

export async function respondToActionInvitation(
  registrationId: string,
  decision: NotificationDecision,
): Promise<ActionInvitationDecisionResponse> {
  const response = await fetch("/api/actions/invitations", {
    method: "PATCH",
    cache: "no-store",
    credentials: "same-origin",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify({ registrationId, decision }),
  });
  const payload = await readContactRequestsResponse(response);
  if (!payload || typeof payload !== "object") {
    throw new Error("La décision d'invitation n'a pas renvoyé d'état valide.");
  }
  const raw = payload as Record<string, unknown>;
  const status = raw.status;
  if (status !== "accepted" && status !== "rejected" && status !== "unavailable") {
    throw new Error("La décision d'invitation n'a pas renvoyé d'état valide.");
  }
  return {
    status,
    registrationId: typeof raw.registrationId === "string" ? raw.registrationId : registrationId,
    actionId: typeof raw.actionId === "string" ? raw.actionId : null,
  };
}

function parseRegistrationRequestIds(payload: unknown): string[] {
  if (!payload || typeof payload !== "object") return [];
  const requests = (payload as { requests?: unknown }).requests;
  if (!Array.isArray(requests)) return [];
  return requests.flatMap((request) => {
    if (!request || typeof request !== "object") return [];
    const id = (request as { registration_id?: unknown }).registration_id;
    return typeof id === "string" && id.trim() ? [id.trim()] : [];
  });
}

export async function loadPendingActionRegistrationRequestIds(): Promise<string[]> {
  const response = await fetch("/api/actions/registration-requests", {
    cache: "no-store",
    credentials: "same-origin",
    headers: { Accept: "application/json" },
  });
  return parseRegistrationRequestIds(await readContactRequestsResponse(response));
}

function chunk<T>(items: readonly T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size) as T[]);
  }
  return chunks;
}

/**
 * Loads only decision events whose canonical business request is still pending.
 * The user predicate is intentional: RLS remains the final permission boundary,
 * while this predicate prevents a session from projecting another user's event.
 */
export async function loadPendingDecisionNotificationsForCurrentUser(
  userId: string,
  getToken: () => Promise<string | null>,
  pendingRequests: readonly PendingDecisionRequest[],
): Promise<PendingDecisionNotifications> {
  const requests = normalizePendingDecisionRequests(pendingRequests);
  if (requests.length === 0) {
    return { notifications: [], missingRequestIds: [], unresolvedRequestIds: [] };
  }

  const supabase = await getNotificationsClient(getToken);
  const notificationsById = new Map<string, AppNotification>();
  const latestNotificationByRequestKey = new Map<string, AppNotification>();
  const unresolvedRequestKeys = new Set<string>();

  for (const requestBatch of chunk(requests, PENDING_NOTIFICATION_REQUEST_BATCH_SIZE)) {
    const requestKeys = new Set(
      requestBatch.map((request) => getPendingDecisionRequestKey(request.kind, request.requestId)),
    );
    // Cost is bounded to 20 reads of at most 50 rows for each batch of 50
    // business decisions. A capped traversal produces unresolved ids, never
    // a false missing decision.
    let offset = 0;
    let page = 0;

    while (page < PENDING_NOTIFICATION_MAX_PAGES) {
      const query = supabase
        .from("app_notifications")
        .select(notificationColumns)
        .eq("user_id", userId)
        .or(requestBatch.map(buildPendingDecisionFilter).join(","))
        .order("created_at", { ascending: false })
        .order("id", { ascending: false })
        .range(offset, offset + PENDING_NOTIFICATION_PAGE_SIZE - 1);

      const { data, error } = await query;
      if (error) throw error;

      const pageNotifications = (data ?? []) as AppNotification[];
      for (const notification of pageNotifications) {
        const request = readPendingDecisionRequest(notification.payload);
        if (!request) continue;
        const requestKey = getPendingDecisionRequestKey(request.kind, request.requestId);
        if (!requestKeys.has(requestKey)) continue;
        notificationsById.set(notification.id, notification);
        if (!latestNotificationByRequestKey.has(requestKey)) {
          latestNotificationByRequestKey.set(requestKey, notification);
        }
      }

      const allRequestsObserved = requestBatch.every((request) =>
        latestNotificationByRequestKey.has(getPendingDecisionRequestKey(request.kind, request.requestId)),
      );
      if (allRequestsObserved || pageNotifications.length < PENDING_NOTIFICATION_PAGE_SIZE) break;

      offset += PENDING_NOTIFICATION_PAGE_SIZE;
      page += 1;
    }

    for (const request of requestBatch) {
      const requestKey = getPendingDecisionRequestKey(request.kind, request.requestId);
      if (!latestNotificationByRequestKey.has(requestKey)) {
        unresolvedRequestKeys.add(requestKey);
      }
    }
  }

  const matchedRequestKeys = new Set(
    [...latestNotificationByRequestKey.entries()]
      .filter(([, notification]) => isActionablePendingDecisionNotification(notification))
      .map(([requestKey]) => requestKey),
  );
  const missingRequestIds = requests
    .filter((request) => {
      const requestKey = getPendingDecisionRequestKey(request.kind, request.requestId);
      return !unresolvedRequestKeys.has(requestKey) && !matchedRequestKeys.has(requestKey);
    })
    .map((request) => request.requestId);
  const unresolvedRequestIds = requests
    .filter((request) => unresolvedRequestKeys.has(getPendingDecisionRequestKey(request.kind, request.requestId)))
    .map((request) => request.requestId);

  return {
    notifications: [...notificationsById.values()],
    missingRequestIds: [...new Set(missingRequestIds)],
    unresolvedRequestIds: [...new Set(unresolvedRequestIds)],
  };
}

export async function respondToActionRegistrationRequest(
  actionId: string,
  registrationId: string,
  decision: NotificationDecision,
): Promise<ActionRegistrationRequestDecisionResponse> {
  const response = await fetch(`/api/actions/${encodeURIComponent(actionId)}/group-join`, {
    method: "POST",
    cache: "no-store",
    credentials: "same-origin",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify({
      participantId: registrationId,
      decision,
      requestKind: "registration_request",
    }),
  });
  const payload = await readContactRequestsResponse(response);
  if (!payload || typeof payload !== "object") {
    throw new Error("La décision d'inscription n'a pas renvoyé d'état valide.");
  }
  const raw = payload as Record<string, unknown>;
  const status = raw.status;
  if (status === "ok") {
    const alreadyReviewed = raw.alreadyReviewed === true;
    const participationStatus = raw.participationStatus;
    return {
      status: alreadyReviewed || participationStatus !== "confirmed" && participationStatus !== "cancelled"
        ? "unavailable"
        : decision === "accept" ? "accepted" : "rejected",
      registrationId: typeof raw.participantId === "string" ? raw.participantId : registrationId,
      actionId: typeof raw.actionId === "string" ? raw.actionId : actionId,
    };
  }
  if (status !== "accepted" && status !== "rejected" && status !== "unavailable") {
    throw new Error("La décision d'inscription n'a pas renvoyé d'état valide.");
  }
  return {
    status,
    registrationId: typeof raw.participantId === "string" ? raw.participantId : registrationId,
    actionId: typeof raw.actionId === "string" ? raw.actionId : actionId,
  };
}

export async function loadNotificationsPageForCurrentUser(
  userId: string,
  getToken: () => Promise<string | null>,
  cursor: NotificationPageCursor | null = null,
): Promise<NotificationsPage> {
  const supabase = await getNotificationsClient(getToken);
  let query = supabase
    .from("app_notifications")
    .select(notificationColumns)
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(NOTIFICATIONS_PAGE_SIZE);

  if (cursor) {
    query = query.or(
      `created_at.lt.${cursor.createdAt},and(created_at.eq.${cursor.createdAt},id.lt.${cursor.id})`,
    );
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  const notifications = (data ?? []) as AppNotification[];
  const lastNotification = notifications.at(-1);

  return {
    notifications,
    nextCursor:
      notifications.length === NOTIFICATIONS_PAGE_SIZE && lastNotification
        ? {
            createdAt: lastNotification.created_at,
            id: lastNotification.id,
          }
        : null,
  };
}

export async function markNotificationAsReadForCurrentUser(
  userId: string,
  notificationId: string,
  getToken: () => Promise<string | null>,
): Promise<void> {
  const supabase = await getNotificationsClient(getToken);
  const { error } = await supabase
    .from("app_notifications")
    .update({ read_at: new Date().toISOString(), seen_at: new Date().toISOString() })
    .eq("id", notificationId)
    .eq("user_id", userId);

  if (error) {
    throw error;
  }
}
