import {
  ACTION_POLLUTION_COLOR_STOPS,
  CLEAN_PLACE_COLOR,
  resolveDynamicColor,
} from "../map-marker-categories";

export function MapGeometryLegend() {
  return (
    <div
      role="note"
      aria-label="Légende de la carte"
      className="pointer-events-auto w-[min(21rem,calc(100vw-1.5rem))] max-h-[min(24rem,calc(100dvh-11rem))] min-w-0 overflow-x-hidden overflow-y-auto rounded-2xl border border-sky-200/80 bg-white/95 px-3 py-2.5 text-slate-800 shadow-[0_18px_42px_-28px_rgba(14,165,233,0.45)] backdrop-blur-xl"
    >
      <p className="cmm-text-caption font-black uppercase tracking-[0.14em] text-slate-500">
        Lecture de la carte
      </p>
      <div className="mt-2 space-y-2 text-[10px] font-semibold leading-snug">
        <p className="text-slate-600">
          Actions : la couleur représente la pollution projetée depuis la dernière action.
        </p>
        <div className="grid grid-cols-1 gap-x-3 gap-y-1.5 sm:grid-cols-2">
          {ACTION_POLLUTION_COLOR_STOPS.map((stop) => (
            <p key={stop.key} className="flex min-w-0 items-center gap-1.5">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full border border-slate-900/15"
                style={{ backgroundColor: resolveDynamicColor(stop.threshold) }}
                aria-hidden="true"
              />
              <span className="min-w-0 break-words">{stop.label}</span>
            </p>
          ))}
          <p className="flex min-w-0 items-center gap-1.5">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full border border-emerald-700/30"
              style={{ backgroundColor: CLEAN_PLACE_COLOR }}
              aria-hidden="true"
            />
            <span className="min-w-0 break-words">Vert · lieu explicitement propre</span>
          </p>
        </div>
        <p className="text-slate-600">
          Trash Spotter : signalements actuellement observés et actionnables.
        </p>
      </div>

      <div className="mt-2 grid gap-1.5 border-t border-slate-200 pt-2 text-[10px] font-semibold leading-snug">
        <p className="flex items-center gap-2">
          <span className="h-0.5 w-6 shrink-0 bg-sky-600" aria-hidden="true" />
          Trait plein : parcours déclaré/connu
        </p>
        <p className="flex items-center gap-2">
          <span
            className="h-0.5 w-6 shrink-0 border-t-2 border-dashed border-sky-600"
            aria-hidden="true"
          />
          Trait pointillé : parcours indicatif/reconstruit
        </p>
        <p className="flex items-center gap-2">
          <span
            className="h-3.5 w-6 shrink-0 rounded-sm border border-sky-600 bg-sky-500/25"
            aria-hidden="true"
          />
          Surface remplie : zone d&apos;action
        </p>
        <p className="flex items-center gap-2">
          <span
            className="h-2.5 w-2.5 shrink-0 rounded-full border border-sky-600 bg-sky-500/60"
            aria-hidden="true"
          />
          Point : localisation seule
        </p>
      </div>
      <p className="mt-2 text-[10px] font-medium leading-snug text-slate-500">
        Zone indicative : opacité réduite et libellé explicite.
      </p>
      <a
        href="/methodologie#methodologie-carte-actions"
        className="mt-2 inline-flex min-h-9 w-full min-w-0 items-center justify-center rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-center text-[10px] font-black uppercase leading-tight tracking-[0.12em] text-sky-800 transition hover:border-sky-300 hover:bg-sky-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/50"
      >
        Voir la méthodologie détaillée
      </a>
    </div>
  );
}
