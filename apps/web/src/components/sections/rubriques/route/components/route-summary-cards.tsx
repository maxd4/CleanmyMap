import { RouteOptions } from "../route-types";
import { CmmCard } from "@/components/ui/cmm-card";

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
      label: fr ? "Priorité / déplacement" : "Priority / travel",
      value: `${options.priorityVsTravel}% / ${100 - options.priorityVsTravel}%`,
      note: fr ? "Pondération opérationnelle" : "Operational weighting",
    },
    {
      label: fr ? "Créneau total" : "Total event slot",
      value: `${options.travelBudgetMinutes} min`,
      note: fr ? "Action + 15 min d’organisation" : "Action + 15 min organization",
    },
    {
      label: fr ? "Sous-groupes" : "Sub-groups",
      value: `${options.volunteers} · ${options.groupCount}`,
      note: fr ? "Bénévoles · groupes" : "Volunteers · groups",
    },
  ] as const;

  return (
    <section aria-label={fr ? "Résumé des paramètres" : "Settings summary"}>
      <CmmCard tone="emerald" variant="outlined" size="sm" className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {summaryCards.map((item) => (
          <div
            key={item.label}
            className="min-w-0 rounded-xl border border-emerald-200/60 bg-emerald-50/70 px-3 py-2"
          >
            <p className="cmm-text-caption font-black uppercase leading-4 tracking-[0.08em] text-emerald-800">
              {item.label}
            </p>
            <p className="mt-1 text-sm font-black text-emerald-950 sm:text-base">{item.value}</p>
            <p className="mt-0.5 cmm-text-caption font-medium leading-4 text-emerald-800/80">{item.note}</p>
          </div>
        ))}
      </CmmCard>
    </section>
  );
}
