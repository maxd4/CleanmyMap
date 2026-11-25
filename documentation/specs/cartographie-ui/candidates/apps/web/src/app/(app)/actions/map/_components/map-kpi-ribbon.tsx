import { cn } from "@/lib/utils";
import { CmmCard } from "@/components/ui/cmm-card";
import type { PublicImpactMetric } from "@/lib/impact/public-impact-kpis";

type MapKpiRibbonProps = {
  metrics: PublicImpactMetric[];
};

const metricAccentStyles = {
  blue: {
    bar: "bg-sky-500",
  },
  emerald: {
    bar: "bg-emerald-500",
  },
  amber: {
    bar: "bg-amber-400",
  },
} as const;

export function MapKpiRibbon({ metrics }: MapKpiRibbonProps) {
  return (
    <section
      className="space-y-3"
      aria-labelledby="actions-map-global-kpis-title"
    >
      <div className="space-y-1">
        <h2 id="actions-map-global-kpis-title" className="text-base font-semibold text-[var(--text-primary)]">
          Bilan global CleanMyMap — indépendant des filtres de cette carte
        </h2>
        <p className="cmm-text-caption text-[var(--text-secondary)]">
          Six indicateurs consolidés, distincts du viewport courant.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
        {metrics.map((metric) => {
          const accent = metricAccentStyles[metric.accent];

          return (
            <CmmCard key={metric.key} size="sm" variant="outlined" className="min-w-0 flex flex-col justify-between gap-2">
              <div className={cn("mb-2 h-1 w-8 rounded-full", accent.bar)} />
              <p className="cmm-text-caption font-medium leading-snug text-[var(--text-secondary)]">
                {metric.label}
                {metric.classification === "proxy" ? " (proxy)" : null}
              </p>
              <div className="break-words tabular-nums text-lg font-bold leading-tight tracking-tight text-[var(--text-primary)] sm:text-xl">
                {metric.value}
              </div>
            </CmmCard>
          );
        })}
      </div>
    </section>
  );
}
