import type { ReportGenerationSnapshotRecord } from "./report-generation-history-store";
import type { ReportGenerationHistoryTheme } from "./report-generation-history-contract";
import { periodLabel } from "./report-pdf-data";
import { containsPrivateMarker } from "./report-publication-private-data";

export type ReportPublicLibrarySort = "asc" | "desc";
export type ReportPublicLibraryTheme = ReportGenerationHistoryTheme;
export type ReportPublicLibraryPeriod =
  | "thirty_days"
  | "three_months"
  | "six_months"
  | "twelve_months"
  | "current_year"
  | "full_history"
  | "custom_range";

export type ReportPublicLibraryRow = {
  id: string;
  title: string;
  period: string;
  scope: string;
  theme: ReportPublicLibraryTheme;
  publishedAt: string;
  authorLabel: string | null;
  viewUrl: string;
  downloadUrl: string;
};

export type ReportPublicLibraryPage = {
  rows: ReportPublicLibraryRow[];
  page: number;
  pageSize: number;
  total: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
};

export type ReportPublicLibraryFilters = {
  page?: number;
  pageSize?: number;
  search?: string;
  periodId?: ReportPublicLibraryPeriod;
  theme?: ReportPublicLibraryTheme;
  sort?: ReportPublicLibrarySort;
};

export type ReportPublicationRecord = {
  id: string;
  generationId: string;
  artifactId: string;
  createdByClerkId: string;
  title: string;
  periodId: ReportPublicLibraryPeriod;
  scopeLabel: string;
  theme: ReportPublicLibraryTheme;
  publishedAt: string;
  revokedAt: string | null;
  publicAuthorLabel: string | null;
};

export class ReportPublicationProjectionError extends Error {
  constructor(message = "Ce rapport ne peut pas être publié sans exposer de données privées.") {
    super(message);
    this.name = "ReportPublicationProjectionError";
  }
}

export function assertReportPublicationEligibility(
  generation: ReportGenerationSnapshotRecord,
): void {
  if (generation.scopeKind === "single_action") {
    throw new ReportPublicationProjectionError("Les rapports mono-action ne sont pas publiables dans la bibliothèque commune.");
  }
  const payload = generation.snapshot;
  if (payload.organizationName?.trim() || payload.data.rows?.length || payload.data.columns?.length) {
    throw new ReportPublicationProjectionError();
  }
  if (containsPrivateMarker(payload.title) || containsPrivateMarker(generation.scopeLabel) || containsPrivateMarker(payload.data)) {
    throw new ReportPublicationProjectionError();
  }
}

export function projectReportPublicationPreview(params: {
  generation: ReportGenerationSnapshotRecord;
  theme: ReportPublicLibraryTheme;
  artifactReady: boolean;
  publishedAt?: string | null;
}) {
  assertReportPublicationEligibility(params.generation);
  return {
    title: params.generation.snapshot.title,
    period: params.generation.snapshot.periode,
    scope: params.generation.scopeLabel,
    theme: params.theme,
    artifactReady: params.artifactReady,
    publishedAt: params.publishedAt ?? null,
    authorLabel: null,
    documentUrl: `/api/reports/generations/${encodeURIComponent(params.generation.id)}/pdf?theme=${params.theme}`,
    communicatedContent: "Le PDF réellement accessible pour cette variante, sans JSON, CSV, action ni média privé.",
  };
}

export function projectReportPublicationRow(record: ReportPublicationRecord): ReportPublicLibraryRow {
  return {
    id: record.id,
    title: record.title,
    period: periodLabel(record.periodId),
    scope: record.scopeLabel,
    theme: record.theme,
    publishedAt: record.publishedAt,
    authorLabel: record.publicAuthorLabel,
    viewUrl: `/api/reports/library/${encodeURIComponent(record.id)}/pdf`,
    downloadUrl: `/api/reports/library/${encodeURIComponent(record.id)}/pdf?download=1`,
  };
}
