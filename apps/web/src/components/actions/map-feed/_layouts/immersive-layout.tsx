import type { ActionMapItem } from "@/lib/actions/types";
import type { RefObject } from "react";
import dynamic from "next/dynamic";
import type { ActionsMapCanvasComponent } from "../map-feed.types";
import { MapEmptyState } from "./map-empty-state";
import { MapLoadingState } from "./map-loading-state";
import type { MapViewportState } from "@/components/actions/map/map-export.types";

const ActionStoriesCarousel = dynamic(
  () => import("@/components/map/ActionStoriesCarousel").then((mod) => mod.ActionStoriesCarousel),
  {
    ssr: false,
    loading: () => (
      <div className="h-[420px] rounded-[2rem] border border-sky-200/60 bg-white/80" />
    ),
  },
);

type ImmersiveLayoutProps = {
  items: ActionMapItem[];
  allItems: ActionMapItem[];
  hasPartialSource: boolean;
  partialSourcesLabel: string;
  freshnessLabel: string | null;
  isValidating: boolean;
  mapCanvasError: string | null;
  MapCanvas: ActionsMapCanvasComponent | null;
  selectedActionId: string | null;
  onOpenAction: (actionId: string) => void;
  onSelectAction: (actionId: string) => void;
  onReload: () => void;
  onResetFilters: () => void;
  tone?: "sky" | "emerald";
  showIntro?: boolean;
  fullViewport?: boolean;
  showStoriesCarousel?: boolean;
  zoneQuery?: string;
  mapExportTargetRef?: RefObject<HTMLDivElement | null>;
  onViewportChange?: (viewport: MapViewportState) => void;
};

export function ImmersiveLayout({
  items,
  allItems,
  hasPartialSource,
  partialSourcesLabel,
  freshnessLabel,
  isValidating,
  mapCanvasError,
  MapCanvas,
  selectedActionId,
  onOpenAction,
  onSelectAction,
  onReload,
  onResetFilters,
  tone = "sky",
  showIntro = true,
  fullViewport = false,
  showStoriesCarousel = true,
  zoneQuery = "",
  mapExportTargetRef,
  onViewportChange,
}: ImmersiveLayoutProps) {
  const isEmerald = tone === "emerald";
  const hasItems = items.length > 0;
  const emptyMode = allItems.length > 0 ? "filtered" : "empty";

  return (
    <>
      <div className={`pointer-events-none absolute inset-0 ${isEmerald ? "bg-[radial-gradient(circle_at_top_left,rgba(134,239,172,0.24),transparent_28%),radial-gradient(circle_at_top_right,rgba(187,247,208,0.22),transparent_26%),linear-gradient(180deg,rgba(255,255,255,0.34),rgba(255,255,255,0))]" : "bg-[radial-gradient(circle_at_top_left,rgba(125,211,252,0.26),transparent_28%),radial-gradient(circle_at_top_right,rgba(191,219,254,0.24),transparent_26%),linear-gradient(180deg,rgba(255,255,255,0.34),rgba(255,255,255,0))]"}`} />
      <div className="relative z-10 flex flex-col gap-6">
        {showIntro ? (
          <div className={`flex flex-wrap items-start justify-between gap-3 rounded-[2.25rem] px-6 py-5 text-slate-950 backdrop-blur-xl border ${isEmerald ? "border-emerald-200/80 bg-emerald-50 shadow-[0_24px_56px_-32px_rgba(34,197,94,0.16)]" : "border-sky-200/80 bg-sky-50 shadow-[0_24px_56px_-32px_rgba(14,165,233,0.16)]"}`}>
            <div className="max-w-2xl">
              {hasPartialSource ? (
                <span className={`inline-flex items-center rounded-full border px-2.5 py-1 cmm-text-caption font-semibold tracking-[0.12em] text-slate-950 ${isEmerald ? "border-emerald-300/40 bg-emerald-100" : "border-amber-300/40 bg-amber-100"}`}>
                  Sources partielles: {partialSourcesLabel}
                </span>
              ) : null}
              <h2 className="mt-2 text-2xl font-semibold tracking-[-0.02em] text-slate-950 sm:text-4xl">
                Carte terrain
              </h2>
            <p className="mt-2 max-w-3xl text-sm font-medium leading-relaxed text-slate-700">
              Visualisation des flux terrain, de leur densité et de leur qualité.
            </p>
            {freshnessLabel ? (
              <div className={`mt-4 inline-flex items-center gap-2 rounded-full border bg-white/80 px-3 py-1.5 cmm-text-caption font-semibold tracking-[0.12em] text-slate-700 ${isEmerald ? "border-emerald-200/80" : "border-sky-200/80"}`}>
                <span className={`h-2 w-2 rounded-full ${isEmerald ? "bg-emerald-500" : "bg-sky-500"}`} />
                {freshnessLabel}
              </div>
            ) : null}
          </div>
            <button
              onClick={onReload}
              className={`rounded-2xl px-6 py-3 cmm-text-caption font-semibold tracking-[0.12em] text-slate-950 transition active:scale-95 border ${isEmerald ? "border-emerald-200/80 bg-emerald-100 hover:border-emerald-300 hover:bg-emerald-200" : "border-sky-200/80 bg-sky-100 hover:border-sky-300 hover:bg-sky-200"}`}
            >
              {isValidating ? "Actualisation..." : "Rafraîchir les données"}
            </button>
          </div>
        ) : null}

        <div className="grid gap-6">
          <div
            ref={mapExportTargetRef}
            className={`relative min-h-[600px] overflow-hidden rounded-[2.75rem] ${isEmerald ? "border border-emerald-200/80 bg-[linear-gradient(180deg,rgba(244,250,242,0.98),rgba(252,254,250,0.98))] shadow-[0_24px_56px_-32px_rgba(34,197,94,0.16)]" : "border border-sky-200/80 bg-sky-50 shadow-[0_24px_56px_-32px_rgba(14,165,233,0.16)]"}`}
          >
            {mapCanvasError ? (
              <div className="flex h-full items-center justify-center bg-rose-50 px-6 text-center text-slate-950">
                <div className="max-w-md space-y-3 rounded-[2rem] border border-rose-200/70 bg-white px-8 py-10">
                  <p className="cmm-text-caption font-semibold tracking-[0.12em] text-rose-800">
                    Erreur de rendu
                  </p>
                  <p className="text-sm font-medium leading-relaxed text-slate-700">
                    {mapCanvasError}
                  </p>
                </div>
              </div>
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
            ) : !MapCanvas ? (
              <MapLoadingState fullViewport tone={tone} />
            ) : (
              <MapCanvas
                items={items}
                selectedActionId={selectedActionId}
                onSelectAction={onSelectAction}
                fullViewport={fullViewport}
                tone={tone}
                onViewportChange={onViewportChange}
              />
            )}
          </div>
        </div>

        {showStoriesCarousel ? (
          <div className={`rounded-[2.75rem] p-6 text-slate-950 backdrop-blur-3xl border ${isEmerald ? "border-emerald-200/80 bg-emerald-50 shadow-[0_24px_56px_-32px_rgba(34,197,94,0.16)]" : "border-sky-200/80 bg-sky-50 shadow-[0_24px_56px_-32px_rgba(14,165,233,0.16)]"}`}>
            <ActionStoriesCarousel items={items} onOpenAction={onOpenAction} />
          </div>
        ) : null}
      </div>
    </>
  );
}
