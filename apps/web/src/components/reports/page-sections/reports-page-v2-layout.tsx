import type { ReactNode } from "react";
import { PageReadingTemplate } from "@/components/ui/page-reading-template";
import { AnimatedImpactMetrics } from "@/components/reports/AnimatedImpactMetrics";
import { RadialProgressGauge } from "@/components/reports/RadialProgressGauge";
import { NavigationGrid, type NavigationGridItem } from "@/components/ui/navigation-grid";
import { RubriqueExcelExportButton } from "@/components/ui/rubrique-excel-export-button";
import { KpiMethodBlock } from "@/components/pilotage/kpi-method-block";
import { AnalyticsCockpit } from "@/components/reports/analytics-cockpit";
import { ReportsWebDocument } from "@/components/reports/reports-web-document.tsx";
import { ReportsImpactReadingsSection } from "@/components/reports/reports-impact-readings-section";
import { ReportsPageTabs } from "./reports-page-tabs";
import type { CommunityEventItem } from "@/lib/community/http";
import type { ActionDataContract } from "@/lib/actions/data-contract";
import type { Locale } from "@/lib/ui/preferences";
import type { ProfileAction } from "@/lib/profiles";
import type { MonthlyAnalyticsPoint } from "@/lib/pilotage/analytics-data-utils";
import type { PilotageOverview } from "@/lib/pilotage/overview";

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
  primaryAction: ProfileAction;
  secondaryAction?: ProfileAction | null;
  summaryKpis: readonly [ReportsSummaryKpi, ReportsSummaryKpi, ReportsSummaryKpi];
  navigationItems: NavigationGridItem[];
  overview: PilotageOverview | null;
  contracts: ActionDataContract[]; 
  communityEvents: CommunityEventItem[];
  weather: ReportsWeather;
  monthlyData: MonthlyAnalyticsPoint[];
  toReportsExportRow: (contract: ActionDataContract) => Record<string, unknown>;
  publicAccessBanner: ReactNode;
};

export function ReportsPageV2Layout({
  locale,
  roleLabel,
  primaryAction,
  secondaryAction,
  summaryKpis,
  navigationItems,
  overview,
  contracts,
  communityEvents,
  weather,
  monthlyData,
  toReportsExportRow,
  publicAccessBanner,
}: ReportsPageV2LayoutProps) {
  return (
    <div className="space-y-4">
      {publicAccessBanner}

      <ReportsPageTabs
        generation={
          <ReportsWebDocument
            contracts={contracts}
            communityEvents={communityEvents}
            weather={weather}
            overview={overview}
          />
        }
        pilotage={
          <div className="space-y-8">
            <PageReadingTemplate
              context={`Profil ${roleLabel}`}
              title="Rapports d'impact"
              objective="Comparer les fenêtres utiles, lire la méthode KPI et exporter les livrables."
              summary={
                <div className="space-y-10">
                  <AnimatedImpactMetrics kpis={summaryKpis} />

                  <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
                    <RadialProgressGauge
                      value={78}
                      label="Réduction Déchets"
                      subLabel="Objectif Q2 2026"
                      color="red"
                    />
                    <RadialProgressGauge
                      value={45}
                      label="Mobilisation"
                      subLabel="Nouveaux bénévoles"
                      color="cyan"
                    />
                    <RadialProgressGauge
                      value={92}
                      label="Qualité Data"
                      subLabel="Précision GPS"
                      color="cyan"
                    />
                    <RadialProgressGauge
                      value={65}
                      label="Impact CO2"
                      subLabel="Émissions évitées"
                      color="red"
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
                <ReportsImpactReadingsSection
                  contracts={contracts}
                  communityEvents={communityEvents}
                  weather={weather}
                />
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
        }
      />
    </div>
  );
}
