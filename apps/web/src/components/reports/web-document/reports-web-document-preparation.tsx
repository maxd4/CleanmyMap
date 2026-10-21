"use client";

import type { ModuleState, DetailLevelId, ReportPdfTheme, SelectedPeriodId, ReportAdvancedFilters } from "./reports-web-document.shared";
import {
  ReportsAdvancedFilterControls,
  ReportsModuleControls,
  ReportsOptionControls,
  ReportsPeriodControls,
  ReportsScopeControls,
  type ScopeOptions,
} from "./reports-web-document-preparation-sections";

export type ReportsWebDocumentPreparationProps = {
  period: SelectedPeriodId;
  onPeriodChange: (period: SelectedPeriodId) => void;
  detailLevel: DetailLevelId;
  onDetailLevelChange: (detailLevel: DetailLevelId) => void;
  theme: ReportPdfTheme;
  onThemeChange: (theme: ReportPdfTheme) => void;
  customRange?: { from: string; to: string };
  onCustomRangeChange?: (range: { from: string; to: string }) => void;
  selectedScopeValue: string;
  scopeOptions: ScopeOptions;
  onScopeChange: (value: string) => void;
  singleAction?: { actionId: string; scopeLabel: string };
  modules: ModuleState;
  onModuleToggle: (key: keyof ModuleState) => void;
  advancedFilters: ReportAdvancedFilters;
  onAdvancedFiltersChange: (filters: ReportAdvancedFilters) => void;
  resumeNotice?: string[];
  actionMediaAvailability?: "available" | "unavailable";
  advancedFiltersOpen?: boolean;
  onAdvancedFiltersToggle?: () => void;
};

export function ReportsWebDocumentPreparation({
  period,
  onPeriodChange,
  detailLevel,
  onDetailLevelChange,
  theme,
  onThemeChange,
  customRange = { from: "", to: "" },
  onCustomRangeChange = () => undefined,
  selectedScopeValue,
  scopeOptions,
  onScopeChange,
  singleAction,
  modules,
  onModuleToggle,
  advancedFilters,
  onAdvancedFiltersChange,
  resumeNotice,
  actionMediaAvailability = "available",
  advancedFiltersOpen = false,
  onAdvancedFiltersToggle = () => undefined,
}: ReportsWebDocumentPreparationProps) {
  return (
    <section aria-labelledby="reports-configuration-title" className="rounded-2xl border border-red-100 bg-white p-5 shadow-[0_12px_30px_-24px_rgba(220,38,38,0.28)] sm:p-6">
      <div><p className="text-xs font-semibold text-red-600">Rapport d&apos;impact</p><h3 id="reports-configuration-title" className="mt-1 text-xl font-bold tracking-tight text-slate-950">Configuration</h3><p className="mt-1 text-sm leading-5 text-slate-600">Période, périmètre et modules du rapport.</p></div>
      <div className="mt-5 space-y-5">
        {resumeNotice && resumeNotice.length > 0 ? <div data-testid="reports-resume-notice" role="status" className="space-y-1 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-950"><p className="font-black">Configuration reprise</p>{resumeNotice.map((line) => <p key={line}>{line}</p>)}</div> : null}
        <ReportsPeriodControls period={period} onPeriodChange={onPeriodChange} customRange={customRange} onCustomRangeChange={onCustomRangeChange} singleAction={singleAction} />
        {!singleAction ? <ReportsAdvancedFilterControls filters={advancedFilters} onChange={onAdvancedFiltersChange} availability={actionMediaAvailability} open={advancedFiltersOpen} onToggle={onAdvancedFiltersToggle} /> : null}
        <ReportsOptionControls detailLevel={detailLevel} onDetailLevelChange={onDetailLevelChange} theme={theme} onThemeChange={onThemeChange} />
        <ReportsScopeControls selectedScopeValue={selectedScopeValue} scopeOptions={scopeOptions} onScopeChange={onScopeChange} singleAction={singleAction} />
        <ReportsModuleControls modules={modules} onModuleToggle={onModuleToggle} />
      </div>
    </section>
  );
}
