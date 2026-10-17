"use client";

import type { ReportAdvancedFilters } from "./reports-web-document.shared";

export type ReportsAdvancedFiltersPanelProps = {
  filters: ReportAdvancedFilters;
  onChange: (filters: ReportAdvancedFilters) => void;
  actionMediaAvailability: "available" | "unavailable";
};

export function ReportsAdvancedFiltersPanel({
  filters,
  onChange,
  actionMediaAvailability,
}: ReportsAdvancedFiltersPanelProps) {
  const setFilter = <K extends keyof ReportAdvancedFilters>(
    key: K,
    value: ReportAdvancedFilters[K],
  ) => onChange({ ...filters, [key]: value });

  return (
    <div id="reports-advanced-filters" className="space-y-4 border-t border-slate-200 px-4 py-4">
      <p className="text-xs leading-5 text-slate-600">
        Ces filtres utilisent uniquement les champs canoniques de l&apos;action. Les valeurs absentes ne satisfont pas un seuil.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-xs font-semibold text-slate-600">
          Qualité des données
          <select value={filters.dataQuality} onChange={(event) => setFilter("dataQuality", event.target.value as ReportAdvancedFilters["dataQuality"])} className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-white px-2 text-sm text-slate-700">
            <option value="all">Toutes les données</option>
            <option value="without_blocking_anomaly">Sans anomalie bloquante</option>
          </select>
        </label>
        <label className="text-xs font-semibold text-slate-600">
          Qualité minimale
          <select value={filters.qualityGradeAtLeast} onChange={(event) => setFilter("qualityGradeAtLeast", event.target.value as ReportAdvancedFilters["qualityGradeAtLeast"])} className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-white px-2 text-sm text-slate-700">
            <option value="any">Toutes</option>
            <option value="C">C ou mieux</option>
            <option value="B">B ou mieux</option>
            <option value="A">A uniquement</option>
          </select>
        </label>
        <label className="text-xs font-semibold text-slate-600">
          Provenance des mesures
          <select value={filters.measureProvenance} onChange={(event) => setFilter("measureProvenance", event.target.value as ReportAdvancedFilters["measureProvenance"])} className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-white px-2 text-sm text-slate-700">
            <option value="any">Toutes</option>
            <option value="measured">Mesurées</option>
            <option value="derived">Dérivées</option>
            <option value="estimated">Estimées</option>
            <option value="missing">Indisponibles</option>
          </select>
        </label>
        <label className="text-xs font-semibold text-slate-600">
          Coordonnées
          <select value={filters.validCoordinates} onChange={(event) => setFilter("validCoordinates", event.target.value as ReportAdvancedFilters["validCoordinates"])} className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-white px-2 text-sm text-slate-700">
            <option value="any">Toutes</option>
            <option value="required">Présentes et valides</option>
          </select>
        </label>
        <label className="text-xs font-semibold text-slate-600">
          Provenance géométrique
          <select value={filters.geometryProvenance} onChange={(event) => setFilter("geometryProvenance", event.target.value as ReportAdvancedFilters["geometryProvenance"])} className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-white px-2 text-sm text-slate-700">
            <option value="any">Toutes</option>
            <option value="observed">Observée</option>
            <option value="declared">Déclarée</option>
            <option value="reference">Référence</option>
            <option value="reconstructed">Reconstituée</option>
            <option value="estimated">Estimée</option>
            <option value="fallback">Point de secours</option>
            <option value="missing">Indisponible</option>
          </select>
        </label>
        <label className="text-xs font-semibold text-slate-600">
          Mode de déclaration
          <select value={filters.declarationOrigin} onChange={(event) => setFilter("declarationOrigin", event.target.value as ReportAdvancedFilters["declarationOrigin"])} className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-white px-2 text-sm text-slate-700">
            <option value="any">Tous</option>
            <option value="quick">Déclaration rapide</option>
            <option value="complete">Déclaration complète</option>
          </select>
        </label>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {([
          ["wasteKgMin", "Masse minimale (kg)"],
          ["wasteKgMax", "Masse maximale (kg)"],
          ["cigaretteButtsMin", "Mégots minimum"],
          ["cigaretteButtsMax", "Mégots maximum"],
        ] as const).map(([key, label]) => (
          <label key={key} className="text-xs font-semibold text-slate-600">
            {label}
            <input
              type="number"
              min="0"
              step="any"
              value={filters[key] ?? ""}
              onChange={(event) => setFilter(key, event.target.value === "" ? null : Number(event.target.value))}
              className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-white px-2 text-sm text-slate-700"
            />
          </label>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-xs font-semibold text-slate-600">
          Catégorie structurée
          <select value={filters.wasteCategory} onChange={(event) => setFilter("wasteCategory", event.target.value as ReportAdvancedFilters["wasteCategory"])} className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-white px-2 text-sm text-slate-700">
            <option value="any">Toutes</option>
            <option value="recyclables">Recyclables</option>
            <option value="glass">Verre</option>
            <option value="household">Déchets ménagers</option>
            <option value="other">Autres déchets</option>
          </select>
        </label>
        <label className="text-xs font-semibold text-slate-600">
          Géométrie exploitable
          <select value={filters.exploitableGeometry} onChange={(event) => setFilter("exploitableGeometry", event.target.value as ReportAdvancedFilters["exploitableGeometry"])} className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-white px-2 text-sm text-slate-700">
            <option value="any">Toutes</option>
            <option value="with">Avec géométrie</option>
            <option value="without">Sans géométrie</option>
          </select>
        </label>
        <label className="text-xs font-semibold text-slate-600 sm:col-span-2">
          Preuve photographique finalisée
          <select
            value={filters.photographicEvidence}
            disabled={actionMediaAvailability === "unavailable"}
            onChange={(event) => setFilter("photographicEvidence", event.target.value as ReportAdvancedFilters["photographicEvidence"])}
            className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-white px-2 text-sm text-slate-700 disabled:cursor-not-allowed disabled:bg-slate-100"
          >
            <option value="any">Toutes</option>
            <option value="with">Avec preuve ready</option>
            <option value="without">Sans preuve ready</option>
          </select>
          {actionMediaAvailability === "unavailable" ? (
            <span className="mt-1 block font-normal text-amber-700">Preuve photo indisponible pour ce chargement ; aucun objet privé n&apos;est transmis au navigateur.</span>
          ) : null}
        </label>
      </div>
    </div>
  );
}
