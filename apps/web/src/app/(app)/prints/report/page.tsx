import type { Metadata } from "next";
import Image from "next/image";
import { AnalyticsCockpit } from "@/components/reports/analytics-cockpit";
import { TerritoryMapComparisonCards } from "@/components/maps/territory-map-comparison-cards";
import { CmmGrid, CmmGridItem } from "@/components/ui/cmm-grid";
import { ClerkRequiredGate } from "@/components/ui/clerk-required-gate";
import { PageHeader, PageHeaderBadge } from "@/components/ui/page-header";
import { aggregateMonthlyAnalytics } from "@/lib/pilotage/analytics-data-utils";
import { fetchCachedUnifiedActionContracts } from "@/lib/actions/unified-source-cache";
import { loadPilotageOverview } from "@/lib/pilotage/overview";
import { getSafeAuthSession } from "@/lib/auth/safe-session";
import { reportPdfColors } from "@/lib/pdf-export/report-pdf-theme";
import { resolvePageFamily } from "@/lib/ui/page-families";

export const metadata: Metadata = {
  title: "Rapport d'impact imprimable - CleanMyMap",
  description: "Rapport d'impact imprimable et synthèse documentaire réservés aux comptes connectés.",
  robots: {
    index: false,
    follow: false,
  },
};

type ReportStat = {
  label: string;
  value: string;
};

async function loadFullAuditData() {
  const [overview, contractsResult] = await Promise.all([
    loadPilotageOverview({
      periodDays: 90,
      limit: 1500,
    }),
    fetchCachedUnifiedActionContracts({
      limit: 500,
      status: "approved",
      floorDate: null,
      requireCoordinates: false,
      types: null,
    }),
  ]);

  return { overview, contracts: contractsResult.items };
}

export default async function PrintReportPage() {
  const { userId } = await getSafeAuthSession();
  const pageFamily = resolvePageFamily("/prints/report");

  if (!userId) {
    return (
      <div className="space-y-6">
        <div className="print:hidden">
          <PageHeader
            family={pageFamily}
            eyebrow="Impression & export"
            title="Rapport d'impact imprimable"
            subtitle="Synthèse documentaire, export visuel et lecture d'impact pour l'audit."
            badges={
              <>
              <PageHeaderBadge family={pageFamily}>Impression</PageHeaderBadge>
              <PageHeaderBadge family={pageFamily} muted>
                Export
              </PageHeaderBadge>
              </>
            }
          />
        </div>

        <ClerkRequiredGate
          isAuthenticated={false}
          mode="blur"
          lockedPreview={
            <section className="space-y-4 rounded-3xl border border-stone-200 bg-stone-50/90 p-5 shadow-sm">
              <div className="grid gap-3 md:grid-cols-4">
                {["Masse récoltée", "Bénévoles", "Score qualité", "Zones couvertes"].map((label) => (
                  <article key={label} className="rounded-2xl border border-stone-200 bg-white/90 p-4">
                    <p className="cmm-text-caption uppercase tracking-wide cmm-text-muted">{label}</p>
                    <p className="mt-2 text-lg font-semibold cmm-text-primary">—</p>
                  </article>
                ))}
              </div>
              <div className="rounded-2xl border border-stone-200 bg-white/90 p-4 cmm-text-small cmm-text-secondary">
                Le rapport complet, les exports et la méthodologie détaillée se déverrouillent après
                connexion.
              </div>
            </section>
          }
        >
          <div />
        </ClerkRequiredGate>
      </div>
    );
  }

  const data = await loadFullAuditData().catch(() => null);
  const overview = data?.overview;
  const monthlyData = data ? aggregateMonthlyAnalytics(data.contracts) : [];

  if (!overview) {
    return <div>Erreur de chargement des données d&apos;audit.</div>;
  }

  const reportId = "CMM-AUDIT-2026";
  const reportDate = new Date("2026-04-25").toLocaleDateString("fr-FR");
  const reportStats: ReportStat[] = [
    {
      label: "Masse récoltée",
      value: `${overview.comparison.current.impactVolumeKg.toFixed(1)} kg`,
    },
    {
      label: "Bénévoles",
      value: String(overview.comparison.current.mobilizationCount),
    },
    {
      label: "Score qualité",
      value: "AA",
    },
    {
      label: "Zones couvertes",
      value: String(overview.zones.length),
    },
  ];

  return (
    <div className="cmm-print-report min-h-screen space-y-6 p-0 sm:p-12 print:p-0">
      <div className="print:hidden">
          <PageHeader
            family={pageFamily}
            eyebrow="Impression & export"
          title="Rapport d'impact imprimable"
          subtitle="Synthèse documentaire, export visuel et lecture d'impact pour l'audit."
          badges={
            <>
              <PageHeaderBadge family={pageFamily}>Impression</PageHeaderBadge>
              <PageHeaderBadge family={pageFamily} muted>
                Document
              </PageHeaderBadge>
            </>
          }
        />
      </div>

      <CmmGrid
        as="main"
        className="mx-auto w-full max-w-[210mm] print:mx-0 print:max-w-none"
        contentClassName="gap-6 lg:gap-8"
      >
        <CmmGridItem span={{ mobile: 4, tablet: 6, desktop: 12 }}>
          <section
            className="cmm-print-report__section rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm print:rounded-none print:border-0 print:bg-transparent print:p-0 print:shadow-none"
            style={{ borderColor: reportPdfColors.rule }}
          >
            <div className="grid gap-4 lg:grid-cols-[1.35fr_0.65fr] lg:items-start">
              <div className="space-y-3">
                <div className="flex items-center gap-3 font-bold tracking-tighter text-slate-950 print:text-[18pt]">
                  <Image
                    src="/brand/logo-cleanmymap-officiel.svg"
                    alt="Logo CleanMyMap"
                    width={160}
                    height={48}
                    className="h-8 w-auto"
                    priority
                  />
                  <span>
                    CLEANMYMAP <span className="font-light text-slate-600">AUDIT</span>
                  </span>
                </div>
                <p className="cmm-text-caption font-bold uppercase tracking-widest cmm-text-muted">
                  Rapport d&apos;impact environnemental et social
                </p>
                <div className="flex flex-wrap gap-2">
                  <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-slate-700 print:bg-white">
                    Impression
                  </span>
                  <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-slate-700 print:bg-white">
                    Export
                  </span>
                </div>
              </div>

              <div className="grid gap-2 rounded-2xl border border-slate-200 bg-slate-50/80 p-4 text-left print:bg-transparent print:p-0">
                <p className="cmm-text-small font-bold uppercase text-slate-700">Document certifié</p>
                <p className="cmm-text-caption cmm-text-muted font-mono">ID: {reportId}</p>
                <p className="cmm-text-caption cmm-text-muted">{reportDate}</p>
              </div>
            </div>
          </section>
        </CmmGridItem>

        <CmmGridItem span={{ mobile: 4, tablet: 6, desktop: 12 }}>
          <section className="cmm-print-report__section overflow-hidden rounded-[1.5rem] border border-slate-200 bg-slate-50/80 shadow-sm print:bg-transparent print:shadow-none">
            <CmmGrid className="!px-0 print:!px-0" contentClassName="gap-px">
              {reportStats.map((stat) => (
                <CmmGridItem
                  key={stat.label}
                  span={{ mobile: 4, tablet: 3, desktop: 3 }}
                  className="min-w-0 bg-white p-4 sm:p-5 print:bg-transparent print:p-3"
                >
                  <p className="cmm-text-caption font-bold uppercase tracking-widest cmm-text-muted">
                    {stat.label}
                  </p>
                  <p className="mt-2 text-2xl font-black tracking-tight cmm-text-primary print:text-[18pt]">
                    {stat.value}
                  </p>
                </CmmGridItem>
              ))}
            </CmmGrid>
          </section>
        </CmmGridItem>

        <CmmGridItem span={{ mobile: 4, tablet: 6, desktop: 6 }}>
          <section className="cmm-print-report__section space-y-4 rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm print:bg-transparent print:shadow-none">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
                  Territoire imprimable
                </p>
                <h2 className="mt-1 text-xl font-black tracking-tight text-slate-950">
                  Deux lectures du territoire
                </h2>
                <p className="mt-1 text-sm leading-6 text-slate-600">
                  La carte de base garde un repère terrain direct. La carte Terraink ajoute une lecture
                  plus graphique, utile pour la couverture d&apos;un rapport, une annexe ou une
                  présentation imprimée.
                </p>
              </div>
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
                Synthèse visuelle
              </p>
            </div>

            <TerritoryMapComparisonCards
              title="Deux lectures du territoire imprimable"
              subtitle="La carte de base garde un repère terrain direct. La carte Terraink ajoute une lecture plus graphique, utile pour la couverture d'un rapport, une annexe ou une présentation imprimée."
              locationLabel="Rapport imprimable"
              tone="sky"
              note="Le rendu imprimable ne remplace pas la version de base. Il sert surtout à comparer la lisibilité et le rendu documentaire dans un contexte d'export."
            />
          </section>
        </CmmGridItem>

        <CmmGridItem span={{ mobile: 4, tablet: 6, desktop: 6 }}>
          <section className="cmm-print-report__section space-y-4 rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm print:bg-transparent print:shadow-none">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
                  Analyse mensuelle
                </p>
                <h2 className="mt-1 text-xl font-black tracking-tight text-slate-950">
                  Vue consolidée
                </h2>
                <p className="mt-1 text-sm leading-6 text-slate-600">
                  Comparatif des volumes et de la mobilisation, sans détour graphique inutile.
                </p>
              </div>
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
                Masse / mobilisation
              </p>
            </div>

            <div className="overflow-hidden rounded-[1.25rem] border border-slate-200 bg-slate-950/95 p-4 text-white print:border-slate-300 print:bg-transparent print:text-slate-900">
              <AnalyticsCockpit data={monthlyData} />
            </div>
          </section>
        </CmmGridItem>

        <CmmGridItem span={{ mobile: 4, tablet: 6, desktop: 12 }}>
          <section className="cmm-print-report__section grid gap-4 rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm print:bg-transparent print:shadow-none lg:grid-cols-2">
            <div className="space-y-3">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
                Méthode et proxy
              </p>
              <h3 className="text-lg font-black tracking-tight text-slate-950">
                Calibrage et source de lecture
              </h3>
              <p className="text-sm leading-6 text-slate-600">
                Les calculs de masse et de volume sont basés sur les protocoles de science citoyenne.
                <strong> Source ADEME Ref 2024.</strong> Le score de qualité de donnée (DQV) est pondéré
                par l&apos;exactitude GPS et la complétude des formulaires.
              </p>
            </div>

            <div className="space-y-3">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
                Lecture de l&apos;impact
              </p>
              <h3 className="text-lg font-black tracking-tight text-slate-950">
                Notes de synthèse
              </h3>
              <p className="text-sm leading-6 text-slate-600">
                Une hausse de 15% de la mobilisation est corrélée à une amélioration de la propreté
                perçue sur les zones prioritaires. Les mégots représentent 65% de la toxicité hydrique
                sur le périmètre audité.
              </p>
            </div>
          </section>
        </CmmGridItem>

        <CmmGridItem span={{ mobile: 4, tablet: 6, desktop: 12 }}>
          <footer className="cmm-print-report__section cmm-ribbon-surface mt-auto flex items-end justify-between gap-6 pt-12 print:border-t print:border-slate-200 print:bg-white print:text-slate-700 print:shadow-none">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Image
                  src="/brand/pictogramme-cleanmymap.svg"
                  alt="Logo CleanMyMap"
                  width={50}
                  height={50}
                  className="h-5 w-auto opacity-70"
                />
                <p className="cmm-text-caption font-bold uppercase tracking-[0.2em] text-slate-100/70 print:text-slate-500">
                  CleanMyMap - Intelligence Environnementale
                </p>
              </div>
              <div className="flex gap-4 text-[9px] font-mono text-slate-300 print:text-slate-400">
                  <span>RFC-6749 conforme</span>
                  <span>RGPD conforme</span>
                  <span>Données ouvertes prêtes</span>
              </div>
            </div>

            <div className="flex h-24 w-24 items-center justify-center rounded-xl bg-slate-100 text-slate-300 print:bg-slate-50 print:text-slate-300">
              <span className="cmm-text-caption text-center font-bold">
                Sceau <br /> CleanMyMap
              </span>
            </div>
          </footer>
        </CmmGridItem>
      </CmmGrid>

      <style
        dangerouslySetInnerHTML={{
          __html: `
            @page {
              size: A4 portrait;
              margin: 10mm;
            }

            @media print {
              body {
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
              }

              .cmm-print-report {
                --cmm-grid-columns-mobile: 4;
                --cmm-grid-columns-tablet: 12;
                --cmm-grid-columns-desktop: 12;
                --cmm-grid-margin-mobile: 0;
                --cmm-grid-margin-tablet: 0;
                --cmm-grid-margin-desktop: 0;
                --cmm-grid-gutter-mobile: 4mm;
                --cmm-grid-gutter-tablet: 4mm;
                --cmm-grid-gutter-desktop: 4mm;
                --cmm-grid-max-width: 100%;
                --cmm-grid-step: 8px;
              }

              .cmm-print-report__section {
                break-inside: avoid;
                page-break-inside: avoid;
              }

              .cmm-print-report__section h1,
              .cmm-print-report__section h2,
              .cmm-print-report__section h3,
              .cmm-print-report__section h4 {
                break-after: avoid;
                page-break-after: avoid;
              }

              .cmm-print-report p {
                orphans: 3;
                widows: 3;
              }

              .cmm-print-report table {
                width: 100%;
                table-layout: fixed;
              }

              .cmm-print-report th,
              .cmm-print-report td {
                overflow-wrap: anywhere;
                word-break: break-word;
              }
            }
          `,
        }}
      />
    </div>
  );
}
