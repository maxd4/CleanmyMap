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

export type ReportGenerationHistoryRecord = ReportGenerationHistoryInput & {
  id: string;
  createdAt: string;
  generatedAt: string;
  createdByClerkId: string;
  filename: string;
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
  record: Pick<ReportGenerationHistoryRecord, "id" | "payload" | "scopeLabel" | "detailLevel" | "generatedAt">,
): ReportGenerationHistoryRow | null {
  const generatedAt = formatReportGenerationDate(record.generatedAt);
  if (!generatedAt) {
    return null;
  }

  return {
    id: record.id,
    report: record.payload.title,
    period: periodLabel(record.payload.periode as PeriodId),
    perimeter: record.scopeLabel,
    detail: detailLevelLabel(record.detailLevel),
    generatedAt,
  };
}
