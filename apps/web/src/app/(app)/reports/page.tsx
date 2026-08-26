import type { Metadata } from "next";
import { AccountCompletionGate } from "@/components/account/account-completion-gate";
import { DeferredReportsWebDocument } from "@/components/reports/deferred-reports-web-document";
import { ReportsPageV2Layout } from "@/components/reports/page-sections/reports-page-v2-layout";
import { ReportsAnalysisDashboard } from "@/components/reports/reports-analysis-dashboard";
import { RubriqueExcelExportButton } from "@/components/ui/rubrique-excel-export-button";
import { CTAGroup, SectionHeader } from "@/components/ui/page-structure";
import { ClerkRequiredGate } from "@/components/ui/clerk-required-gate";
import { getCurrentUserRoleLabel } from "@/lib/authz";
import { getSafeAuthSession } from "@/lib/auth/safe-session";
import { loadAccountCompletionGateState } from "@/lib/auth/account-completion-gate";
import { getServerLocale } from "@/lib/server-preferences";
import {
  getProfileLabel,
  getProfilePrimaryAction,
  getProfileSecondaryAction,
  isAdminLikeProfile,
  toProfile,
} from "@/lib/profiles";
import {
  buildEmptyReportsModel,
  buildReportsSummaryKpis,
  loadReportsGenerationData,
  loadReportsAnalysisData,
  toReportsExportRow,
  type ReportsSummaryKpi,
} from "@/lib/reports/page-data";
import type { Locale } from "@/lib/ui/preferences";
import type { ProfileAction } from "@/lib/profiles";
import type { PilotageOverview } from "@/lib/pilotage/overview";
import type { ReportModel } from "@/lib/reports/report-model/types";

type ReportsPageTabId = "generation" | "analysis";

type ReportsPageProps = {
  searchParams: Promise<{ tab?: string }>;
};

type ReportsAnalysisContentParams = {
  locale: Locale;
  roleLabel: string;
  primaryAction: ProfileAction;
  secondaryAction?: ProfileAction | null;
  summaryKpis: readonly [ReportsSummaryKpi, ReportsSummaryKpi, ReportsSummaryKpi];
  overview: Pick<PilotageOverview, "methods" | "periodDays"> | null;
  report: ReportModel;
  monthlyData: Awaited<ReturnType<typeof loadReportsAnalysisData>>["monthlyData"];
  canAccessExports: boolean;
  exportRows: Record<string, unknown>[] | null;
};

function resolveReportsTab(
  requestedTab: string | undefined,
  canAccessDetailedReports: boolean,
): ReportsPageTabId {
  if (requestedTab === "generation") {
    return "generation";
  }

  if (requestedTab === "analysis" || requestedTab === "pilotage") {
    return "analysis";
  }

  return canAccessDetailedReports ? "generation" : "analysis";
}

function buildReportsAnalysisContent({
  locale,
  roleLabel,
  primaryAction,
  secondaryAction,
  summaryKpis,
  overview,
  report,
  monthlyData,
  canAccessExports,
  exportRows,
}: ReportsAnalysisContentParams) {
  return (
    <div className="space-y-6">
      <ReportsAnalysisDashboard
        locale={locale}
        roleLabel={roleLabel}
        primaryAction={primaryAction}
        secondaryAction={secondaryAction}
        summaryKpis={summaryKpis}
        methods={overview?.methods ?? []}
        report={report}
        periodDays={overview?.periodDays ?? 90}
        monthlyData={monthlyData}
      />

        <section
          id="exports"
          className="space-y-4 rounded-2xl border border-white/40 bg-white/60 p-5 shadow-xl backdrop-blur-md"
        >
          <SectionHeader
            eyebrow="Exports"
            title="Livrables"
            subtitle="Les exports sont regroupés plus bas pour alléger l&apos;ouverture."
            titleSize="sm"
            eyebrowClassName="cmm-text-caption font-semibold uppercase tracking-[0.14em] cmm-text-muted"
            subtitleClassName="cmm-text-small cmm-text-secondary mt-1"
          />
          {canAccessExports ? (
            <CTAGroup>
              <RubriqueExcelExportButton
                rubriqueTitle="Rapport d'impact"
                data={exportRows ?? undefined}
              />
            </CTAGroup>
          ) : (
            <div className="rounded-2xl border border-slate-200 bg-white/80 p-4">
              <p className="text-sm font-black uppercase tracking-[0.14em] text-slate-700">
                Export réservé
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Les exports détaillés sont réservés aux profils administratifs pour éviter les
                téléchargements répétés et les réponses trop lourdes.
              </p>
            </div>
          )}
        </section>
    </div>
  );
}

export const metadata: Metadata = {
  title: "Rapports d'impact - CleanMyMap",
  description:
    "Analysez les données de nettoyage participatif, les indicateurs d'impact calculés par proxy et la qualité des données.",
};

export default async function ReportsPage({ searchParams }: ReportsPageProps) {
  const [{ userId, clerkReachable }, locale] = await Promise.all([
    getSafeAuthSession(),
    getServerLocale(),
  ]);
  const resolvedSearchParams = await searchParams;
  const accountCompletion = userId
    ? await loadAccountCompletionGateState({ userId, clerkReachable }).catch(
        () => null,
      )
    : null;
  const role =
    userId && clerkReachable
      ? await getCurrentUserRoleLabel().catch(() => "anonymous" as const)
      : ("anonymous" as const);
  const profile = toProfile(role);
  const canAccessReportsPage = Boolean(userId);
  const canAccessDetailedReports = isAdminLikeProfile(profile);
  const activeTab = resolveReportsTab(
    resolvedSearchParams.tab,
    canAccessDetailedReports,
  );
  const primaryAction = getProfilePrimaryAction(profile);
  const secondaryAction = getProfileSecondaryAction(profile);
  const roleLabel = userId
    ? getProfileLabel(profile, locale)
    : locale === "fr"
      ? "Visiteur"
      : "Visitor";

  if (!canAccessReportsPage) {
    return (
      <ClerkRequiredGate
        isAuthenticated={false}
        authUnavailable={!clerkReachable}
        mode="blur"
        lockedPreview={
          <section className="rounded-2xl border border-red-200 bg-red-50 p-5 shadow-sm">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-red-700">
              Niveau connecté requis
            </p>
            <p className="mt-3 text-sm leading-6 text-red-900">
              Les rapports détaillés sont réservés aux comptes connectés pour éviter de charger
              des données lourdes côté visiteur.
            </p>
          </section>
        }
      >
        <div />
      </ClerkRequiredGate>
    );
  }

  if (activeTab === "generation") {
    if (canAccessDetailedReports) {
      const generationData = await loadReportsGenerationData().catch(() => null);

      const generationContent = generationData ? (
        <DeferredReportsWebDocument
          contracts={generationData.contracts}
          isTruncated={generationData.isTruncated}
          sourceHealth={generationData.sourceHealth}
          communityEvents={generationData.communityEvents}
          communityEventsAvailability={generationData.communityEventsAvailability}
          weather={generationData.weather}
          overviewGeneratedAt={null}
        />
      ) : (
        <section className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-[0_10px_24px_-18px_rgba(15,23,42,0.18)]">
          <p className="text-sm font-black uppercase tracking-[0.16em] text-red-600">
            Génération indisponible
          </p>
          <h2 className="mt-1 text-2xl font-black tracking-tight text-slate-950">
            Le document détaillé n&apos;a pas pu être chargé
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            Réessayez dans un instant. Le chargement serveur des contrats ou de la météo a
            échoué.
          </p>
        </section>
      );

      return (
        <AccountCompletionGate state={accountCompletion}>
          <ReportsPageV2Layout
            activeTab={activeTab}
            generationContent={generationContent}
          />
        </AccountCompletionGate>
      );
    }

    return (
      <AccountCompletionGate state={accountCompletion}>
        <ReportsPageV2Layout
          activeTab={activeTab}
          generationContent={
            <section className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-[0_10px_24px_-18px_rgba(15,23,42,0.18)]">
              <p className="text-sm font-black uppercase tracking-[0.16em] text-red-600">
                Génération réservée
              </p>
              <h2 className="mt-1 text-2xl font-black tracking-tight text-slate-950">
                Aperçu détaillé verrouillé
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Le document complet, les exports et les vues de génération restent réservés aux
                profils administratifs.
              </p>
            </section>
          }
        />
      </AccountCompletionGate>
    );
  }

  const analysisData = await loadReportsAnalysisData().catch(() => null);
  const overview = analysisData?.overview ?? null;
  const report = analysisData?.report ?? buildEmptyReportsModel();
  const monthlyData = analysisData?.monthlyData ?? [];
  const summaryKpis = buildReportsSummaryKpis(overview);

  const analysisContent = buildReportsAnalysisContent({
    locale,
    roleLabel,
    primaryAction,
    secondaryAction,
    summaryKpis,
    overview,
    report,
    monthlyData,
    canAccessExports: canAccessDetailedReports,
    exportRows: overview
      ? overview.contracts.map(toReportsExportRow)
      : null,
  });

  return (
    <AccountCompletionGate state={accountCompletion}>
      <ReportsPageV2Layout
        activeTab={activeTab}
        analysisContent={analysisContent}
      />
    </AccountCompletionGate>
  );
}
