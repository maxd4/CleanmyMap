import useSWR from "swr";
import { fetchMapActions } from "@/lib/actions/http";
import type { ActionMapItem } from "@/lib/actions/types";
import { swrRecentViewOptions } from "@/lib/swr-config";

export function useMapActionById(
  actionId: string | null,
  knownItem?: ActionMapItem | null,
) {
  const shouldFetch = Boolean(actionId && !knownItem);
  const { data, error, isLoading, mutate } = useSWR(
    shouldFetch && actionId ? ["actions-map-action", actionId] : null,
    () =>
      fetchMapActions({
        actionId,
        floorDate: null,
        limit: 1,
        types: "all",
      }).then((response) => response.items.find((item) => item.id === actionId) ?? null),
    swrRecentViewOptions,
  );

  return {
    item: knownItem ?? data ?? null,
    error,
    isLoading: shouldFetch ? isLoading : false,
    reload: mutate,
  };
}
