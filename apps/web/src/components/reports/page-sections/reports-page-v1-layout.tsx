import Link from "next/link";
import type { ReactNode } from "react";
import { ThirtySecondsSummary } from "@/components/pilotage/thirty-seconds-summary";
import { PageHero, PageHeroBadge } from "@/components/ui/page-hero";
import { RubriqueExcelExportButton } from "@/components/ui/rubrique-excel-export-button";
import { ReportsWindowComparisonsSection } from "@/components/reports/reports-window-comparisons-section";
import { KpiMethodBlock } from "@/components/pilotage/kpi-method-block";
import { ReportsWebDocument } from "@/components/reports/reports-web-document";
import { ReportsKpiSummary } from "@/components/reports/reports-kpi-summary";
import { ActionsReportPanel } from "@/components/reports/actions-report-panel";
import { TerritoryMapComparisonCards } from "@/components/maps/territory-map-comparison-cards";
import { RolePrimaryActions } from "@/components/navigation/role-primary-actions";
import type { CommunityEventItem } from "@/lib/community/http";
import type { ActionDataContract } from "@/lib/actions/data-contract";
import type { PilotageOverview } from "@/lib/pilotage/overview";
import type { Locale } from "@/lib/ui/preferences";
import type { AppProfile, ProfileAction } from "@/lib/profiles";
import { isAdminLikeProfile } from "@/lib/profiles";
import { resolvePageFamily } from "@/lib/ui/page-families";
import type { ThirtySecondsSummaryProps } from "@/components/pilotage/thirty-seconds-summary";
import type { ActionListResponse } from "@/lib/actions/types";
import type { AdminOperationAuditItem } from "@/components/reports/admin-workflow/types";

type ReportsWeather = {
  current?: {
    temperature_2m?: number;
    precipitation?: number;
    wind_speed_10m?: number;
  };
} | null;

type ReportsPageV1LayoutProps = {
  locale: Locale;
  roleLabel: string;
  profile: AppProfile;
  primaryAction: ProfileAction;
  summaryKpis: NonNullable<ThirtySecondsSummaryProps["kpis"]>;
  headerActions: Array<{ href: string; label: string }>;
  overview: PilotageOverview | null;
  contracts: ActionDataContract[];
  communityEvents: CommunityEventItem[];
  weather: ReportsWeather;
  adminWorkflowPreview: ActionListResponse | null;
  adminWorkflowAudit: AdminOperationAuditItem[] | null;
  toReportsExportRow: (contract: ActionDataContract) => Record<string, unknown>;
  publicAccessBanner: ReactNode;
};

export function ReportsPageV1Layout({
  locale,
  roleLabel,
  profile,
  primaryAction,
  summaryKpis,
  headerActions,
  overview,
  contracts,
  communityEvents,
  weather,
  adminWorkflowPreview,
  adminWorkflowAudit,
  toReportsExportRow,
  publicAccessBanner,
}: ReportsPageV1LayoutProps) {
  const pageFamily = resolvePageFamily("/reports");

  return (
    <div data-rubrique-report-root className="space-y-4">
      {publicAccessBanner}

      <PageHero
        family={pageFamily}
        eyebrow={`Profil ${roleLabel}`}
        title="Rapports d'impact"
        subtitle="Arbitrer sur 30j/90j/12m avec comparatifs N vs N-1 et priorités auto justifiées."
        badges={
          <>
            <PageHeroBadge family={pageFamily}>
              30j / 90j / 12m
            </PageHeroBadge>
            <PageHeroBadge family={pageFamily} muted>
              Exports contrôlés
            </PageHeroBadge>
          </>
        }
        className="max-w-4xl pt-2"
      />

      <div className="flex flex-wrap gap-2">
        {headerActions.map((action: { href: string; label: string }) => (
          <Link
            key={action.href}
            href={action.href}
            className="inline-flex min-h-10 items-center justify-center rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 hover:text-slate-950"
          >
            {action.label}
          </Link>
        ))}
      </div>

      <ThirtySecondsSummary
        kpis={summaryKpis}
        alert={overview ? overview.summary.alert : undefined}
        recommendedAction={{
          href: overview?.summary.recommendedAction.href ?? primaryAction.href,
          label:
            overview?.summary.recommendedAction.label ?? primaryAction.label[locale],
        }}
        recommendedReason={overview?.summary.recommendedAction.reason}
      />

      <TerritoryMapComparisonCards
        title="Deux lectures du territoire d'impact"
        subtitle="La carte de base reste la référence terrain. La carte Terraink ajoute une lecture plus éditoriale et plus imprimable. On conserve les deux pour comparer la clarté, l'usage et la valeur documentaire."
        locationLabel="Territoire audité"
        tone="rose"
        note="Cette double présentation évite de figer trop tôt un seul style. La carte brute et la carte Terraink servent à comparer deux intentions différentes."
      />

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <p className="cmm-text-caption font-semibold uppercase tracking-[0.14em] cmm-text-muted">
          Tracer
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          <RubriqueExcelExportButton
            rubriqueTitle="Reporting et pilotage"
            data={contracts.map(toReportsExportRow)}
          />
        </div>
      </section>

      {overview ? (
        <ReportsWindowComparisonsSection
          comparisonsByWindow={overview.comparisonsByWindow}
        />
      ) : null}

      {overview ? <KpiMethodBlock methods={overview.methods} title="Méthode" /> : null}

      <ReportsWebDocument
        contracts={contracts}
        communityEvents={communityEvents}
        weather={weather}
      />

      <ReportsKpiSummary contracts={contracts} />

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
            Tu vois la synthèse KPI, mais les exports CSV/JSON et la modération
            restent limités au rôle <span className="font-semibold">admin</span> ou <span className="font-semibold">max</span>.
          </p>
        </section>
      )}

      <RolePrimaryActions profile={profile} />
    </div>
  );
}
