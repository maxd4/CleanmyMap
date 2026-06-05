"use client";

import { useMemo } from "react";
import { ArrowRight, CalendarDays, ChevronRight, Eye, FileText, Map, ShieldCheck, Sparkles } from "lucide-react";
import { TerritoryMapComparisonCards } from "@/components/maps/territory-map-comparison-cards";
import { useReportsWebDocumentModel } from "@/components/reports/web-document/use-reports-web-document-model";
import type { ActionDataContract } from "@/lib/actions/data-contract";
import type { CommunityEventItem } from "@/lib/community/http";
import type { PilotageOverview } from "@/lib/pilotage/overview";
import type { ReportModel } from "@/components/reports/web-document/types";
import type { ReportScopeKind } from "@/lib/reports/scope";
import { toFrInt, toFrNumber } from "@/components/reports/web-document/analytics";

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
  overview: PilotageOverview | null;
  scopeKind?: ReportScopeKind;
  scopeValue?: string;
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

type HistoryCard = {
  tag: string;
  title: string;
  subtitle: string;
  toneClass: string;
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

function buildHistoryCards(report: ReportModel, overview: PilotageOverview | null, activeScopeLabel: string): HistoryCard[] {
  const comparison30 = overview?.comparisonsByWindow["30"];
  const comparison90 = overview?.comparisonsByWindow["90"];
  const comparison365 = overview?.comparisonsByWindow["365"];
  const topArea = report.areas[0];

  return [
    {
      tag: "Standard",
      title: `Rapport standard — ${activeScopeLabel}`,
      subtitle: `${report.generatedAt} · ${toFrNumber(report.totals.actions)} actions`,
      toneClass: "text-emerald-600",
    },
    {
      tag: "Institutionnel",
      title: "Rapport institutionnel — 90 jours",
      subtitle: `${comparison90?.current.reliability.reason ?? "Lecture consolidée"} · ${toFrNumber(report.map.geoCoverage)}% géolocalisation`,
      toneClass: "text-red-600",
    },
    {
      tag: "Technique",
      title: "Rapport technique — 12 mois",
      subtitle: `${comparison365?.current.reliability.level ?? "lecture"} · ${toFrNumber(report.quality.completenessScore)}% de complétude`,
      toneClass: "text-cyan-600",
    },
    {
      tag: "Standard",
      title: "Rapport standard — fenêtre 30j",
      subtitle: `${comparison30?.current.reliability.reason ?? "Vue de pilotage"} · ${toFrNumber(report.climate.co2AvoidedKg)} kg CO2e`,
      toneClass: "text-emerald-600",
    },
    {
      tag: "Cartographie",
      title: `Rapport standard — ${topArea ? topArea.area : "zone prioritaire"}`,
      subtitle: `${toFrInt(topArea?.actions ?? 0)} actions · ${toFrNumber(topArea?.score ?? 0)} score`,
      toneClass: "text-red-600",
    },
    {
      tag: "Communauté",
      title: "Rapport standard — mobilisation",
      subtitle: `${toFrInt(report.totals.volunteers)} bénévoles · ${toFrNumber(report.community.participationRate)}% participation`,
      toneClass: "text-cyan-600",
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
      <div className="space-y-2.5">
        {group.items.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.label}
              className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200/80 bg-slate-50/70 px-3 py-2.5 shadow-none"
            >
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white text-slate-500 shadow-sm">
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

function HistoryCardView({ card }: { card: HistoryCard }) {
  return (
    <article className="group rounded-[1.35rem] border border-slate-200 bg-white px-4 py-3.5 shadow-sm transition hover:border-slate-300 hover:shadow-md">
      <div className={`text-[10px] font-black uppercase tracking-[0.18em] ${card.toneClass}`}>{card.tag}</div>
      <h3 className="mt-1 text-[15px] font-semibold leading-snug text-slate-950">{card.title}</h3>
      <p className="mt-1 text-[13px] leading-5 text-slate-500">{card.subtitle}</p>
      <div className="mt-2 flex justify-end text-slate-400 transition group-hover:text-slate-700">
        <ChevronRight size={16} />
      </div>
    </article>
  );
}

function HistoryRow({ left, right }: { left: HistoryCard; right: HistoryCard }) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_2.5rem_minmax(0,1fr)] items-center gap-2">
      <div className="pr-1.5 md:pr-6">
        <HistoryCardView card={left} />
      </div>
      <div className="relative flex h-full items-center justify-center">
        <span className="absolute inset-y-0 w-px bg-slate-200" />
        <span className="relative z-10 h-3.5 w-3.5 rounded-full border-2 border-sky-500 bg-white shadow-sm" />
      </div>
      <div className="pl-1.5 md:pl-6">
        <HistoryCardView card={right} />
      </div>
    </div>
  );
}

export function ReportsImpactReadingsSection({
  contracts,
  communityEvents,
  weather,
  overview,
}: ReportsImpactReadingsSectionProps) {
  const model = useReportsWebDocumentModel({
    initialContracts: contracts,
    initialCommunityEvents: communityEvents,
    initialWeather: weather,
  });

  const report = model.report;
  const activeScopeLabel = model.activeScopeLabel;

  const snapshotGroups = useMemo(() => buildSnapshotGroups(report), [report]);
  const historyCards = useMemo(() => buildHistoryCards(report, overview, activeScopeLabel), [activeScopeLabel, overview, report]);
  const historyRows = useMemo(
    () =>
      historyCards.reduce<Array<{ left: HistoryCard; right: HistoryCard }>>((rows, _, index) => {
        if (index % 2 !== 0) {
          return rows;
        }
        const left = historyCards[index];
        const right = historyCards[index + 1];
        if (!left || !right) {
          return rows;
        }
        rows.push({ left, right });
        return rows;
      }, []),
    [historyCards],
  );

  return (
    <div className="space-y-6">
      <TerritoryMapComparisonCards
        title="Deux lectures de sortie de l'impact"
        subtitle="Choisissez la vue qui correspond le mieux à vos besoins."
        locationLabel={activeScopeLabel}
        tone="sky"
        note="La carte de base est idéale pour la vérification et l'analyse. La version Terraink est conçue pour vos présentations et communications."
      />

      <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-[0_10px_24px_-18px_rgba(15,23,42,0.22)] sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-red-600 text-white shadow-[0_18px_36px_-22px_rgba(220,38,38,0.45)]">
                <Sparkles size={20} />
              </div>
              <div>
                <h2 className="text-2xl font-black tracking-tight text-slate-950">
                  Snapshot de l&apos;impact (aperçu)
                </h2>
                <p className="mt-1 text-sm text-slate-500">Résumé des indicateurs inclus dans ce rapport.</p>
              </div>
            </div>
          </div>

          <a href="#kpi-summary" className="inline-flex items-center gap-2 text-sm font-semibold text-sky-700 transition hover:text-sky-800">
            Voir le détail de tous les indicateurs
            <ArrowRight size={16} />
          </a>
        </div>

        <div className="mt-6 grid gap-4 xl:grid-cols-4">
          {snapshotGroups.map((group) => (
            <SnapshotGroupCard key={group.id} group={group} />
          ))}
        </div>
      </section>

      <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-[0_10px_24px_-18px_rgba(15,23,42,0.22)] sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-red-200 bg-red-50 text-red-600">
                <CalendarDays size={20} />
              </div>
              <div>
                <h2 className="text-2xl font-black tracking-tight text-slate-950">
                  Historique d&apos;impact
                </h2>
                <p className="mt-1 text-sm text-slate-500">Vos rapports précédemment générés.</p>
              </div>
            </div>
          </div>
        </div>

        <div className="relative mt-8 space-y-7">
          {historyRows.map((row) => (
            <HistoryRow key={`${row.left.title}-${row.right.title}`} left={row.left} right={row.right} />
          ))}
        </div>
      </section>
    </div>
  );
}
