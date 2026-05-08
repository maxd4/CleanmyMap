import { useMemo } from "react";
import { mapItemCigaretteButts, mapItemCoordinates, mapItemWasteKg } from "@/lib/actions/data-contract";
import type { ActionMapItem } from "@/lib/actions/types";

type MapKpiStats = {
  actions: number;
  wasteKg: number;
  butts: number;
  volunteers: number;
  geocoverage: number;
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

    const geolocated = items.filter((item) => {
      const coords = mapItemCoordinates(item);
      return coords.latitude !== null && coords.longitude !== null;
    }).length;

    return {
      actions: items.length,
      wasteKg: totalKg,
      butts: totalButts,
      volunteers,
      geocoverage: items.length > 0 ? Math.round((geolocated / items.length) * 100) : 0,
    };
  }, [filteredMapItems]);
}
