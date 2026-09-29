import { ArrowRight, FileText, ShieldAlert } from "lucide-react";
import { CmmButton } from "@/components/ui/cmm-button";
import { CmmCard } from "@/components/ui/cmm-card";
import { CmmDisclosure } from "@/components/ui/cmm-disclosure";
import { cn } from "@/lib/utils";
import type { LearnLocale } from "@/lib/learning/learn-rubric-data";
import {
  GESTES_PROPRES_BAROMETER_2025,
  type GestesPropresBarometerMetric,
} from "@/lib/learning/gestes-propres/gestes-propres-barometer";
import { IFOP_DEPOTS_STUDY, type IfopDepotsMetric } from "@/lib/learning/gestes-propres/ifop-depots-study";
import { LearnGestesPropresBarometer } from "./learn-gestes-propres-barometer";
import { LearnIfopDepotsSection } from "./learn-ifop-depots-section";

const BAROMETER_METRICS = Object.values(GESTES_PROPRES_BAROMETER_2025.categories).flat();

function getBarometerMetric(id: string): GestesPropresBarometerMetric {
  const metric = BAROMETER_METRICS.find((entry) => entry.id === id);

  if (!metric) {
    throw new Error("Missing national context barometer metric: " + id);
  }

  return metric;
}

function getIfopMetric(id: string): IfopDepotsMetric {
  const metric = IFOP_DEPOTS_STUDY.metrics.find((entry) => entry.id === id);

  if (!metric) {
    throw new Error("Missing national context IFOP metric: " + id);
  }

  return metric;
}

export function getNationalContextMetrics() {
  return {
    barometer: GESTES_PROPRES_BAROMETER_2025.featuredKpiIds.map(getBarometerMetric),
    ifop: IFOP_DEPOTS_STUDY.featuredMetricIds.map(getIfopMetric),
  };
}

function NationalMetricCard({ metric, locale }: { metric: GestesPropresBarometerMetric; locale: LearnLocale }) {
  return (
    <CmmCard tone="amber" variant="outlined" className="flex h-full flex-col gap-2 p-4">
      <p className="text-3xl font-black tracking-tight text-amber-900" aria-label={metric.value + " %"}>
        {metric.value}%
      </p>
      <p className="cmm-text-small font-black leading-snug cmm-text-primary">{metric.label[locale]}</p>
      <p className="cmm-text-caption leading-relaxed cmm-text-secondary">{metric.context[locale]}</p>
      <p className="cmm-text-caption leading-relaxed cmm-text-secondary">{metric.interpretationLimit[locale]}</p>
      <p className="cmm-text-caption font-black text-amber-800">
        {locale === "fr" ? "Enquête déclarative · Baromètre 2025 · p. " : "Self-reported survey · 2025 Barometer · p. "}
        {metric.sourcePage}
      </p>
    </CmmCard>
  );
}

export function LearnNationalContextSection({ locale, className }: { locale: LearnLocale; className?: string }) {
  const { barometer, ifop } = getNationalContextMetrics();
  const barometerStudy = GESTES_PROPRES_BAROMETER_2025;
  const ifopStudy = IFOP_DEPOTS_STUDY;

  return (
    <section
      className={cn(
        "rounded-[2rem] border border-amber-200/80 bg-[linear-gradient(180deg,rgba(255,251,235,0.98),rgba(255,255,255,0.98))] p-4 shadow-sm md:p-5",
        className,
      )}
      aria-labelledby="national-context-title"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-3xl space-y-2">
          <p className="cmm-text-caption font-black uppercase tracking-[0.18em] text-amber-700">
            {locale === "fr" ? "Contexte national" : "National context"}
          </p>
          <h3 id="national-context-title" className="text-2xl font-black tracking-tight cmm-text-primary md:text-3xl">
            {locale === "fr" ? "Pourquoi les déchets abandonnés comptent" : "Why abandoned waste matters"}
          </h3>
          <p className="cmm-text-small leading-relaxed cmm-text-secondary">
            {locale === "fr"
              ? "Quatre repères issus d’une enquête déclarative pour comprendre les perceptions, les freins et les leviers, sans les transformer en mesure terrain."
              : "Four cues from a self-reported survey to understand perceptions, barriers and levers without turning them into field measurements."}
          </p>
        </div>
        <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-amber-200 bg-amber-100 text-amber-900">
          <ShieldAlert className="h-5 w-5" aria-hidden="true" />
        </span>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {barometer.map((metric) => <NationalMetricCard key={metric.id} metric={metric} locale={locale} />)}
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <div className="rounded-[1.35rem] border border-amber-200 bg-white p-4">
          <p className="cmm-text-caption font-black uppercase tracking-[0.16em] text-amber-700">
            {locale === "fr" ? "Ce que ces données signifient" : "What these data mean"}
          </p>
          <p className="mt-2 cmm-text-small leading-relaxed cmm-text-secondary">{barometerStudy.interpretationNote[locale]}</p>
          <p className="mt-2 cmm-text-small leading-relaxed cmm-text-secondary">
            {locale === "fr"
              ? "L’étude IFOP sur les dépôts complète cette lecture avec les options de collecte connues, les risques perçus et les solutions jugées utiles."
              : "The IFOP dumping study complements this reading with known collection options, perceived risks and solutions considered useful."}
          </p>
        </div>
        <div className="rounded-[1.35rem] border border-amber-200 bg-amber-50/50 p-4">
          <p className="cmm-text-caption font-black uppercase tracking-[0.16em] text-amber-700">
            {locale === "fr" ? "Ce que ces données ne permettent pas de conclure" : "What these data cannot conclude"}
          </p>
          <p className="mt-2 cmm-text-small leading-relaxed cmm-text-secondary">
            {locale === "fr"
              ? "Elles ne mesurent ni le taux réel de dépôts, ni un changement de comportement, ni l’impact physique des déchets."
              : "They measure neither the actual littering rate, nor behavior change, nor the physical impact of waste."}
          </p>
          <p className="mt-2 cmm-text-small leading-relaxed cmm-text-secondary">{ifop[0]?.interpretationLimit[locale]}</p>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-[1.4rem] border border-amber-200 bg-white p-4">
        <div className="max-w-2xl space-y-1">
          <p className="text-base font-black tracking-tight cmm-text-primary">
            {locale === "fr" ? "Contexte national ≠ données CleanMyMap" : "National context ≠ CleanMyMap data"}
          </p>
          <p className="cmm-text-small leading-relaxed cmm-text-secondary">
            {locale === "fr"
              ? barometerStudy.organization[locale] + " · " + barometerStudy.fieldworkPeriod[locale] + " · " + barometerStudy.sampleSize.toLocaleString("fr-FR") + " personnes · données déclaratives."
              : barometerStudy.organization[locale] + " · " + barometerStudy.fieldworkPeriod[locale] + " · " + barometerStudy.sampleSize.toLocaleString("en-GB") + " people · self-reported data."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <CmmButton href="/signalement" tone="primary" variant="pill" className="min-h-11 px-4 py-2.5 cmm-text-caption font-black uppercase tracking-[0.16em]">
            {locale === "fr" ? "Signaler un dépôt" : "Report litter"}
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </CmmButton>
          <CmmButton href={barometerStudy.pdfPath} tone="secondary" variant="pill" className="min-h-11 px-4 py-2.5 cmm-text-caption font-black uppercase tracking-[0.16em]" title={locale === "fr" ? "Ouvrir le PDF du baromètre" : "Open the barometer PDF"}>
            {locale === "fr" ? "Source PDF" : "Source PDF"}
            <FileText className="h-4 w-4" aria-hidden="true" />
          </CmmButton>
        </div>
      </div>

      <CmmDisclosure
        summary={locale === "fr" ? "Voir la méthodologie et les indicateurs détaillés" : "View methodology and detailed indicators"}
        tone="amber"
        size="md"
        className="mt-4"
      >
        <div className="space-y-4">
          <p className="cmm-text-small leading-relaxed cmm-text-secondary">{barometerStudy.methodology[locale]}</p>
          <p className="cmm-text-small leading-relaxed cmm-text-secondary">{ifopStudy.methodology[locale]}</p>
          <LearnGestesPropresBarometer locale={locale} />
          <LearnIfopDepotsSection locale={locale} />
        </div>
      </CmmDisclosure>
    </section>
  );
}
