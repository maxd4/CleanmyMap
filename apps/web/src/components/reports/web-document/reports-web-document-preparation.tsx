"use client";

import { CmmCard } from "@/components/ui/cmm-card";

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
    <section aria-labelledby="reports-configuration-title" className="min-w-0">
      <CmmCard tone="family" className="space-y-5">
      <div><p className="cmm-text-caption font-semibold text-rose-700">Étape 1 · Sélection</p><h3 id="reports-configuration-title" className="mt-1 text-xl font-bold tracking-tight text-slate-950">Configuration</h3><p className="mt-1 text-sm leading-5 text-slate-600">Période, périmètre et modules du rapport.</p></div>
      <div className="mt-5 space-y-5">
        {resumeNotice && resumeNotice.length > 0 ? <div data-testid="reports-resume-notice" role="status" className="space-y-1 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-950"><p className="font-black">Configuration reprise</p>{resumeNotice.map((line) => <p key={line}>{line}</p>)}</div> : null}
        <div className="grid gap-4 sm:grid-cols-2">
          <ReportsScopeControls selectedScopeValue={selectedScopeValue} scopeOptions={scopeOptions} onScopeChange={onScopeChange} singleAction={singleAction} />
          <ReportsPeriodControls period={period} onPeriodChange={onPeriodChange} customRange={customRange} onCustomRangeChange={onCustomRangeChange} singleAction={singleAction} />
        </div>
        {!singleAction ? <ReportsAdvancedFilterControls filters={advancedFilters} onChange={onAdvancedFiltersChange} availability={actionMediaAvailability} open={advancedFiltersOpen} onToggle={onAdvancedFiltersToggle} /> : null}
        <div className="space-y-4 border-t border-slate-200 pt-4">
          <div><h4 className="font-bold cmm-text-primary">Composition du document</h4><p className="cmm-text-small cmm-text-secondary">Le niveau et le thème modifient la restitution, pas les actions retenues.</p></div>
          <div className="grid gap-4 sm:grid-cols-2"><ReportsOptionControls detailLevel={detailLevel} onDetailLevelChange={onDetailLevelChange} theme={theme} onThemeChange={onThemeChange} /></div>
          <ReportsModuleControls modules={modules} onModuleToggle={onModuleToggle} />
        </div>
      </div>
      </CmmCard>
    </section>
  );
}
