import {
  detailLevelLabel,
  periodLabel,
  type DetailLevelId,
  type ModuleState,
  type PeriodId,
} from "@/components/reports/web-document/reports-web-document.shared";
import type { PdfReportPayload } from "@/lib/pdf-export/simple-pdf";

export const REPORT_GENERATION_HISTORY_LIMIT = 12;

export type ReportGenerationHistoryRow = {
  id: string;
  report: string;
  period: string;
  perimeter: string;
  detail: string;
  generatedAt: string;
};

export type ReportGenerationHistoryInput = {
  payload: PdfReportPayload;
  scopeKind: "global" | "account" | "association" | "arrondissement";
  scopeValue: string;
  scopeLabel: string;
  detailLevel: DetailLevelId;
  modules: ModuleState;
};

export type ReportGenerationHistoryMetadata = {
  id: string;
  title: string;
  periodId: PeriodId;
  scopeLabel: string;
  detailLevel: DetailLevelId;
  generatedAt: string;
};

export function isReportGenerationHistoryRow(
  value: unknown,
): value is ReportGenerationHistoryRow {
  if (!value || typeof value !== "object") {
    return false;
  }
  const row = value as Record<string, unknown>;
  return ["id", "report", "period", "perimeter", "detail", "generatedAt"].every(
    (key) => typeof row[key] === "string" && row[key] !== "",
  );
}

export function formatReportGenerationDate(value: string): string | null {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) {
    return null;
  }

  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

export function toReportGenerationHistoryRow(
  metadata: ReportGenerationHistoryMetadata,
): ReportGenerationHistoryRow | null {
  const generatedAt = formatReportGenerationDate(metadata.generatedAt);
  if (!generatedAt) {
    return null;
  }

  return {
    id: metadata.id,
    report: metadata.title,
    period: periodLabel(metadata.periodId),
    perimeter: metadata.scopeLabel,
    detail: detailLevelLabel(metadata.detailLevel),
    generatedAt,
  };
}
