import type { ReactNode } from "react";
import { PageReadingTemplate } from "@/components/ui/page-reading-template";
import { AnimatedImpactMetrics } from "@/components/reports/AnimatedImpactMetrics";
import { RadialProgressGauge } from "@/components/reports/RadialProgressGauge";
import { NavigationGrid, type NavigationGridItem } from "@/components/ui/navigation-grid";
import { ReportsWindowComparisonsSection } from "@/components/reports/reports-window-comparisons-section";
import { EcologicalTimeline } from "@/components/reports/EcologicalTimeline";
import { RubriqueExcelExportButton } from "@/components/ui/rubrique-excel-export-button";
import { KpiMethodBlock } from "@/components/pilotage/kpi-method-block";
import { AnalyticsCockpit } from "@/components/reports/analytics-cockpit";
import { ReportsWebDocument } from "@/components/reports/reports-web-document";
import { ReportsKpiSummary } from "@/components/reports/reports-kpi-summary";
import { ActionsReportPanel } from "@/components/reports/actions-report-panel";
import { TerritoryMapComparisonCards } from "@/components/maps/territory-map-comparison-cards";
import type { CommunityEventItem } from "@/lib/community/http";
import type { ActionDataContract } from "@/lib/actions/data-contract";
import type { Locale } from "@/lib/ui/preferences";
import type { AppProfile, ProfileAction } from "@/lib/profiles";
import { isAdminLikeProfile } from "@/lib/profiles";
import { getActionOperationalContext } from "@/lib/actions/data-contract";
import type { MonthlyAnalyticsPoint } from "@/lib/pilotage/analytics-data-utils";
import type { PilotageOverview } from "@/lib/pilotage/overview";
import type { ActionListResponse } from "@/lib/actions/types";
import type { AdminOperationAuditItem } from "@/components/reports/admin-workflow/types";

type ReportsWeather = {
  current?: {
    temperature_2m?: number;
    precipitation?: number;
    wind_speed_10m?: number;
  };
} | null;

type ReportsSummaryKpi = {
  label: string;
  value: string;
  previousValue: string;
  deltaAbsolute?: string;
  deltaPercent?: string;
  interpretation?: "positive" | "negative" | "neutral";
};

type ReportsPageV2LayoutProps = {
  locale: Locale;
  roleLabel: string;
  profile: AppProfile;
  primaryAction: ProfileAction;
  secondaryAction?: ProfileAction | null;
  summaryKpis: readonly [ReportsSummaryKpi, ReportsSummaryKpi, ReportsSummaryKpi];
  navigationItems: NavigationGridItem[];
  overview: PilotageOverview | null;
  contracts: ActionDataContract[];
  communityEvents: CommunityEventItem[];
  weather: ReportsWeather;
  adminWorkflowPreview: ActionListResponse | null;
  adminWorkflowAudit: AdminOperationAuditItem[] | null;
  monthlyData: MonthlyAnalyticsPoint[];
  toReportsExportRow: (contract: ActionDataContract) => Record<string, unknown>;
  publicAccessBanner: ReactNode;
};

export function ReportsPageV2Layout({
  locale,
  roleLabel,
  profile,
  primaryAction,
  secondaryAction,
  summaryKpis,
  navigationItems,
  overview,
  contracts,
  communityEvents,
  weather,
  adminWorkflowPreview,
  adminWorkflowAudit,
  monthlyData,
  toReportsExportRow,
  publicAccessBanner,
}: ReportsPageV2LayoutProps) {
  return (
    <div className="space-y-4">
      {publicAccessBanner}

      <PageReadingTemplate
        context={`Profil ${roleLabel}`}
        title="Rapports d'impact"
        objective="Comparer les fenêtres utiles, lire la méthode KPI et exporter les livrables."
        summary={
          <div className="space-y-10">
            <AnimatedImpactMetrics kpis={summaryKpis} />

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <RadialProgressGauge
                value={78}
                label="Réduction Déchets"
                subLabel="Objectif Q2 2026"
                color="emerald"
              />
              <RadialProgressGauge
                value={45}
                label="Mobilisation"
                subLabel="Nouveaux bénévoles"
                color="blue"
              />
              <RadialProgressGauge
                value={92}
                label="Qualité Data"
                subLabel="Précision GPS"
                color="violet"
              />
              <RadialProgressGauge
                value={65}
                label="Impact CO2"
                subLabel="Émissions évitées"
                color="amber"
              />
            </div>

            <NavigationGrid items={navigationItems} columns={{ default: 1, sm: 2, md: 4, xl: 4 }} />
          </div>
        }
        primaryAction={{
          href: primaryAction.href,
          label: primaryAction.label[locale],
        }}
        secondaryAction={
          secondaryAction
            ? {
                href: secondaryAction.href,
                label: secondaryAction.label[locale],
              }
            : undefined
        }
        analysis={
          <div className="space-y-16">
            <TerritoryMapComparisonCards
              title="Deux lectures du territoire d'impact"
              subtitle="La carte de base garde une lecture terrain et opérationnelle. La version Terraink ajoute une lecture plus éditoriale, utile pour les rapports, les exports et les présentations. Les deux restent disponibles pour trancher plus tard."
              locationLabel="Territoire audité"
              tone="rose"
              note="La version Terraink ne remplace rien ici. Elle sert de piste visuelle à comparer avec la carte brute et à valider selon le contexte d'usage."
            />

            <div id="comparisons">
              {overview ? (
                <ReportsWindowComparisonsSection
                  comparisonsByWindow={overview.comparisonsByWindow}
                />
              ) : (
                <section className="rounded-2xl border border-amber-200 bg-amber-50 p-6 shadow-sm">
                  <p className="cmm-text-small text-amber-800">
                    Données de comparaison temporairement indisponibles.
                    Vérifier la source pilotage.
                  </p>
                </section>
              )}
            </div>

            <div className="space-y-10">
              <div className="text-center">
                <h3 className="text-3xl font-black cmm-text-primary mb-2">Historique d&apos;impact</h3>
                <p className="cmm-text-secondary font-medium italic">Les actions les plus significatives sur le terrain</p>
              </div>
              <EcologicalTimeline
                actions={contracts.map((c: ActionDataContract) => ({
                  id: c.id,
                  date: c.dates.observedAt,
                  label: c.location.label,
                  wasteKg: c.metadata.wasteKg || 0,
                  volunteers: getActionOperationalContext(c).volunteersCount,
                  type: c.type
                }))}
              />
            </div>
          </div>
        }
      />

      <div className="space-y-8">
        {overview ? (
          <section id="method" className="space-y-4 rounded-2xl border border-white/40 bg-white/60 p-5 shadow-xl backdrop-blur-md">
            <div>
              <p className="cmm-text-caption font-semibold uppercase tracking-[0.14em] cmm-text-muted">
                Méthode KPI
              </p>
              <h2 className="mt-1 text-xl font-semibold cmm-text-primary">
                Lire la méthode KPI
              </h2>
              <p className="mt-1 cmm-text-small cmm-text-secondary">
                L&apos;explication détaillée reste disponible plus bas.
              </p>
            </div>
            <KpiMethodBlock methods={overview.methods} title="Méthode" />
          </section>
        ) : null}

        <section id="cockpit" className="space-y-4 rounded-2xl border border-white/40 bg-white/60 p-5 shadow-xl backdrop-blur-md">
          <div>
            <p className="cmm-text-caption font-semibold uppercase tracking-[0.14em] cmm-text-muted">
              Analyse mensuelle
            </p>
            <h2 className="mt-1 text-xl font-semibold cmm-text-primary">
              Vue mensuelle
            </h2>
            <p className="mt-1 cmm-text-small cmm-text-secondary">
              Les comparatifs, les agrégats et les exports restent plus bas.
            </p>
          </div>
          <AnalyticsCockpit data={monthlyData} />
        </section>

        <section id="document" className="space-y-4 rounded-2xl border border-white/40 bg-white/60 p-5 shadow-xl backdrop-blur-md">
          <ReportsWebDocument
            contracts={contracts}
            communityEvents={communityEvents}
            weather={weather}
          />
        </section>

        <section id="kpi-summary" className="space-y-4 rounded-2xl border border-white/40 bg-white/60 p-5 shadow-xl backdrop-blur-md">
          <ReportsKpiSummary contracts={contracts} />
        </section>

        <section className="space-y-4 rounded-2xl border border-white/40 bg-white/60 p-5 shadow-xl backdrop-blur-md">
          {isAdminLikeProfile(profile) ? (
            <ActionsReportPanel
              initialPreview={adminWorkflowPreview}
              initialAuditItems={adminWorkflowAudit}
            />
          ) : (
            <section className="rounded-2xl border border-amber-200 bg-amber-50 p-6 shadow-sm">
              <p className="cmm-text-caption font-semibold uppercase tracking-[0.14em] text-amber-700">
                Admin requis
              </p>
              <h2 className="mt-2 text-xl font-semibold text-amber-900">
                Exports et modération réservés aux admins
              </h2>
              <p className="mt-2 cmm-text-small text-amber-800">
                Tu vois la synthèse KPI, mais les exports CSV/JSON et la
                modération restent limités au rôle{""}
                <span className="font-semibold">admin</span> ou <span className="font-semibold">max</span>.
              </p>
            </section>
          )}
        </section>

        <section id="exports" className="space-y-4 rounded-2xl border border-white/40 bg-white/60 p-5 shadow-xl backdrop-blur-md">
          <div>
            <p className="cmm-text-caption font-semibold uppercase tracking-[0.14em] cmm-text-muted">
              Exports
            </p>
            <h2 className="mt-1 text-xl font-semibold cmm-text-primary">
              Livrables
            </h2>
            <p className="mt-1 cmm-text-small cmm-text-secondary">
              Les exports sont regroupés plus bas pour alléger l&apos;ouverture.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <RubriqueExcelExportButton
              rubriqueTitle="Reporting et pilotage"
              data={contracts.map(toReportsExportRow)}
            />
          </div>
        </section>
      </div>
    </div>
  );
}
