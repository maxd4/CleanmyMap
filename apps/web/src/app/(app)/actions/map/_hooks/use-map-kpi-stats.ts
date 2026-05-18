import { useMemo } from "react";
import { mapItemCigaretteButts, mapItemWasteKg } from "@/lib/actions/data-contract";
import type { ActionMapItem } from "@/lib/actions/types";

type MapKpiStats = {
  visibleActions: number;
  wasteKg: number;
  butts: number;
  volunteers: number;
};

export function useMapKpiStats(filteredMapItems: ActionMapItem[]): MapKpiStats {
  return useMemo(() => {
    const items = filteredMapItems;
    const totalKg = items.reduce((acc, item) => acc + (mapItemWasteKg(item) ?? 0), 0);
    const totalButts = items.reduce((acc, item) => acc + (mapItemCigaretteButts(item) ?? 0), 0);

    let volunteers = 0;
    for (const item of items) {
      volunteers += Number(item.contract?.metadata.volunteersCount || 0);
    }

    return {
      visibleActions: items.length,
      wasteKg: totalKg,
      butts: totalButts,
      volunteers,
    };
  }, [filteredMapItems]);
}
