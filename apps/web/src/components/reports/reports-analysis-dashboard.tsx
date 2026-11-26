import { CalendarDays, Download, Leaf, Droplets, Recycle, Activity } from "lucide-react";
import { CmmCard } from "@/components/ui/cmm-card";
import { CmmButton } from "@/components/ui/cmm-button";
import { KpiMethodBlock } from "@/components/pilotage/kpi-method-block";
import { AnalyticsCockpit } from "@/components/reports/analytics-cockpit";
import { ReportsCommunityConversionKpis } from "@/components/reports/reports-community-conversion-kpis";
import { formatScorePercent } from "@/lib/formatters/score";
import { buildReportDataAvailabilityNotices, describeReportMeasurementCoverage, formatCoveredReportValue, type ReportDataAvailability } from "@/lib/reports/data-availability";
import type { MethodDefinition } from "@/lib/pilotage/overview.types";
import type { MonthlyAnalyticsPoint } from "@/lib/pilotage/analytics-data-utils";
import type { ReportsSummaryKpi } from "@/lib/reports/page-data";
import { toFrInt, toFrNumber } from "@/lib/reports/report-model/formatters";
import type { ReportModel } from "@/lib/reports/report-model/types";
import type { Locale } from "@/lib/ui/preferences";
import type { ProfileAction } from "@/lib/profiles";

type ReportsAnalysisDashboardProps = {
  locale: Locale;
  roleLabel: string;
  primaryAction: ProfileAction;
  secondaryAction?: ProfileAction | null;
  summaryKpis: readonly ReportsSummaryKpi[];
  methods: MethodDefinition[];
  report: ReportModel;
  periodDays: number;
  monthlyData: MonthlyAnalyticsPoint[];
  availability?: ReportDataAvailability;
};

function buildImpactMetrics(report: ReportModel) {
  const { totals, climate, recycling } = report;
  const count = totals.actions;
  const waste = totals.knownWasteActions;
  const butts = totals.buttsKnownActions;
  const wasteCoverage = describeReportMeasurementCoverage(waste, count);
  const buttsCoverage = describeReportMeasurementCoverage(butts, count);
  const triKnown = count > 0 && waste === count && butts === count && totals.kg > 0;
  return [
    { label: "Émissions évitées (proxy)", value: formatCoveredReportValue(toFrNumber(climate.co2AvoidedKg) + " kg CO₂e", waste, count), coverage: wasteCoverage, icon: Leaf, tone: "text-emerald-700" },
    { label: "Eau potentiellement préservée (proxy)", value: formatCoveredReportValue(toFrInt(climate.waterProtectedLiters) + " L", butts, count), coverage: buttsCoverage, icon: Droplets, tone: "text-sky-700" },
    { label: "Masse recyclable estimée", value: formatCoveredReportValue(toFrNumber(recycling.recyclableKg) + " kg", waste, count), coverage: wasteCoverage, icon: Recycle, tone: "text-violet-700" },
    { label: "Indice de tri (proxy)", value: triKnown ? formatScorePercent(recycling.triIndex, 1) : "Non comparable", coverage: triKnown ? "Masse et mégots renseignés sur toutes les actions" : "Exige une masse positive et les deux mesures sur le même corpus", icon: Activity, tone: "text-amber-700" },
  ];
}

function ImpactMetrics({ report }: { report: ReportModel }) {
  return (
    <section aria-labelledby="reports-impact-overview-title" className="space-y-3">
      <div><h3 id="reports-impact-overview-title" className="text-lg font-bold cmm-text-primary">Équivalences environnementales</h3><p className="cmm-text-small cmm-text-secondary">Proxys calculés sur les données renseignées, pas des mesures d’effets réellement évités.</p></div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {buildImpactMetrics(report).map(({ label, value, coverage, icon: Icon, tone }) => (
          <CmmCard key={label} tone="slate" size="sm" className="min-w-0 space-y-2">
            <div className="flex items-start gap-2"><Icon size={20} className={`shrink-0 ${tone}`} aria-hidden="true" /><h4 className="cmm-text-small font-semibold cmm-text-primary">{label}</h4></div>
            <p className="text-xl font-bold tabular-nums cmm-text-primary">{value}</p>
            <p className="cmm-text-small cmm-text-secondary">{coverage}</p>
          </CmmCard>
        ))}
      </div>
    </section>
  );
}

function QualityMetrics({ report }: { report: ReportModel }) {
  const { totals, quality, map, terrain } = report;
  const mapCount = terrain.actionCount + terrain.spotCount + terrain.cleanPlaceCount;
  const metrics = [
    { label: "Complétude des données", value: quality.completenessScore, denominator: totals.actions },
    { label: "Cohérence des données", value: quality.coherenceScore, denominator: totals.actions },
    { label: "Couverture géolocalisée", value: map.geoCoverage, denominator: mapCount },
    { label: "Couverture des traces", value: map.traceCoverage, denominator: mapCount },
  ];
  return (
    <CmmCard as="section" tone="slate" className="space-y-4">
      <div><h3 className="text-lg font-bold cmm-text-primary">Qualité des données et cartographie</h3><p className="cmm-text-small cmm-text-secondary">Qualité des enregistrements, distincte de l’impact environnemental. Les ratios sans dénominateur sont indisponibles.</p></div>
      <dl className="grid gap-x-8 gap-y-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map(({ label, value, denominator }) => (
          <div key={label} className="min-w-0 space-y-2">
            <dt className="font-semibold cmm-text-small cmm-text-primary">{label}</dt>
            <dd className="font-bold tabular-nums cmm-text-primary">{denominator > 0 && Number.isFinite(value) ? formatScorePercent(value, 1) : "Non disponible"}</dd>
            {denominator > 0 && Number.isFinite(value) ? <progress aria-label={label} value={Math.max(0, Math.min(100, value))} max={100} className="h-2 w-full accent-rose-700" /> : null}
          </div>
        ))}
      </dl>
      <p className="cmm-text-caption cmm-text-secondary">Modèle calculé le {report.generatedAt || "date non disponible"}</p>
    </CmmCard>
  );
}

function ComparisonTable({ kpis, periodDays }: { kpis: readonly ReportsSummaryKpi[]; periodDays: number }) {
  return (
    <CmmCard as="section" tone="slate" className="min-w-0 space-y-3">
      <h4 className="font-bold cmm-text-primary">Comparaison de périodes</h4>
      <p className="cmm-text-small cmm-text-secondary">{periodDays} jours glissants et {periodDays} jours précédents, selon le référentiel de pilotage.</p>
      {kpis.length ? <dl className="divide-y divide-slate-200">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="space-y-1 py-3">
            <dt className="font-semibold cmm-text-primary">{kpi.label}</dt>
            <dd className="cmm-text-small cmm-text-secondary">{kpi.previousValue} → <strong className="cmm-text-primary">{kpi.value}</strong></dd>
            <dd className={`cmm-text-small font-semibold ${kpi.interpretation === "positive" ? "text-emerald-800" : kpi.interpretation === "negative" ? "text-rose-800" : "cmm-text-secondary"}`}>{kpi.deltaPercent || kpi.deltaAbsolute || "Variation indisponible"}</dd>
          </div>
        ))}
      </dl> : <p className="cmm-text-body cmm-text-primary">Aucune comparaison disponible pour cette vue.</p>}
    </CmmCard>
  );
}

export function ReportsAnalysisDashboard({ locale, roleLabel, primaryAction, secondaryAction, summaryKpis, methods, report, periodDays, monthlyData, availability }: ReportsAnalysisDashboardProps) {
  const notices = buildReportDataAvailabilityNotices(availability);
  const { totals } = report;
  const activity = [
    { label: "Actions approuvées", value: toFrInt(totals.actions), detail: "Périmètre global · corpus chargé" },
    { label: "Masse de déchets", value: formatCoveredReportValue(toFrNumber(totals.kg) + " kg", totals.knownWasteActions, totals.actions), detail: describeReportMeasurementCoverage(totals.knownWasteActions, totals.actions) },
    { label: "Mégots", value: formatCoveredReportValue(toFrInt(totals.butts), totals.buttsKnownActions, totals.actions), detail: describeReportMeasurementCoverage(totals.buttsKnownActions, totals.actions) },
    { label: "Participations", value: formatCoveredReportValue(toFrInt(totals.volunteers), totals.volunteersKnownActions, totals.actions), detail: describeReportMeasurementCoverage(totals.volunteersKnownActions, totals.actions) + " · pas des personnes uniques" },
  ];
  return (
    <section className="space-y-6" aria-labelledby="reports-analysis-title">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2"><h2 id="reports-analysis-title" className="text-xl font-bold cmm-text-primary">Analyse des résultats</h2><p className="cmm-text-body cmm-text-secondary">Activité, tendances, qualité et limites du corpus approuvé.</p><p className="flex flex-wrap items-center gap-2 cmm-text-small cmm-text-secondary"><CalendarDays size={16} aria-hidden="true" /> Global · {periodDays} jours glissants · {roleLabel}</p></div>
        <CmmButton href="#exports" tone="secondary"><Download size={16} aria-hidden="true" /> Accéder aux exports</CmmButton>
      </header>
      {notices.length ? <div role="status" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">{notices.map((notice) => <p key={notice}>{notice}</p>)}</div> : null}
      {totals.actions === 0 ? <p role="status" className="rounded-xl border border-slate-200 p-4 cmm-text-body cmm-text-primary">Aucune action approuvée dans le corpus chargé sur cette période. Aucun résultat physique ne peut en être déduit.</p> : null}
      <section aria-label="Activité de terrain" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {activity.map(({ label, value, detail }) => <CmmCard key={label} tone="family" size="sm" className="min-w-0 space-y-2"><h3 className="font-semibold cmm-text-small cmm-text-primary">{label}</h3><p className="text-2xl font-bold tabular-nums cmm-text-primary">{value}</p><p className="cmm-text-small cmm-text-secondary">{detail}</p></CmmCard>)}
      </section>
      <section id="comparisons" aria-labelledby="reports-trends-title" className="space-y-3">
        <h3 id="reports-trends-title" className="text-lg font-bold cmm-text-primary">Tendances et comparaisons</h3>
        <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
          <CmmCard tone="slate" className="min-w-0 space-y-3"><h4 className="font-bold cmm-text-primary">Évolution de la collecte</h4><p className="cmm-text-small cmm-text-secondary">Mois disponibles dans les 12 derniers mois glissants. Les périodes du graphique et du bilan ne sont pas identiques.</p><AnalyticsCockpit data={monthlyData} /></CmmCard>
          <ComparisonTable kpis={summaryKpis} periodDays={periodDays} />
        </div>
      </section>
      <ImpactMetrics report={report} />
      <QualityMetrics report={report} />
      {availability?.communityEventsAvailability === "unavailable" || availability?.communityEventsAvailability === "partial"
        ? <CmmCard tone="slate" as="section"><h3 className="font-bold cmm-text-primary">Engagement des événements communautaires</h3><p className="cmm-text-body cmm-text-primary">Indicateurs indisponibles : la source ou l’attribution des événements est incomplète.</p></CmmCard>
        : <ReportsCommunityConversionKpis summary={report.community.conversion} />}
      <CmmCard as="section" tone="slate" className="space-y-3">
        <h3 className="text-lg font-bold cmm-text-primary">Méthodes, sources et limites</h3>
        <details id="method"><summary className="cursor-pointer font-semibold cmm-text-primary">Consulter le référentiel KPI</summary><div className="mt-4"><KpiMethodBlock methods={methods} title="Référentiel KPI" /></div></details>
        <CmmButton href="/methodologie" tone="tertiary">Lire la méthodologie scientifique</CmmButton>
      </CmmCard>
      <div className="flex flex-wrap gap-2"><CmmButton href={primaryAction.href} tone="primary">{primaryAction.label[locale]}</CmmButton>{secondaryAction ? <CmmButton href={secondaryAction.href} tone="secondary">{secondaryAction.label[locale]}</CmmButton> : null}</div>
    </section>
  );
}
