import type { ActionMapItem } from "@/lib/actions/types";
import type { ActionsMapCanvasComponent } from "../map-feed.types";

type DefaultLayoutProps = {
  items: ActionMapItem[];
  hasPartialSource: boolean;
  partialSourcesLabel: string;
  freshnessLabel: string | null;
  isValidating: boolean;
  mapCanvasError: string | null;
  MapCanvas: ActionsMapCanvasComponent | null;
  selectedActionId: string | null;
  onReload: () => void;
};

export function DefaultLayout({
  items,
  hasPartialSource,
  partialSourcesLabel,
  freshnessLabel,
  isValidating,
  mapCanvasError,
  MapCanvas,
  selectedActionId,
  onReload,
}: DefaultLayoutProps) {
  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          {hasPartialSource ? (
            <span className="inline-flex items-center rounded-full border border-amber-300/40 bg-amber-100 px-2.5 py-1 cmm-text-caption font-semibold tracking-[0.12em] text-slate-950">
              Sources partielles: {partialSourcesLabel}
            </span>
          ) : null}
          <h2 className="text-xl font-semibold tracking-[-0.02em] text-slate-950">Lecture cartographique</h2>
          <p className="mt-1 text-sm text-slate-700">
            Flux géolocalisé depuis <code>/api/actions/map</code> pour piloter les interventions terrain.
          </p>
          {freshnessLabel ? (
            <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-cyan-200/80 bg-cyan-100 px-3 py-1.5 cmm-text-caption font-semibold tracking-[0.12em] text-slate-950">
              <span className="h-2 w-2 rounded-full bg-cyan-500" />
              {freshnessLabel}
            </div>
          ) : null}
        </div>
        <button
          onClick={onReload}
          className="rounded-lg border border-cyan-200/80 bg-cyan-100 px-3 py-2 text-sm font-semibold text-slate-950 transition hover:border-cyan-300 hover:bg-cyan-200"
        >
          {isValidating ? "Actualisation..." : "Rafraîchir"}
        </button>
      </div>

      <div className="mt-5 overflow-hidden rounded-[1.75rem] border border-cyan-200/80 bg-cyan-50 shadow-inner">
        {MapCanvas ? (
          <MapCanvas items={items} selectedActionId={selectedActionId} />
        ) : mapCanvasError ? (
          <div className="flex h-[28rem] items-center justify-center rounded-[1.75rem] border border-rose-200/70 bg-rose-50 px-6 text-center text-slate-950">
            <div className="max-w-sm space-y-2 rounded-[1.5rem] border border-rose-200/70 bg-white px-5 py-6 shadow-sm">
              <p className="cmm-text-caption font-semibold tracking-[0.12em] text-rose-800">
                Carte indisponible
              </p>
              <p className="text-sm leading-6 text-slate-700">{mapCanvasError}</p>
            </div>
          </div>
        ) : (
          <div className="flex h-[28rem] items-center justify-center rounded-[1.75rem] border border-cyan-200/80 bg-cyan-50 px-6 text-center text-slate-950">
            <div className="max-w-sm space-y-2">
              <div className="mx-auto h-10 w-10 animate-pulse rounded-2xl border border-cyan-200/80 bg-cyan-100" />
              <p className="cmm-text-caption font-semibold tracking-[0.12em] text-slate-700">
                Initialisation de la carte
              </p>
              <p className="text-sm leading-6 text-slate-700">Chargement des couches interactives.</p>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
