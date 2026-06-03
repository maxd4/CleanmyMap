import { useMemo } from "react";
import type { RefObject } from "react";
import { Target } from "lucide-react";
import { cn } from "@/lib/utils";
import { getBlockClasses } from "@/lib/ui/block-accents";
import { ActionsMapFilterControls } from "@/components/actions/map/actions-map-filter-controls";
import { ActionsMapExportButton } from "@/components/actions/map/actions-map-export-button";
import { buildActionsMapGeoQuality } from "@/components/actions/map/actions-map-quality";
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
import type { MapViewportState } from "@/components/actions/map/map-export.types";

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
  onStatusChange: (status: ActionsMapFilters["statusFilter"]) => void;
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
  onStatusChange,
  onCategoryToggle,
  onReset,
}: MapControlTowerProps) {
  const { references } = useActionPollutionScoreReferences();
  const classes = getBlockClasses("visualize");
  const surfaceCard = cn(
    "rounded-[3rem] border border-sky-200/80 bg-sky-50/90 backdrop-blur-3xl transition-all duration-700 relative overflow-hidden",
    classes.shadow
  );

  const geoQuality = buildActionsMapGeoQuality(filteredMapItems);
  const categoryCounts = useMemo(
    () =>
      allMapItems.reduce<Record<MarkerCategory, number>>(
        (acc, item) => {
          for (const category of deriveMarkerCategories(item, references)) {
            acc[category] += 1;
          }
          return acc;
        },
        {
          blue: 0,
          green: 0,
          yellow: 0,
          violet: 0,
          bin: 0,
          ashtray: 0,
          combo: 0,
        },
      ),
    [allMapItems, references],
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
            aria-label={`${visibleCount} points visibles sur ${loadedCount} chargés`}
          >
            {visibleCount} / {loadedCount} points
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
        onStatusChange={onStatusChange}
        onCategoryToggle={onCategoryToggle}
        onReset={onReset}
      />

      <MapLegend />

      <div className="grid grid-cols-2 gap-6 border-t border-sky-200/80 pt-10 sm:grid-cols-5">
        {[
          { label: "Qualité géo", val: geoQuality.total, color: "text-sky-500" },
          { label: "Sans coord.", val: geoQuality.missingCoordinates, color: "text-rose-400" },
          { label: "Réels", val: geoQuality.realGeometry, color: "text-emerald-400" },
          { label: "Estimés", val: geoQuality.estimatedGeometry, color: "text-amber-400" },
          { label: "Fallback", val: geoQuality.fallbackPoint, color: "text-slate-500" },
        ].map((q, i) => (
          <div key={i} className="space-y-2">
            <p className="cmm-text-caption font-semibold tracking-[0.12em] text-slate-600 leading-none">
              {q.label}
            </p>
            <p className="text-2xl font-black tracking-tighter leading-none text-slate-950">{q.val}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
