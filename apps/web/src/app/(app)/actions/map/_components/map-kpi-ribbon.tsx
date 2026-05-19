import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import type { HomeMetric } from "@/lib/accueil/config";

type MapKpiRibbonProps = {
  metrics?: HomeMetric[];
};

const metricAccentStyles = {
  blue: {
    bar: "bg-cyan-500",
    value: "text-slate-950",
  },
  emerald: {
    bar: "bg-teal-500",
    value: "text-slate-950",
  },
  amber: {
    bar: "bg-amber-400",
    value: "text-slate-950",
  },
} as const;

function formatValue(value: string): string {
  return value.replace(/^n\/a$/i, "—");
}

export function MapKpiRibbon({ metrics }: MapKpiRibbonProps) {
  const safeMetrics = metrics ?? [];
  const renderedMetrics =
    safeMetrics.length > 0
      ? safeMetrics
      : [
          { key: "wasteKg", label: "Déchets récoltés", value: "n/a", category: "Résultat", accent: "blue" },
          { key: "butts", label: "Mégots retirés", value: "n/a", category: "Résultat", accent: "blue" },
          { key: "volunteers", label: "Bénévoles mobilisés", value: "n/a", category: "Résultat", accent: "blue" },
          { key: "co2", label: "CO₂e évité", value: "n/a", category: "Équivalent", accent: "emerald" },
          { key: "water", label: "Eau préservée", value: "n/a", category: "Équivalent", accent: "emerald" },
          { key: "euro", label: "Économie de voirie", value: "n/a", category: "Économique", accent: "amber" },
        ] satisfies HomeMetric[];

  return (
    <section className="relative overflow-hidden rounded-[3rem] border border-cyan-200/80 bg-cyan-50/95 p-5 sm:p-6 shadow-[0_24px_56px_-32px_rgba(8,145,178,0.22)]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(34,211,238,0.18),transparent_30%),radial-gradient(circle_at_bottom_left,rgba(186,230,253,0.35),transparent_24%)]" />
      <div className="pointer-events-none absolute right-4 top-4 text-cyan-200/50">
        <Sparkles size={120} />
      </div>

      <div className="relative z-10 flex flex-wrap items-start justify-between gap-4 px-1 pb-5 sm:px-2">
        <div className="space-y-1">
          <p className="flex items-center gap-3 cmm-text-caption font-semibold tracking-[0.14em] text-slate-950">
            <span className="h-4 w-4 rounded-full bg-cyan-500 shadow-[0_0_18px_rgba(34,211,238,0.55)]" />
            Aperçu de l&apos;impact
          </p>
          <p className="max-w-2xl text-sm font-medium leading-relaxed text-slate-600">
            Données terrain certifiées. Formules exposées en méthodologie.
          </p>
        </div>
      </div>

      <div className="relative z-10 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {renderedMetrics.map((metric) => {
          const accent = metricAccentStyles[metric.accent];

          return (
            <div
              key={metric.key}
              className={cn(
                "group relative min-h-[152px] overflow-hidden rounded-[1.6rem] border border-cyan-100 bg-white p-6 shadow-[0_14px_32px_-20px_rgba(6,17,30,0.18)] transition-transform duration-300 hover:-translate-y-0.5",
              )}
            >
              <div className={cn("absolute inset-y-4 left-0 w-1 rounded-r-full", accent.bar)} />
              <p className="mb-4 min-h-[2.5rem] cmm-text-caption font-semibold leading-snug tracking-[0.12em] text-slate-600">
                {metric.label}
              </p>
              <div className={cn("text-[clamp(2.1rem,4vw,3rem)] font-black leading-none tracking-tight", accent.value)}>
                {formatValue(metric.value)}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
