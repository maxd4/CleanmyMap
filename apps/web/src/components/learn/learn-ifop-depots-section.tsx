import { ArrowRight, FileText } from "lucide-react";
import { CmmButton } from "@/components/ui/cmm-button";
import { CmmCard } from "@/components/ui/cmm-card";
import type { LearnLocale } from "@/lib/learning/learn-rubric-data";
import { IFOP_DEPOTS_STUDY } from "@/lib/learning/ifop-depots-study";
import { cn } from "@/lib/utils";

function getMetric(id: string) {
  const metric = IFOP_DEPOTS_STUDY.metrics.find((entry) => entry.id === id);

  if (!metric) {
    throw new Error(`Missing IFOP illegal dumping metric: ${id}`);
  }

  return metric;
}

export function LearnIfopDepotsSection({ locale, className }: { locale: LearnLocale; className?: string }) {
  const featuredMetrics = IFOP_DEPOTS_STUDY.featuredMetricIds.map(getMetric);
  const pdfHref = IFOP_DEPOTS_STUDY.pdfPath;

  return (
    <section
      className={cn(
        "rounded-[2rem] border border-amber-200/80 bg-[linear-gradient(180deg,rgba(255,251,235,0.98),rgba(255,255,255,0.98))] p-4 shadow-sm md:p-5",
        className,
      )}
      aria-labelledby="ifop-depots-title"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-3xl space-y-2">
          <p className="cmm-text-caption font-black uppercase tracking-[0.18em] text-amber-700">
            {locale === "fr" ? "Étude source" : "Source study"}
          </p>
          <h3 id="ifop-depots-title" className="text-2xl font-black tracking-tight cmm-text-primary md:text-3xl">
            {IFOP_DEPOTS_STUDY.title[locale]}
          </h3>
          <p className="cmm-text-small leading-relaxed cmm-text-secondary">
            {IFOP_DEPOTS_STUDY.scope[locale]} {IFOP_DEPOTS_STUDY.fieldworkPeriod[locale]}.
          </p>
        </div>
        <span className="inline-flex items-center rounded-full border border-amber-200 bg-white px-3 py-1.5 cmm-text-caption font-black uppercase tracking-[0.16em] text-amber-900">
          {locale === "fr" ? "Données déclaratives" : "Self-reported data"}
        </span>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {featuredMetrics.map((metric) => (
          <CmmCard key={metric.id} tone="amber" variant="outlined" className="flex h-full flex-col gap-2 p-4">
            <p className="text-3xl font-black tracking-tight text-amber-900" aria-label={`${metric.value} %`}>
              {metric.value}%
            </p>
            <p className="cmm-text-small font-black leading-snug cmm-text-primary">{metric.label[locale]}</p>
            <p className="cmm-text-caption leading-relaxed cmm-text-secondary">{metric.interpretationLimit[locale]}</p>
          </CmmCard>
        ))}
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-[1.35rem] border border-amber-200 bg-white p-4">
          <p className="cmm-text-caption font-black uppercase tracking-[0.16em] text-amber-700">
            {locale === "fr" ? "Ce que l’étude permet de distinguer" : "What the study helps distinguish"}
          </p>
          <p className="mt-2 cmm-text-small leading-relaxed cmm-text-secondary">{IFOP_DEPOTS_STUDY.methodology[locale]}</p>
          <p className="mt-2 cmm-text-small leading-relaxed cmm-text-secondary">
            {locale === "fr"
              ? "Les pourcentages décrivent des réponses d’enquête : ils ne remplacent pas une mesure terrain des dépôts."
              : "The percentages describe survey answers: they do not replace field measurement of illegal dumping."}
          </p>
        </div>
        <div className="rounded-[1.35rem] border border-amber-200 bg-white p-4">
          <p className="cmm-text-caption font-black uppercase tracking-[0.16em] text-amber-700">
            {locale === "fr" ? "Pistes recommandées par la source" : "Recommendations from the source"}
          </p>
          <ul className="mt-3 space-y-2 cmm-text-small leading-relaxed cmm-text-secondary">
            {IFOP_DEPOTS_STUDY.recommendations.map((recommendation) => (
              <li key={recommendation.fr} className="flex gap-2">
                <span aria-hidden="true" className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
                <span>{recommendation[locale]}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-[1.4rem] border border-amber-200 bg-white p-4">
        <p className="cmm-text-small leading-relaxed cmm-text-secondary">
          {locale === "fr" ? "Source : IFOP × Gestes Propres · document daté de mai 2025." : "Source: IFOP × Gestes Propres · document dated May 2025."}
        </p>
        <CmmButton href={pdfHref} tone="secondary" variant="pill" className="min-h-11 px-4 py-2.5 cmm-text-caption font-black uppercase tracking-[0.16em]">
          {locale === "fr" ? "Consulter l’étude" : "Read the study"}
          <FileText className="h-4 w-4" aria-hidden="true" />
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </CmmButton>
      </div>
    </section>
  );
}
