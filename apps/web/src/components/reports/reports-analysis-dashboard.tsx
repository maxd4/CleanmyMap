import {
  Activity,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  CircleHelp,
  Download,
  Droplets,
  FileText,
  Leaf,
  MapPin,
  Recycle,
  Users,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { KpiMethodBlock } from "@/components/pilotage/kpi-method-block";
import { AnalyticsCockpit } from "@/components/reports/analytics-cockpit";
import { formatScorePercent } from "@/lib/formatters/score";
import type { MethodDefinition } from "@/lib/pilotage/overview.types";
import type { MonthlyAnalyticsPoint } from "@/lib/pilotage/analytics-data-utils";
import type { ReportsSummaryKpi } from "@/lib/reports/page-data";
import { toFrInt, toFrNumber } from "@/lib/reports/report-model";
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
};

type ImpactMetric = {
  label: string;
  value: string;
  unit: string;
  tone: string;
  icon: typeof Leaf;
};

type QualityMetric = {
  label: string;
  value: number;
  tone: "emerald" | "sky";
};

function impactMetrics(report: ReportModel): ImpactMetric[] {
  return [
    {
      label: "Émissions évitées (proxy)",
      value: toFrNumber(report.climate.co2AvoidedKg),
      unit: "kg CO₂e",
      tone: "emerald",
      icon: Leaf,
    },
    {
      label: "Eau préservée (proxy)",
      value: toFrInt(report.climate.waterProtectedLiters),
      unit: "L",
      tone: "sky",
      icon: Droplets,
    },
    {
      label: "Masse recyclable estimée",
      value: toFrNumber(report.recycling.recyclableKg),
      unit: "kg",
      tone: "violet",
      icon: Recycle,
    },
    {
      label: "Indice de tri (proxy)",
      value: formatScorePercent(report.recycling.triIndex, 1).replace(" %", ""),
      unit: "%",
      tone: "amber",
      icon: Activity,
    },
  ];
}

function qualityMetrics(report: ReportModel): QualityMetric[] {
  return [
    { label: "Complétude des données", value: report.quality.completenessScore, tone: "emerald" },
    { label: "Cohérence des données", value: report.quality.coherenceScore, tone: "emerald" },
    { label: "Couverture géolocalisée", value: report.map.geoCoverage, tone: "sky" },
    { label: "Couverture des traces", value: report.map.traceCoverage, tone: "sky" },
  ];
}

function formatGeneratedAt(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "indisponible";
  return date.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function QualityRing({ metric }: { metric: QualityMetric }) {
  const safeValue = Math.min(Math.max(metric.value, 0), 100);
  const radius = 28;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (safeValue / 100) * circumference;
  const stroke = metric.tone === "emerald" ? "#10b981" : "#2499e9";

  return (
    <article className="rounded-2xl border border-slate-200/80 bg-white px-3 py-4 text-center shadow-[0_8px_20px_-18px_rgba(15,23,42,0.25)]">
      <h3 className="min-h-10 text-xs font-semibold leading-5 text-slate-700">{metric.label}</h3>
      <div className="relative mx-auto mt-2 h-[76px] w-[76px]" aria-label={`${metric.label}: ${formatScorePercent(metric.value, 1)}`} role="img">
        <svg viewBox="0 0 76 76" className="h-full w-full -rotate-90" aria-hidden="true">
          <circle cx="38" cy="38" r={radius} fill="none" stroke="#e8eef3" strokeWidth="6" />
          <circle
            cx="38"
            cy="38"
            r={radius}
            fill="none"
            stroke={stroke}
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
          />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-sm font-black tabular-nums text-slate-900">
          {formatScorePercent(metric.value, 1)}
        </span>
      </div>
      <p className="mt-2 text-xs font-semibold text-emerald-600">Score affiché en %</p>
    </article>
  );
}

function ImpactMetricCard({ metric }: { metric: ImpactMetric }) {
  const Icon = metric.icon;
  const iconClasses = {
    emerald: "bg-emerald-50 text-emerald-600",
    sky: "bg-sky-50 text-sky-600",
    violet: "bg-violet-50 text-violet-600",
    amber: "bg-amber-50 text-amber-600",
  }[metric.tone];

  return (
    <article className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[0_8px_20px_-18px_rgba(15,23,42,0.25)]">
      <div className="flex items-start gap-3">
        <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${iconClasses}`}>
          <Icon size={23} strokeWidth={2} aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className="text-xs font-semibold leading-5 text-slate-700">{metric.label}</p>
          <p className="mt-2 text-xl font-black tracking-tight text-slate-950">
            {metric.value} <span className="text-sm font-bold text-slate-700">{metric.unit}</span>
          </p>
        </div>
        <CircleHelp className="ml-auto shrink-0 text-slate-400" size={15} aria-hidden="true" />
      </div>
      <p className="mt-4 text-xs text-slate-500">Période sélectionnée • valeur calculée selon la méthode active</p>
    </article>
  );
}

function ComparisonTable({ kpis }: { kpis: readonly ReportsSummaryKpi[] }) {
  return (
    <section className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[0_8px_20px_-18px_rgba(15,23,42,0.25)]" aria-labelledby="reports-comparison-title">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 id="reports-comparison-title" className="text-sm font-black text-slate-900">Comparaison de périodes</h3>
          <p className="mt-1 text-xs text-slate-500">Comparaison fournie par l&apos;overview de pilotage.</p>
        </div>
        <span className="rounded-lg border border-slate-200 px-2 py-1 text-[11px] font-semibold text-slate-600">Période précédente</span>
      </div>

      {kpis.length > 0 ? (
        <div className="mt-5 divide-y divide-slate-100">
          {kpis.map((kpi) => (
            <div key={kpi.label} className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 py-3 first:pt-0 last:pb-0">
              <p className="min-w-0 text-xs font-semibold text-slate-700">{kpi.label}</p>
              <div className="text-right">
                <p className="text-xs text-slate-500">{kpi.previousValue} → <span className="font-bold text-slate-900">{kpi.value}</span></p>
                <p className="mt-1 text-xs font-black text-emerald-600">{kpi.deltaPercent || kpi.deltaAbsolute || "Variation indisponible"}</p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-5 rounded-xl border border-dashed border-slate-200 px-3 py-4 text-xs text-slate-500">Aucune comparaison disponible pour cette vue.</p>
      )}
    </section>
  );
}

export function ReportsAnalysisDashboard({
  locale,
  roleLabel,
  primaryAction,
  secondaryAction,
  summaryKpis,
  methods,
  report,
  periodDays,
  monthlyData,
}: ReportsAnalysisDashboardProps) {
  const metrics = impactMetrics(report);
  const quality = qualityMetrics(report);

  return (
    <div className="rounded-[2rem] border border-rose-100/80 bg-white/95 p-4 shadow-[0_26px_70px_-42px_rgba(190,24,93,0.35)] sm:p-6 lg:p-7">
      <PageHeader
        tone="red"
        eyebrow={`Profil ${roleLabel}`}
        title="Rapports d&apos;impact"
        subtitle="Analysez la qualité de vos données, suivez vos KPI et comparez vos résultats dans le temps."
        action={
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700">
              <CalendarDays size={15} className="text-slate-500" aria-hidden="true" />
              {periodDays} jours glissants
            </div>
            <a
              href="#exports"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-red-200 hover:bg-red-50 hover:text-red-700"
            >
              <Download size={15} aria-hidden="true" />
              Exporter un aperçu
            </a>
          </div>
        }
      />

      <div className="mt-7 space-y-4">
        <section className="rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5" aria-labelledby="reports-impact-overview-title">
          <div className="flex flex-wrap items-center gap-2">
            <h2 id="reports-impact-overview-title" className="text-lg font-black text-red-700">Aperçu global</h2>
            <span className="text-sm font-semibold text-slate-500">(période sélectionnée)</span>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {metrics.map((metric) => <ImpactMetricCard key={metric.label} metric={metric} />)}
          </div>
        </section>

        <div className="grid gap-4 lg:grid-cols-[1.06fr_0.94fr]">
          <section className="rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5" aria-labelledby="reports-quality-title">
            <div className="flex items-center gap-2">
              <h2 id="reports-quality-title" className="text-lg font-black text-red-700">Qualité des données &amp; cartographie</h2>
              <CircleHelp size={15} className="text-slate-400" aria-hidden="true" />
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4">
              {quality.map((metric) => <QualityRing key={metric.label} metric={metric} />)}
            </div>
            <div className="mt-4 flex flex-col gap-3 border-t border-slate-100 pt-4 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
              <span className="inline-flex items-center gap-2"><MapPin size={14} aria-hidden="true" /> Périmètre : Global • {periodDays} jours glissants</span>
              <span className="inline-flex items-center gap-2"><CheckCircle2 size={14} className="text-emerald-600" aria-hidden="true" /> Généré le {formatGeneratedAt(report.generatedAt)}</span>
            </div>
          </section>

          <section id="method" className="rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5" aria-labelledby="reports-method-title">
            <h2 id="reports-method-title" className="text-lg font-black text-red-700">Méthodologie &amp; calcul des KPI</h2>
            <div className="mt-4">
              <KpiMethodBlock methods={methods} title="Référentiel KPI" />
            </div>
          </section>
        </div>

        <p className="flex items-center justify-center gap-2 px-4 text-center text-xs text-slate-500">
          <FileText size={14} aria-hidden="true" /> Détails des formules, sources et limites disponibles dans le référentiel ci-dessus.
        </p>

        <section id="comparisons" className="rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5" aria-labelledby="reports-trends-title">
          <div className="flex items-center gap-2">
            <h2 id="reports-trends-title" className="text-lg font-black text-red-700">Tendances &amp; comparaisons</h2>
            <Activity size={15} className="text-slate-400" aria-hidden="true" />
          </div>
          <div className="mt-4 grid gap-4 lg:grid-cols-[1.35fr_0.9fr]">
            <div className="min-w-0 rounded-2xl border border-slate-200/80 bg-white p-3 sm:p-4">
              <div className="flex items-center gap-2 px-1">
                <h3 className="text-sm font-black text-slate-900">Évolution de la collecte</h3>
                <span className="text-xs text-slate-500">(12 derniers mois disponibles)</span>
              </div>
              <div className="mt-2"><AnalyticsCockpit data={monthlyData} /></div>
            </div>
            <ComparisonTable kpis={summaryKpis} />
          </div>
        </section>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-slate-100 pt-5">
        <a href={primaryAction.href} className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-bold text-white shadow-[0_12px_24px_-14px_rgba(220,38,38,0.6)] transition hover:bg-red-700">
          <Users size={16} aria-hidden="true" /> {primaryAction.label[locale]}
        </a>
        {secondaryAction ? (
          <a href={secondaryAction.href} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:border-red-200 hover:bg-red-50 hover:text-red-700">
            {secondaryAction.label[locale]} <ChevronRight size={16} aria-hidden="true" />
          </a>
        ) : null}
      </div>
    </div>
  );
}
