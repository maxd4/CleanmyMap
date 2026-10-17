"use client";

import { useMemo, useRef, useState } from "react";
import {
  CheckCircle2,
  FileText,
  Loader2,
  TriangleAlert,
} from "lucide-react";
import {
  ReportsWebDocumentDelivery,
  ReportsWebDocumentDeliveryHistory,
} from "@/components/reports/web-document/reports-web-document-delivery";
import { ReportsWebDocumentPreparation } from "@/components/reports/web-document/reports-web-document-preparation";
import { ReportsWebDocumentPreview } from "@/components/reports/web-document/reports-web-document-preview";
import { useReportsWebDocumentModel } from "@/components/reports/web-document/use-reports-web-document-model";
import {
  DEFAULT_REPORT_MODULES,
  DEFAULT_REPORT_DETAIL_LEVEL,
  DEFAULT_REPORT_GENERATION_PERIOD,
  DEFAULT_REPORT_PDF_THEME,
  buildCoverageRangeLabel,
  buildModuleSelectionLabel,
  buildPdfData,
  buildReportTitle,
  buildScopeSelectValue,
  parseScopeSelectValue,
  reportPeriodLabel,
  resolveReportExportStatus,
  type DetailLevelId,
  type ModuleState,
  type ReportPdfTheme,
  type SelectedPeriodId,
  REPORT_ADVANCED_FILTER_DEFAULTS,
  type ReportAdvancedFilters,
} from "@/components/reports/web-document/reports-web-document.shared";
import { usePdfExport } from "@/components/ui/pdf-export/use-pdf-export";
import {
  openPrintableReport,
} from "@/lib/pdf-export/browser-report";
import { buildPdfReportFilename, type PdfReportPayload } from "@/lib/pdf-export/simple-pdf";
import type { ActionDataContract } from "@/lib/actions/data-contract";
import type { UnifiedSourceHealth } from "@/lib/actions/unified-source/types";
import type { CommunityEventItem } from "@/lib/community/http";
import {
  buildReportDataAvailabilityNotices,
  type CommunityEventsAvailability,
} from "@/lib/reports/data-availability";
import { IMPACT_PROXY_CONFIG } from "@/lib/gamification/impact-proxy-config";
import {
  REPORT_GENERATION_HISTORY_LIMIT,
  isReportGenerationHistoryRow,
  type ReportGenerationHistoryRow,
} from "@/lib/reports/report-generation-history-contract";
import type { ReportGenerationHistoryActionState } from "./web-document/reports-web-document-delivery";
import {
  filterReportGenerationContracts,
  isValidReportGenerationPeriodSelection,
  REPORT_GENERATION_TIME_ZONE,
  type ReportGenerationPeriodSelection,
} from "@/lib/reports/generation-period";
import type { ReportExportAvailability } from "@/lib/reports/report-export-quota-contract";
import { isReportGenerationPayload } from "@/lib/reports/report-generation-payload";
import { createReportsWebDocumentHistoryActions } from "@/components/reports/reports-web-document-history-actions";

export type ReportsWebDocumentProps = {
  contracts: ActionDataContract[];
  isTruncated?: boolean;
  sourceHealth?: UnifiedSourceHealth;
  communityEvents: CommunityEventItem[];
  communityEventsAvailability?: CommunityEventsAvailability;
  initialRecentRows?: ReportGenerationHistoryRow[];
  initialHistoryAvailability?: "available" | "unavailable";
  dailyExportAvailability?: ReportExportAvailability;
  actionMediaReadyCountByActionId?: Record<string, number>;
  actionMediaAvailability?: "available" | "unavailable";
  singleAction?: { actionId: string; scopeLabel: string };
};

export function ReportsWebDocument({
  contracts,
  isTruncated = false,
  sourceHealth,
  communityEvents,
  communityEventsAvailability,
  initialRecentRows = [],
  initialHistoryAvailability = "available",
  dailyExportAvailability: initialDailyExportAvailability = "unavailable",
  actionMediaReadyCountByActionId = {},
  actionMediaAvailability = "available",
  singleAction,
}: ReportsWebDocumentProps) {
  const previewRef = useRef<HTMLDivElement>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [recentRows, setRecentRows] = useState(initialRecentRows);
  const [historyAvailability, setHistoryAvailability] = useState(initialHistoryAvailability);
  const [historyActionStateById, setHistoryActionStateById] = useState<
    Record<string, ReportGenerationHistoryActionState>
  >({});
  const [historyWarning, setHistoryWarning] = useState<string | null>(null);
  const [dailyExportAvailability, setDailyExportAvailability] =
    useState<ReportExportAvailability>(initialDailyExportAvailability);
  const [period, setPeriod] = useState<SelectedPeriodId>(
    singleAction ? "full_history" : DEFAULT_REPORT_GENERATION_PERIOD,
  );
  const [customRange, setCustomRange] = useState({ from: "", to: "" });
  const periodSelection = useMemo<ReportGenerationPeriodSelection>(
    () => period === "custom_range"
      ? { id: "custom_range", from: customRange.from, to: customRange.to }
      : { id: period },
    [customRange.from, customRange.to, period],
  );
  const periodSelectionValid = isValidReportGenerationPeriodSelection(periodSelection);
  const [detailLevel, setDetailLevel] = useState<DetailLevelId>(DEFAULT_REPORT_DETAIL_LEVEL);
  const [reportTheme, setReportTheme] = useState<ReportPdfTheme>(DEFAULT_REPORT_PDF_THEME);
  const [modules, setModules] = useState<ModuleState>(DEFAULT_REPORT_MODULES);
  const [advancedFilters, setAdvancedFilters] = useState<ReportAdvancedFilters>(REPORT_ADVANCED_FILTER_DEFAULTS);
  const [advancedFiltersOpen, setAdvancedFiltersOpen] = useState(false);
  const historicalReplayRef = useRef<{ reportWindow: Window; payload: PdfReportPayload } | null>(null);
  const historicalActions = createReportsWebDocumentHistoryActions({
    reportTheme,
    setRecentRows,
    setHistoryAvailability,
    setDailyExportAvailability,
    setHistoryActionStateById,
  });
  const reportNow = useMemo(() => new Date(), []);
  const filteredContracts = useMemo(
    () => filterReportGenerationContracts(contracts, periodSelection, reportNow),
    [contracts, periodSelection, reportNow],
  );
  const model = useReportsWebDocumentModel({
    initialContracts: filteredContracts,
    initialIsTruncated: isTruncated,
    initialSourceHealth: sourceHealth,
    initialCommunityEvents: communityEvents,
    initialCommunityEventsAvailability: communityEventsAvailability,
    initialPeriod: periodSelection,
    initialNow: reportNow,
    advancedFilters,
    actionMediaReadyCountByActionId,
    actionMediaAvailability,
  });
  const coverageRangeLabel = useMemo(
    () => buildCoverageRangeLabel(model.filteredContracts ?? filteredContracts),
    [filteredContracts, model.filteredContracts],
  );

  const dataAvailabilityNotices = buildReportDataAvailabilityNotices(
    model.dataAvailability,
  );

  const report = model.report;
  const activeScopeLabel = singleAction?.scopeLabel ?? model.activeScopeLabel;
  const wasteKnown = report.totals.knownWasteActions === undefined || report.totals.knownWasteActions > 0;
  const volunteersKnown = (report.totals.volunteersKnownActions ?? 0) > 0;
  const surfaceProxy = wasteKnown && volunteersKnown
    ? report.totals.kg * IMPACT_PROXY_CONFIG.factors.surfaceM2PerWasteKg +
      report.totals.hours * 60 * IMPACT_PROXY_CONFIG.factors.surfaceM2PerVolunteerMinute
    : null;
  const selectedScopeValue = singleAction
    ? "single_action"
    : buildScopeSelectValue(model.scopeKind, model.scopeValue);
  const defaultTitle = buildReportTitle(activeScopeLabel, detailLevel);
  const pdfData = useMemo(
    () =>
      buildPdfData({
        reportTitle: defaultTitle,
        scopeLabel: activeScopeLabel,
        period,
        periodRange: period === "custom_range" && periodSelectionValid
          ? { from: customRange.from, to: customRange.to, timeZone: REPORT_GENERATION_TIME_ZONE }
          : undefined,
        detailLevel,
        modules,
        model,
        surfaceProxy,
        generatedAt: reportNow.toISOString(),
      }),
    [activeScopeLabel, customRange.from, customRange.to, defaultTitle, detailLevel, model, modules, period, periodSelectionValid, reportNow, surfaceProxy],
  );

  async function generateReportOnServer(
    _payload: PdfReportPayload,
    reportWindow?: Window | null,
  ): Promise<void> {
    const requestBody = singleAction
      ? {
          input: { type: "single_action" as const, actionId: singleAction.actionId },
          detailLevel,
          modules,
        }
      : {
          input: {
            type: "multi_action" as const,
            period: periodSelection,
            scope: {
              kind: model.scopeKind,
              value: model.scopeKind === "global" ? null : model.scopeValue,
            },
            filters: advancedFilters,
          },
          detailLevel,
          modules,
        };
    const response = await fetch("/api/reports/generations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
    });
    const body = (await response.json().catch(() => null)) as {
      item?: unknown;
      error?: unknown;
      payload?: unknown;
      filename?: unknown;
    } | null;
    if (!response.ok) {
      if (response.status === 429) {
        setDailyExportAvailability("used");
        setHistoryWarning(
          typeof body?.error === "string"
            ? body.error
            : "Un export détaillé a déjà été utilisé aujourd'hui ; le prochain sera disponible le jour civil suivant.",
        );
      }
      throw new Error(typeof body?.error === "string" ? body.error : "Export indisponible.");
    }
    const historyRow = body?.item;
    if (!historyRow || !isReportGenerationHistoryRow(historyRow)) {
      throw new Error("Report generation history persistence failed.");
    }
    setRecentRows((current) => [historyRow, ...current].slice(0, REPORT_GENERATION_HISTORY_LIMIT));
    setHistoryAvailability("available");
    setDailyExportAvailability("used");
    const generatedPayload = isReportGenerationPayload(body?.payload)
      ? body.payload
      : null;
    if (!generatedPayload) {
      throw new Error("Le snapshot serveur du rapport est invalide.");
    }
    historicalReplayRef.current = null;
    const renderResult = openPrintableReport(
      generatedPayload,
      typeof body?.filename === "string" ? body.filename : buildPdfReportFilename(generatedPayload),
      undefined,
      reportWindow,
      { theme: reportTheme },
    );
    if (renderResult === "blocked") {
      throw new Error("La fenêtre du rapport a été bloquée. Autorisez les fenêtres contextuelles puis réessayez depuis l'historique.");
    }
  }

  function handleThemeChange(theme: ReportPdfTheme): void {
    setReportTheme(theme);
  }

  const {
    state,
    message,
    copy,
    hasData,
    isDisabled,
    exportRubriquePdf,
  } = usePdfExport({
    rubrique: "reporting",
    periode: period,
    organizationType: activeScopeLabel,
    defaultTitle,
    data: pdfData,
    onGenerate: generateReportOnServer,
    disabled:
      model.isLoading ||
      model.hasError ||
      !periodSelectionValid ||
      dailyExportAvailability !== "available",
  });

  function toggleModule(key: keyof ModuleState): void {
    setModules((current) => ({
      ...current,
      [key]: !current[key],
    }));
  }

  function handleGenerate(): void {
    setHistoryWarning(null);
    void exportRubriquePdf();
  }

  function handlePreview(): void {
    setShowPreview((current) => !current);
  }

  const resolvedExportStatus = resolveReportExportStatus({
    state,
    hasData,
    isLoading: model.isLoading,
    hasError: model.hasError,
    dailyExportAvailability,
    message,
  });
  const exportStatus = {
    ...resolvedExportStatus,
    icon:
      resolvedExportStatus.kind === "success"
        ? CheckCircle2
        : resolvedExportStatus.kind === "ready"
          ? FileText
          : resolvedExportStatus.kind === "loading"
            ? Loader2
            : TriangleAlert,
    tone:
      resolvedExportStatus.kind === "success"
        ? "border-red-200 bg-red-50 text-red-900"
        : resolvedExportStatus.kind === "ready"
          ? "border-slate-200 bg-slate-50 text-slate-900"
          : resolvedExportStatus.kind === "quota-unavailable" || resolvedExportStatus.kind === "no-data"
            ? "border-slate-200 bg-slate-50 text-slate-900"
            : "border-red-200 bg-red-50 text-red-900",
    iconTone: "text-red-600",
  };
  const dataStatusLabel = model.isLoading
    ? "Chargement en cours"
    : model.hasError
      ? "Erreur de chargement"
      : dataAvailabilityNotices.length > 0
        ? "Données partielles"
        : "Données disponibles";

  return (
    <section data-testid="reports-generation" className="space-y-5">
      <header>
        <h2 className="text-xl font-bold tracking-tight text-slate-950">
          Générer un rapport d&apos;impact
        </h2>
      </header>

      {dataAvailabilityNotices.length > 0 ? (
        <div
          role="status"
          aria-live="polite"
          className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm leading-6 text-amber-900"
        >
          <TriangleAlert size={16} className="mt-1 shrink-0 text-amber-600" />
          <p>{dataAvailabilityNotices.join(" ")}</p>
        </div>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-start">
        <ReportsWebDocumentPreparation
          period={period}
          onPeriodChange={setPeriod}
          detailLevel={detailLevel}
          onDetailLevelChange={setDetailLevel}
          theme={reportTheme}
          onThemeChange={(theme) => {
            handleThemeChange(theme);
            historicalActions.handleThemeChange(theme, historicalReplayRef);
          }}
          customRange={customRange}
          onCustomRangeChange={setCustomRange}
          selectedScopeValue={selectedScopeValue}
          scopeOptions={model.scopeOptions}
          onScopeChange={(value) => {
            const next = parseScopeSelectValue(value);
            model.setScopeKind(next.kind);
            model.setScopeValue(next.value);
          }}
          modules={modules}
          onModuleToggle={toggleModule}
          advancedFilters={advancedFilters}
          onAdvancedFiltersChange={setAdvancedFilters}
          actionMediaAvailability={actionMediaAvailability}
          advancedFiltersOpen={advancedFiltersOpen}
          onAdvancedFiltersToggle={() => setAdvancedFiltersOpen((open) => !open)}
          singleAction={singleAction}
        />

        <section
          aria-labelledby="reports-summary-title"
          className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_12px_30px_-24px_rgba(15,23,42,0.24)] sm:p-6"
        >
          <ReportsWebDocumentPreview
            report={report}
            activeScopeLabel={activeScopeLabel}
            showPreview={showPreview}
            previewRef={previewRef}
            onTogglePreview={handlePreview}
            periodDisplayLabel={reportPeriodLabel(period, false)}
            coverageRangeLabel={coverageRangeLabel}
            isTruncated={Boolean(model.dataAvailability.isTruncated)}
            modulesLabel={buildModuleSelectionLabel(modules)}
            dataStatusLabel={dataStatusLabel}
            chapterCount={pdfData.chapters.length}
          />

          <ReportsWebDocumentDelivery
            state={state}
            message={message}
            pendingLabel={copy.pendingLabel}
            isDisabled={isDisabled}
            exportStatus={exportStatus}
            historyWarning={historyWarning}
            dailyExportAvailability={dailyExportAvailability}
            onGenerate={handleGenerate}
          />
        </section>
      </div>

      <ReportsWebDocumentDeliveryHistory
        recentRows={recentRows}
        historyAvailability={historyAvailability}
        actionStateById={historyActionStateById}
        onView={(id) => void historicalActions.handleHistoricalAction(id, "view", historicalReplayRef)}
        onReexport={(id) => void historicalActions.handleHistoricalAction(id, "reexport", historicalReplayRef)}
        onPrint={(id) => void historicalActions.handleHistoricalPrint(id)}
        onDerive={(id) => void historicalActions.handleHistoricalAction(id, "derive", historicalReplayRef)}
      />
    </section>
  );
}
