export function MapGeometryLegend() {
  return (
    <div
      role="note"
      aria-label="Légende des tracés"
      className="pointer-events-auto w-[min(19rem,calc(100vw-1.5rem))] rounded-2xl border border-sky-200/80 bg-white/95 px-3 py-2.5 text-slate-800 shadow-[0_18px_42px_-28px_rgba(14,165,233,0.45)] backdrop-blur-xl"
    >
      <p className="cmm-text-caption font-black uppercase tracking-[0.14em] text-slate-500">
        Tracés
      </p>
      <div className="mt-2 grid gap-1.5 text-[10px] font-semibold leading-snug">
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
    </div>
  );
}
