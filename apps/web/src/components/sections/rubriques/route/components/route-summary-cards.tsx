import { RouteConstraints } from "../route-types";

interface RouteSummaryCardsProps {
  constraints: RouteConstraints;
  fr: boolean;
}

export function RouteSummaryCards({ constraints, fr }: RouteSummaryCardsProps) {
  const summaryCards = [
    {
      label: fr ? "Temps dispo" : "Time available",
      value: `${constraints.availableMinutes} min`,
      note: fr ? "Fenêtre terrain" : "Field window",
    },
    {
      label: fr ? "Bénévoles" : "Volunteers",
      value: `${constraints.volunteers}`,
      note: fr ? "Force de sortie" : "Team size",
    },
    {
      label: fr ? "Arrêts max" : "Max stops",
      value: `${constraints.maxStops}`,
      note: fr ? "Parcours ciblé" : "Focused route",
    },
    {
      label: fr ? "Arbitrage" : "Trade-off",
      value: `${constraints.impactVsDistance}%`,
      note: fr ? "Impact priorisé" : "Impact weighted",
    },
  ] as const;

  return (
    <section className="rounded-[1.75rem] border border-emerald-300/18 bg-[rgba(11,39,30,0.88)] p-5 shadow-[0_24px_56px_-32px_rgba(52,211,153,0.28)]">
      <p className="text-[11px] font-black uppercase tracking-[0.28em] text-emerald-100/68">
        {fr ? "Lecture rapide" : "Quick read"}
      </p>
      <h2 className="mt-2 text-2xl font-bold tracking-[-0.02em] text-white">
        {fr ? "Ce que l'IA optimise" : "What the AI optimizes"}
      </h2>
      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/78">
        {fr
          ? "Le trajet privilégie les actions qui ont du sens aujourd'hui, avec vos contraintes réelles: temps, équipe, météo, sécurité et distance."
          : "The route prioritizes what matters today, based on real constraints: time, team size, weather, safety, and distance."}
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
