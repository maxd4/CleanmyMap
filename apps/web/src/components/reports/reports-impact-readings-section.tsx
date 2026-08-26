import { ArrowRight, CalendarDays, Eye, FileText, Map, ShieldCheck, Sparkles } from "lucide-react";
import { CmmGrid, CmmGridItem } from "@/components/ui/cmm-grid";
import { formatScorePercent } from "@/lib/formatters/score";
import type { ReportModel } from "@/lib/reports/report-model/types";
import { toFrInt, toFrNumber } from "@/lib/reports/report-model";
import { SectionHeader } from "@/components/ui/page-structure";

type ReportsImpactReadingsSectionProps = {
  report: ReportModel;
};

type SnapshotItem = {
  label: string;
  value: string;
  icon: typeof FileText;
};

type SnapshotGroup = {
  id: string;
  title: string;
  accentClass: string;
  items: SnapshotItem[];
};

function buildSnapshotGroups(report: ReportModel): SnapshotGroup[] {
  const sourceCount = Object.keys(report.impactMethodology.sources ?? {}).length;
  const bucketCount = Object.values(report.community.sourceBuckets).filter((value) => value > 0).length;

  return [
    {
      id: "collecte-terrain",
      title: "Collecte terrain",
      accentClass: "bg-red-500",
      items: [
        { label: "Volumes collectés", value: `${toFrNumber(report.totals.kg)} kg`, icon: FileText },
        {
          label: "Couverture géolocalisée",
          value: formatScorePercent(report.map.geoCoverage, 1),
          icon: Map,
        },
        { label: "Fréquence", value: `${toFrInt(report.totals.actions)} actions`, icon: CalendarDays },
        { label: "Types de flux", value: `${bucketCount}`, icon: Sparkles },
        {
          label: "Ratio collecte",
          value: `${toFrNumber(report.totals.kg / Math.max(report.totals.actions, 1), 2)} kg/action`,
          icon: ArrowRight,
        },
      ],
    },
    {
      id: "impact-env",
      title: "Impacts et estimations",
      accentClass: "bg-cyan-500",
      items: [
        {
          label: "Émissions évitées (proxy)",
          value: `${toFrNumber(report.climate.co2AvoidedKg)} kg CO₂e`,
          icon: Sparkles,
        },
        {
          label: "Eau préservée (proxy)",
          value: `${toFrInt(report.climate.waterProtectedLiters)} L`,
          icon: Sparkles,
        },
        {
          label: "Masse recyclable estimée",
          value: `${toFrNumber(report.recycling.recyclableKg)} kg`,
          icon: ShieldCheck,
        },
        { label: "Charge bénévole", value: `${toFrNumber(report.totals.hours)} h`, icon: CalendarDays },
        {
          label: "Économie de voirie (proxy)",
          value:
            report.climate.streetCleaningSavingsEuros == null
              ? "Indisponible"
              : `${toFrNumber(report.climate.streetCleaningSavingsEuros)} €`,
          icon: ArrowRight,
        },
      ],
    },
    {
      id: "tri-qualite",
      title: "Tri et qualité des données",
      accentClass: "bg-blue-500",
      items: [
        {
          label: "Indice de tri (proxy)",
          value: formatScorePercent(report.recycling.triIndex, 1),
          icon: ShieldCheck,
        },
        { label: "Zones couvertes", value: `${report.areas.length}`, icon: Map },
        {
          label: "Complétude des données",
          value: formatScorePercent(report.quality.completenessScore, 1),
          icon: FileText,
        },
        {
          label: "Cohérence des données",
          value: formatScorePercent(report.quality.coherenceScore, 1),
          icon: FileText,
        },
        { label: "Sources de méthode", value: `${sourceCount}`, icon: Sparkles },
        {
          label: "Couverture des traces",
          value: formatScorePercent(report.map.traceCoverage, 1),
          icon: Eye,
        },
        { label: "Ancienneté des données", value: `${toFrNumber(report.quality.freshnessDays)} j`, icon: CalendarDays },
      ],
    },
    {
      id: "transparence",
      title: "Transparence & méthodes",
      accentClass: "bg-red-500",
      items: [
        {
          label: "Version du proxy",
          value: report.impactMethodology.proxyVersion ?? "Indisponible",
          icon: ShieldCheck,
        },
        {
          label: "Version des règles qualité",
          value: report.impactMethodology.qualityRulesVersion ?? "Indisponible",
          icon: ArrowRight,
        },
      ],
    },
  ];
}

function SnapshotGroupCard({ group }: { group: SnapshotGroup }) {
  return (
    <article className="space-y-3">
      <div className="flex items-center gap-2">
        <span className={`h-1.5 w-10 rounded-full ${group.accentClass}`} />
        <p className="text-[13px] font-semibold text-slate-900">{group.title}</p>
      </div>
      <div className="divide-y divide-slate-200/70 rounded-2xl border border-slate-200/70 bg-slate-50/50 px-3">
        {group.items.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.label}
              className="flex items-center justify-between gap-3 py-3 first:pt-3 last:pb-3"
            >
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white text-slate-500 shadow-[0_6px_16px_-10px_rgba(15,23,42,0.35)]">
                  <Icon size={13} />
                </span>
                <p className="min-w-0 text-[13px] text-slate-500">{item.label}</p>
              </div>
              <span className="shrink-0 text-[13px] font-semibold text-slate-700">{item.value}</span>
            </div>
          );
        })}
      </div>
    </article>
  );
}

export function ReportsImpactReadingsSection({
  report,
}: ReportsImpactReadingsSectionProps) {
  const snapshotGroups = buildSnapshotGroups(report);

  return (
    <CmmGrid
      as="section"
      className="rounded-[2rem] border border-slate-200 bg-white py-5 shadow-[0_10px_24px_-18px_rgba(15,23,42,0.22)] sm:py-6"
      contentClassName="gap-4"
    >
      <CmmGridItem span={{ mobile: 4, tablet: 6, desktop: 12 }}>
        <SectionHeader
          eyebrow={
            <span className="inline-flex items-center gap-2">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-red-600 text-white shadow-[0_18px_36px_-22px_rgba(220,38,38,0.45)]">
                <Sparkles size={20} />
              </span>
              Snapshot de l&apos;impact
            </span>
          }
          title="Aperçu"
          subtitle="Résumé des indicateurs inclus dans ce rapport."
          action={
            <a
              href="#kpi-summary"
              className="inline-flex items-center gap-2 text-sm font-semibold text-sky-700 transition hover:text-sky-800"
            >
              Voir le détail de tous les indicateurs
              <ArrowRight size={16} />
            </a>
          }
          titleSize="md"
          className="gap-3"
          eyebrowClassName="text-stone-900"
          subtitleClassName="text-sm text-slate-500"
        />
      </CmmGridItem>

      <CmmGridItem span={{ mobile: 4, tablet: 6, desktop: 12 }}>
        <CmmGrid contentClassName="gap-4">
          {snapshotGroups.map((group) => (
            <CmmGridItem key={group.id} span={{ mobile: 4, tablet: 3, desktop: 3 }}>
              <SnapshotGroupCard group={group} />
            </CmmGridItem>
          ))}
        </CmmGrid>
      </CmmGridItem>
    </CmmGrid>
  );
}
