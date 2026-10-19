import type { Metadata } from "next";
import { AccountCompletionGate } from "@/components/account/account-completion-gate";
import { DeferredReportsWebDocument } from "@/components/reports/deferred-reports-web-document";
import { ReportsFiles } from "@/components/reports/reports-files";
import { ReportsLibrary } from "@/components/reports/reports-library";
import { ReportsPageV2Layout } from "@/components/reports/page-sections/reports-page-v2-layout";
import { resolveReportsTab } from "@/components/reports/page-sections/reports-page-tabs";
import { ReportsAnalysisDashboard } from "@/components/reports/reports-analysis-dashboard";
import { RubriqueExcelExportButton } from "@/components/ui/rubrique-excel-export-button";
import { CTAGroup, SectionHeader } from "@/components/ui/page-structure";
import { CmmButton } from "@/components/ui/cmm-button";
import { ClerkRequiredGate } from "@/components/ui/clerk-required-gate";
import { getCurrentUserIdentity, getCurrentUserRoleLabel } from "@/lib/authz";
import { getSafeAuthSession } from "@/lib/auth/safe-session";
import { loadAccountCompletionGateState } from "@/lib/auth/account-completion-gate";
import { getServerLocale } from "@/lib/server-preferences";
import {
  getProfileLabel,
  getProfilePrimaryAction,
  getProfileSecondaryAction,
  toProfile,
} from "@/lib/profiles";
import {
  buildReportsSummaryKpis,
  loadReportsGenerationData,
  loadReportsAnalysisData,
  loadReportsPublicSummary,
  type ReportsSummaryKpi,
} from "@/lib/reports/page-data";
import type { Locale } from "@/lib/ui/preferences";
import type { ProfileAction } from "@/lib/profiles";
import type { PilotageOverview } from "@/lib/pilotage/overview";
import type { ReportModel } from "@/lib/reports/report-model/types";
import {
  getReportGenerationSnapshotById,
  InvalidReportGenerationIdError,
  listReportGenerationHistoryPage,
} from "@/lib/reports/report-generation-history-store";
import type { ReportGenerationHistoryPage } from "@/lib/reports/report-generation-history-contract";
import { listPublicReportLibraryPage } from "@/lib/reports/report-publication-store";
import type { ReportPublicLibraryPage } from "@/lib/reports/report-publication-contract";
import {
  buildReportGenerationResumeConfig,
  type ReportGenerationResumeConfig,
} from "@/lib/reports/report-generation-resume";
import {
  getReportExportAvailability,
} from "@/lib/reports/report-export-quota";
import type { ReportExportAvailability } from "@/lib/reports/report-export-quota-contract";
import {
  projectPublicActionContract,
  type PublicActionContract,
} from "@/lib/actions/public-dto";
import {
  getSingleActionReportScopeLabel,
  resolveSingleActionReportContract,
  SingleActionReportTargetUnavailableError,
} from "@/lib/reports/single-action-report";

type ReportsPageProps = {
  searchParams: Promise<{
    tab?: string;
    actionId?: string;
    resumeId?: string;
    detail?: string;
  }>;
};

type SingleActionReportPageContext = {
  actionId: string;
  contract: PublicActionContract;
  scopeLabel: string;
};

type SingleActionReportPageError = "not_admissible" | "unavailable";

type ReportsResumeStatus = "not_found" | "invalid" | "unavailable" | "action_unavailable";

function buildSingleActionGenerationData(contract: PublicActionContract) {
  return {
    contracts: [contract],
    isTruncated: false,
    sourceHealth: {
      partial: false,
      failedSources: [],
      availableSources: ["actions" as const],
      warnings: [],
    },
    communityEvents: [],
    communityEventsAvailability: "unavailable" as const,
    actionMediaReadyCountByActionId: {},
    actionMediaAvailability: "available" as const,
  };
}

type ReportsAnalysisContentParams = {
  locale: Locale;
  roleLabel: string;
  primaryAction: ProfileAction;
  secondaryAction?: ProfileAction | null;
  summaryKpis: readonly [ReportsSummaryKpi, ReportsSummaryKpi, ReportsSummaryKpi];
  overview: Pick<PilotageOverview, "methods" | "periodDays"> | null;
  report: ReportModel;
  monthlyData: Awaited<ReturnType<typeof loadReportsAnalysisData>>["monthlyData"];
  dailyExportAvailability: ReportExportAvailability;
};

function buildReportsAnalysisContent({
  locale,
  roleLabel,
  primaryAction,
  secondaryAction,
  summaryKpis,
  overview,
  report,
  monthlyData,
  dailyExportAvailability,
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
          <CTAGroup>
            <RubriqueExcelExportButton
              rubriqueTitle="Rapport d'impact"
              serverEndpoint="/api/reports/exports.csv"
              initialDailyExportAvailability={dailyExportAvailability}
            />
          </CTAGroup>
        </section>
    </div>
  );
}

function buildReportsPublicSummaryContent(
  publicSummary: Awaited<ReturnType<typeof loadReportsPublicSummary>> | null,
  showDetailedCta = false,
) {
  const detailedCta = showDetailedCta ? (
    <CmmButton
      href="?tab=analysis&detail=1"
      prefetch={false}
      tone="primary"
      variant="pill"
      className="mt-2"
    >
      Afficher les analyses détaillées
    </CmmButton>
  ) : null;

  return publicSummary ? (
    <section
      className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
      data-testid="reports-public-summary"
    >
      <div>
        <p className="text-xs font-black uppercase tracking-[0.16em] text-red-600">
          Synthèse publique
        </p>
        <h2 className="mt-1 text-2xl font-black tracking-tight text-slate-950">
          L&apos;impact visible des actions CleanMyMap
        </h2>
        <p className="cmm-text-body mt-2">
          Consultez les indicateurs publics. Un compte est demandé uniquement pour générer un
          export détaillé ou retrouver votre historique.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ["Actions visibles", publicSummary.visibleActions],
          ["Lieux couverts", publicSummary.distinctLocations],
          ["Déchets récoltés", `${publicSummary.wasteKg} kg`],
          ["Bénévoles mobilisés", publicSummary.volunteers],
        ].map(([label, value]) => (
          <div key={String(label)} className="rounded-xl border border-slate-100 bg-slate-50 p-4">
            <p className="text-xs font-semibold text-slate-500">{label}</p>
            <p className="mt-2 text-2xl font-black text-slate-950">{value}</p>
          </div>
        ))}
      </div>
      {detailedCta}
    </section>
  ) : (
    <section role="alert" className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-amber-900">
      La synthèse publique est temporairement indisponible.
      {detailedCta}
    </section>
  );
}

function buildReportsGenerationContent({
  generationData,
  dailyExportAvailability,
  singleAction,
  singleActionError,
  resumeConfig,
  resumeStatus,
}: {
  generationData: Awaited<ReturnType<typeof loadReportsGenerationData>> | null;
  dailyExportAvailability: ReportExportAvailability;
  singleAction?: Pick<SingleActionReportPageContext, "actionId" | "scopeLabel" | "contract"> | null;
  singleActionError?: SingleActionReportPageError | null;
  resumeConfig?: ReportGenerationResumeConfig | null;
  resumeStatus?: ReportsResumeStatus | null;
}) {
  if (singleActionError) {
    const targetUnavailable = singleActionError === "not_admissible";
    return (
      <section
        role="alert"
        data-testid="single-action-report-unavailable"
        className="rounded-[1.75rem] border border-amber-200 bg-amber-50 p-5 shadow-[0_10px_24px_-18px_rgba(180,83,9,0.25)]"
      >
        <p className="text-sm font-black uppercase tracking-[0.16em] text-amber-700">
          {targetUnavailable ? "Action non admissible" : "Résolution indisponible"}
        </p>
        <h2 className="mt-1 text-2xl font-black tracking-tight text-slate-950">
          {targetUnavailable
            ? "Ce rapport mono-action n'est pas disponible"
            : "Le rapport mono-action n'a pas pu être chargé"}
        </h2>
        <p className="mt-2 text-sm leading-6 text-amber-900">
          {targetUnavailable
            ? "L'action doit être terminée, approuvée et publiquement visible. Aucun quota n'a été consommé."
            : "La résolution serveur est temporairement indisponible. Réessayez sans changer l'identifiant de l'action. Aucun quota n'a été consommé."}
        </p>
        <CmmButton
          href="/actions/history"
          tone="secondary"
          variant="pill"
          className="mt-4 min-h-11 border-amber-300 text-amber-900 hover:bg-amber-100"
        >
          Revenir à l&apos;historique
        </CmmButton>
      </section>
    );
  }

  return generationData ? (
    <DeferredReportsWebDocument
      contracts={generationData.contracts}
      isTruncated={generationData.isTruncated}
      sourceHealth={generationData.sourceHealth}
      communityEvents={generationData.communityEvents}
      communityEventsAvailability={generationData.communityEventsAvailability}
      actionMediaReadyCountByActionId={generationData.actionMediaReadyCountByActionId}
      actionMediaAvailability={generationData.actionMediaAvailability}
      dailyExportAvailability={dailyExportAvailability}
      resumeConfig={resumeConfig ?? undefined}
      resumeStatus={resumeStatus ?? undefined}
      singleAction={singleAction ?? undefined}
    />
  ) : (
    <section className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-[0_10px_24px_-18px_rgba(15,23,42,0.18)]">
      <p className="text-sm font-black uppercase tracking-[0.16em] text-red-600">
        Génération indisponible
      </p>
      <h2 className="mt-1 text-2xl font-black tracking-tight text-slate-950">
        Le document détaillé n&apos;a pas pu être chargé
      </h2>
      <p className="cmm-text-body mt-2">
        Réessayez dans un instant. Le chargement serveur des contrats a échoué.
      </p>
    </section>
  );
}

function buildReportsAnalysisUnavailableContent() {
  return (
    <section
      role="alert"
      className="rounded-[1.75rem] border border-amber-200 bg-amber-50 p-5 shadow-[0_10px_24px_-18px_rgba(180,83,9,0.25)]"
    >
      <p className="text-sm font-black uppercase tracking-[0.16em] text-amber-700">
        Analyse temporairement indisponible
      </p>
      <h2 className="mt-1 text-2xl font-black tracking-tight text-slate-950">
        Les indicateurs n&apos;ont pas pu être chargés
      </h2>
      <p className="mt-2 text-sm leading-6 text-amber-900">
        Réessayez dans un instant. Aucun zéro n&apos;est affiché tant que les données Analyse ne
        sont pas disponibles.
      </p>
    </section>
  );
}

function buildAnonymousGenerationContent(clerkReachable: boolean) {
  return (
    <ClerkRequiredGate
      isAuthenticated={false}
      authUnavailable={!clerkReachable}
      mode="blur"
      stateHeadingLevel="h2"
      lockedPreview={
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="cmm-text-caption font-black uppercase tracking-[0.18em] text-slate-700">
            Compte requis pour générer
          </p>
          <p className="cmm-text-body mt-3">
            La synthèse est publique. Connectez-vous uniquement pour préparer un export détaillé ou
            consulter votre historique.
          </p>
        </section>
      }
    >
      <div />
    </ClerkRequiredGate>
  );
}

export const metadata: Metadata = {
  title: "Rapports d'impact",
  description:
    "Analysez les données de nettoyage participatif, les indicateurs d'impact calculés par proxy et la qualité des données.",
  alternates: { canonical: "/reports" },
  robots: { index: true, follow: true },
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
  const identity = accountCompletion || !userId
    ? null
    : await getCurrentUserIdentity({ userId }).catch(() => null);
  const authorizationRole = role === "anonymous" ? "benevole" : role;
  const profile = accountCompletion?.currentProfile ?? identity?.activeProfile ?? toProfile(authorizationRole);
  const activeTab = resolveReportsTab(
    resolvedSearchParams.tab,
  );
  const showDetailedAnalysis = resolvedSearchParams.detail === "1";
  const primaryAction = getProfilePrimaryAction(profile);
  const secondaryAction = getProfileSecondaryAction(profile);
  const roleLabel = userId
    ? getProfileLabel(profile, locale)
    : locale === "fr"
      ? "Visiteur"
      : "Visitor";

  if (activeTab === "library") {
    const emptyPage: ReportPublicLibraryPage = { rows: [], page: 1, pageSize: 12, total: 0, hasNextPage: false, hasPreviousPage: false };
    const initialResult = await listPublicReportLibraryPage({ page: 1, pageSize: 12 })
      .then((page) => ({ page, availability: "available" as const }))
      .catch(() => ({ page: emptyPage, availability: "unavailable" as const }));
    return <ReportsPageV2Layout activeTab="library" libraryContent={<ReportsLibrary initialPage={initialResult.page} initialAvailability={initialResult.availability} />} />;
  }

  if (!userId) {
    if (activeTab === "generation") {
      return (
        <ReportsPageV2Layout
          activeTab={activeTab}
          generationContent={buildAnonymousGenerationContent(clerkReachable)}
        />
      );
    }

    if (activeTab === "files") {
      return (
        <ReportsPageV2Layout
          activeTab={activeTab}
          filesContent={buildAnonymousGenerationContent(clerkReachable)}
        />
      );
    }

    const publicSummary = await loadReportsPublicSummary().catch(() => null);
    const publicSummaryContent = buildReportsPublicSummaryContent(publicSummary);

    return <ReportsPageV2Layout activeTab="analysis" analysisContent={publicSummaryContent} />;
  }

  if (activeTab === "generation") {
    const requestedActionId = resolvedSearchParams.actionId?.trim() || null;
    let singleAction: SingleActionReportPageContext | null = null;
    let singleActionError: SingleActionReportPageError | null = null;
    if (requestedActionId) {
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(requestedActionId)) {
        singleActionError = "not_admissible";
      } else {
        try {
          const resolvedContract = await resolveSingleActionReportContract(requestedActionId);
          singleAction = {
            actionId: requestedActionId,
            contract: projectPublicActionContract(resolvedContract),
            scopeLabel: getSingleActionReportScopeLabel(resolvedContract),
          };
        } catch (error) {
          singleActionError = error instanceof SingleActionReportTargetUnavailableError
            ? "not_admissible"
            : "unavailable";
        }
      }
    }

    const resumeId = resolvedSearchParams.resumeId?.trim() || null;
    const resumeContextResult = resumeId
      ? getReportGenerationSnapshotById(resumeId, userId)
          .then(async (record) => {
            if (!record) return { config: null, status: "not_found" as const, singleAction: null };
            const config = buildReportGenerationResumeConfig(record);
            if (config.scope?.kind !== "single_action") {
              return { config, status: null, singleAction: null };
            }
            try {
              const contract = await resolveSingleActionReportContract(config.scope.value);
              return {
                config,
                status: null,
                singleAction: {
                  actionId: config.scope.value,
                  contract: projectPublicActionContract(contract),
                  scopeLabel: getSingleActionReportScopeLabel(contract),
                },
              };
            } catch (error) {
              return {
                config,
                status: error instanceof SingleActionReportTargetUnavailableError
                  ? "action_unavailable" as const
                  : "unavailable" as const,
                singleAction: null,
              };
            }
          })
          .catch((error) => ({
            config: null,
            status: error instanceof InvalidReportGenerationIdError ? "invalid" as const : "unavailable" as const,
            singleAction: null,
          }))
      : Promise.resolve({ config: null, status: null, singleAction: null });
    const [generationData, resumeContext, dailyExportAvailability] = await Promise.all([
      singleActionError
        ? Promise.resolve(null)
        : resumeContextResult.then((context) => {
            const resumeSingleAction = context.config?.scope?.kind === "single_action"
              ? context.singleAction
              : null;
            const activeSingleAction = resumeSingleAction ?? (
              context.config?.scope?.kind === "single_action" ? null : singleAction
            );
            if (context.config?.scope?.kind === "single_action" && !resumeSingleAction) {
              return null;
            }
            return activeSingleAction
              ? buildSingleActionGenerationData(activeSingleAction.contract)
              : loadReportsGenerationData(userId).catch(() => null);
          }),
      resumeContextResult,
      getReportExportAvailability(userId).catch(
        () => "unavailable" as ReportExportAvailability,
      ),
    ]);

    const activeSingleAction = resumeContext.config?.scope?.kind === "single_action"
      ? resumeContext.singleAction
      : singleAction;

    const generationContent = buildReportsGenerationContent({
      generationData,
      dailyExportAvailability,
      singleAction: activeSingleAction,
      singleActionError,
      resumeConfig: resumeContext.config,
      resumeStatus: resumeContext.status,
    });

    return (
      <AccountCompletionGate state={accountCompletion}>
        <ReportsPageV2Layout
          activeTab={activeTab}
          generationContent={generationContent}
        />
      </AccountCompletionGate>
    );
  }

  if (activeTab === "files") {
    const emptyPage: ReportGenerationHistoryPage = {
      rows: [],
      page: 1,
      pageSize: 12,
      total: 0,
      hasNextPage: false,
      hasPreviousPage: false,
    };
    const initialResult = await listReportGenerationHistoryPage(userId, { page: 1, pageSize: 12 })
      .then((page) => ({ page, availability: "available" as const }))
      .catch(() => ({ page: emptyPage, availability: "unavailable" as const }));
    return (
      <AccountCompletionGate state={accountCompletion}>
        <ReportsPageV2Layout
          activeTab={activeTab}
          filesContent={<ReportsFiles initialPage={initialResult.page} initialAvailability={initialResult.availability} />}
        />
      </AccountCompletionGate>
    );
  }

  if (!showDetailedAnalysis) {
    const publicSummary = await loadReportsPublicSummary().catch(() => null);
    const publicSummaryContent = buildReportsPublicSummaryContent(publicSummary, true);

    return (
      <AccountCompletionGate state={accountCompletion}>
        <ReportsPageV2Layout
          activeTab="analysis"
          analysisContent={publicSummaryContent}
        />
      </AccountCompletionGate>
    );
  }

  const analysisResult = await loadReportsAnalysisData()
    .then((data) => ({ data, availability: "available" as const }))
    .catch(() => ({ data: null, availability: "unavailable" as const }));
  const dailyExportAvailability = await getReportExportAvailability(userId).catch(
    () => "unavailable" as ReportExportAvailability,
  );
  const analysisContent = analysisResult.availability === "unavailable" ? (
    buildReportsAnalysisUnavailableContent()
  ) : (
    (() => {
      const { overview, report, monthlyData } = analysisResult.data;
      return buildReportsAnalysisContent({
        locale,
        roleLabel,
        primaryAction,
        secondaryAction,
        summaryKpis: buildReportsSummaryKpis(overview),
        overview,
        report,
        monthlyData,
        dailyExportAvailability,
      });
    })()
  );

  return (
    <AccountCompletionGate state={accountCompletion}>
      <ReportsPageV2Layout
        activeTab={activeTab}
        analysisContent={analysisContent}
      />
    </AccountCompletionGate>
  );
}
