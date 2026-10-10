import type { ActionsMapLayoutCommonProps } from "../map-feed.types";
import { MapEmptyStateFromLayout } from "./map-empty-state";
import { MapLoadingState } from "./map-loading-state";
import { MapTruncationNotice, type MapEmptyStateMode } from "./map-data-status";
import { MapCanvasView } from "./map-canvas-view";

type ImmersiveLayoutIntroProps = Pick<
  ActionsMapLayoutCommonProps,
  "hasPartialSource" | "partialSourcesLabel" | "freshnessLabel" | "isValidating" | "onReload"
> & {
  isEmerald: boolean;
  isTruncated: boolean;
  showIntro: boolean;
  tone: "sky" | "emerald";
};

export function ImmersiveLayoutIntro({
  hasPartialSource,
  partialSourcesLabel,
  freshnessLabel,
  isValidating,
  onReload,
  isEmerald,
  isTruncated,
  showIntro,
  tone,
}: ImmersiveLayoutIntroProps) {
  if (!showIntro) return null;

  return (
    <div className={`flex flex-wrap items-start justify-between gap-3 rounded-[2.25rem] px-6 py-5 text-slate-950 backdrop-blur-xl border ${isEmerald ? "border-emerald-200/80 bg-emerald-50 shadow-[0_24px_56px_-32px_rgba(34,197,94,0.16)]" : "border-sky-200/80 bg-sky-50 shadow-[0_24px_56px_-32px_rgba(14,165,233,0.16)]"}`}>
      <div className="max-w-2xl">
        {hasPartialSource ? (
          <span className={`inline-flex items-center rounded-full border px-2.5 py-1 cmm-text-caption font-semibold tracking-[0.12em] text-slate-950 ${isEmerald ? "border-emerald-300/40 bg-emerald-100" : "border-amber-300/40 bg-amber-100"}`}>
            Sources partielles: {partialSourcesLabel}
          </span>
        ) : null}
        <MapTruncationNotice isTruncated={isTruncated} tone={tone} />
        <h2 className="mt-2 text-2xl font-semibold tracking-[-0.02em] text-slate-950 sm:text-4xl">Carte terrain</h2>
        <p className="cmm-text-body cmm-text-primary mt-2 max-w-3xl">
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
        className={`rounded-2xl px-6 py-3 cmm-text-caption font-semibold tracking-[0.12em] text-slate-950 transition border ${isEmerald ? "border-emerald-200/80 bg-emerald-100 hover:border-emerald-300 hover:bg-emerald-200" : "border-sky-200/80 bg-sky-100 hover:border-sky-300 hover:bg-sky-200"}`}
      >
        {isValidating ? "Actualisation..." : "Rafraîchir les données"}
      </button>
    </div>
  );
}

type ImmersiveLayoutMapFrameProps = {
  layoutProps: ActionsMapLayoutCommonProps;
  emptyMode: MapEmptyStateMode;
  fullViewport: boolean;
  isEmerald: boolean;
};

export function ImmersiveLayoutMapFrame({
  layoutProps,
  emptyMode,
  fullViewport,
  isEmerald,
}: ImmersiveLayoutMapFrameProps) {
  const {
    items,
    mapCanvasError,
    MapCanvas,
    tone,
    compact,
    isInitialViewportResolved = true,
    mapExportTargetRef,
  } = layoutProps;
  const hasItems = items.length > 0;

  return (
    <div
      ref={mapExportTargetRef}
      className={`relative overflow-hidden rounded-[2.75rem] ${compact ? "h-[24rem] min-h-[24rem] sm:h-[28rem] sm:min-h-[28rem] lg:h-[clamp(22rem,calc(100dvh-23rem),31rem)] lg:min-h-[22rem]" : "min-h-[600px]"} ${isEmerald ? "border border-emerald-200/80 bg-[linear-gradient(180deg,rgba(244,250,242,0.98),rgba(252,254,250,0.98))] shadow-[0_24px_56px_-32px_rgba(34,197,94,0.16)]" : "border border-sky-200/80 bg-sky-50 shadow-[0_24px_56px_-32px_rgba(14,165,233,0.16)]"}`}
    >
      {mapCanvasError ? (
        <div className="flex h-full items-center justify-center bg-rose-50 px-6 text-center text-slate-950">
          <div className="max-w-md space-y-3 rounded-[2rem] border border-rose-200/70 bg-white px-8 py-10">
            <p className="cmm-text-caption font-semibold tracking-[0.12em] text-rose-800">Erreur de rendu</p>
            <p className="text-sm font-medium leading-relaxed text-slate-900">{mapCanvasError}</p>
          </div>
        </div>
      ) : !isInitialViewportResolved ? (
        <MapLoadingState fullViewport={fullViewport} compact={compact} tone={tone} />
      ) : !hasItems ? (
        <MapEmptyStateFromLayout layoutProps={layoutProps} mode={emptyMode} />
      ) : !MapCanvas ? (
        <MapLoadingState fullViewport={fullViewport} compact={compact} tone={tone} />
      ) : (
        <MapCanvasView layoutProps={layoutProps} fullViewport={fullViewport} />
      )}
    </div>
  );
}
