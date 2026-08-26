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
import { CmmGrid, CmmGridItem } from "@/components/ui/cmm-grid";
import {
  REPORT_HISTORY_SERVER_LIMIT,
  buildCoverageRangeLabel,
  buildDetailCoverageLabel,
  buildModuleSelectionLabel,
  buildPdfData,
  buildReportTitle,
  buildScopeSelectValue,
  detailLevelLabel,
  detailLevelToModules,
  periodLabel,
  parseScopeSelectValue,
  type DetailLevelId,
  type ModuleState,
  type PeriodId,
  type ReportsWeather,
  type SelectedPeriodId,
} from "@/components/reports/web-document/reports-web-document.shared";
import { usePdfExport } from "@/components/ui/pdf-export/use-pdf-export";
import type { PdfReportPayload } from "@/lib/pdf-export/simple-pdf";
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

function toIsoDateKey(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function getPeriodFloorDate(period: PeriodId): string | null {
  const today = new Date();
  const utcToday = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));

  switch (period) {
    case "six_months": {
      const floor = new Date(utcToday);
      floor.setUTCMonth(floor.getUTCMonth() - 6);
      return toIsoDateKey(floor);
    }
    case "current_year":
      return `${today.getUTCFullYear()}-01-01`;
    case "full_history":
      return null;
  }

  return null;
}

function filterContractsByPeriod(contracts: ActionDataContract[], period: PeriodId) {
  const floorDate = getPeriodFloorDate(period);

  return contracts.filter((contract) => {
    if (contract.status !== "approved") {
      return false;
    }

    if (!floorDate) {
      return true;
    }

    return contract.dates.observedAt >= floorDate;
  });
}

export type ReportsWebDocumentProps = {
  contracts: ActionDataContract[];
  isTruncated?: boolean;
  sourceHealth?: UnifiedSourceHealth;
  communityEvents: CommunityEventItem[];
  communityEventsAvailability?: CommunityEventsAvailability;
  weather: ReportsWeather;
  initialRecentRows?: ReportGenerationHistoryRow[];
};

export function ReportsWebDocument({
  contracts,
  isTruncated = false,
  sourceHealth,
  communityEvents,
  communityEventsAvailability,
  weather,
  initialRecentRows = [],
}: ReportsWebDocumentProps) {
  const previewRef = useRef<HTMLDivElement>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [recentRows, setRecentRows] = useState(initialRecentRows);
  const [historyWarning, setHistoryWarning] = useState<string | null>(null);
  const [period, setPeriod] = useState<SelectedPeriodId>("");
  const [detailLevel, setDetailLevel] = useState<DetailLevelId>("default");
  const [modules, setModules] = useState<ModuleState>(detailLevelToModules("default"));
  const effectivePeriod = period || "six_months";
  const historyCompletenessWarning = effectivePeriod === "full_history";
  const filteredContracts = useMemo(
    () => filterContractsByPeriod(contracts, effectivePeriod),
    [contracts, effectivePeriod],
  );
  const coverageRangeLabel = useMemo(
    () => buildCoverageRangeLabel(filteredContracts),
    [filteredContracts],
  );
  const detailCoverageLabel = useMemo(
    () => `${buildDetailCoverageLabel(detailLevel)} Modules optionnels inclus: ${buildModuleSelectionLabel(modules)}.`,
    [detailLevel, modules],
  );

  const model = useReportsWebDocumentModel({
    initialContracts: filteredContracts,
    initialIsTruncated: isTruncated,
    initialSourceHealth: sourceHealth,
    initialCommunityEvents: communityEvents,
    initialCommunityEventsAvailability: communityEventsAvailability,
    initialWeather: weather,
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
        period: effectivePeriod,
        detailLevel,
        modules,
        model,
        surfaceProxy,
      }),
    [activeScopeLabel, defaultTitle, detailLevel, effectivePeriod, model, modules, surfaceProxy],
  );

  async function persistSuccessfulExport(payload: PdfReportPayload): Promise<void> {
    try {
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
      const body = (await response.json().catch(() => null)) as { item?: unknown } | null;
      const historyRow = body?.item;
      if (!response.ok || !historyRow || !isReportGenerationHistoryRow(historyRow)) {
        throw new Error("Report generation history persistence failed.");
      }
      setRecentRows((current) => [historyRow, ...current].slice(0, REPORT_GENERATION_HISTORY_LIMIT));
    } catch {
      setHistoryWarning(
        "Le PDF a bien été généré, mais cette génération n'a pas pu être ajoutée à l'historique.",
      );
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
    periode: effectivePeriod,
    organizationType: activeScopeLabel,
    defaultTitle,
    data: pdfData,
    onExportSuccess: persistSuccessfulExport,
    disabled: model.isLoading || model.hasError,
  });

  function syncModulesFromDetailLevel(nextLevel: DetailLevelId): void {
    setDetailLevel(nextLevel);
    setModules(detailLevelToModules(nextLevel));
  }

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
          tone: "border-cyan-200 bg-cyan-50 text-cyan-900",
          iconTone: "text-cyan-600",
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
  return (
    <CmmGrid
      as="section"
      className="rounded-[2.25rem] border border-slate-200 bg-white p-4 shadow-[0_18px_55px_-30px_rgba(15,23,42,0.25)] sm:p-6"
      contentClassName="gap-6"
    >
      <CmmGridItem span={{ mobile: 4, tablet: 6, desktop: 12 }}>
        <header className="flex items-start gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[1.4rem] bg-red-600 text-white shadow-[0_18px_42px_-24px_rgba(220,38,38,0.55)]">
            <FileText size={28} />
          </div>
          <div className="min-w-0">
            <h2 className="text-[clamp(1.8rem,3vw,2.4rem)] font-black leading-tight tracking-[-0.04em] text-slate-950">
              Générer un rapport d&apos;impact
            </h2>
            <p className="mt-1 max-w-3xl text-sm font-medium leading-6 text-slate-600 sm:text-base">
              {dataAvailabilityNotices.length > 0
                ? "Créez un rapport avec les données disponibles et les limites signalées."
                : "Créez un rapport complet avec les données et la méthodologie CleanMyMap."}
            </p>
          </div>
        </header>
      </CmmGridItem>

      {dataAvailabilityNotices.length > 0 ? (
        <CmmGridItem span={{ mobile: 4, tablet: 6, desktop: 12 }}>
          <div
            role="status"
            aria-live="polite"
            className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm leading-6 text-amber-900"
          >
            <TriangleAlert size={16} className="mt-1 shrink-0 text-amber-600" />
            <p>{dataAvailabilityNotices.join(" ")}</p>
          </div>
        </CmmGridItem>
      ) : null}

      <CmmGridItem span={{ mobile: 4, tablet: 6, desktop: 12 }}>
        <div className="grid gap-4 xl:grid-cols-[1.14fr_0.86fr] xl:items-start">
        <ReportsWebDocumentPreparation
          period={period}
          onPeriodChange={setPeriod}
          historyCompletenessWarning={historyCompletenessWarning}
          selectedScopeValue={selectedScopeValue}
          scopeOptions={model.scopeOptions}
          onScopeChange={(value) => {
            const next = parseScopeSelectValue(value);
            model.setScopeKind(next.kind);
            model.setScopeValue(next.value);
          }}
          detailLevel={detailLevel}
          onDetailLevelChange={syncModulesFromDetailLevel}
          modules={modules}
          onModuleToggle={toggleModule}
        />

        <div className="grid gap-4">
          <ReportsWebDocumentPreview
            report={report}
            activeScopeLabel={activeScopeLabel}
            weatherAdvice={model.weatherAdvice}
            showPreview={showPreview}
            previewRef={previewRef}
            onTogglePreview={handlePreview}
            periodDisplayLabel={periodLabel(effectivePeriod)}
            detailDisplayLabel={detailLevelLabel(detailLevel)}
            modules={modules}
            historyCoverageLabel={
              historyCompletenessWarning
                ? `Historique borné à ${REPORT_HISTORY_SERVER_LIMIT}`
                : `Historique: ${filteredContracts.length} actions`
            }
            historyGuaranteeLabel={
              historyCompletenessWarning
                ? `Historique: plafonné à ${REPORT_HISTORY_SERVER_LIMIT} actions approuvées.`
                : "Historique: couverture conforme à la fenêtre sélectionnée."
            }
            coverageRangeLabel={coverageRangeLabel}
            detailCoverageLabel={detailCoverageLabel}
            exportStatus={exportStatus}
          />

          <ReportsWebDocumentDelivery
            state={state}
            message={message}
            pendingLabel={copy.pendingLabel}
            isDisabled={isDisabled}
            exportStatus={exportStatus}
            historyWarning={historyWarning}
            onGenerate={handleGenerate}
          />
        </div>
      </div>
      </CmmGridItem>

      <CmmGridItem span={{ mobile: 4, tablet: 6, desktop: 12 }}>
        <ReportsWebDocumentDeliveryHistory
          recentRows={recentRows}
        />
      </CmmGridItem>
    </CmmGrid>
  );
}
