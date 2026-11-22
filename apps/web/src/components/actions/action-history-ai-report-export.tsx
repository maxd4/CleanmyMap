"use client";

import { AiMarkdownExportConfirmation } from "@/components/reports/ai-markdown-export-confirmation";
import { DEFAULT_REPORT_DETAIL_LEVEL, DEFAULT_REPORT_MODULES } from "@/lib/reports/report-pdf-data";
import { DEFAULT_REPORT_PDF_THEME } from "@/lib/pdf-export/report-pdf-theme";
import type { ReportGenerationRequest } from "@/lib/reports/report-generation-request";

export function buildActionHistoryAiExportRequest(actionId: string): ReportGenerationRequest {
  return {
    input: { type: "single_action", actionId },
    detailLevel: DEFAULT_REPORT_DETAIL_LEVEL,
    modules: DEFAULT_REPORT_MODULES,
    theme: DEFAULT_REPORT_PDF_THEME,
  };
}

export function ActionHistoryAiReportExport({ actionId }: { actionId: string }) {
  const filename = `cleanmymap-action-${actionId}-rapport-ia.md`;
  return (
    <AiMarkdownExportConfirmation
      request={buildActionHistoryAiExportRequest(actionId)}
      triggerLabel="Exporter les données"
      fallbackFilename={filename}
      tone="primary"
      className="min-h-11 w-full sm:w-auto"
    />
  );
}
