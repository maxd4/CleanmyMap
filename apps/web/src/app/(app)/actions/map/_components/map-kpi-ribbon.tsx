import { cn } from "@/lib/utils";
import type { PublicImpactMetric } from "@/lib/impact/public-impact-kpis";

type MapKpiRibbonProps = {
  metrics: PublicImpactMetric[];
};

const metricAccentStyles = {
  blue: {
    bar: "bg-sky-500",
    value: "text-slate-950",
  },
  emerald: {
    bar: "bg-emerald-500",
    value: "text-slate-950",
  },
  amber: {
    bar: "bg-amber-400",
    value: "text-slate-950",
  },
} as const;

export function MapKpiRibbon({ metrics }: MapKpiRibbonProps) {
  return (
    <section
      className="rounded-2xl border border-sky-200/80 bg-sky-50/80 p-4 shadow-[0_14px_32px_-24px_rgba(14,165,233,0.2)]"
      aria-labelledby="actions-map-global-kpis-title"
    >
      <div className="mb-3 space-y-1">
        <p id="actions-map-global-kpis-title" className="cmm-text-small font-semibold text-slate-800">
          Bilan global CleanMyMap — indépendant des filtres de cette carte
        </p>
        <p className="cmm-text-caption text-slate-600">
          Six indicateurs consolidés, distincts du viewport courant.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        {metrics.map((metric) => {
          const accent = metricAccentStyles[metric.accent];

          return (
            <div
              key={metric.key}
              className="min-w-0 rounded-xl border border-sky-100 bg-white/90 px-3 py-3"
            >
              <div className={cn("mb-2 h-1 w-8 rounded-full", accent.bar)} />
              <p className="cmm-text-caption font-medium leading-snug text-slate-600">
                {metric.label}
                {metric.classification === "proxy" ? " (proxy)" : null}
              </p>
              <div className={cn("mt-2 text-lg font-bold leading-tight tracking-tight sm:text-xl", accent.value)}>
                {metric.value}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
