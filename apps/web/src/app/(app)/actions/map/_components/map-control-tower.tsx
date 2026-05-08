import { Target } from "lucide-react";
import { cn } from "@/lib/utils";
import { getBlockClasses } from "@/lib/ui/block-accents";
import { ActionsMapFilterControls } from "@/components/actions/map/actions-map-filter-controls";
import { ActionsMapExportButton } from "@/components/actions/map/actions-map-export-button";
import { buildActionsMapGeoQuality } from "@/components/actions/map/actions-map-quality";
import type { ActionMapItem } from "@/lib/actions/types";
import type { ActionsMapFilters } from "@/components/actions/map/actions-map-filters.utils";
import type { MarkerCategory } from "@/components/actions/map-marker-categories";

type MapControlTowerProps = {
  filters: ActionsMapFilters;
  initialDays: number;
  visibleCount: number;
  loadedCount: number;
  filteredMapItems: ActionMapItem[];
  onDaysChange: (days: number) => void;
  onStatusChange: (status: ActionsMapFilters["statusFilter"]) => void;
  onImpactChange: (impact: ActionsMapFilters["impactFilter"]) => void;
  onQualityMinChange: (quality: number) => void;
  onCategoryToggle: (category: MarkerCategory) => void;
  onReset: () => void;
};

export function MapControlTower({
  filters,
  initialDays,
  visibleCount,
  loadedCount,
  filteredMapItems,
  onDaysChange,
  onStatusChange,
  onImpactChange,
  onQualityMinChange,
  onCategoryToggle,
  onReset,
}: MapControlTowerProps) {
  const classes = getBlockClasses("visualize");
  const surfaceCard = cn(
    "rounded-[3rem] border border-white/5 bg-white/5 backdrop-blur-3xl transition-all duration-700 relative overflow-hidden",
    classes.shadow
  );

  const geoQuality = buildActionsMapGeoQuality(filteredMapItems);

  return (
    <section className={cn(surfaceCard, "p-10 space-y-10")}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Target size={18} className="text-sky-400" />
          <h3 className="text-[11px] font-black uppercase tracking-[0.3em] text-white/40">
            Paramètres Cockpit
          </h3>
        </div>
        <div className="flex items-center gap-6 text-[10px] font-black text-white/20 uppercase tracking-widest">
          <span className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/5">
            {visibleCount} / {loadedCount} points
          </span>
          <ActionsMapExportButton items={filteredMapItems} />
        </div>
      </div>

      <ActionsMapFilterControls
        filters={filters}
        initialDays={initialDays}
        onDaysChange={onDaysChange}
        onStatusChange={onStatusChange}
        onImpactChange={onImpactChange}
        onQualityMinChange={onQualityMinChange}
        onCategoryToggle={onCategoryToggle}
        onReset={onReset}
      />

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-6 pt-10 border-t border-white/5">
        {[
          { label: "Géo Qualité", val: geoQuality.total, color: "text-sky-400" },
          { label: "Sans coord.", val: geoQuality.missingCoordinates, color: "text-rose-400" },
          { label: "Réels", val: geoQuality.realGeometry, color: "text-emerald-400" },
          { label: "Estimés", val: geoQuality.estimatedGeometry, color: "text-amber-400" },
          { label: "Fallback", val: geoQuality.fallbackPoint, color: "text-white/20" },
        ].map((q, i) => (
          <div key={i} className="space-y-2">
            <p className="text-[9px] font-black uppercase tracking-widest opacity-40 leading-none">
              {q.label}
            </p>
            <p className={cn("text-2xl font-black tracking-tighter leading-none", q.color)}>{q.val}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
