"use client";

import { useMemo, useState } from "react";
import { useReportsWebDocumentModel } from "./use-reports-web-document-model";
import {
  DEFAULT_REPORT_DETAIL_LEVEL,
  DEFAULT_REPORT_MODULES,
  DEFAULT_REPORT_PDF_THEME,
  REPORT_ADVANCED_FILTER_DEFAULTS,
  buildCoverageRangeLabel,
  buildScopeSelectValue,
  parseScopeSelectValue,
  type DetailLevelId,
  type ModuleState,
  type ReportAdvancedFilters,
  type ReportPdfTheme,
  type SelectedPeriodId,
} from "./reports-web-document.shared";
import { buildReportDataAvailabilityNotices } from "@/lib/reports/data-availability";
import { IMPACT_PROXY_CONFIG } from "@/lib/gamification/impact-proxy-config";
import {
  REPORT_GENERATION_TIME_ZONE,
  filterReportGenerationContracts,
  isValidReportGenerationPeriodSelection,
  type ReportGenerationPeriodSelection,
} from "@/lib/reports/generation-period";
import type { ReportScopeKind } from "@/lib/reports/scope";
import { buildPdfData, buildReportTitle } from "./reports-web-document.shared";
import {
  buildResumeNoticeLines,
  getScopeOptionsKey,
  resolveResumedPeriod,
} from "./reports-web-document-config";
import type { ReportsWebDocumentProps } from "./reports-web-document.types";

export function useReportsWebDocumentConfig(props: ReportsWebDocumentProps) {
  const {
    contracts,
    isTruncated = false,
    sourceHealth,
    communityEvents,
    communityEventsAvailability,
    dailyExportAvailability: initialDailyExportAvailability = "unavailable",
    actionMediaReadyCountByActionId = {},
    actionMediaAvailability = "available",
    resumeConfig,
    resumeStatus,
    singleAction,
  } = props;
  const [showPreview, setShowPreview] = useState(false);
  const [historyWarning, setHistoryWarning] = useState<string | null>(null);
  const [resumeScopeSelectionDone, setResumeScopeSelectionDone] = useState(false);
  const [dailyExportAvailability, setDailyExportAvailability] = useState(initialDailyExportAvailability);
  const [period, setPeriod] = useState<SelectedPeriodId>(singleAction ? "full_history" : resolveResumedPeriod(resumeConfig));
  const [customRange, setCustomRange] = useState({ from: resumeConfig?.period.from ?? "", to: resumeConfig?.period.to ?? "" });
  const [detailLevel, setDetailLevel] = useState<DetailLevelId>(resumeConfig?.detailLevel ?? DEFAULT_REPORT_DETAIL_LEVEL);
  const [reportTheme, setReportTheme] = useState<ReportPdfTheme>(resumeConfig?.theme ?? DEFAULT_REPORT_PDF_THEME);
  const [modules, setModules] = useState<ModuleState>(resumeConfig?.modules ?? DEFAULT_REPORT_MODULES);
  const [advancedFilters, setAdvancedFilters] = useState<ReportAdvancedFilters>(resumeConfig?.filters ?? REPORT_ADVANCED_FILTER_DEFAULTS);
  const [advancedFiltersOpen, setAdvancedFiltersOpen] = useState(false);
  const reportNow = useMemo(() => new Date(), []);
  const periodSelection = useMemo<ReportGenerationPeriodSelection>(
    () => period === "custom_range" ? { id: "custom_range", from: customRange.from, to: customRange.to } : { id: period },
    [customRange.from, customRange.to, period],
  );
  const periodSelectionValid = isValidReportGenerationPeriodSelection(periodSelection);
  const initialScope = resumeConfig?.scope && resumeConfig.scope.kind !== "single_action"
    ? { kind: resumeConfig.scope.kind as ReportScopeKind, value: resumeConfig.scope.value }
    : undefined;
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
    initialScopeContracts: contracts,
    initialScope,
    advancedFilters,
    actionMediaReadyCountByActionId,
    actionMediaAvailability,
  });
  const coverageRangeLabel = useMemo(
    () => buildCoverageRangeLabel(model.filteredContracts ?? filteredContracts),
    [filteredContracts, model.filteredContracts],
  );
  const resumedScopeIsAvailable = resumeConfig?.scope
    ? resumeConfig.scope.kind === "single_action"
      ? Boolean(singleAction)
      : resumeConfig.scope.kind === "global" || model.scopeOptions[getScopeOptionsKey(resumeConfig.scope.kind)].some((option) => option.value === resumeConfig.scope?.value)
    : false;
  const scopeNeedsNewSelection = Boolean(resumeStatus || (resumeConfig && (!resumeConfig.scope || !resumedScopeIsAvailable))) && !resumeScopeSelectionDone;
  const resumeNoticeLines = buildResumeNoticeLines({ resumeConfig, resumeStatus, scopeNeedsNewSelection });
  const dataAvailabilityNotices = buildReportDataAvailabilityNotices(model.dataAvailability);
  const report = model.report;
  const activeScopeLabel = singleAction?.scopeLabel ?? model.activeScopeLabel;
  const wasteKnown = report.totals.knownWasteActions === undefined || report.totals.knownWasteActions > 0;
  const volunteersKnown = (report.totals.volunteersKnownActions ?? 0) > 0;
  const surfaceProxy = wasteKnown && volunteersKnown
    ? report.totals.kg * IMPACT_PROXY_CONFIG.factors.surfaceM2PerWasteKg + report.totals.hours * 60 * IMPACT_PROXY_CONFIG.factors.surfaceM2PerVolunteerMinute
    : null;
  const selectedScopeValue = singleAction ? "single_action" : scopeNeedsNewSelection ? "" : buildScopeSelectValue(model.scopeKind, model.scopeValue);
  const defaultTitle = buildReportTitle(activeScopeLabel, detailLevel);
  const pdfData = useMemo(
    () => buildPdfData({
      reportTitle: defaultTitle,
      scopeLabel: activeScopeLabel,
      period,
      periodRange: period === "custom_range" && periodSelectionValid ? { from: customRange.from, to: customRange.to, timeZone: REPORT_GENERATION_TIME_ZONE } : undefined,
      detailLevel,
      modules,
      model,
      surfaceProxy,
      generatedAt: reportNow.toISOString(),
    }),
    [activeScopeLabel, customRange.from, customRange.to, defaultTitle, detailLevel, model, modules, period, periodSelectionValid, reportNow, surfaceProxy],
  );
  function handleScopeChange(value: string): void {
    const next = parseScopeSelectValue(value);
    model.setScopeKind(next.kind);
    model.setScopeValue(next.value);
    setResumeScopeSelectionDone(true);
  }
  function toggleModule(key: keyof ModuleState): void {
    setModules((current) => ({ ...current, [key]: !current[key] }));
  }
  return {
    model, report, period, setPeriod, customRange, setCustomRange, detailLevel, setDetailLevel,
    reportTheme, setReportTheme, modules, advancedFilters, setAdvancedFilters, advancedFiltersOpen,
    setAdvancedFiltersOpen, reportNow, periodSelection, periodSelectionValid, scopeNeedsNewSelection,
    resumeNoticeLines, dataAvailabilityNotices, activeScopeLabel, coverageRangeLabel, selectedScopeValue,
    defaultTitle, pdfData, showPreview, setShowPreview, historyWarning, setHistoryWarning,
    dailyExportAvailability, setDailyExportAvailability, toggleModule, handleScopeChange,
    singleAction,
  };
}
