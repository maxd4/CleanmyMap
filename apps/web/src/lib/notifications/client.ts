"use client";

import type { SupabaseClient } from "@supabase/supabase-js";
import { buildRequiredClerkSupabaseAccessTokenProvider } from "@/lib/clerk-supabase-token";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

export type AppNotification = {
  id: string;
  type: "validation" | "community" | "system" | "security" | "chat";
  title: string;
  content: string;
  read_at: string | null;
  created_at: string;
  payload: Record<string, unknown> | null;
};

const notificationColumns =
  "id, type, title, content, read_at, created_at, payload" as const;

export const NOTIFICATIONS_PAGE_SIZE = 20;

export type NotificationPageCursor = {
  createdAt: string;
  id: string;
};

export type NotificationsPage = {
  notifications: AppNotification[];
  nextCursor: NotificationPageCursor | null;
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
    .update({ read_at: new Date().toISOString() })
    .eq("id", notificationId)
    .eq("user_id", userId);

  if (error) {
    throw error;
  }
}
