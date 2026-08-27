import type { RefObject } from "react";
import { Target } from "lucide-react";
import { cn } from "@/lib/utils";
import { getBlockClasses } from "@/lib/ui/block-accents";
import { ActionsMapFilterControls } from "@/components/actions/map/actions-map-filter-controls";
import { ActionsMapExportButton } from "@/components/actions/map/actions-map-export-button";
import type { ActionMapItem } from "@/lib/actions/types";
import type {
  ActionsMapFilters,
  ActionsMapDateScope,
} from "@/components/actions/map/actions-map-filters.utils";
import {
  deriveMarkerCategories,
  type MarkerCategory,
} from "@/components/actions/map-marker-categories";
import { MapLegend } from "./map-legend";
import { useActionPollutionScoreReferences } from "@/components/actions/map/action-pollution-score-references-context";
import type { MapViewportState } from "@/lib/geo/map-viewport";

type MapControlTowerProps = {
  filters: ActionsMapFilters;
  visibleCount: number;
  loadedCount: number;
  allMapItems: ActionMapItem[];
  filteredMapItems: ActionMapItem[];
  freshnessLabel?: string | null;
  viewport?: MapViewportState | null;
  mapExportTargetRef?: RefObject<HTMLDivElement | null>;
  onZoneQueryChange: (zoneQuery: string) => void;
  onDateScopeChange: (dateScope: ActionsMapDateScope) => void;
  onCategoryToggle: (category: MarkerCategory) => void;
  onReset: () => void;
};

export function MapControlTower({
  filters,
  visibleCount,
  loadedCount,
  allMapItems,
  filteredMapItems,
  freshnessLabel,
  viewport,
  mapExportTargetRef,
  onZoneQueryChange,
  onDateScopeChange,
  onCategoryToggle,
  onReset,
}: MapControlTowerProps) {
  const { references } = useActionPollutionScoreReferences();
  const classes = getBlockClasses("visualize");
  const surfaceCard = cn(
    "rounded-[3rem] border border-sky-200/80 bg-sky-50/90 backdrop-blur-3xl transition-all duration-700 relative overflow-hidden",
    classes.shadow
  );

  const categoryCounts = allMapItems.reduce<Record<MarkerCategory, number>>(
    (acc, item) => {
      for (const category of deriveMarkerCategories(item, references)) {
        acc[category] += 1;
      }
      return acc;
    },
    {
      blue: 0,
      orange: 0,
      red: 0,
      green: 0,
      violet: 0,
      black: 0,
      bin: 0,
      ashtray: 0,
      combo: 0,
    },
  );

  return (
    <section className={cn(surfaceCard, "space-y-6 p-5 sm:p-6 lg:space-y-10 lg:p-10")}>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-4">
          <Target size={18} className="text-sky-700" />
          <h3 className="cmm-text-caption font-semibold tracking-[0.12em] text-slate-700">
            Filtres
          </h3>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end sm:gap-4 cmm-text-caption font-semibold tracking-[0.12em] text-slate-600">
          <span
            className="rounded-lg border border-sky-200 bg-sky-100 px-3 py-1.5 text-center"
            aria-label={`${visibleCount} objets cartographiques visibles sur ${loadedCount} chargés`}
          >
            {visibleCount} / {loadedCount} objets cartographiques
          </span>
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
      </div>

      <ActionsMapFilterControls
        filters={filters}
        categoryCounts={categoryCounts}
        onZoneQueryChange={onZoneQueryChange}
        onDateScopeChange={onDateScopeChange}
        onCategoryToggle={onCategoryToggle}
        onReset={onReset}
      />

      <MapLegend />
    </section>
  );
}
