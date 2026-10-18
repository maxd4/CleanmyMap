"use client";

import {
  CalendarDays,
  MapPin,
} from "lucide-react";
import { ReportsAdvancedFiltersPanel } from "./reports-advanced-filters-panel";
import {
  DETAIL_LEVEL_OPTIONS,
  REPORT_MODULE_DEFINITIONS,
  REPORT_PDF_THEME_OPTIONS,
  detailLevelDescription,
  type ModuleState,
  type DetailLevelId,
  type ReportPdfTheme,
  type SelectedPeriodId,
  type ReportAdvancedFilters,
} from "./reports-web-document.shared";

type ScopeChoice = {
  value: string;
  label: string;
};

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
  scopeOptions: {
    accounts: ScopeChoice[];
    associations: ScopeChoice[];
    arrondissements: ScopeChoice[];
  };
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
    <section
      aria-labelledby="reports-configuration-title"
      className="rounded-2xl border border-red-100 bg-white p-5 shadow-[0_12px_30px_-24px_rgba(220,38,38,0.28)] sm:p-6"
    >
      <div>
        <p className="text-xs font-semibold text-red-600">Rapport d&apos;impact</p>
        <h3 id="reports-configuration-title" className="mt-1 text-xl font-bold tracking-tight text-slate-950">
          Configuration
        </h3>
        <p className="mt-1 text-sm leading-5 text-slate-600">
          Période, périmètre et modules du rapport.
        </p>
      </div>

      <div className="mt-5 space-y-5">
        {resumeNotice && resumeNotice.length > 0 ? (
          <div
            data-testid="reports-resume-notice"
            role="status"
            className="space-y-1 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-950"
          >
            <p className="font-black">Configuration reprise</p>
            {resumeNotice.map((line) => <p key={line}>{line}</p>)}
          </div>
        ) : null}
        <div className="space-y-3">
          <label htmlFor="reports-web-document-period" className="block text-sm font-black text-slate-900">Période</label>
          {singleAction ? (
            <div
              id="reports-web-document-period"
              role="status"
              className="flex min-h-12 items-center rounded-xl border border-red-200 bg-red-50 px-4 text-sm font-semibold text-red-950"
            >
              Historique complet · action sélectionnée
            </div>
          ) : <div className="relative">
            <CalendarDays
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              size={18}
            />
            <select
              id="reports-web-document-period"
              value={period}
              onChange={(event) => onPeriodChange(event.target.value as SelectedPeriodId)}
              className="h-12 w-full rounded-xl border border-slate-200 bg-white pl-11 pr-10 text-sm text-slate-600 shadow-[inset_0_1px_4px_rgba(15,23,42,0.04)] outline-none transition focus:border-red-300"
            >
              <option value="thirty_days">30 jours</option>
              <option value="three_months">3 mois</option>
              <option value="six_months">Six mois</option>
              <option value="twelve_months">12 mois</option>
              <option value="current_year">Année en cours</option>
              <option value="full_history">Historique complet</option>
              <option value="custom_range">Dates personnalisées</option>
            </select>
          </div>}
          {!singleAction && period === "custom_range" ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-xs font-semibold text-slate-600">
                Du
                <input
                  type="date"
                  value={customRange.from}
                  onChange={(event) => onCustomRangeChange({ ...customRange, from: event.target.value })}
                  className="mt-1 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm text-slate-700 outline-none focus:border-red-300"
                />
              </label>
              <label className="text-xs font-semibold text-slate-600">
                Au
                <input
                  type="date"
                  value={customRange.to}
                  min={customRange.from || undefined}
                  onChange={(event) => onCustomRangeChange({ ...customRange, to: event.target.value })}
                  className="mt-1 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm text-slate-700 outline-none focus:border-red-300"
                />
              </label>
              {customRange.from && customRange.to && customRange.from > customRange.to ? (
                <p role="alert" className="text-xs font-semibold text-red-700 sm:col-span-2">
                  La date de début doit précéder la date de fin.
                </p>
              ) : null}
              <p className="text-xs leading-5 text-slate-500 sm:col-span-2">
                Dates civiles inclusives, interprétées en UTC sur la date métier de l&apos;action.
              </p>
            </div>
          ) : null}

        </div>

        {!singleAction ? (
          <div className="rounded-xl border border-slate-200 bg-slate-50/70">
            <button
              type="button"
              aria-expanded={advancedFiltersOpen}
              aria-controls="reports-advanced-filters"
              onClick={onAdvancedFiltersToggle}
              className="flex min-h-12 w-full items-center justify-between px-4 text-left text-sm font-black text-slate-900"
            >
              <span>Filtres avancés</span>
              <span aria-hidden="true" className="text-slate-500">{advancedFiltersOpen ? "−" : "+"}</span>
            </button>
            {advancedFiltersOpen ? (
              <ReportsAdvancedFiltersPanel
                filters={advancedFilters}
                onChange={onAdvancedFiltersChange}
                actionMediaAvailability={actionMediaAvailability}
              />
            ) : null}
          </div>
        ) : null}

        <div className="space-y-2">
          <label htmlFor="reports-web-document-detail-level" className="block text-sm font-black text-slate-900">
            Niveau de détail
          </label>
          <select
            id="reports-web-document-detail-level"
            value={detailLevel}
            onChange={(event) => onDetailLevelChange(event.target.value as DetailLevelId)}
            aria-describedby="reports-web-document-detail-level-description"
            className="h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-600 shadow-[inset_0_1px_4px_rgba(15,23,42,0.04)] outline-none transition focus:border-red-300"
          >
            {DETAIL_LEVEL_OPTIONS.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
          <p id="reports-web-document-detail-level-description" className="text-xs leading-5 text-slate-500">
            {detailLevelDescription(detailLevel)}
          </p>
        </div>

        <div className="space-y-2">
          <label htmlFor="reports-web-document-theme" className="block text-sm font-black text-slate-900">
            Thème PDF
          </label>
          <select
            id="reports-web-document-theme"
            value={theme}
            onChange={(event) => onThemeChange(event.target.value as ReportPdfTheme)}
            aria-describedby="reports-web-document-theme-description"
            className="h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-600 shadow-[inset_0_1px_4px_rgba(15,23,42,0.04)] outline-none transition focus:border-red-300"
          >
            {REPORT_PDF_THEME_OPTIONS.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
          <p id="reports-web-document-theme-description" className="text-xs leading-5 text-slate-500">
            {REPORT_PDF_THEME_OPTIONS.find((option) => option.id === theme)?.description}
          </p>
        </div>

        <div className="space-y-3">
          <label htmlFor="reports-web-document-scope" className="block text-sm font-black text-slate-900">Périmètre du rapport</label>
          {singleAction ? (
            <div
              id="reports-web-document-scope"
              role="status"
              className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-950"
            >
              <span className="block font-bold">{singleAction.scopeLabel}</span>
              <span className="mt-1 block text-xs text-red-800">Action sélectionnée · résolution serveur à la génération</span>
            </div>
          ) : <div className="relative">
            <MapPin
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              size={18}
            />
            <select
              id="reports-web-document-scope"
              value={selectedScopeValue}
              onChange={(event) => onScopeChange(event.target.value)}
              className="h-12 w-full rounded-xl border border-slate-200 bg-white pl-11 pr-10 text-sm text-slate-600 shadow-[inset_0_1px_4px_rgba(15,23,42,0.04)] outline-none transition focus:border-red-300"
            >
              <option value="">Sélectionner un périmètre</option>
              <optgroup label="Général">
                <option value="global">Global</option>
              </optgroup>
              <optgroup label="Compte">
                {scopeOptions.accounts.map((choice) => (
                  <option key={choice.value} value={`account:${choice.value}`}>
                    {choice.label}
                  </option>
                ))}
              </optgroup>
              <optgroup label="Association">
                {scopeOptions.associations.map((choice) => (
                  <option key={choice.value} value={`association:${choice.value}`}>
                    {choice.label}
                  </option>
                ))}
              </optgroup>
              <optgroup label="Arrondissement">
                {scopeOptions.arrondissements.map((choice) => (
                  <option key={choice.value} value={`arrondissement:${choice.value}`}>
                    {choice.label}
                  </option>
                ))}
              </optgroup>
            </select>
          </div>}
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-black text-slate-900">
            Modules optionnels
            <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-slate-200 text-[10px] font-black text-slate-400">
              i
            </span>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {REPORT_MODULE_DEFINITIONS.map((option) => {
              const checked = modules[option.id];
              return (
                <label
                  htmlFor={`reports-web-document-module-${option.id}`}
                  key={option.id}
                  className={`flex cursor-pointer items-start gap-3 rounded-xl border px-3 py-2 transition ${
                    checked
                      ? "border-red-200 bg-red-50"
                      : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                  }`}
                >
                  <input
                    id={`reports-web-document-module-${option.id}`}
                    type="checkbox"
                    checked={checked}
                    onChange={() => onModuleToggle(option.id)}
                    className="mt-1 h-4 w-4 rounded border-slate-300 text-red-600 focus:ring-red-400"
                  />
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-slate-800">
                      {option.label}
                    </span>
                    <span className="block text-xs leading-5 text-slate-500">
                      {option.description}
                    </span>
                  </span>
                </label>
              );
            })}
          </div>
        </div>

      </div>
    </section>
  );
}
