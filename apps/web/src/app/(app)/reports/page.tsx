import type { Metadata } from "next";
import { AccountCompletionGate } from "@/components/account/account-completion-gate";
import { ReportsFiles } from "@/components/reports/reports-files";
import { ReportsLibrary } from "@/components/reports/reports-library";
import { ReportsPageV2Layout } from "@/components/reports/page-sections/reports-page-v2-layout";
import { resolveReportsTab } from "@/components/reports/page-sections/reports-page-tabs";
import { getCurrentUserIdentity, getCurrentUserRoleLabel } from "@/lib/authz";
import { getSafeAuthSession } from "@/lib/auth/safe-session";
import { loadAccountCompletionGateState } from "@/lib/auth/account-completion-gate";
import { buildPageMetadata } from "@/lib/metadata";
import { getServerLocale } from "@/lib/server-preferences";
import {
  getProfileLabel,
  getProfilePrimaryAction,
  getProfileSecondaryAction,
  toProfile,
} from "@/lib/profiles";
import { buildReportsSummaryKpis } from "@/lib/reports/page-data";
import {
  buildAnonymousGenerationContent,
  buildReportsAnalysisContent,
  buildReportsAnalysisUnavailableContent,
  buildReportsGenerationContent,
  buildReportsPublicSummaryContent,
} from "./page-content";
import {
  resolveReportsGenerationContext,
} from "./page-generation-context";
import {
  loadReportsAnalysisPage,
  loadReportsExportAvailability,
  loadReportsFilesPage,
  loadReportsGenerationPage,
  loadReportsLibraryPage,
  loadReportsPublicSummaryPage,
} from "./page-loaders";

type ReportsPageProps = {
  searchParams: Promise<{
    tab?: string;
    actionId?: string;
    resumeId?: string;
    detail?: string;
  }>;
};

export const metadata: Metadata = buildPageMetadata("/reports", {
  title: "Rapports d'impact",
  description:
    "Analysez les données de nettoyage participatif, les indicateurs d'impact calculés par proxy et la qualité des données.",
  robots: { index: true, follow: true },
});

export default async function ReportsPage({ searchParams }: ReportsPageProps) {
  const [{ userId, clerkReachable }, locale] = await Promise.all([
    getSafeAuthSession(),
    getServerLocale(),
  ]);
  const resolvedSearchParams = await searchParams;
  const accountCompletion = userId
    ? await loadAccountCompletionGateState({ userId, clerkReachable }).catch(() => null)
    : null;
  const role =
    userId && clerkReachable
      ? await getCurrentUserRoleLabel().catch(() => "anonymous" as const)
      : ("anonymous" as const);
  const identity =
    accountCompletion || !userId
      ? null
      : await getCurrentUserIdentity({ userId }).catch(() => null);
  const authorizationRole = role === "anonymous" ? "benevole" : role;
  const profile =
    accountCompletion?.currentProfile ?? identity?.activeProfile ?? toProfile(authorizationRole);
  const activeTab = resolveReportsTab(resolvedSearchParams.tab);
  const showDetailedAnalysis = resolvedSearchParams.detail === "1";
  const primaryAction = getProfilePrimaryAction(profile);
  const secondaryAction = getProfileSecondaryAction(profile);
  const roleLabel = userId
    ? getProfileLabel(profile, locale)
    : locale === "fr"
      ? "Visiteur"
      : "Visitor";

  if (activeTab === "library") {
    const initialResult = await loadReportsLibraryPage();
    return (
      <ReportsPageV2Layout
        activeTab="library"
        libraryContent={
          <ReportsLibrary
            initialPage={initialResult.page}
            initialAvailability={initialResult.availability}
          />
        }
      />
    );
  }

  if (!userId) {
    if (activeTab === "generation" || activeTab === "files") {
      const lockedContent = buildAnonymousGenerationContent(clerkReachable);
      return (
        <ReportsPageV2Layout
          activeTab={activeTab}
          {...(activeTab === "generation"
            ? { generationContent: lockedContent }
            : { filesContent: lockedContent })}
        />
      );
    }

    const publicSummary = await loadReportsPublicSummaryPage();
    return (
      <ReportsPageV2Layout
        activeTab="analysis"
        analysisContent={buildReportsPublicSummaryContent(publicSummary)}
      />
    );
  }

  if (activeTab === "generation") {
    const generationContext = await resolveReportsGenerationContext({
      requestedActionId: resolvedSearchParams.actionId?.trim() || null,
      resumeId: resolvedSearchParams.resumeId?.trim() || null,
      userId,
    });
    const {
      generationData,
      resumeContext,
      dailyExportAvailability,
    } = await loadReportsGenerationPage({ userId, context: generationContext });
    const activeSingleAction =
      resumeContext.config?.scope?.kind === "single_action"
        ? resumeContext.singleAction
        : generationContext.singleAction;
    const generationContent = buildReportsGenerationContent({
      generationData,
      dailyExportAvailability,
      singleAction: activeSingleAction,
      singleActionError: generationContext.singleActionError,
      resumeConfig: resumeContext.config,
      resumeStatus: resumeContext.status,
    });

    return (
      <AccountCompletionGate state={accountCompletion}>
        <ReportsPageV2Layout activeTab={activeTab} generationContent={generationContent} />
      </AccountCompletionGate>
    );
  }

  if (activeTab === "files") {
    const initialResult = await loadReportsFilesPage(userId);
    return (
      <AccountCompletionGate state={accountCompletion}>
        <ReportsPageV2Layout
          activeTab={activeTab}
          filesContent={
            <ReportsFiles
              initialPage={initialResult.page}
              initialAvailability={initialResult.availability}
            />
          }
        />
      </AccountCompletionGate>
    );
  }

  if (!showDetailedAnalysis) {
    const publicSummary = await loadReportsPublicSummaryPage();
    return (
      <AccountCompletionGate state={accountCompletion}>
        <ReportsPageV2Layout
          activeTab="analysis"
          analysisContent={buildReportsPublicSummaryContent(publicSummary, true)}
        />
      </AccountCompletionGate>
    );
  }

  const analysisResult = await loadReportsAnalysisPage();
  const dailyExportAvailability = await loadReportsExportAvailability(userId);
  const analysisContent =
    analysisResult.availability === "unavailable"
      ? buildReportsAnalysisUnavailableContent()
      : buildReportsAnalysisContent({
          locale,
          roleLabel,
          primaryAction,
          secondaryAction,
          summaryKpis: buildReportsSummaryKpis(analysisResult.data.overview),
          overview: analysisResult.data.overview,
          report: analysisResult.data.report,
          monthlyData: analysisResult.data.monthlyData,
          dailyExportAvailability,
        });

  return (
    <AccountCompletionGate state={accountCompletion}>
      <ReportsPageV2Layout activeTab={activeTab} analysisContent={analysisContent} />
    </AccountCompletionGate>
  );
}
