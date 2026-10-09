"use client";

import type { SupabaseClient } from "@supabase/supabase-js";
import { buildRequiredClerkSupabaseAccessTokenProvider } from "@/lib/clerk-supabase-token";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

export type AppNotification = {
  id: string;
  type: "validation" | "community" | "system" | "security" | "chat" | "action_discussion" | "gamification_reconciliation";
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

export type NotificationPageCursor = {
  createdAt: string;
  id: string;
};

export type NotificationsPage = {
  notifications: AppNotification[];
  nextCursor: NotificationPageCursor | null;
};

export type NotificationDecision = "accept" | "reject";

export type NotificationDecisionResponse = {
  status: "accepted" | "rejected" | "ignored" | "unavailable";
  messageId: string | null;
  actionId: string | null;
  senderId: string | null;
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

async function readContactRequestsResponse(response: Response): Promise<unknown> {
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
