import type { ActionMapItem } from "@/lib/actions/types";
import { ActionStoriesCarousel } from "@/components/map/ActionStoriesCarousel";
import type { ActionsMapCanvasComponent } from "../map-feed.types";

type ImmersiveLayoutProps = {
  items: ActionMapItem[];
  summary: { totalKg: number; totalButts: number };
  hasPartialSource: boolean;
  partialSourcesLabel: string;
  freshnessLabel: string | null;
  isValidating: boolean;
  mapCanvasError: string | null;
  MapCanvas: ActionsMapCanvasComponent | null;
  selectedActionId: string | null;
  onReload: () => void;
};

export function ImmersiveLayout({
  items,
  summary,
  hasPartialSource,
  partialSourcesLabel,
  freshnessLabel,
  isValidating,
  mapCanvasError,
  MapCanvas,
  selectedActionId,
  onReload,
}: ImmersiveLayoutProps) {
  return (
    <>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.18),transparent_28%),radial-gradient(circle_at_top_right,rgba(34,211,238,0.12),transparent_26%),linear-gradient(180deg,rgba(255,255,255,0.04),rgba(15,23,42,0))]" />
      <div className="relative z-10 flex flex-col gap-6">
        <div className="flex flex-wrap items-start justify-between gap-3 rounded-[2.25rem] border border-sky-300/16 bg-[rgba(16,40,64,0.9)] px-6 py-5 text-white shadow-[0_24px_56px_-32px_rgba(56,189,248,0.28)] backdrop-blur-xl">
          <div className="max-w-2xl">
            {hasPartialSource ? (
              <span className="inline-flex items-center rounded-full border border-amber-300/20 bg-[rgba(63,40,8,0.88)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-amber-100">
                Sources partielles: {partialSourcesLabel}
              </span>
            ) : null}
            <h2 className="mt-2 text-2xl font-black tracking-tight text-white sm:text-4xl">
              Lecture spatiale
            </h2>
            <p className="mt-2 max-w-3xl text-sm font-medium leading-relaxed text-sky-100/64">
              Visualisation en temps réel des flux terrain, de leur densité et de leur qualité géographique.
            </p>
            {freshnessLabel ? (
              <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-sky-300/16 bg-sky-400/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-sky-100">
                <span className="h-2 w-2 rounded-full bg-sky-300 shadow-[0_0_0_4px_rgba(56,189,248,0.15)]" />
                {freshnessLabel}
              </div>
            ) : null}
          </div>
          <button
            onClick={onReload}
            className="rounded-2xl border border-sky-300/16 bg-[rgba(16,40,64,0.92)] px-6 py-3 text-xs font-black uppercase tracking-widest text-sky-50 transition hover:border-sky-300/30 hover:bg-[rgba(18,47,74,0.96)] active:scale-95"
          >
            {isValidating ? "Actualisation..." : "Rafraîchir les données"}
          </button>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
          <div className="relative min-h-[600px] overflow-hidden rounded-[2.75rem] border border-sky-300/16 bg-[rgba(8,23,36,0.86)] shadow-[0_24px_56px_-32px_rgba(56,189,248,0.22)]">
            {MapCanvas ? (
              <MapCanvas items={items} selectedActionId={selectedActionId} />
            ) : mapCanvasError ? (
              <div className="flex h-full items-center justify-center bg-[rgba(7,18,30,0.96)] px-6 text-center text-white">
                <div className="max-w-md space-y-3 rounded-[2rem] border border-rose-300/16 bg-[rgba(63,16,30,0.9)] px-8 py-10">
                  <p className="text-xs font-black uppercase tracking-widest text-rose-200">
                    Erreur de rendu
                  </p>
                  <p className="text-sm font-medium leading-relaxed text-rose-50/80">
                    {mapCanvasError}
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex h-full items-center justify-center bg-[rgba(7,18,30,0.96)] px-6 text-center text-white">
                <div className="max-w-md space-y-4">
                  <div className="mx-auto h-16 w-16 animate-spin rounded-full border-4 border-sky-300/18 border-t-sky-300" />
                  <p className="text-xs font-black uppercase tracking-widest text-sky-100/50">
                    Initialisation du cockpit
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-6">
            <div className="flex-1 rounded-[2.75rem] border border-sky-300/16 bg-[rgba(16,40,64,0.88)] p-6 text-white shadow-[0_24px_56px_-32px_rgba(56,189,248,0.22)] backdrop-blur-3xl">
              <ActionStoriesCarousel items={items} />
              <div className="mt-auto pt-8">
                <div className="grid grid-cols-3 gap-4">
                  <div className="rounded-3xl border border-sky-300/12 bg-sky-400/10 p-4 text-center">
                    <p className="mb-1 text-[9px] font-black uppercase tracking-widest text-sky-100/42">Impact</p>
                    <p className="text-2xl font-black text-white">{items.length}</p>
                  </div>
                  <div className="rounded-3xl border border-sky-300/12 bg-sky-400/10 p-4 text-center">
                    <p className="mb-1 text-[9px] font-black uppercase tracking-widest text-sky-100/42">Volume</p>
                    <p className="text-2xl font-black text-white">
                      {summary.totalKg.toFixed(0)}
                      <span className="text-sm">kg</span>
                    </p>
                  </div>
                  <div className="rounded-3xl border border-sky-300/12 bg-sky-400/10 p-4 text-center">
                    <p className="mb-1 text-[9px] font-black uppercase tracking-widest text-sky-100/42">Mégots</p>
                    <p className="text-2xl font-black text-white">
                      {Math.round(summary.totalButts / 1000)}
                      <span className="text-sm">k</span>
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
