import type { RefObject } from "react";
import { Target } from "lucide-react";
import { CmmCard } from "@/components/ui/cmm-card";
import { MapTruncationNotice } from "@/components/actions/map-feed/_layouts/map-data-status";
import { ActionsMapExportButton } from "@/components/actions/map/export/actions-map-export-button";
import type { ActionMapItem } from "@/lib/actions/types";
import type { ActionsMapFilters } from "@/components/actions/map/filters/actions-map-filters.utils";
import type { MapViewportState } from "@/lib/geo/map-viewport";

type MapControlTowerProps = {
  filters: ActionsMapFilters;
  visibleCount: number;
  loadedCount: number;
  filteredMapItems: ActionMapItem[];
  freshnessLabel?: string | null;
  modeStatusLabel?: string | null;
  viewport?: MapViewportState | null;
  hasPartialSource?: boolean;
  partialSourcesLabel?: string;
  isTruncated?: boolean;
  isLoading?: boolean;
  isUnavailable?: boolean;
  mapExportTargetRef?: RefObject<HTMLDivElement | null>;
};

export function MapControlTower({
  filters,
  visibleCount,
  loadedCount,
  filteredMapItems,
  freshnessLabel,
  modeStatusLabel,
  viewport,
  mapExportTargetRef,
  hasPartialSource = false,
  partialSourcesLabel,
  isTruncated = false,
  isLoading = false,
  isUnavailable = false,
}: MapControlTowerProps) {

  return (
    <CmmCard as="section" tone="family" size="sm" className="space-y-3" ariaLabel="Données de la vue">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Target size={18} className="shrink-0 text-[var(--cmm-family-heading,var(--text-primary))]" aria-hidden="true" />
          <div>
            <h2 className="text-base font-semibold text-[var(--text-primary)]">Données de la vue</h2>
            <p className="text-sm font-medium text-[var(--text-secondary)]" role="status">
              {isUnavailable ? "Données indisponibles." : isLoading ? "Chargement de la vue…" : <>{visibleCount} élément{visibleCount === 1 ? "" : "s"} visible{visibleCount === 1 ? "" : "s"} sur {loadedCount} chargé{loadedCount === 1 ? "" : "s"}.</>}
            </p>
            {modeStatusLabel ? (
              <p role="status" className="mt-0.5 cmm-text-caption font-semibold text-[var(--cmm-family-heading,var(--text-primary))]">
                {modeStatusLabel}
              </p>
            ) : null}
          </div>
        </div>
        {!isUnavailable && !isLoading ? <ActionsMapExportButton
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
        /> : null}
      </div>
      {freshnessLabel && !isUnavailable && !isLoading ? <p className="cmm-text-caption text-[var(--text-secondary)]">{freshnessLabel}</p> : null}
      {hasPartialSource || isTruncated ? <div className="flex flex-wrap items-center gap-2" role="status">
        {hasPartialSource ? <span className="rounded-lg bg-amber-100 px-2.5 py-1 cmm-text-caption font-semibold text-amber-950">Sources partielles : {partialSourcesLabel || "inconnues"}</span> : null}
        <MapTruncationNotice isTruncated={isTruncated} />
      </div> : null}
    </CmmCard>
  );
}
