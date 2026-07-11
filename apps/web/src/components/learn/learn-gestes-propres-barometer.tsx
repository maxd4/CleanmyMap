import { ArrowRight, BarChart3, ChevronDown, FileText, ShieldAlert } from "lucide-react";
import { CmmButton } from "@/components/ui/cmm-button";
import { CmmCard } from "@/components/ui/cmm-card";
import { cn } from "@/lib/utils";
import type { LearnLocale } from "@/lib/learning/learn-rubric-data";
import { GESTES_PROPRES_BAROMETER_2025 } from "@/lib/learning/gestes-propres-barometer";
import { LearnGestesPropresCollectiveActionSection } from "@/components/learn/learn-gestes-propres-collective-action-section";
import { LearnGestesPropresMythsSection } from "@/components/learn/learn-gestes-propres-myths-section";

type BarometerKpi = (typeof GESTES_PROPRES_BAROMETER_2025.featuredKpiIds)[number];
type BarometerMetric = (typeof ALL_BAROMETER_METRICS)[number];

const ALL_BAROMETER_METRICS = Object.values(GESTES_PROPRES_BAROMETER_2025.categories).flat();

const KPI_ORDER: BarometerKpi[] = GESTES_PROPRES_BAROMETER_2025.featuredKpiIds;
const KPI_CATEGORY_LABELS: Record<string, Record<LearnLocale, string>> = {
  declared_practices: { fr: "Déclarations", en: "Declarations" },
  false_beliefs: { fr: "Idées reçues", en: "False beliefs" },
  social_influence: { fr: "Influence sociale", en: "Social influence" },
  positive_engagement: { fr: "Pratique positive", en: "Positive engagement" },
  perception: { fr: "Perception", en: "Perception" },
};

function getMetric(id: BarometerKpi) {
  const metric = ALL_BAROMETER_METRICS.find((entry) => entry.id === id);

  if (!metric) {
    throw new Error(`Missing Gestes Propres barometer metric: ${id}`);
  }

  return metric;
}

function getMetricById(id: string): BarometerMetric {
  const metric = ALL_BAROMETER_METRICS.find((entry) => entry.id === id);

  if (!metric) {
    throw new Error(`Missing Gestes Propres barometer metric: ${id}`);
  }

  return metric;
}

function getPdfHref() {
  return `/docs/${GESTES_PROPRES_BAROMETER_2025.pdfPath.replace(/^documentation\//, "")}`;
}

function BarometerKpiCard({
  locale,
  metricId,
}: {
  locale: LearnLocale;
  metricId: BarometerKpi;
}) {
  const metric = getMetric(metricId);

  return (
    <CmmCard tone="amber" variant="outlined" className="flex h-full flex-col gap-3 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="cmm-text-caption font-black uppercase tracking-[0.18em] text-amber-700">
            {KPI_CATEGORY_LABELS[metric.category]?.[locale] ?? metric.category}
          </p>
          <h3 className="text-3xl font-black tracking-tight cmm-text-primary">
            {metric.value}
            <span className="ml-1 text-xl">%</span>
          </h3>
        </div>
        <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-amber-200 bg-amber-50 text-amber-700">
          <BarChart3 className="h-4 w-4" aria-hidden="true" />
        </span>
      </div>

      <p className="text-base font-black tracking-tight cmm-text-primary">{metric.label[locale]}</p>
      <p className="cmm-text-small leading-relaxed cmm-text-secondary">{metric.context[locale]}</p>
    </CmmCard>
  );
}

type ComparisonRow = {
  label: { fr: string; en: string };
  declaredId: string;
  recognizedId: string;
  note: { fr: string; en: string };
};

const COMPARISON_ROWS: ComparisonRow[] = [
  {
    label: {
      fr: "Déchets jetés correctement",
      en: "Waste disposed of correctly",
    },
    declaredId: "declared-practices-jeter-correctement",
    recognizedId: "declared-practices-abandon-12-mois",
    note: {
      fr: "Comparer une déclaration générale et un aveu plus précis évite de surinterpréter le niveau réel de propreté.",
      en: "Comparing a general declaration with a more specific admission avoids overreading the real cleanliness level.",
    },
  },
  {
    label: {
      fr: "Gestion des mégots",
      en: "Cigarette butt handling",
    },
    declaredId: "declared-practices-megots-vertueux",
    recognizedId: "declared-practices-megot-annee",
    note: {
      fr: "Le même écart existe pour les mégots: l’image déclarée reste plus flatteuse que l’aveu d’un abandon dans l’année.",
      en: "The same gap exists for cigarette butts: the declared image remains more flattering than the admission of littering in the year.",
    },
  },
];

function ComparisonCard({
  locale,
  row,
}: {
  locale: LearnLocale;
  row: ComparisonRow;
}) {
  const declaredMetric = getMetricById(row.declaredId);
  const recognizedMetric = getMetricById(row.recognizedId);

  return (
    <CmmCard tone="amber" variant="outlined" className="flex h-full flex-col gap-4 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="cmm-text-caption font-black uppercase tracking-[0.18em] text-amber-700">
            {locale === "fr" ? "Comparaison" : "Comparison"}
          </p>
          <h4 className="text-lg font-black tracking-tight cmm-text-primary">{row.label[locale]}</h4>
        </div>
        <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-amber-200 bg-amber-50 text-amber-700">
          <BarChart3 className="h-4 w-4" aria-hidden="true" />
        </span>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-[1.15rem] border border-amber-100 bg-white px-3 py-3">
          <p className="cmm-text-caption font-black uppercase tracking-[0.16em] text-amber-700">
            {locale === "fr" ? "Ce que l’on déclare" : "What is declared"}
          </p>
          <p className="mt-1 text-2xl font-black tracking-tight cmm-text-primary">
            {declaredMetric.value}%
          </p>
          <p className="mt-1 cmm-text-small leading-relaxed cmm-text-secondary">
            {declaredMetric.context[locale]}
          </p>
        </div>

        <div className="rounded-[1.15rem] border border-amber-100 bg-amber-50/50 px-3 py-3">
          <p className="cmm-text-caption font-black uppercase tracking-[0.16em] text-amber-700">
            {locale === "fr" ? "Ce que l’on reconnaît" : "What is admitted"}
          </p>
          <p className="mt-1 text-2xl font-black tracking-tight cmm-text-primary">
            {recognizedMetric.value}%
          </p>
          <p className="mt-1 cmm-text-small leading-relaxed cmm-text-secondary">
            {recognizedMetric.context[locale]}
          </p>
        </div>
      </div>

      <p className="cmm-text-small leading-relaxed cmm-text-secondary">{row.note[locale]}</p>
    </CmmCard>
  );
}

export function LearnGestesPropresBarometer({ locale, className }: { locale: LearnLocale; className?: string }) {
  const featuredMetrics = KPI_ORDER.map((metricId) => getMetric(metricId));

  return (
    <section
      className={cn(
        "rounded-[2rem] border border-amber-200/80 bg-[linear-gradient(180deg,rgba(255,251,235,0.98),rgba(255,255,255,0.98))] p-4 shadow-sm md:p-5",
        className,
      )}
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-3xl space-y-2">
            <p className="cmm-text-caption font-black uppercase tracking-[0.18em] text-amber-700">
              {locale === "fr" ? "Baromètre national 2025" : "National barometer 2025"}
            </p>
            <h3 className="text-2xl font-black tracking-tight cmm-text-primary md:text-3xl">
              {locale === "fr"
                ? "Ce que les Français pensent, déclarent et font réellement"
                : "What French people think, declare and really do"}
            </h3>
            <p className="cmm-text-caption font-black uppercase tracking-[0.16em] text-amber-700">
              {GESTES_PROPRES_BAROMETER_2025.subtitle[locale]}
            </p>
            <p className="cmm-text-small leading-relaxed cmm-text-secondary">
              {locale === "fr"
                ? "Le baromètre reste déclaratif: il met en regard perception, croyance et gestes reconnus, sans confondre intention et observation."
                : "The barometer remains declarative: it compares perception, belief and reported gestures without confusing intention and observation."}
            </p>
          </div>

          <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-amber-200 bg-amber-100 text-amber-900">
            <ShieldAlert className="h-5 w-5" aria-hidden="true" />
          </span>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {featuredMetrics.map((metric) => (
            <BarometerKpiCard key={metric.id} locale={locale} metricId={metric.id as BarometerKpi} />
          ))}
        </div>

        <div className="space-y-3">
          <div className="max-w-3xl space-y-2">
            <p className="cmm-text-caption font-black uppercase tracking-[0.18em] text-amber-700">
              {locale === "fr" ? "Déclarations contre pratiques" : "Declared vs actual practices"}
            </p>
            <h4 className="text-xl font-black tracking-tight cmm-text-primary">
              {locale === "fr"
                ? "Comparer sans juger ce que l’on dit et ce que l’on admet"
                : "Compare what people say and what they admit without judging"}
            </h4>
          </div>

          <div className="grid gap-3 lg:grid-cols-2">
            {COMPARISON_ROWS.map((row) => (
              <ComparisonCard key={row.label.fr} locale={locale} row={row} />
            ))}
          </div>

          <p className="rounded-[1.2rem] border border-amber-200 bg-white px-4 py-3 cmm-text-small leading-relaxed cmm-text-secondary">
            {locale === "fr"
              ? "Résultats déclaratifs, sans profilage ni accusation."
              : "Declared results, without profiling or accusation."}
          </p>
        </div>

        <LearnGestesPropresMythsSection locale={locale} />

        <details className="group rounded-[1.35rem] border border-amber-200 bg-white px-4 py-3 shadow-sm">
          <summary className="flex cursor-pointer list-none items-start justify-between gap-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/70 focus-visible:ring-offset-2 focus-visible:ring-offset-white">
            <div className="space-y-1 pr-4">
              <p className="cmm-text-caption font-black uppercase tracking-[0.18em] text-amber-700">
                {locale === "fr" ? "Méthodologie et source" : "Methodology and source"}
              </p>
              <p className="cmm-text-small leading-relaxed cmm-text-secondary">
                {locale === "fr"
                  ? `${GESTES_PROPRES_BAROMETER_2025.fieldworkPeriod[locale]} · ${GESTES_PROPRES_BAROMETER_2025.sampleSize.toLocaleString("fr-FR")} personnes · enquête déclarative`
                  : `${GESTES_PROPRES_BAROMETER_2025.fieldworkPeriod[locale]} · ${GESTES_PROPRES_BAROMETER_2025.sampleSize.toLocaleString("en-GB")} people · declared survey`}
              </p>
            </div>
            <span className="mt-1 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-2xl border border-amber-200 bg-amber-50 text-amber-700 transition group-open:rotate-180">
              <ChevronDown className="h-4 w-4" aria-hidden="true" />
            </span>
          </summary>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <div className="rounded-[1.15rem] border border-amber-100 bg-amber-50/40 px-3 py-3">
              <p className="cmm-text-caption font-black uppercase tracking-[0.16em] text-amber-700">
                {locale === "fr" ? "Source" : "Source"}
              </p>
              <p className="mt-1 cmm-text-small leading-relaxed cmm-text-primary">
                {GESTES_PROPRES_BAROMETER_2025.organization[locale]}
              </p>
            </div>

            <div className="rounded-[1.15rem] border border-amber-100 bg-white px-3 py-3">
              <p className="cmm-text-caption font-black uppercase tracking-[0.16em] text-amber-700">
                {locale === "fr" ? "Méthode" : "Method"}
              </p>
              <p className="mt-1 cmm-text-small leading-relaxed cmm-text-primary">
                {GESTES_PROPRES_BAROMETER_2025.methodology[locale]}
              </p>
            </div>

            <div className="rounded-[1.15rem] border border-amber-100 bg-white px-3 py-3 md:col-span-2">
              <p className="cmm-text-caption font-black uppercase tracking-[0.16em] text-amber-700">
                {locale === "fr" ? "Périmètre" : "Scope"}
              </p>
              <p className="mt-1 cmm-text-small leading-relaxed cmm-text-primary">
                {locale === "fr"
                  ? `Baromètre de ${GESTES_PROPRES_BAROMETER_2025.pageCount} pages, basé sur du déclaratif et à lire comme une mesure de perceptions, de croyances et de pratiques déclarées.`
                  : `${GESTES_PROPRES_BAROMETER_2025.pageCount}-page barometer based on declared data and to be read as a measure of perceptions, beliefs and declared practices.`}
              </p>
            </div>
          </div>
        </details>

        <LearnGestesPropresCollectiveActionSection locale={locale} />

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-[1.4rem] border border-amber-200 bg-white p-4">
          <div className="max-w-2xl space-y-1">
            <p className="text-base font-black tracking-tight cmm-text-primary">
              {locale === "fr" ? "Lecture utile" : "Useful reading"}
            </p>
            <p className="cmm-text-small leading-relaxed cmm-text-secondary">
              {locale === "fr"
                ? "L’écart entre ce que l’on déclare et ce que l’on reconnaît explique pourquoi les rappels contextuels et les repères simples restent utiles."
                : "The gap between what people declare and what they admit explains why contextual reminders and simple cues still matter."}
            </p>
            <p className="cmm-text-caption font-semibold uppercase tracking-[0.16em] text-amber-700">
              {locale === "fr"
                ? `${GESTES_PROPRES_BAROMETER_2025.organization[locale]} · ${GESTES_PROPRES_BAROMETER_2025.fieldworkPeriod[locale]} · ${GESTES_PROPRES_BAROMETER_2025.sampleSize.toLocaleString("fr-FR")} personnes`
                : `${GESTES_PROPRES_BAROMETER_2025.organization[locale]} · ${GESTES_PROPRES_BAROMETER_2025.fieldworkPeriod[locale]} · ${GESTES_PROPRES_BAROMETER_2025.sampleSize.toLocaleString("en-GB")} people`}
            </p>
          </div>

          <CmmButton
            href={getPdfHref()}
            tone="secondary"
            variant="pill"
            className="min-h-11 px-4 py-2.5 cmm-text-caption font-black uppercase tracking-[0.16em]"
            title={locale === "fr" ? "Ouvrir le PDF du baromètre" : "Open the barometer PDF"}
          >
            {locale === "fr" ? "Consulter le baromètre complet" : "Consult the full barometer"}
            <FileText className="h-4 w-4" aria-hidden="true" />
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </CmmButton>
        </div>
      </div>
    </section>
  );
}
