import {
  loadReportsAnalysisData,
  loadReportsGenerationData,
  loadReportsPublicSummary,
} from "@/lib/reports/page-data";
import {
  listReportGenerationHistoryPage,
} from "@/lib/reports/report-generation-history-store";
import type { ReportGenerationHistoryPage } from "@/lib/reports/report-generation-history-contract";
import { listPublicReportLibraryPage } from "@/lib/reports/report-publication-store";
import type { ReportPublicLibraryPage } from "@/lib/reports/report-publication-contract";
import { getReportExportAvailability } from "@/lib/reports/report-export-quota";
import type { ReportExportAvailability } from "@/lib/reports/report-export-quota-contract";
import {
  buildSingleActionGenerationData,
  type ReportsGenerationContext,
  type ReportsResumeContext,
  type SingleActionReportPageContext,
} from "./page-generation-context";

export type ReportsGenerationData = Awaited<ReturnType<typeof loadReportsGenerationData>>;
export type ReportsAnalysisData = Awaited<ReturnType<typeof loadReportsAnalysisData>>;

export async function loadReportsLibraryPage() {
  const emptyPage: ReportPublicLibraryPage = {
    rows: [],
    page: 1,
    pageSize: 12,
    total: 0,
    hasNextPage: false,
    hasPreviousPage: false,
  };

  return listPublicReportLibraryPage({ page: 1, pageSize: 12 })
    .then((page) => ({ page, availability: "available" as const }))
    .catch(() => ({ page: emptyPage, availability: "unavailable" as const }));
}

export async function loadReportsFilesPage(userId: string) {
  const emptyPage: ReportGenerationHistoryPage = {
    rows: [],
    page: 1,
    pageSize: 12,
    total: 0,
    hasNextPage: false,
    hasPreviousPage: false,
  };

  return listReportGenerationHistoryPage(userId, { page: 1, pageSize: 12 })
    .then((page) => ({ page, availability: "available" as const }))
    .catch(() => ({ page: emptyPage, availability: "unavailable" as const }));
}

export function loadReportsPublicSummaryPage() {
  return loadReportsPublicSummary().catch(() => null);
}

export function loadReportsAnalysisPage(): Promise<
  | { data: ReportsAnalysisData; availability: "available" }
  | { data: null; availability: "unavailable" }
> {
  return loadReportsAnalysisData()
    .then((data) => ({ data, availability: "available" as const }))
    .catch(() => ({ data: null, availability: "unavailable" as const }));
}

export function loadReportsExportAvailability(
  userId: string,
): Promise<ReportExportAvailability> {
  return getReportExportAvailability(userId).catch(
    () => "unavailable" as ReportExportAvailability,
  );
}

export async function loadReportsGenerationPage({
  userId,
  context,
}: {
  userId: string;
  context: ReportsGenerationContext;
}): Promise<{
  generationData: ReportsGenerationData | null;
  resumeContext: ReportsResumeContext;
  dailyExportAvailability: ReportExportAvailability;
}> {
  const { singleActionError, resumeContext: resumeContextPromise } = context;
  const dailyExportAvailabilityPromise = loadReportsExportAvailability(userId);
  const resumeContext = await resumeContextPromise;
  const [generationData, dailyExportAvailability] = await Promise.all([
    singleActionError
      ? Promise.resolve(null)
      : loadGenerationDataForContext(userId, context.singleAction, resumeContext),
    dailyExportAvailabilityPromise,
  ]);

  return { generationData, resumeContext, dailyExportAvailability };
}

function loadGenerationDataForContext(
  userId: string,
  requestedSingleAction: SingleActionReportPageContext | null,
  resumeContext: ReportsResumeContext,
) {
  const resumeSingleAction =
    resumeContext.config?.scope?.kind === "single_action"
      ? resumeContext.singleAction
      : null;
  const activeSingleAction =
    resumeSingleAction ??
    (resumeContext.config?.scope?.kind === "single_action"
      ? null
      : requestedSingleAction);

  if (resumeContext.config?.scope?.kind === "single_action" && !resumeSingleAction) {
    return Promise.resolve(null);
  }

  return activeSingleAction
    ? Promise.resolve(buildSingleActionGenerationData(activeSingleAction.contract))
    : loadReportsGenerationData(userId).catch(() => null);
}
