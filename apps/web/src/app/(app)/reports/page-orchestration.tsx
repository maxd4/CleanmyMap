import { AccountCompletionGate } from "@/components/account/account-completion-gate";
import { ReportsFiles } from "@/components/reports/reports-files";
import { ReportsLibrary } from "@/components/reports/reports-library";
import { ReportsPageV2Layout } from "@/components/reports/page-sections/reports-page-v2-layout";
import { getCurrentUserIdentity, getCurrentUserRoleLabel } from "@/lib/authz";
import { getSafeAuthSession } from "@/lib/auth/safe-session";
import { loadAccountCompletionGateState } from "@/lib/auth/account-completion-gate";
import { getServerLocale } from "@/lib/server-preferences";
import { getProfileLabel, getProfilePrimaryAction, getProfileSecondaryAction, toProfile } from "@/lib/profiles";
import { buildReportsSummaryKpis } from "@/lib/reports/page-data";
import {
  buildAnonymousGenerationContent,
  buildReportsAnalysisContent,
  buildReportsAnalysisUnavailableContent,
  buildReportsGenerationContent,
  buildReportsPublicSummaryContent,
} from "./page-content";
import { resolveReportsGenerationContext } from "./page-generation-context";
import {
  loadReportsAnalysisPage,
  loadReportsExportAvailability,
  loadReportsFilesPage,
  loadReportsGenerationPage,
  loadReportsLibraryPage,
  loadReportsPublicSummaryPage,
} from "./page-loaders";
import type { ReportsResumeStatus } from "@/components/reports/web-document/reports-web-document.types";
import type { Locale } from "@/lib/ui/preferences";

export type ReportsPageSearchParams = {
  tab?: string;
  actionId?: string;
  resumeId?: string;
  detail?: string;
};

type ReportsPageContext = {
  userId: string | null;
  clerkReachable: boolean;
  locale: Locale;
  accountCompletion: Awaited<ReturnType<typeof loadAccountCompletionGateState>> | null;
  role: Awaited<ReturnType<typeof getCurrentUserRoleLabel>> | "anonymous";
  identity: Awaited<ReturnType<typeof getCurrentUserIdentity>> | null;
};

export async function loadReportsPageContext(): Promise<ReportsPageContext> {
  const [{ userId, clerkReachable }, locale] = await Promise.all([getSafeAuthSession(), getServerLocale()]);
  const accountCompletion = userId
    ? await loadAccountCompletionGateState({ userId, clerkReachable }).catch(() => null)
    : null;
  const role = userId && clerkReachable ? await getCurrentUserRoleLabel().catch(() => "anonymous" as const) : "anonymous" as const;
  const identity = accountCompletion || !userId ? null : await getCurrentUserIdentity({ userId }).catch(() => null);
  return { userId, clerkReachable, locale, accountCompletion, role, identity };
}

export async function renderReportsLibraryTab() {
  const initialResult = await loadReportsLibraryPage();
  return <ReportsPageV2Layout activeTab="library" libraryContent={<ReportsLibrary initialPage={initialResult.page} initialAvailability={initialResult.availability} />} />;
}

export async function renderReportsAnonymousTab(tab: "generation" | "files" | "analysis", clerkReachable: boolean) {
  if (tab === "generation" || tab === "files") {
    const lockedContent = buildAnonymousGenerationContent(clerkReachable);
    return <ReportsPageV2Layout activeTab={tab} {...(tab === "generation" ? { generationContent: lockedContent } : { filesContent: lockedContent })} />;
  }
  const publicSummary = await loadReportsPublicSummaryPage();
  return <ReportsPageV2Layout activeTab="analysis" analysisContent={buildReportsPublicSummaryContent(publicSummary)} />;
}

export async function renderReportsAuthenticatedTab(params: {
  tab: "generation" | "files" | "analysis";
  detail: boolean;
  actionId?: string;
  resumeId?: string;
  userId: string;
  accountCompletion: ReportsPageContext["accountCompletion"];
  clerkReachable: boolean;
  locale: Locale;
  role: ReportsPageContext["role"];
  identity: ReportsPageContext["identity"];
}) {
  if (params.tab === "generation") {
    const generationContext = await resolveReportsGenerationContext({ requestedActionId: params.actionId?.trim() || null, resumeId: params.resumeId?.trim() || null, userId: params.userId });
    const { generationData, resumeContext, dailyExportAvailability } = await loadReportsGenerationPage({ userId: params.userId, context: generationContext });
    const activeSingleAction = resumeContext.config?.scope?.kind === "single_action" ? resumeContext.singleAction : generationContext.singleAction;
    const generationContent = buildReportsGenerationContent({ generationData, dailyExportAvailability, singleAction: activeSingleAction, singleActionError: generationContext.singleActionError, resumeConfig: resumeContext.config, resumeStatus: resumeContext.status as ReportsResumeStatus });
    return <AccountCompletionGate state={params.accountCompletion}><ReportsPageV2Layout activeTab="generation" generationContent={generationContent} /></AccountCompletionGate>;
  }
  if (params.tab === "files") {
    const initialResult = await loadReportsFilesPage(params.userId);
    return <AccountCompletionGate state={params.accountCompletion}><ReportsPageV2Layout activeTab="files" filesContent={<ReportsFiles initialPage={initialResult.page} initialAvailability={initialResult.availability} />} /></AccountCompletionGate>;
  }
  if (!params.detail) {
    const publicSummary = await loadReportsPublicSummaryPage();
    return <AccountCompletionGate state={params.accountCompletion}><ReportsPageV2Layout activeTab="analysis" analysisContent={buildReportsPublicSummaryContent(publicSummary, true)} /></AccountCompletionGate>;
  }
  const analysisResult = await loadReportsAnalysisPage();
  const dailyExportAvailability = await loadReportsExportAvailability(params.userId);
  const authorizationRole = params.role === "anonymous" ? "benevole" : params.role;
  const profile = params.accountCompletion?.currentProfile ?? params.identity?.activeProfile ?? toProfile(authorizationRole);
  const roleLabel = getProfileLabel(profile, params.locale);
  const analysisContent = analysisResult.availability === "unavailable"
    ? buildReportsAnalysisUnavailableContent()
    : buildReportsAnalysisContent({ locale: params.locale, roleLabel, primaryAction: getProfilePrimaryAction(profile), secondaryAction: getProfileSecondaryAction(profile), summaryKpis: buildReportsSummaryKpis(analysisResult.data.overview), overview: analysisResult.data.overview, report: analysisResult.data.report, monthlyData: analysisResult.data.monthlyData, dailyExportAvailability });
  return <AccountCompletionGate state={params.accountCompletion}><ReportsPageV2Layout activeTab="analysis" analysisContent={analysisContent} /></AccountCompletionGate>;
}
