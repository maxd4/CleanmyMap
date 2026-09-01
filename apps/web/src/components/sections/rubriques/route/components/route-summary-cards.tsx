import { RouteOptions } from "../route-types";

interface RouteSummaryCardsProps {
  options: RouteOptions;
  fr: boolean;
}

export function RouteSummaryCards({ options, fr }: RouteSummaryCardsProps) {
  const summaryCards = [
    {
      label: fr ? "Arrêts max" : "Max stops",
      value: `${options.maxStops}`,
      note: fr ? "Parcours ciblé" : "Focused route",
    },
    {
      label: fr ? "Priorité / distance" : "Priority / distance",
      value: `${options.priorityVsDistance}% / ${100 - options.priorityVsDistance}%`,
      note: fr ? "Pondération opérationnelle" : "Operational weighting",
    },
  ] as const;

  return (
    <section className="rounded-[1.75rem] border border-emerald-300/18 bg-[rgba(11,39,30,0.88)] p-5 shadow-[0_24px_56px_-32px_rgba(52,211,153,0.28)]">
      <p className="text-[11px] font-black uppercase tracking-[0.28em] text-emerald-100/68">
        {fr ? "Lecture rapide" : "Quick read"}
      </p>
      <h2 className="mt-2 text-2xl font-bold tracking-[-0.02em] text-white">
        {fr ? "Ce que la recommandation utilise" : "What the recommendation uses"}
      </h2>
      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white">
        {fr
          ? "La sélection combine la priorité opérationnelle disponible (fraîcheur des signalements) et la distance."
          : "The selection combines the available operational priority (report freshness) and distance."}
      </p>

      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        {summaryCards.map((item) => (
          <div
            key={item.label}
            className="rounded-2xl border border-emerald-200/12 bg-[rgba(17,56,41,0.72)] px-4 py-3"
          >
            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-emerald-100/58">
              {item.label}
            </p>
            <p className="mt-2 text-lg font-black text-white">{item.value}</p>
            <p className="mt-1 text-xs text-white/64">{item.note}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
