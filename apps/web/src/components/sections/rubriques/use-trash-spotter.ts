import { useMemo } from "react";
import useSWR from "swr";
import { fetchMapActions } from "@/lib/actions/http";
import { mapItemType } from "@/lib/actions/data-contract";
import { swrRecentViewOptions } from "@/lib/swr-config";

/** Read-only data feed for the Trash Spotter surface.
 *
 * Creation is intentionally provided by the shared observation form. Keeping
 * loading and submission in separate modules prevents the section from
 * maintaining a second spot/clean_place creation engine.
 */
export function useTrashSpotter() {
  const { data, isLoading, error, mutate } = useSWR(
    ["section-trash-spotter"],
    () =>
      fetchMapActions({
        status: "all",
        days: 180,
        limit: 250,
        types: ["spot"],
      }),
    swrRecentViewOptions,
  );

  const quality = useMemo(() => {
    const items = (data?.items ?? []).filter((item) => mapItemType(item) === "spot");
    const approved = items.filter((item) => item.status === "approved");
    const withCoords = items.filter(
      (item) => item.latitude !== null && item.longitude !== null,
    ).length;
    const recent = [...items]
      .sort((a, b) => b.action_date.localeCompare(a.action_date))
      .slice(0, 6);

    return {
      received: items.length,
      approved: approved.length,
      withCoords,
      recent,
    };
  }, [data?.items]);

  return { isLoading, error, quality, mutate };
}
