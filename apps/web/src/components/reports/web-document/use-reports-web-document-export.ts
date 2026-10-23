"use client";

import { usePdfExport } from "@/components/ui/pdf-export/use-pdf-export";
import { CheckCircle2, FileText, Loader2, TriangleAlert } from "lucide-react";
import { buildPdfReportFilename, type PdfReportPayload } from "@/lib/pdf-export/simple-pdf";
import { openPrintableReport } from "@/lib/pdf-export/browser-report";
import { isReportGenerationPayload } from "@/lib/reports/report-generation-payload";
import type { ReportExportAvailability } from "@/lib/reports/report-export-quota-contract";
import { resolveReportExportStatus } from "./reports-web-document.shared";
import type { useReportsWebDocumentConfig } from "./use-reports-web-document-config";

type ReportConfig = ReturnType<typeof useReportsWebDocumentConfig>;

function buildGenerationRequest(config: ReportConfig) {
  const { advancedFilters, detailLevel, modules, periodSelection, reportTheme, singleAction } = config;
  return singleAction
    ? { input: { type: "single_action" as const, actionId: singleAction.actionId }, detailLevel, modules, theme: reportTheme }
    : {
        input: {
          type: "multi_action" as const,
          period: periodSelection,
          scope: { kind: config.model.scopeKind, value: config.model.scopeKind === "global" ? null : config.model.scopeValue },
          filters: advancedFilters,
        },
        detailLevel,
        modules,
        theme: reportTheme,
      };
}

async function requestGeneratedPayload(config: ReportConfig): Promise<{ payload: PdfReportPayload; filename?: string }> {
  const response = await fetch("/api/reports/generations", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(buildGenerationRequest(config)),
  });
  const body = (await response.json().catch(() => null)) as { error?: unknown; payload?: unknown; filename?: unknown } | null;
  if (!response.ok) {
    if (response.status === 429) config.setDailyExportAvailability("used");
    throw new Error(typeof body?.error === "string" ? body.error : "Export indisponible.");
  }
  const payload = isReportGenerationPayload(body?.payload) ? body.payload : null;
  if (!payload) throw new Error("Le snapshot serveur du rapport est invalide.");
  return { payload, filename: typeof body?.filename === "string" ? body.filename : undefined };
}

export function useReportsWebDocumentExport(config: ReportConfig) {
  const dailyExportAvailability: ReportExportAvailability = config.dailyExportAvailability;
  const setDailyExportAvailability = config.setDailyExportAvailability;
  const generateReportOnServer = async (_payload: PdfReportPayload, reportWindow?: Window | null): Promise<void> => {
    const result = await requestGeneratedPayload(config);
    setDailyExportAvailability("used");
    const renderResult = openPrintableReport(
      result.payload,
      result.filename ?? buildPdfReportFilename(result.payload),
      undefined,
      reportWindow,
      { theme: config.reportTheme },
    );
    if (renderResult === "blocked") {
      throw new Error("La fenêtre du rapport a été bloquée. Autorisez les fenêtres contextuelles puis réessayez depuis l'historique.");
    }
  };
  const pdfExport = usePdfExport({
    rubrique: "reporting",
    periode: config.period,
    organizationType: config.activeScopeLabel,
    defaultTitle: config.defaultTitle,
    data: config.pdfData,
    onGenerate: generateReportOnServer,
    disabled: config.model.isLoading || config.model.hasError || !config.periodSelectionValid || config.scopeNeedsNewSelection || dailyExportAvailability !== "available",
  });
  function handleGenerate(): void {
    config.setHistoryWarning(null);
    void /* fire-and-forget -- UI event boundary delegates to the existing stateful action. */ pdfExport.exportRubriquePdf();
  }
  const resolvedExportStatus = resolveReportExportStatus({
    state: pdfExport.state,
    hasData: pdfExport.hasData,
    isLoading: config.model.isLoading,
    hasError: config.model.hasError,
    dailyExportAvailability,
    message: pdfExport.message,
  });
  return {
    ...pdfExport,
    dailyExportAvailability,
    setDailyExportAvailability,
    handleGenerate,
    exportStatus: {
      ...resolvedExportStatus,
      icon: resolvedExportStatus.kind === "success" ? CheckCircle2 : resolvedExportStatus.kind === "ready" ? FileText : resolvedExportStatus.kind === "loading" ? Loader2 : TriangleAlert,
      tone: resolvedExportStatus.kind === "success"
        ? "border-red-200 bg-red-50 text-red-900"
        : resolvedExportStatus.kind === "ready" || resolvedExportStatus.kind === "quota-unavailable" || resolvedExportStatus.kind === "no-data"
          ? "border-slate-200 bg-slate-50 text-slate-900"
          : "border-red-200 bg-red-50 text-red-900",
      iconTone: "text-red-600",
    },
    dataStatusLabel: config.model.isLoading
      ? "Chargement en cours"
      : config.model.hasError
        ? "Erreur de chargement"
        : config.dataAvailabilityNotices.length > 0
          ? "Données partielles"
          : "Données disponibles",
  };
}
