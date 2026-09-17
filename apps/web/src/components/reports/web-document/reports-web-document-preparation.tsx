"use client";

import {
  CalendarDays,
  MapPin,
} from "lucide-react";
import {
  REPORT_MODULE_DEFINITIONS,
  type ModuleState,
  type SelectedPeriodId,
} from "./reports-web-document.shared";

type ScopeChoice = {
  value: string;
  label: string;
};

export type ReportsWebDocumentPreparationProps = {
  period: SelectedPeriodId;
  onPeriodChange: (period: SelectedPeriodId) => void;
  historyCompletenessWarning?: boolean;
  selectedScopeValue: string;
  scopeOptions: {
    accounts: ScopeChoice[];
    associations: ScopeChoice[];
    arrondissements: ScopeChoice[];
  };
  onScopeChange: (value: string) => void;
  modules: ModuleState;
  onModuleToggle: (key: keyof ModuleState) => void;
};

export function ReportsWebDocumentPreparation({
  period,
  onPeriodChange,
  selectedScopeValue,
  scopeOptions,
  onScopeChange,
  modules,
  onModuleToggle,
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
        <div className="space-y-3">
          <label className="block text-sm font-black text-slate-900">Période</label>
          <div className="relative">
            <CalendarDays
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              size={18}
            />
            <select
              value={period}
              onChange={(event) => onPeriodChange(event.target.value as SelectedPeriodId)}
              className="h-12 w-full rounded-xl border border-slate-200 bg-white pl-11 pr-10 text-sm text-slate-600 shadow-[inset_0_1px_4px_rgba(15,23,42,0.04)] outline-none transition focus:border-red-300"
            >
              <option value="six_months">Six mois</option>
              <option value="current_year">Année en cours</option>
              <option value="full_history">Historique complet</option>
            </select>
          </div>

        </div>

        <div className="space-y-3">
          <label className="block text-sm font-black text-slate-900">Périmètre du rapport</label>
          <div className="relative">
            <MapPin
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              size={18}
            />
            <select
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
          </div>
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
                  key={option.id}
                  className={`flex cursor-pointer items-start gap-3 rounded-xl border px-3 py-2 transition ${
                    checked
                      ? "border-red-200 bg-red-50"
                      : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                  }`}
                >
                  <input
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
