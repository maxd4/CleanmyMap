"use client";

import React from "react";
import { ASSOCIATION_SELECTION_OPTIONS } from "@/lib/actions/association-options";
import { usePdfExport } from "./pdf-export/use-pdf-export";
import { PdfExportHistory } from "./pdf-export/pdf-export-history";

type RubriquePdfExportButtonProps = {
  rubriqueTitle: string;
  targetSelector?: string;
};

export function RubriquePdfExportButton({
  rubriqueTitle,
  targetSelector = "[data-rubrique-report-root]",
}: RubriquePdfExportButtonProps) {
  const {
    state,
    message,
    customRubrique,
    setCustomRubrique,
    orgType,
    setOrgType,
    selectedOrg,
    setSelectedOrg,
    history,
    rubriqueSlug,
    filename,
    exportRubriquePdf
  } = usePdfExport(rubriqueTitle, targetSelector);

  return (
    <div data-print-ignore="true" className="flex flex-col gap-3 min-w-80 w-full max-w-sm">
      <div className="w-full rounded-[1.5rem] border border-white/60 bg-white/70 backdrop-blur-xl p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
          {/* Decorative Icon BG */}
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
        </div>
        
        <p className="cmm-text-caption font-bold uppercase tracking-widest text-emerald-600 mb-3 flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          Génération Livrable PDF
        </p>
        
        <div className="space-y-1 mb-4">
          <p className="cmm-text-caption cmm-text-muted flex justify-between">
            <span>Rubrique:</span> <span className="font-bold cmm-text-primary">{rubriqueSlug}</span>
          </p>
          <p className="cmm-text-caption cmm-text-muted flex justify-between truncate">
            <span>Fichier:</span> <span className="font-mono bg-slate-100 px-1.5 rounded cmm-text-caption cmm-text-secondary">{filename.toLowerCase()}</span>
          </p>
        </div>
        
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="flex flex-col gap-1">
            <label className="cmm-text-caption font-bold cmm-text-secondary">Type d'organisation</label>
            <select 
              value={orgType} 
              onChange={(e) => setOrgType(e.target.value as any)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 cmm-text-caption cmm-text-primary outline-none focus:border-emerald-500 transition-all shadow-inner"
            >
              <option value="global">Global</option>
              <option value="association">Association</option>
              <option value="entreprise">Entreprise</option>
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="cmm-text-caption font-bold cmm-text-secondary">Période</label>
            <div className="w-full rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 cmm-text-caption cmm-text-muted cursor-not-allowed">
              Année {new Date().getFullYear()}
            </div>
          </div>
        </div>

        {orgType === "association" && (
          <div className="flex flex-col gap-1 mb-4 animate-in fade-in slide-in-from-top-2">
            <label className="cmm-text-caption font-bold cmm-text-secondary">Choisir l'Association</label>
            <select 
              value={selectedOrg}
              onChange={(e) => setSelectedOrg(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 cmm-text-caption cmm-text-primary outline-none focus:border-emerald-500 transition-all shadow-inner"
            >
              <option value="">Sélectionner...</option>
              {ASSOCIATION_SELECTION_OPTIONS.filter(opt => opt !== "Entreprise" && opt !== "Action spontanée").map(opt => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </div>
        )}

        {orgType === "entreprise" && (
          <div className="flex flex-col gap-1 mb-4 animate-in fade-in slide-in-from-top-2">
            <label className="cmm-text-caption font-bold cmm-text-secondary">Nom de l'Entreprise</label>
            <input 
              type="text"
              value={selectedOrg}
              onChange={(e) => setSelectedOrg(e.target.value)}
              placeholder="ex: Veolia, SNCF..."
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 cmm-text-caption cmm-text-primary outline-none focus:border-emerald-500 transition-all shadow-inner"
            />
          </div>
        )}

        <label htmlFor="pdf-rubrique-name" className="block cmm-text-caption font-bold cmm-text-secondary mb-1">
          Titre du rapport (Optionnel)
        </label>
        <input
          id="pdf-rubrique-name"
          type="text"
          value={customRubrique}
          onChange={(event) => setCustomRubrique(event.target.value)}
          placeholder="ex: Impact Q1, Audit 2024..."
          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 cmm-text-caption cmm-text-primary outline-none focus:border-emerald-500 transition-all shadow-inner mb-4"
        />

        <button
          type="button"
          onClick={exportRubriquePdf}
          disabled={state === "pending"}
          className="w-full relative overflow-hidden group rounded-xl bg-slate-900 px-4 py-3 cmm-text-small font-bold text-white transition-all hover:bg-slate-800 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-70"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/0 via-emerald-500/20 to-emerald-500/0 -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]" />
          <span className="relative flex items-center justify-center gap-2">
            {state === "pending" ? "Préparation du document..." : "Générer le rapport officiel"}
          </span>
        </button>
        {message ? <p className="mt-2 cmm-text-caption font-bold text-rose-500 bg-rose-50 p-2 rounded-lg border border-rose-100 text-center">{message}</p> : null}
      </div>

      <PdfExportHistory history={history} />
    </div>
  );
}
