import { useMemo } from "react";
import { sumActionImpactKpis } from "@/lib/actions/impact-calculators";
import { mapItemType } from "@/lib/actions/data-contract";
import type { ActionMapItem } from "@/lib/actions/types";

type MapKpiStats = {
  visibleActions: number;
  wasteKg: number;
  butts: number;
  volunteers: number;
  co2AvoidedKg: number;
  waterSavedLiters: number;
  euroSaved: number;
};

export function computeMapKpiStats(filteredMapItems: ActionMapItem[]): MapKpiStats {
  const items = filteredMapItems.filter((item) => mapItemType(item) === "action");
  const totals = sumActionImpactKpis(
    items.map(
      (item) =>
        item.contract ?? {
          metadata: {
            wasteKg: item.waste_kg,
            cigaretteButts: item.cigarette_butts,
            volunteersCount: item.volunteers_count,
            wasteBreakdown: item.waste_breakdown,
          },
        },
    ),
  );

  return {
    visibleActions: items.length,
    ...totals,
  };
}

export function useMapKpiStats(filteredMapItems: ActionMapItem[]): MapKpiStats {
  return useMemo(() => {
    return computeMapKpiStats(filteredMapItems);
  }, [filteredMapItems]);
}
