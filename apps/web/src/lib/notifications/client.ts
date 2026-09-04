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
  const supabase = await getNotificationsClient(getToken);
  const { data, error } = await supabase
    .from("app_notifications")
    .select(notificationColumns)
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) {
    throw error;
  }

  return (data ?? []) as AppNotification[];
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
