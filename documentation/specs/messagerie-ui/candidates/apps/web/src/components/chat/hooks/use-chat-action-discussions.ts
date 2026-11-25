"use client";

import { useMemo } from "react";
import useSWR from "swr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { fetchActions } from "@/lib/actions/http";
import { isActionStartInFuture } from "@/lib/actions/temporal";
import type { ActionListItem } from "@/lib/actions/types";
import { useChatSurfaceActivity } from "../chat-surface-activity-context";

export function mergePublishedActionItems(
  groups: readonly (readonly ActionListItem[])[],
): ActionListItem[] {
  const byId = new Map<string, ActionListItem>();
  for (const item of groups.flat()) {
    if (!item.published_at) continue;
    byId.set(item.id, item);
  }
  return [...byId.values()].sort((left, right) => {
    const leftFuture = isActionStartInFuture({
      action_date: left.action_date,
      event_start_time: left.contract?.dates.eventStartTime ?? null,
      action_timezone: left.contract?.dates.actionTimezone,
      event_start_at: left.contract?.dates.eventStartAt,
    });
    const rightFuture = isActionStartInFuture({
      action_date: right.action_date,
      event_start_time: right.contract?.dates.eventStartTime ?? null,
      action_timezone: right.contract?.dates.actionTimezone,
      event_start_at: right.contract?.dates.eventStartAt,
    });
    if (leftFuture !== rightFuture) return leftFuture ? -1 : 1;
    return right.action_date.localeCompare(left.action_date);
  });
}

export function useChatActionDiscussions(enabled: boolean, userId: string | undefined, role: string | null, supabase: SupabaseClient | null) {
  const surfaceActive = useChatSurfaceActivity();
  const key = enabled && surfaceActive && userId && role && supabase ? ["chat-action-discussions", userId, role] : null;
  const { data, error, isLoading, mutate } = useSWR<ActionListItem[], unknown>(
    key,
    async () => {
      const [published, future] = await Promise.all([
        fetchActions({ types: "action", limit: 100, days: 3650 }),
        fetchActions({ types: "action", limit: 100, days: 3650, futureOnly: true }),
      ]);
      const actions = mergePublishedActionItems([published.items, future.items]);
      if (!supabase || !actions.length) return [];
      const { data: conversations, error } = await supabase.from("action_conversations").select("action_id").in("action_id", actions.map(action => action.id));
      if (error) throw error;
      const allowed = new Set((conversations ?? []).map(row => row.action_id));
      return actions.filter(action => allowed.has(action.id));
    },
    {
      revalidateOnFocus: true,
      revalidateOnReconnect: false,
      refreshWhenHidden: false,
      refreshWhenOffline: false,
      refreshInterval: 300_000,
      dedupingInterval: 300_000,
    },
  );

  return useMemo(
    () => ({
      items: key && !error ? data ?? [] : [],
      error: error instanceof Error ? error.message : error ? "Impossible de charger les actions." : null,
      isLoading,
      refresh: mutate,
    }),
    [data, error, isLoading, mutate, key],
  );
}
