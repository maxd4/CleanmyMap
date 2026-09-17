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
  buildCoverageRangeLabel,
  buildModuleSelectionLabel,
  buildPdfData,
  buildReportTitle,
  buildScopeSelectValue,
  parseScopeSelectValue,
  reportPeriodLabel,
  type DetailLevelId,
  type ModuleState,
  type SelectedPeriodId,
} from "@/components/reports/web-document/reports-web-document.shared";
import { usePdfExport } from "@/components/ui/pdf-export/use-pdf-export";
import {
  renderReportWindow,
  openOrDownloadReport,
} from "@/lib/pdf-export/browser-report";
import { buildPdfReportFilename, type PdfReportPayload } from "@/lib/pdf-export/simple-pdf";
import type { ActionDataContract } from "@/lib/actions/data-contract";
import type { UnifiedSourceHealth } from "@/lib/actions/unified-source";
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
import { loadHistoricalReportSnapshot } from "@/lib/reports/historical-report-client";
import { replayHistoricalReport } from "@/lib/reports/historical-report-replay";
import { filterReportGenerationContracts } from "@/lib/reports/generation-period";
import type { ReportExportAvailability } from "@/lib/reports/report-export-quota-contract";

export type ReportsWebDocumentProps = {
  contracts: ActionDataContract[];
  isTruncated?: boolean;
  sourceHealth?: UnifiedSourceHealth;
  communityEvents: CommunityEventItem[];
  communityEventsAvailability?: CommunityEventsAvailability;
  initialRecentRows?: ReportGenerationHistoryRow[];
  initialHistoryAvailability?: "available" | "unavailable";
  dailyExportAvailability?: ReportExportAvailability;
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
  const [period, setPeriod] = useState<SelectedPeriodId>(DEFAULT_REPORT_GENERATION_PERIOD);
  const detailLevel: DetailLevelId = DEFAULT_REPORT_DETAIL_LEVEL;
  const [modules, setModules] = useState<ModuleState>(DEFAULT_REPORT_MODULES);
  const reportNow = useMemo(() => new Date(), []);
  const filteredContracts = useMemo(
    () => filterReportGenerationContracts(contracts, period, reportNow),
    [contracts, period, reportNow],
  );
  const coverageRangeLabel = useMemo(
    () => buildCoverageRangeLabel(filteredContracts),
    [filteredContracts],
  );
  const model = useReportsWebDocumentModel({
    initialContracts: filteredContracts,
    initialIsTruncated: isTruncated,
    initialSourceHealth: sourceHealth,
    initialCommunityEvents: communityEvents,
    initialCommunityEventsAvailability: communityEventsAvailability,
    initialNow: reportNow,
  });

  const dataAvailabilityNotices = buildReportDataAvailabilityNotices(
    model.dataAvailability,
  );

  const report = model.report;
  const activeScopeLabel = model.activeScopeLabel;
  const surfaceProxy =
    report.totals.kg * IMPACT_PROXY_CONFIG.factors.surfaceM2PerWasteKg +
    report.totals.hours * 60 * IMPACT_PROXY_CONFIG.factors.surfaceM2PerVolunteerMinute;
  const selectedScopeValue = buildScopeSelectValue(model.scopeKind, model.scopeValue);
  const defaultTitle = buildReportTitle(activeScopeLabel, detailLevel);
  const pdfData = useMemo(
    () =>
      buildPdfData({
        reportTitle: defaultTitle,
        scopeLabel: activeScopeLabel,
        period,
        detailLevel,
        modules,
        model,
        surfaceProxy,
      }),
    [activeScopeLabel, defaultTitle, detailLevel, model, modules, period, surfaceProxy],
  );

  async function generateReportOnServer(payload: PdfReportPayload): Promise<void> {
    const response = await fetch("/api/reports/generations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          payload,
          scopeKind: model.scopeKind,
          scopeValue: model.scopeValue,
          scopeLabel: activeScopeLabel,
          detailLevel,
          modules,
        }),
      });
    const body = (await response.json().catch(() => null)) as { item?: unknown; error?: unknown } | null;
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
    openOrDownloadReport(payload, buildPdfReportFilename(payload));
  }

  async function handleHistoricalAction(
    id: string,
    action: ReportGenerationHistoryActionState["action"],
  ): Promise<void> {
    setHistoryActionStateById((current) => ({
      ...current,
      [id]: {
        action,
        state: "pending",
        message: action === "view" ? "Ouverture du rapport historique..." : "Préparation de la réexportation...",
      },
    }));

    const reportWindow = action === "view" ? window.open("", "_blank") : null;
    if (action === "view" && !reportWindow) {
      setHistoryActionStateById((current) => ({
        ...current,
        [id]: {
          action,
          state: "error",
          message: "La fenêtre du rapport a été bloquée. Autorisez les fenêtres contextuelles puis réessayez.",
        },
      }));
      return;
    }

    try {
      const generation = await loadHistoricalReportSnapshot(id);
      replayHistoricalReport(action, generation, {
        view: (payload) => renderReportWindow(reportWindow!, payload),
        reexport: (payload, filename) => openOrDownloadReport(payload, filename),
      });

      setHistoryActionStateById((current) => ({
        ...current,
        [id]: {
          action,
          state: "success",
          message:
            action === "view"
              ? "Rapport historique ouvert depuis le snapshot enregistré."
              : "Réexport traité depuis le snapshot historique (" +
                generation.filename +
                "). Aucune nouvelle génération n'a été créée.",
        },
      }));
    } catch (error) {
      reportWindow?.close();
      setHistoryActionStateById((current) => ({
        ...current,
        [id]: {
          action,
          state: "error",
          message: error instanceof Error ? error.message : "Impossible de charger le rapport historique.",
        },
      }));
    }
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

  const exportStatus =
    state === "pending"
      ? {
          icon: Loader2,
          label: "Génération en cours",
          description: "Le livrable est en cours de préparation.",
          tone: "border-red-200 bg-red-50 text-red-900",
          iconTone: "text-red-600",
        }
      : state === "success"
          ? {
              icon: CheckCircle2,
              label: "Prêt à exporter",
              description: "Le PDF officiel est ouvert et prêt à être enregistré.",
              tone: "border-red-200 bg-red-50 text-red-900",
              iconTone: "text-red-600",
            }
          : state === "error"
          ? {
              icon: TriangleAlert,
              label: "Export à vérifier",
              description: message ?? "Une action est nécessaire avant de relancer l'export.",
              tone: "border-red-200 bg-red-50 text-red-900",
              iconTone: "text-red-600",
            }
          : hasData
            ? {
                icon: FileText,
                label: "Prêt à générer",
                description: "La configuration actuelle permet de lancer l'export.",
                tone: "border-slate-200 bg-slate-50 text-slate-900",
                iconTone: "text-red-600",
              }
            : {
                icon: TriangleAlert,
                label: "Export indisponible",
                description: "Aucune donnée exploitable n'est disponible pour cette configuration.",
                tone: "border-slate-200 bg-slate-50 text-slate-900",
              iconTone: "text-slate-400",
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
          selectedScopeValue={selectedScopeValue}
          scopeOptions={model.scopeOptions}
          onScopeChange={(value) => {
            const next = parseScopeSelectValue(value);
            model.setScopeKind(next.kind);
            model.setScopeValue(next.value);
          }}
          modules={modules}
          onModuleToggle={toggleModule}
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
            modulesLabel={buildModuleSelectionLabel(modules)}
            dataStatusLabel={dataStatusLabel}
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
        onView={(id) => void handleHistoricalAction(id, "view")}
        onReexport={(id) => void handleHistoricalAction(id, "reexport")}
      />
    </section>
  );
}
