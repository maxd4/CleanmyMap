import type { ActionMapItem } from "@/lib/actions/types";
import { ActionStoriesCarousel } from "@/components/map/ActionStoriesCarousel";
import type { ActionsMapCanvasComponent } from "../map-feed.types";

type ImmersiveLayoutProps = {
  items: ActionMapItem[];
  hasPartialSource: boolean;
  partialSourcesLabel: string;
  freshnessLabel: string | null;
  isValidating: boolean;
  mapCanvasError: string | null;
  MapCanvas: ActionsMapCanvasComponent | null;
  selectedActionId: string | null;
  onOpenAction: (actionId: string) => void;
  onReload: () => void;
  showIntro?: boolean;
  fullViewport?: boolean;
  showStoriesCarousel?: boolean;
};

export function ImmersiveLayout({
  items,
  hasPartialSource,
  partialSourcesLabel,
  freshnessLabel,
  isValidating,
  mapCanvasError,
  MapCanvas,
  selectedActionId,
  onOpenAction,
  onReload,
  showIntro = true,
  fullViewport = false,
  showStoriesCarousel = true,
}: ImmersiveLayoutProps) {
  return (
    <>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(125,211,252,0.26),transparent_28%),radial-gradient(circle_at_top_right,rgba(191,219,254,0.24),transparent_26%),linear-gradient(180deg,rgba(255,255,255,0.34),rgba(255,255,255,0))]" />
      <div className="relative z-10 flex flex-col gap-6">
        {showIntro ? (
          <div className="flex flex-wrap items-start justify-between gap-3 rounded-[2.25rem] border border-sky-200/80 bg-sky-50 px-6 py-5 text-slate-950 shadow-[0_24px_56px_-32px_rgba(14,165,233,0.16)] backdrop-blur-xl">
            <div className="max-w-2xl">
              {hasPartialSource ? (
                <span className="inline-flex items-center rounded-full border border-amber-300/40 bg-amber-100 px-2.5 py-1 cmm-text-caption font-semibold tracking-[0.12em] text-slate-950">
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
              <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-sky-200/80 bg-white/80 px-3 py-1.5 cmm-text-caption font-semibold tracking-[0.12em] text-slate-700">
                <span className="h-2 w-2 rounded-full bg-sky-500" />
                {freshnessLabel}
              </div>
            ) : null}
          </div>
            <button
              onClick={onReload}
              className="rounded-2xl border border-sky-200/80 bg-sky-100 px-6 py-3 cmm-text-caption font-semibold tracking-[0.12em] text-slate-950 transition hover:border-sky-300 hover:bg-sky-200 active:scale-95"
            >
              {isValidating ? "Actualisation..." : "Rafraîchir les données"}
            </button>
          </div>
        ) : null}

        <div className="grid gap-6">
          <div className="relative min-h-[600px] overflow-hidden rounded-[2.75rem] border border-sky-200/80 bg-sky-50 shadow-[0_24px_56px_-32px_rgba(14,165,233,0.16)]">
            {MapCanvas ? (
              <MapCanvas items={items} selectedActionId={selectedActionId} fullViewport={fullViewport} />
            ) : mapCanvasError ? (
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
            ) : (
              <div className="flex h-full items-center justify-center bg-sky-50 px-6 text-center text-slate-950">
                <div className="max-w-md space-y-4">
                  <div className="mx-auto h-16 w-16 animate-spin rounded-full border-4 border-sky-200 border-t-sky-500" />
                  <p className="cmm-text-caption font-semibold tracking-[0.12em] text-slate-700">
                    Initialisation du cockpit
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {showStoriesCarousel ? (
          <div className="rounded-[2.75rem] border border-sky-200/80 bg-sky-50 p-6 text-slate-950 shadow-[0_24px_56px_-32px_rgba(14,165,233,0.16)] backdrop-blur-3xl">
            <ActionStoriesCarousel items={items} onOpenAction={onOpenAction} />
          </div>
        ) : null}
      </div>
    </>
  );
}
