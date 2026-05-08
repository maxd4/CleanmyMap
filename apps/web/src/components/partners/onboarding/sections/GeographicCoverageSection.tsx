import React from "react";
import { PARIS_ARRONDISSEMENTS, formatPartnerScopeLabel, type ParisArrondissement, type PartnerScope, type PartnerCoverage } from "@/lib/partners/onboarding-types";

export function GeographicCoverageSection({
  partnerScope,
  coverage,
  coverageQuartierInput,
  setCoverageQuartierInput,
  addCoverageQuartiers,
  toggleArrondissement,
  setCoverageQuartiers,
}: {
  partnerScope: PartnerScope;
  coverage: PartnerCoverage;
  coverageQuartierInput: string;
  setCoverageQuartierInput: (v: string) => void;
  addCoverageQuartiers: () => void;
  toggleArrondissement: (v: ParisArrondissement) => void;
  setCoverageQuartiers: React.Dispatch<React.SetStateAction<string[]>>;
}) {
  return (
    <section className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
      <div>
        <h3 className="cmm-text-small font-semibold cmm-text-primary">Périmètre géographique</h3>
        <p className="mt-1 cmm-text-caption cmm-text-secondary">
          Choisis au moins un arrondissement pour un réseau local, ou laisse vide pour une couverture nationale.
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        {PARIS_ARRONDISSEMENTS.map((arrondissement) => {
          const checked = coverage.arrondissements.includes(arrondissement);
          return (
            <button
              type="button"
              key={arrondissement}
              onClick={() => toggleArrondissement(arrondissement)}
              className={`rounded-full px-3 py-2 cmm-text-caption font-semibold transition ${
                checked
                  ? "bg-slate-900 text-white"
                  : "bg-white cmm-text-secondary border border-slate-300 hover:bg-slate-100"
              }`}
            >
              Paris {arrondissement === 1 ? "1er" : `${arrondissement}e`}
            </button>
          );
        })}
      </div>
      <div className="space-y-2">
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            value={coverageQuartierInput}
            onChange={(event) => setCoverageQuartierInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                addCoverageQuartiers();
              }
            }}
            placeholder="Quartiers (ex: Bas Belleville, Belleville)"
            className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2 cmm-text-small"
          />
          <button
            type="button"
            onClick={addCoverageQuartiers}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 cmm-text-small font-semibold cmm-text-secondary hover:bg-slate-100"
          >
            Ajouter
          </button>
        </div>
        {coverage.quartiers.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {coverage.quartiers.map((quartier) => (
              <button
                key={quartier}
                type="button"
                onClick={() =>
                  setCoverageQuartiers((current) =>
                    current.filter((value) => value !== quartier)
                  )
                }
                className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-2 cmm-text-caption font-semibold text-emerald-800 hover:bg-emerald-100"
              >
                {quartier} ×
              </button>
            ))}
          </div>
        ) : null}
        <p className="cmm-text-caption cmm-text-muted">
          Sélection:{" "}
          {coverage.arrondissements.length > 0
            ? `Paris ${coverage.arrondissements.map((item) => `${item === 1 ? "1er" : `${item}e`}`).join(",")}`
            : "aucun arrondissement sélectionné"}
          {coverage.quartiers.length > 0 ? ` · ${coverage.quartiers.join(",")}` : ""}
        </p>
        {partnerScope !== "local" ? (
          <p className="cmm-text-caption cmm-text-muted">
            {formatPartnerScopeLabel(partnerScope)}: les arrondissements ne sont pas requis pour ce partenaire.
          </p>
        ) : null}
      </div>
    </section>
  );
}
