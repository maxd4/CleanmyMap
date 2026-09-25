"use client";

import { useMemo } from "react";
import useSWR from "swr";
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
    });
    const rightFuture = isActionStartInFuture({
      action_date: right.action_date,
      event_start_time: right.contract?.dates.eventStartTime ?? null,
    });
    if (leftFuture !== rightFuture) return leftFuture ? -1 : 1;
    return right.action_date.localeCompare(left.action_date);
  });
}

export function useChatActionDiscussions(enabled: boolean) {
  const surfaceActive = useChatSurfaceActivity();
  const key = enabled && surfaceActive ? ["chat-action-discussions"] : null;
  const { data, error, isLoading, mutate } = useSWR(
    key,
    async () => {
      const [published, future] = await Promise.all([
        fetchActions({ types: "action", limit: 100, days: 3650 }),
        fetchActions({ types: "action", limit: 100, days: 3650, futureOnly: true }),
      ]);
      return mergePublishedActionItems([published.items, future.items]);
    },
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      refreshWhenHidden: false,
      refreshWhenOffline: false,
      refreshInterval: 300_000,
      dedupingInterval: 300_000,
    },
  );

  return useMemo(
    () => ({
      items: data ?? [],
      error: error instanceof Error ? error.message : error ? "Impossible de charger les actions." : null,
      isLoading,
      refresh: mutate,
    }),
    [data, error, isLoading, mutate],
  );
}
