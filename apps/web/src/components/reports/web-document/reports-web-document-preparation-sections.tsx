"use client";

import { CalendarDays, MapPin } from "lucide-react";
import { ReportsAdvancedFiltersPanel } from "./reports-advanced-filters-panel";
import {
  DETAIL_LEVEL_OPTIONS,
  REPORT_MODULE_DEFINITIONS,
  REPORT_PDF_THEME_OPTIONS,
  detailLevelDescription,
  type DetailLevelId,
  type ModuleState,
  type ReportAdvancedFilters,
  type ReportPdfTheme,
  type SelectedPeriodId,
} from "./reports-web-document.shared";

type ScopeChoice = { value: string; label: string };
export type ScopeOptions = {
  accounts: ScopeChoice[];
  associations: ScopeChoice[];
  arrondissements: ScopeChoice[];
};

export function ReportsPeriodControls(props: {
  period: SelectedPeriodId;
  onPeriodChange: (period: SelectedPeriodId) => void;
  customRange: { from: string; to: string };
  onCustomRangeChange: (range: { from: string; to: string }) => void;
  singleAction?: { actionId: string; scopeLabel: string };
}) {
  return (
    <div className="space-y-3">
      <label
        htmlFor="reports-web-document-period"
        className="block text-sm font-black text-slate-900"
      >
        Période
      </label>
      {props.singleAction ? (
        <div
          id="reports-web-document-period"
          role="status"
          className="flex min-h-12 items-center rounded-xl border border-red-200 bg-red-50 px-4 text-sm font-semibold text-red-950"
        >
          Historique complet · action sélectionnée
        </div>
      ) : (
        <div className="relative">
          <CalendarDays
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            size={18}
          />
          <select
            id="reports-web-document-period"
            value={props.period}
            onChange={(event) =>
              props.onPeriodChange(event.target.value as SelectedPeriodId)
            }
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
        </div>
      )}
      {!props.singleAction && props.period === "custom_range" ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-xs font-semibold text-slate-600">
            Du
            <input
              type="date"
              value={props.customRange.from}
              onChange={(event) =>
                props.onCustomRangeChange({
                  ...props.customRange,
                  from: event.target.value,
                })
              }
              className="mt-1 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm text-slate-700 outline-none focus:border-red-300"
            />
          </label>
          <label className="text-xs font-semibold text-slate-600">
            Au
            <input
              type="date"
              value={props.customRange.to}
              min={props.customRange.from || undefined}
              onChange={(event) =>
                props.onCustomRangeChange({
                  ...props.customRange,
                  to: event.target.value,
                })
              }
              className="mt-1 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm text-slate-700 outline-none focus:border-red-300"
            />
          </label>
          {props.customRange.from &&
          props.customRange.to &&
          props.customRange.from > props.customRange.to ? (
            <p
              role="alert"
              className="text-xs font-semibold text-red-700 sm:col-span-2"
            >
              La date de début doit précéder la date de fin.
            </p>
          ) : null}
          <p className="text-xs leading-5 text-slate-500 sm:col-span-2">
            Dates civiles inclusives, interprétées en UTC sur la date métier de
            l&apos;action.
          </p>
        </div>
      ) : null}
    </div>
  );
}

export function ReportsScopeControls(props: {
  selectedScopeValue: string;
  scopeOptions: ScopeOptions;
  onScopeChange: (value: string) => void;
  singleAction?: { actionId: string; scopeLabel: string };
}) {
  return (
    <div className="space-y-3">
      <label
        htmlFor="reports-web-document-scope"
        className="block text-sm font-black text-slate-900"
      >
        Périmètre du rapport
      </label>
      {props.singleAction ? (
        <div
          id="reports-web-document-scope"
          role="status"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-950"
        >
          <span className="block font-bold">
            {props.singleAction.scopeLabel}
          </span>
          <span className="mt-1 block text-xs text-red-800">
            Action sélectionnée · résolution serveur à la génération
          </span>
        </div>
      ) : (
        <div className="relative">
          <MapPin
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            size={18}
          />
          <select
            id="reports-web-document-scope"
            value={props.selectedScopeValue}
            onChange={(event) => props.onScopeChange(event.target.value)}
            className="h-12 w-full rounded-xl border border-slate-200 bg-white pl-11 pr-10 text-sm text-slate-600 shadow-[inset_0_1px_4px_rgba(15,23,42,0.04)] outline-none transition focus:border-red-300"
          >
            <option value="">Sélectionner un périmètre</option>
            <optgroup label="Général">
              <option value="global">Global</option>
            </optgroup>
            <optgroup label="Compte">
              {props.scopeOptions.accounts.map((choice) => (
                <option key={choice.value} value={`account:${choice.value}`}>
                  {choice.label}
                </option>
              ))}
            </optgroup>
            <optgroup label="Association">
              {props.scopeOptions.associations.map((choice) => (
                <option
                  key={choice.value}
                  value={`association:${choice.value}`}
                >
                  {choice.label}
                </option>
              ))}
            </optgroup>
            <optgroup label="Arrondissement">
              {props.scopeOptions.arrondissements.map((choice) => (
                <option
                  key={choice.value}
                  value={`arrondissement:${choice.value}`}
                >
                  {choice.label}
                </option>
              ))}
            </optgroup>
          </select>
        </div>
      )}
    </div>
  );
}

export function ReportsOptionControls(props: {
  detailLevel: DetailLevelId;
  onDetailLevelChange: (value: DetailLevelId) => void;
  theme: ReportPdfTheme;
  onThemeChange: (value: ReportPdfTheme) => void;
}) {
  return (
    <>
      <div className="space-y-2">
        <label
          htmlFor="reports-web-document-detail-level"
          className="block text-sm font-black text-slate-900"
        >
          Niveau de détail
        </label>
        <select
          id="reports-web-document-detail-level"
          value={props.detailLevel}
          onChange={(event) =>
            props.onDetailLevelChange(event.target.value as DetailLevelId)
          }
          aria-describedby="reports-web-document-detail-level-description"
          className="h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-600 shadow-[inset_0_1px_4px_rgba(15,23,42,0.04)] outline-none transition focus:border-red-300"
        >
          {DETAIL_LEVEL_OPTIONS.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </select>
        <p
          id="reports-web-document-detail-level-description"
          className="text-xs leading-5 text-slate-500"
        >
          {detailLevelDescription(props.detailLevel)}
        </p>
      </div>
      <div className="space-y-2">
        <label
          htmlFor="reports-web-document-theme"
          className="block text-sm font-black text-slate-900"
        >
          Thème PDF
        </label>
        <select
          id="reports-web-document-theme"
          value={props.theme}
          onChange={(event) =>
            props.onThemeChange(event.target.value as ReportPdfTheme)
          }
          aria-describedby="reports-web-document-theme-description"
          className="h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-600 shadow-[inset_0_1px_4px_rgba(15,23,42,0.04)] outline-none transition focus:border-red-300"
        >
          {REPORT_PDF_THEME_OPTIONS.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </select>
        <p
          id="reports-web-document-theme-description"
          className="text-xs leading-5 text-slate-500"
        >
          {
            REPORT_PDF_THEME_OPTIONS.find((option) => option.id === props.theme)
              ?.description
          }
        </p>
      </div>
    </>
  );
}

export function ReportsModuleControls(props: {
  modules: ModuleState;
  onModuleToggle: (key: keyof ModuleState) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm font-black text-slate-900">
        Modules optionnels
        <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-slate-200 text-xs font-black text-slate-400">
          i
        </span>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {REPORT_MODULE_DEFINITIONS.map((option) => {
          const checked = props.modules[option.id];
          return (
            <label
              htmlFor={`reports-web-document-module-${option.id}`}
              key={option.id}
              className={`flex cursor-pointer items-start gap-3 rounded-xl border px-3 py-2 transition ${checked ? "border-red-200 bg-red-50" : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"}`}
            >
              <input
                id={`reports-web-document-module-${option.id}`}
                type="checkbox"
                checked={checked}
                onChange={() => props.onModuleToggle(option.id)}
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
  );
}

export function ReportsAdvancedFilterControls(props: {
  filters: ReportAdvancedFilters;
  onChange: (filters: ReportAdvancedFilters) => void;
  availability: "available" | "unavailable";
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/70">
      <button
        type="button"
        aria-expanded={props.open}
        aria-controls="reports-advanced-filters"
        onClick={props.onToggle}
        className="flex min-h-12 w-full items-center justify-between px-4 text-left text-sm font-black text-slate-900"
      >
        <span>Filtres avancés</span>
        <span aria-hidden="true" className="text-slate-500">
          {props.open ? "−" : "+"}
        </span>
      </button>
      {props.open ? (
        <ReportsAdvancedFiltersPanel
          filters={props.filters}
          onChange={props.onChange}
          actionMediaAvailability={props.availability}
        />
      ) : null}
    </div>
  );
}
