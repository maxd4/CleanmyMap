import type { Metadata } from "next";
import { AccountCompletionGate } from "@/components/account/account-completion-gate";
import { DeferredReportsWebDocument } from "@/components/reports/deferred-reports-web-document";
import { ReportsPageV2Layout } from "@/components/reports/page-sections/reports-page-v2-layout";
import { ReportsAnalysisDashboard } from "@/components/reports/reports-analysis-dashboard";
import { RubriqueExcelExportButton } from "@/components/ui/rubrique-excel-export-button";
import { CTAGroup, SectionHeader } from "@/components/ui/page-structure";
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
import { listReportGenerationHistory } from "@/lib/reports/report-generation-history-store";
import {
  getReportExportAvailability,
} from "@/lib/reports/report-export-quota";
import type { ReportExportAvailability } from "@/lib/reports/report-export-quota-contract";

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
  dailyExportAvailability: ReportExportAvailability;
};

function resolveReportsTab(
  requestedTab: string | undefined,
  isAuthenticated: boolean,
): ReportsPageTabId {
  if (requestedTab === "generation") {
    return "generation";
  }

  if (requestedTab === "analysis" || requestedTab === "pilotage") {
    return "analysis";
  }

  return isAuthenticated ? "generation" : "analysis";
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
  const identity = accountCompletion || !userId
    ? null
    : await getCurrentUserIdentity({ userId }).catch(() => null);
  const authorizationRole = role === "anonymous" ? "benevole" : role;
  const profile = accountCompletion?.currentProfile ?? identity?.activeProfile ?? toProfile(authorizationRole);
  const activeTab = resolveReportsTab(
    resolvedSearchParams.tab,
    Boolean(userId),
  );
  const primaryAction = getProfilePrimaryAction(profile);
  const secondaryAction = getProfileSecondaryAction(profile);
  const roleLabel = userId
    ? getProfileLabel(profile, locale)
    : locale === "fr"
      ? "Visiteur"
      : "Visitor";

  if (!userId) {
    if (activeTab === "generation") {
      return (
        <ReportsPageV2Layout
          activeTab={activeTab}
          generationContent={
            <ClerkRequiredGate
              isAuthenticated={false}
              authUnavailable={!clerkReachable}
              mode="blur"
              lockedPreview={
                <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <p className="cmm-text-caption font-black uppercase tracking-[0.18em] text-slate-700">
                    Compte requis pour générer
                  </p>
                  <p className="cmm-text-body mt-3">
                    La synthèse est publique. Connectez-vous uniquement pour préparer un export
                    détaillé ou consulter votre historique.
                  </p>
                </section>
              }
            >
              <div />
            </ClerkRequiredGate>
          }
        />
      );
    }

    const publicSummary = await loadReportsPublicSummary().catch(() => null);
    const publicSummaryContent = publicSummary ? (
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
      </section>
    ) : (
      <section role="alert" className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-amber-900">
        La synthèse publique est temporairement indisponible.
      </section>
    );

    return <ReportsPageV2Layout activeTab="analysis" analysisContent={publicSummaryContent} />;
  }

  if (activeTab === "generation") {
    const [generationData, historyResult, dailyExportAvailability] = await Promise.all([
      loadReportsGenerationData().catch(() => null),
      listReportGenerationHistory(userId)
        .then((rows) => ({ rows, availability: "available" as const }))
        .catch(() => ({ rows: [], availability: "unavailable" as const })),
      getReportExportAvailability(userId).catch(
        () => "unavailable" as ReportExportAvailability,
      ),
    ]);

    const generationContent = generationData ? (
      <DeferredReportsWebDocument
        contracts={generationData.contracts}
        isTruncated={generationData.isTruncated}
        sourceHealth={generationData.sourceHealth}
        communityEvents={generationData.communityEvents}
        communityEventsAvailability={generationData.communityEventsAvailability}
        initialRecentRows={historyResult.rows}
        initialHistoryAvailability={historyResult.availability}
        dailyExportAvailability={dailyExportAvailability}
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
          Réessayez dans un instant. Le chargement serveur des contrats a échoué.
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

  const analysisResult = await loadReportsAnalysisData()
    .then((data) => ({ data, availability: "available" as const }))
    .catch(() => ({ data: null, availability: "unavailable" as const }));
  const dailyExportAvailability = await getReportExportAvailability(userId).catch(
    () => "unavailable" as ReportExportAvailability,
  );
  const analysisContent = analysisResult.availability === "unavailable" ? (
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
