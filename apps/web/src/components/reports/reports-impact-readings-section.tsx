"use client";

import { useMemo } from "react";
import { ArrowRight, CalendarDays, Eye, FileText, Map, ShieldCheck, Sparkles } from "lucide-react";
import { useReportsWebDocumentModel } from "@/components/reports/web-document/use-reports-web-document-model";
import { CmmGrid, CmmGridItem } from "@/components/ui/cmm-grid";
import type { ActionDataContract } from "@/lib/actions/data-contract";
import type { CommunityEventItem } from "@/lib/community/http";
import type { ReportModel } from "@/components/reports/web-document/types";
import { toFrInt, toFrNumber } from "@/components/reports/web-document/analytics";
import { SectionHeader } from "@/components/ui/page-structure";

type ReportsWeather = {
  current?: {
    temperature_2m?: number;
    precipitation?: number;
    wind_speed_10m?: number;
  };
} | null;

type ReportsImpactReadingsSectionProps = {
  contracts: ActionDataContract[];
  communityEvents: CommunityEventItem[];
  weather: ReportsWeather;
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
        { label: "Couverture géographique", value: `${toFrNumber(report.map.geoCoverage)}%`, icon: Map },
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
      title: "Impact environnemental",
      accentClass: "bg-cyan-500",
      items: [
        { label: "Émissions de CO2 évitées", value: `${toFrNumber(report.climate.co2AvoidedKg)} kg`, icon: Sparkles },
        { label: "Pollution de l’air évitée", value: `${toFrNumber(report.quality.coherenceScore)}%`, icon: Eye },
        { label: "Pollution de l’eau évitée", value: `${toFrInt(report.climate.waterProtectedLiters)} L`, icon: Sparkles },
        { label: "Pollution des sols évitée", value: `${toFrNumber(report.recycling.triIndex)}%`, icon: ShieldCheck },
        { label: "Ressources économisées", value: `${toFrNumber(report.totals.hours)} h`, icon: CalendarDays },
      ],
    },
    {
      id: "data-carto",
      title: "Données & cartographie",
      accentClass: "bg-blue-500",
      items: [
        { label: "Zones couvertes", value: `${report.areas.length}`, icon: Map },
        { label: "Précision des données", value: `${toFrNumber(report.quality.completenessScore)}%`, icon: FileText },
        { label: "Sources de données", value: `${sourceCount}`, icon: Sparkles },
        { label: "Résolution spatiale", value: `${toFrNumber(report.map.traceCoverage)}%`, icon: Eye },
        { label: "Actualité des données", value: `${toFrNumber(report.quality.freshnessDays)} j`, icon: CalendarDays },
      ],
    },
    {
      id: "transparence",
      title: "Transparence & méthodes",
      accentClass: "bg-red-500",
      items: [
        { label: "Méthodologie validée", value: report.impactMethodology.proxyVersion ?? "OK", icon: ShieldCheck },
        { label: "Traçabilité des données", value: `${toFrNumber(report.map.geoCoverage)}%`, icon: FileText },
        { label: "Conformité & normes", value: `${toFrNumber(report.quality.coherenceScore)}%`, icon: ShieldCheck },
        { label: "Incertitudes", value: `${toFrNumber(100 - report.quality.completenessScore)}%`, icon: Eye },
        { label: "Reproductibilité", value: report.impactMethodology.qualityRulesVersion ?? "Stable", icon: ArrowRight },
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
  contracts,
  communityEvents,
  weather,
}: ReportsImpactReadingsSectionProps) {
  const model = useReportsWebDocumentModel({
    initialContracts: contracts,
    initialCommunityEvents: communityEvents,
    initialWeather: weather,
  });

  const report = model.report;

  const snapshotGroups = useMemo(() => buildSnapshotGroups(report), [report]);

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
