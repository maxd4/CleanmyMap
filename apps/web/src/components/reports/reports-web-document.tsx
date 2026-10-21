"use client";

import { useRef } from "react";
import { TriangleAlert } from "lucide-react";
import { ReportsWebDocumentDelivery } from "@/components/reports/web-document/reports-web-document-delivery";
import { ReportsWebDocumentPreparation } from "@/components/reports/web-document/reports-web-document-preparation";
import { ReportsWebDocumentPreview } from "@/components/reports/web-document/reports-web-document-preview";
import {
  buildModuleSelectionLabel,
  reportPeriodLabel,
} from "@/components/reports/web-document/reports-web-document.shared";
import { useReportsWebDocumentConfig } from "@/components/reports/web-document/use-reports-web-document-config";
import { useReportsWebDocumentExport } from "@/components/reports/web-document/use-reports-web-document-export";
import type { ReportsWebDocumentProps } from "@/components/reports/web-document/reports-web-document.types";

export type { ReportsWebDocumentProps } from "@/components/reports/web-document/reports-web-document.types";

export function ReportsWebDocument(props: ReportsWebDocumentProps) {
  const previewRef = useRef<HTMLDivElement>(null);
  const config = useReportsWebDocumentConfig(props);
  const exportController = useReportsWebDocumentExport(config);
  const { actionMediaAvailability = "available", singleAction } = props;
  const {
    model,
    report,
    period,
    setPeriod,
    customRange,
    setCustomRange,
    detailLevel,
    setDetailLevel,
    reportTheme,
    setReportTheme,
    modules,
    advancedFilters,
    setAdvancedFilters,
    advancedFiltersOpen,
    setAdvancedFiltersOpen,
    resumeNoticeLines,
    dataAvailabilityNotices,
    activeScopeLabel,
    coverageRangeLabel,
    selectedScopeValue,
    showPreview,
    setShowPreview,
    historyWarning,
  } = config;

  return (
    <section data-testid="reports-generation" className="space-y-5">
      <header>
        <h2 className="text-xl font-bold tracking-tight text-slate-950">Générer un rapport d&apos;impact</h2>
      </header>

      {dataAvailabilityNotices.length > 0 ? (
        <div role="status" aria-live="polite" className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm leading-6 text-amber-900">
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
          onThemeChange={setReportTheme}
          customRange={customRange}
          onCustomRangeChange={setCustomRange}
          selectedScopeValue={selectedScopeValue}
          scopeOptions={model.scopeOptions}
          onScopeChange={config.handleScopeChange}
          modules={modules}
          onModuleToggle={config.toggleModule}
          advancedFilters={advancedFilters}
          onAdvancedFiltersChange={setAdvancedFilters}
          resumeNotice={resumeNoticeLines.length > 0 ? resumeNoticeLines : undefined}
          actionMediaAvailability={actionMediaAvailability}
          advancedFiltersOpen={advancedFiltersOpen}
          onAdvancedFiltersToggle={() => setAdvancedFiltersOpen((open) => !open)}
          singleAction={singleAction}
        />

        <section aria-labelledby="reports-summary-title" className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_12px_30px_-24px_rgba(15,23,42,0.24)] sm:p-6">
          <ReportsWebDocumentPreview
            report={report}
            activeScopeLabel={activeScopeLabel}
            showPreview={showPreview}
            previewRef={previewRef}
            onTogglePreview={() => setShowPreview((current) => !current)}
            periodDisplayLabel={reportPeriodLabel(period, false)}
            coverageRangeLabel={coverageRangeLabel}
            isTruncated={Boolean(model.dataAvailability.isTruncated)}
            modulesLabel={buildModuleSelectionLabel(modules)}
            dataStatusLabel={exportController.dataStatusLabel}
            chapterCount={config.pdfData.chapters.length}
          />

          <ReportsWebDocumentDelivery
            state={exportController.state}
            message={exportController.message}
            pendingLabel={exportController.copy.pendingLabel}
            isDisabled={exportController.isDisabled}
            exportStatus={exportController.exportStatus}
            historyWarning={historyWarning}
            dailyExportAvailability={exportController.dailyExportAvailability}
            onGenerate={exportController.handleGenerate}
          />
        </section>
      </div>
    </section>
  );
}
