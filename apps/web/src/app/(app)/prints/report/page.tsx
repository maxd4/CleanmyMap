import type { Metadata } from "next";
import { AnalyticsCockpit } from "@/components/reports/analytics-cockpit";
import { TerritoryMapComparisonCards } from "@/components/maps/territory-map-comparison-cards";
import { CmmGrid, CmmGridItem } from "@/components/ui/cmm-grid";
import { CmmButton } from "@/components/ui/cmm-button";
import { ClerkRequiredGate } from "@/components/ui/clerk-required-gate";
import { PageHeader } from "@/components/ui/page-header";
import { getSafeAuthSession } from "@/lib/auth/safe-session";
import { loadReportsAnalysisData } from "@/lib/reports/page-data";
import { buildReportDataAvailabilityNotices, describeReportMeasurementCoverage, formatCoveredReportValue } from "@/lib/reports/data-availability";
import { toFrInt, toFrNumber } from "@/lib/reports/report-model/formatters";
import { formatScorePercent } from "@/lib/formatters/score";
import type { ReportModel } from "@/lib/reports/report-model/types";
import type { MonthlyAnalyticsPoint } from "@/lib/pilotage/analytics-data-utils";
import { resolvePageFamily } from "@/lib/ui/page-families";
import { BrandLogo } from "@/components/brand/brand-logo";
import { PrintActionButton } from "../brigade-verte/print-action-button";

export const metadata: Metadata = {
  title: "Rapport d'impact imprimable",
  description: "Synthèse documentaire imprimable réservée aux comptes connectés.",
  robots: { index: false, follow: false },
};

const PAPER_SECTION = "cmm-print-report__section min-w-0 space-y-3 border-b border-slate-200 pb-5 print:pb-3";

function ReportTotals({ report }: { report: ReportModel }) {
  const { totals, quality } = report;
  const cards = [
    { label: "Actions approuvées", value: toFrInt(totals.actions), coverage: "Corpus chargé" },
    { label: "Masse récoltée", value: formatCoveredReportValue(toFrNumber(totals.kg) + " kg", totals.knownWasteActions, totals.actions), coverage: describeReportMeasurementCoverage(totals.knownWasteActions, totals.actions) },
    { label: "Mégots retirés", value: formatCoveredReportValue(toFrInt(totals.butts), totals.buttsKnownActions, totals.actions), coverage: describeReportMeasurementCoverage(totals.buttsKnownActions, totals.actions) },
    { label: "Participations", value: formatCoveredReportValue(toFrInt(totals.volunteers), totals.volunteersKnownActions, totals.actions), coverage: describeReportMeasurementCoverage(totals.volunteersKnownActions, totals.actions) },
    { label: "Complétude des données", value: totals.actions > 0 ? formatScorePercent(quality.completenessScore, 1) : "Non disponible", coverage: "Qualité de renseignement, pas une certification" },
    { label: "Secteurs représentés", value: toFrInt(report.areas.length), coverage: "Groupes territoriaux du modèle" },
  ];
  return (
    <section className={PAPER_SECTION} aria-labelledby="print-totals-title">
      <h2 id="print-totals-title" className="text-lg font-bold text-slate-950">Résultats sur la période</h2>
      <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 print:grid-cols-3">
        {cards.map(({ label, value, coverage }) => <div key={label} className="min-w-0 rounded-lg border border-slate-200 p-3 print:rounded-none"><dt className="text-xs font-semibold text-slate-700">{label}</dt><dd className="mt-1 text-lg font-bold tabular-nums text-slate-950">{value}</dd><dd className="mt-1 text-xs text-slate-600">{coverage}</dd></div>)}
      </dl>
      <p className="text-xs text-slate-600">Les participations sont des présences cumulées par action, pas des personnes uniques. Les sommes partielles portent sur les seules mesures renseignées.</p>
    </section>
  );
}

function TerritoryResults({ report }: { report: ReportModel }) {
  return (
    <section className={PAPER_SECTION} aria-labelledby="print-territory-title">
      <h2 id="print-territory-title" className="text-lg font-bold text-slate-950">Lecture territoriale</h2>
      <p className="text-sm text-slate-700">Répartition des actions approuvées par groupes territoriaux du modèle. La géolocalisation et la couverture sont distinctes d’une surface effectivement nettoyée.</p>
      {report.areas.length > 0 ? (
        <div className="overflow-x-auto print:overflow-visible">
          <table className="cmm-data-table w-full border-collapse text-left text-sm">
            <thead><tr className="border-b border-slate-300"><th scope="col" className="p-2">Secteur</th><th scope="col" className="p-2">Actions</th><th scope="col" className="p-2">Masse connue (kg)</th><th scope="col" className="p-2">Couverture masse</th></tr></thead>
            <tbody>{report.areas.map((area) => <tr key={area.area} className="border-b border-slate-200"><th scope="row" className="p-2">{area.area}</th><td className="p-2">{toFrInt(area.actions)}</td><td className="p-2">{formatCoveredReportValue(toFrNumber(area.kg), area.knownWasteActions, area.actions)}</td><td className="p-2">{describeReportMeasurementCoverage(area.knownWasteActions, area.actions)}</td></tr>)}</tbody>
          </table>
        </div>
      ) : <p className="text-sm text-slate-600">Aucun secteur représenté dans le corpus chargé.</p>}
      <div className="print:hidden"><CmmButton href="/actions/map" tone="secondary">Consulter la carte des actions</CmmButton></div>
    </section>
  );
}

function MonthlyResults({ data }: { data: MonthlyAnalyticsPoint[] }) {
  return (
    <section className={PAPER_SECTION} aria-labelledby="print-monthly-title">
      <h2 id="print-monthly-title" className="text-lg font-bold text-slate-950">Évolution mensuelle</h2>
      <p className="text-sm text-slate-700">Mois disponibles des douze derniers mois glissants ; cette fenêtre historique diffère de la période du bilan.</p>
      <div className="print:hidden"><AnalyticsCockpit data={data} /></div>
      {data.length > 0 ? (
        <div className="hidden print:block">
          <table className="cmm-data-table w-full border-collapse text-left text-sm"><thead><tr className="border-b border-slate-300"><th scope="col" className="p-2">Mois</th><th scope="col" className="p-2">Masse (kg)</th><th scope="col" className="p-2">Couverture masse</th><th scope="col" className="p-2">Participations</th><th scope="col" className="p-2">Couverture effectif</th></tr></thead>
            <tbody>{data.map((point) => <tr key={point.month} className="border-b border-slate-200"><th scope="row" className="p-2">{point.month}</th><td className="p-2">{formatCoveredReportValue(toFrNumber(point.kg), point.wasteKnownActions, point.actionCount)}</td><td className="p-2">{describeReportMeasurementCoverage(point.wasteKnownActions, point.actionCount)}</td><td className="p-2">{formatCoveredReportValue(toFrInt(point.volunteers), point.volunteersKnownActions, point.actionCount)}</td><td className="p-2">{describeReportMeasurementCoverage(point.volunteersKnownActions, point.actionCount)}</td></tr>)}</tbody>
          </table>
        </div>
      ) : <p className="hidden print:block text-sm text-slate-600">Aucune tendance disponible.</p>}
    </section>
  );
}

export default async function PrintReportPage() {
  const { userId } = await getSafeAuthSession();
  const pageFamily = resolvePageFamily("/prints/report");
  const heading = <div className="print:hidden"><PageHeader family={pageFamily} title="Rapport d'impact imprimable" subtitle="Synthèse documentaire des données disponibles, distincte du PDF officiel généré dans Rapports." /></div>;

  if (!userId) {
    return (
      <div className="space-y-6">
        {heading}
        <ClerkRequiredGate isAuthenticated={false} mode="blur" lockedPreview={<section className="space-y-3 rounded-xl border border-slate-200 p-5"><h2 className="font-bold">Compte requis</h2><p>Connectez-vous pour consulter et imprimer la synthèse documentaire.</p></section>}><div /></ClerkRequiredGate>
      </div>
    );
  }

  const data = await loadReportsAnalysisData().catch(() => null);
  if (!data) return <div className="space-y-4">{heading}<p role="alert">Les données de la synthèse sont temporairement indisponibles. Aucun résultat n’est affiché.</p><CmmButton href="/reports?tab=analysis" tone="secondary">Revenir aux rapports</CmmButton></div>;

  const { overview, report, monthlyData, communityEventsAvailability } = data;
  const notices = buildReportDataAvailabilityNotices({ ...overview.dataAvailability, communityEventsAvailability });

  return (
    <div className="cmm-print-report space-y-5 p-0 print:space-y-0 print:p-0">
      {heading}
      <div className="mx-auto flex max-w-[1050px] flex-wrap justify-end gap-2 print:hidden">
        <CmmButton href="/reports?tab=generation" tone="secondary">Générer le PDF officiel</CmmButton>
        <PrintActionButton />
      </div>
      <CmmGrid as="article" className="mx-auto w-full max-w-[1050px] bg-white text-slate-950 print:mx-0 print:max-w-none" contentClassName="gap-5 p-4 sm:p-6 lg:p-8 print:gap-3 print:p-0">
        <CmmGridItem span={{ mobile: 4, tablet: 6, desktop: 12 }}>
          <header className={PAPER_SECTION}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <BrandLogo variant="lightSurface" alt="CleanMyMap" className="h-8 w-auto" sizes="10rem" priority />
              <p className="text-xs font-semibold text-slate-700">Synthèse non certifiée · Périmètre global</p>
            </div>
            <h2 className="text-2xl font-bold text-slate-950">Bilan des actions de dépollution</h2>
            <p className="text-sm text-slate-700">Période : {overview.periodDays} jours glissants · Modèle calculé le {report.generatedAt || "date non disponible"}</p>
            <p className="text-sm text-slate-700">Source : modèle d’analyse CleanMyMap, corpus approuvé dans les limites du chargement. Ce document n’est ni un audit indépendant ni un artefact PDF historique.</p>
            {notices.length > 0 ? <div role="status" className="border-l-2 border-amber-600 pl-3 text-sm text-slate-900">{notices.map((notice) => <p key={notice}>{notice}</p>)}</div> : null}
          </header>
        </CmmGridItem>
        <CmmGridItem span={{ mobile: 4, tablet: 6, desktop: 12 }}><ReportTotals report={report} /></CmmGridItem>
        <CmmGridItem span={{ mobile: 4, tablet: 6, desktop: 12 }}><TerritoryResults report={report} /></CmmGridItem>
        <CmmGridItem span={{ mobile: 4, tablet: 6, desktop: 12 }}><MonthlyResults data={monthlyData} /></CmmGridItem>
        <CmmGridItem span={{ mobile: 4, tablet: 6, desktop: 12 }}>
          <section className={PAPER_SECTION} aria-labelledby="print-method-title">
            <h2 id="print-method-title" className="text-lg font-bold text-slate-950">Méthode et proxy</h2>
            <p className="text-sm text-slate-700">Les masses et effectifs ne sont exploitables que lorsqu’ils sont renseignés. Les ratios sans dénominateur sont indisponibles. Les équivalences environnementales du moteur CleanMyMap sont des proxys, pas des effets physiques directement mesurés. Les données partielles n’autorisent pas une extrapolation à l’ensemble du territoire.</p>
            <p className="text-sm text-slate-700">Référentiel scientifique : <a href="/methodologie" className="font-semibold underline">cleanmymap.fr/methodologie</a></p>
          </section>
        </CmmGridItem>
        <CmmGridItem span={{ mobile: 4, tablet: 6, desktop: 12 }}>
          <footer className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
            <span>CleanMyMap · Synthèse documentaire</span><span>cleanmymap.fr/reports</span>
          </footer>
        </CmmGridItem>
      </CmmGrid>
      <div className="mx-auto max-w-[1050px] print:hidden">
        <details className="rounded-xl border border-slate-200 p-4">
          <summary className="cursor-pointer font-semibold">Exemple de présentation cartographique (illustration)</summary>
          <p className="my-3 text-sm">Exemple centré sur Paris, indépendant du corpus analysé. Ne représente pas les zones traitées ni une preuve de collecte et n’est pas imprimé.</p>
          <TerritoryMapComparisonCards title="Deux styles de carte" subtitle="Comparaison illustrative du fond cartographique et de la présentation Terraink." locationLabel="Paris · exemple" tone="sky" />
        </details>
      </div>
      <style>{`
        @page { size: A4 portrait; margin: 10mm; }
        @media print {
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .cmm-print-report { --cmm-grid-columns-mobile: 12; --cmm-grid-columns-tablet: 12; --cmm-grid-columns-desktop: 12; --cmm-grid-margin-mobile: 0; --cmm-grid-margin-tablet: 0; --cmm-grid-margin-desktop: 0; --cmm-grid-gutter-mobile: 4mm; --cmm-grid-gutter-tablet: 4mm; --cmm-grid-gutter-desktop: 4mm; --cmm-grid-max-width: 100%; } .cmm-print-report .cmm-grid-span { grid-column: 1 / -1; }
          .cmm-print-report__section h2, .cmm-print-report__section h3 { break-after: avoid; }
          .cmm-print-report p { orphans: 3; widows: 3; }
          .cmm-print-report table { width: 100%; table-layout: fixed; }
          .cmm-print-report th, .cmm-print-report td { overflow-wrap: anywhere; }
          .cmm-print-report tr, .cmm-print-report dl > div { break-inside: avoid; }
          .cmm-print-report thead { display: table-header-group; }
        }
      `}</style>
    </div>
  );
}
