import { useMemo } from "react";
import useSWR from "swr";
import { fetchActions } from "@/lib/actions/http";
import type { ActionListItem } from "@/lib/actions/types";
import { swrLiveFeedOptions } from "@/lib/swr-config";
import { isAppError, toAppError } from "@/lib/errors/app-errors";
import type { CommunityHighlightItem } from "./types";

export function useCommunityHighlights() {
  const {
    data: actionsData,
    isLoading: actionsLoading,
    error: actionsError,
    mutate: reloadHighlights,
  } = useSWR(
    ["section-community-feed"],
    () => fetchActions({ status: "approved", limit: 600, days: 365, types: "action" }),
    swrLiveFeedOptions,
  );

  const highlights = useMemo<CommunityHighlightItem[]>(() => {
    const items = actionsData?.items ?? [];
    const byDay = new Map<string, { actions: number; volunteers: number }>();
    for (const item of items) {
      const key = item.action_date;
      const previous = byDay.get(key) ?? { actions: 0, volunteers: 0 };
      byDay.set(key, {
        actions: previous.actions + 1,
        volunteers: previous.volunteers + Number(item.volunteers_count || 0),
      });
    }
    return [...byDay.entries()]
      .map(([date, stats]) => ({ date, ...stats }))
      .sort((a, b) => (a.date < b.date ? 1 : -1))
      .slice(0, 6);
  }, [actionsData?.items]);

  const highlightsLoadError = isAppError(actionsError)
    ? actionsError
    : actionsError instanceof Error
      ? toAppError(actionsError, {
          kind: "server",
          message: "Chargement des points communautaires impossible.",
        })
      : null;

  const actionItems = useMemo(
    () => (actionsData?.items ?? []) as ActionListItem[],
    [actionsData?.items],
  );

  return {
    actionsLoading,
    highlightsLoadError,
    reloadHighlights,
    highlights,
    actionItems,
  };
}
