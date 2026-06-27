import type { RefObject } from "react";
import type { ActionMapItem } from "@/lib/actions/types";
import type { ActionsMapCanvasComponent } from "../map-feed.types";
import { MapEmptyState } from "./map-empty-state";
import { MapLoadingState } from "./map-loading-state";
import type { MapViewportState } from "@/components/actions/map/map-export.types";

type DefaultLayoutProps = {
  items: ActionMapItem[];
  allItems: ActionMapItem[];
  hasPartialSource: boolean;
  partialSourcesLabel: string;
  freshnessLabel: string | null;
  isValidating: boolean;
  mapCanvasError: string | null;
  MapCanvas: ActionsMapCanvasComponent | null;
  selectedActionId: string | null;
  onSelectAction: (actionId: string) => void;
  onResetFilters: () => void;
  onReload: () => void;
  tone?: "sky" | "emerald";
  zoneQuery?: string;
  mapExportTargetRef?: RefObject<HTMLDivElement | null>;
  onViewportChange?: (viewport: MapViewportState) => void;
  initialViewport?: MapViewportState | null;
};

export function DefaultLayout({
  items,
  allItems,
  hasPartialSource,
  partialSourcesLabel,
  freshnessLabel,
  isValidating,
  mapCanvasError,
  MapCanvas,
  selectedActionId,
  onSelectAction,
  onResetFilters,
  onReload,
  tone = "sky",
  zoneQuery = "",
  mapExportTargetRef,
  onViewportChange,
  initialViewport,
}: DefaultLayoutProps) {
  const isEmerald = tone === "emerald";
  const hasItems = items.length > 0;
  const emptyMode = allItems.length > 0 ? "filtered" : "empty";

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          {hasPartialSource ? (
            <span className={`inline-flex items-center rounded-full border px-2.5 py-1 cmm-text-caption font-semibold tracking-[0.12em] text-slate-950 ${isEmerald ? "border-emerald-300/40 bg-emerald-100" : "border-amber-300/40 bg-amber-100"}`}>
              Sources partielles: {partialSourcesLabel}
            </span>
          ) : null}
          <h2 className="text-xl font-semibold tracking-[-0.02em] text-slate-950">Carte terrain</h2>
          <p className="mt-1 text-sm text-slate-700">
            Flux géolocalisé depuis Supabase, borné par le viewport et les filtres actifs.
          </p>
          {freshnessLabel ? (
            <div className={`mt-3 inline-flex items-center gap-2 rounded-full border px-3 py-1.5 cmm-text-caption font-semibold tracking-[0.12em] text-slate-950 ${tone === "emerald" ? "border-emerald-200/80 bg-emerald-100" : "border-sky-200/80 bg-sky-100"}`}>
              <span className={`h-2 w-2 rounded-full ${tone === "emerald" ? "bg-emerald-500" : "bg-sky-500"}`} />
              {freshnessLabel}
            </div>
          ) : null}
        </div>
        <button
          onClick={onReload}
          className={`rounded-lg border px-3 py-2 text-sm font-semibold text-slate-950 transition ${tone === "emerald" ? "border-emerald-200/80 bg-emerald-100 hover:border-emerald-300 hover:bg-emerald-200" : "border-sky-200/80 bg-sky-100 hover:border-sky-300 hover:bg-sky-200"}`}
        >
          {isValidating ? "Actualisation..." : "Rafraîchir"}
        </button>
      </div>

      <div
        ref={mapExportTargetRef}
        className={`mt-5 overflow-hidden rounded-[1.75rem] shadow-inner ${tone === "emerald" ? "border border-emerald-200/80 bg-[linear-gradient(180deg,rgba(244,250,242,0.98),rgba(252,254,250,0.98))]" : "border border-sky-200/80 bg-sky-50"}`}
      >
        {mapCanvasError ? (
          <div className="flex h-[28rem] items-center justify-center rounded-[1.75rem] border border-rose-200/70 bg-rose-50 px-6 text-center text-slate-950">
            <div className="max-w-sm space-y-2 rounded-[1.5rem] border border-rose-200/70 bg-white px-5 py-6 shadow-sm">
              <p className="cmm-text-caption font-semibold tracking-[0.12em] text-rose-800">
                Carte indisponible
              </p>
              <p className="text-sm leading-6 text-slate-700">{mapCanvasError}</p>
            </div>
          </div>
        ) : !MapCanvas ? (
          <MapLoadingState tone={tone} />
        ) : !hasItems ? (
          <MapEmptyState
            mode={emptyMode}
            freshnessLabel={freshnessLabel}
            hasPartialSource={hasPartialSource}
            partialSourcesLabel={partialSourcesLabel}
            onResetFilters={onResetFilters}
            onReload={onReload}
            isValidating={isValidating}
            zoneQuery={zoneQuery}
            tone={tone}
          />
        ) : (
          <MapCanvas
            items={items}
            selectedActionId={selectedActionId}
            onSelectAction={onSelectAction}
            onViewportChange={onViewportChange}
            initialViewport={initialViewport}
            tone={tone}
          />
        )}
      </div>
    </>
  );
}
