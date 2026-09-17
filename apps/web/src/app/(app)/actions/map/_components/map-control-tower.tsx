import type { RefObject } from "react";
import { Target } from "lucide-react";
import { cn } from "@/lib/utils";
import { getBlockClasses } from "@/lib/ui/block-accents";
import { ActionsMapExportButton } from "@/components/actions/map/actions-map-export-button";
import type { ActionMapItem } from "@/lib/actions/types";
import type { ActionsMapFilters } from "@/components/actions/map/actions-map-filters.utils";
import type { MapViewportState } from "@/lib/geo/map-viewport";

type MapControlTowerProps = {
  filters: ActionsMapFilters;
  visibleCount: number;
  loadedCount: number;
  filteredMapItems: ActionMapItem[];
  freshnessLabel?: string | null;
  viewport?: MapViewportState | null;
  mapExportTargetRef?: RefObject<HTMLDivElement | null>;
};

export function MapControlTower({
  filters,
  visibleCount,
  loadedCount,
  filteredMapItems,
  freshnessLabel,
  viewport,
  mapExportTargetRef,
}: MapControlTowerProps) {
  const classes = getBlockClasses("visualize");
  const surfaceCard = cn(
    "rounded-[2rem] border border-sky-200/80 bg-sky-50/90 backdrop-blur-3xl",
    classes.shadow,
  );

  return (
    <section className={cn(surfaceCard, "space-y-4 p-5 sm:p-6")} aria-label="Données de la vue">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Target size={18} className="text-sky-700" aria-hidden="true" />
          <div>
            <h3 className="text-base font-semibold text-slate-950">Données de la vue</h3>
            <p className="text-sm font-medium text-slate-600">
              {visibleCount} élément{visibleCount === 1 ? "" : "s"} visible{visibleCount === 1 ? "" : "s"} sur {loadedCount} chargé{loadedCount === 1 ? "" : "s"}.
            </p>
          </div>
        </div>
        <ActionsMapExportButton
          items={filteredMapItems}
          mapCaptureTargetRef={mapExportTargetRef}
          exportContext={{
            zoneQuery: filters.zoneQuery,
            visibleCount,
            loadedCount,
            freshnessLabel,
            viewport,
          }}
          className="w-full sm:w-auto"
        />
      </div>
    </section>
  );
}
