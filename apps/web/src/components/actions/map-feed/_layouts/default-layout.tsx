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
            <span className="inline-flex items-center rounded-full border border-amber-300/20 bg-[rgba(63,40,8,0.88)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-amber-100">
              Sources partielles: {partialSourcesLabel}
            </span>
          ) : null}
          <h2 className="text-xl font-black tracking-tight text-white">Lecture cartographique</h2>
          <p className="mt-1 text-sm text-sky-100/62">
            Flux géolocalisé depuis <code>/api/actions/map</code> pour piloter les interventions terrain.
          </p>
          {freshnessLabel ? (
            <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-sky-300/16 bg-sky-400/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-sky-100">
              <span className="h-2 w-2 rounded-full bg-sky-300" />
              {freshnessLabel}
            </div>
          ) : null}
        </div>
        <button
          onClick={onReload}
          className="rounded-lg border border-sky-300/16 bg-[rgba(16,40,64,0.92)] px-3 py-2 text-sm font-semibold text-sky-100/76 transition hover:border-sky-300/30 hover:bg-[rgba(18,47,74,0.96)]"
        >
          {isValidating ? "Actualisation..." : "Rafraîchir"}
        </button>
      </div>

      <div className="mt-5 overflow-hidden rounded-[1.75rem] border border-sky-300/12 bg-[rgba(8,23,36,0.94)] shadow-inner">
        {MapCanvas ? (
          <MapCanvas items={items} selectedActionId={selectedActionId} />
        ) : mapCanvasError ? (
          <div className="flex h-[28rem] items-center justify-center rounded-[1.75rem] border border-rose-300/16 bg-[rgba(63,16,30,0.88)] px-6 text-center text-rose-50">
            <div className="max-w-sm space-y-2 rounded-[1.5rem] border border-rose-300/16 bg-[rgba(63,16,30,0.7)] px-5 py-6 shadow-sm">
              <p className="text-[11px] font-black uppercase tracking-[0.16em] text-rose-200">
                Carte indisponible
              </p>
              <p className="text-sm leading-6 text-rose-50/82">{mapCanvasError}</p>
            </div>
          </div>
        ) : (
          <div className="flex h-[28rem] items-center justify-center rounded-[1.75rem] border border-sky-300/12 bg-[rgba(8,23,36,0.94)] px-6 text-center text-white">
            <div className="max-w-sm space-y-2">
              <div className="mx-auto h-10 w-10 animate-pulse rounded-2xl border border-sky-300/14 bg-sky-400/10" />
              <p className="text-[11px] font-black uppercase tracking-[0.16em] text-sky-100/50">
                Initialisation de la carte
              </p>
              <p className="text-sm leading-6 text-sky-100/62">Chargement des couches interactives.</p>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
