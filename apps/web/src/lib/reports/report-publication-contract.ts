import type { ReportGenerationSnapshotRecord } from "./report-generation-history-store";
import type { ReportGenerationHistoryTheme } from "./report-generation-history-contract";
import { periodLabel } from "./report-pdf-data";

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

const PRIVATE_MARKERS = /(^|[^a-z])(id|uuid|email|e-mail|phone|tel|clerk|user|owner|token|secret|media|storage|signed|private|coordinate|latitude|longitude|lat|lon|url)([^a-z]|$)/i;
const UUID_PATTERN = /[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i;
const CONTACT_PATTERN = /(?:[\w.+-]+@[\w.-]+\.[a-z]{2,}|(?:\+?\d[\d .-]{7,}\d))/i;

function containsPrivateMarker(value: unknown): boolean {
  if (typeof value === "string") {
    const isDate = /^\d{4}-\d{2}-\d{2}(?:T|$)/.test(value);
    return PRIVATE_MARKERS.test(value) || UUID_PATTERN.test(value) || (!isDate && CONTACT_PATTERN.test(value));
  }
  if (Array.isArray(value)) return value.some(containsPrivateMarker);
  if (value && typeof value === "object") {
    return Object.entries(value).some(([key, child]) => PRIVATE_MARKERS.test(key) || (key !== "generatedAt" && containsPrivateMarker(child)));
  }
  return false;
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
