"use client";

import {
  CalendarDays,
  MapPin,
  ShieldCheck,
  SlidersHorizontal,
  TriangleAlert,
} from "lucide-react";
import {
  DETAIL_LEVEL_OPTIONS,
  GenerationStageCard,
  REPORT_HISTORY_SERVER_LIMIT,
  REPORT_MODULE_DEFINITIONS,
  type DetailLevelId,
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
  historyCompletenessWarning: boolean;
  selectedScopeValue: string;
  scopeOptions: {
    accounts: ScopeChoice[];
    associations: ScopeChoice[];
    arrondissements: ScopeChoice[];
  };
  onScopeChange: (value: string) => void;
  detailLevel: DetailLevelId;
  onDetailLevelChange: (detailLevel: DetailLevelId) => void;
  modules: ModuleState;
  onModuleToggle: (key: keyof ModuleState) => void;
};

export function ReportsWebDocumentPreparation({
  period,
  onPeriodChange,
  historyCompletenessWarning,
  selectedScopeValue,
  scopeOptions,
  onScopeChange,
  detailLevel,
  onDetailLevelChange,
  modules,
  onModuleToggle,
}: ReportsWebDocumentPreparationProps) {
  return (
    <GenerationStageCard
      tone="prepare"
      step="1"
      title="Préparer le rapport"
      description="Choisissez la période, le périmètre et le niveau de détail avant de lancer la génération."
    >
      <div className="space-y-3">
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

          {historyCompletenessWarning ? (
            <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-900">
              <TriangleAlert size={14} className="mt-0.5 shrink-0 text-amber-600" />
              <p>
                Historique disponible — plafonné à {REPORT_HISTORY_SERVER_LIMIT} actions
                approuvées. Pour une complétude strictement exhaustive, il faut lever ce plafond
                côté serveur.
              </p>
            </div>
          ) : null}
        </div>

        <div className="space-y-3">
          <label className="block text-sm font-black text-slate-900">Périmètre géographique</label>
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
          <label className="block text-sm font-black text-slate-900">Niveau de détail</label>
          <div className="relative">
            <SlidersHorizontal
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              size={18}
            />
            <select
              value={detailLevel}
              onChange={(event) => onDetailLevelChange(event.target.value as DetailLevelId)}
              className="h-12 w-full rounded-xl border border-slate-200 bg-white pl-11 pr-10 text-sm text-slate-600 shadow-[inset_0_1px_4px_rgba(15,23,42,0.04)] outline-none transition focus:border-red-300"
            >
              {DETAIL_LEVEL_OPTIONS.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label} ({option.pages})
                </option>
              ))}
            </select>
          </div>
          <p className="text-xs leading-5 text-slate-500">
            Le nombre de pages est indicatif et varie légèrement selon le volume de données.
          </p>
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

        <p className="flex items-start gap-2 rounded-xl bg-slate-50 px-3 py-2 text-xs leading-5 text-slate-500">
          <ShieldCheck size={16} className="mt-0.5 shrink-0 text-red-600" />
          Le rapport est généré à partir des données et de la méthodologie CleanMyMap.
        </p>
      </div>
    </GenerationStageCard>
  );
}
