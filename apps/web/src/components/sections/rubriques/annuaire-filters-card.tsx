import React from "react";
import Link from "next/link";
import { CmmCard } from "@/components/ui/cmm-card";
import { cn } from "@/lib/utils";
import { 
  KIND_FILTERS, 
  CONTRIBUTION_FILTERS, 
  type EntityKind, 
  type ContributionType, 
  type ZoneFilter 
} from "./annuaire-filters";
import { PARIS_ARRONDISSEMENTS, type ParisArrondissement } from "@/lib/geo/paris-arrondissements";

interface AnnuaireFiltersCardProps {
  fr: boolean;
  searchTerm: string;
  setSearchTerm: (val: string) => void;
  filterKind: EntityKind | "all";
  setFilterKind: (val: EntityKind | "all") => void;
  filterContribution: ContributionType | "all";
  setFilterContribution: (val: ContributionType | "all") => void;
  zoneFilter: ZoneFilter;
  setZoneFilter: (val: ZoneFilter) => void;
  setActorCardsPage: (val: number | ((prev: number) => number)) => void;
  targetArrondissement: number | null;
  resultsCount: number;
}

export function AnnuaireFiltersCard({
  fr,
  searchTerm,
  setSearchTerm,
  filterKind,
  setFilterKind,
  filterContribution,
  setFilterContribution,
  zoneFilter,
  setZoneFilter,
  setActorCardsPage,
  targetArrondissement,
  resultsCount,
}: AnnuaireFiltersCardProps) {
  return (
    <CmmCard tone="violet" variant="elevated" className="space-y-6 relative overflow-hidden ring-1 ring-violet-200/50">
      {/* Decorative background element */}
      <div className="absolute -top-24 -right-24 w-48 h-48 bg-violet-100/50 rounded-full blur-3xl pointer-events-none" />
      
      <div className="flex flex-wrap items-start justify-between gap-4 relative z-10">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="h-1 w-4 rounded-full bg-violet-500" />
            <p className="cmm-text-caption font-black uppercase tracking-[0.2em] text-violet-600">
              {fr ? "Exploration" : "Discovery"}
            </p>
          </div>
          <h2 className="cmm-text-h4 cmm-text-primary">
            {fr ? "Trouver un partenaire" : "Find a partner"}
          </h2>
        </div>
        <div className="rounded-xl border border-violet-100 bg-violet-50/50 px-4 py-2 cmm-text-caption text-violet-900 font-medium shadow-sm backdrop-blur-md">
          {fr
            ? "Filtrez par type ou secteur pour affiner le réseau."
            : "Filter by type or area to refine the network."}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 relative z-10">
        <div className="space-y-2">
          <span className="cmm-text-caption font-black cmm-text-secondary uppercase tracking-widest text-[10px] opacity-70">
            {fr ? "Mots-clés" : "Keywords"}
          </span>
          <div className="relative group">
            <input
              value={searchTerm}
              onChange={(event) => {
                setActorCardsPage(1);
                setSearchTerm(event.target.value);
              }}
              placeholder={fr ? "Nom, mission, mot-clé..." : "Name, mission, keyword..."}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 cmm-text-small cmm-text-primary transition-all group-focus-within:border-violet-400 group-focus-within:ring-4 group-focus-within:ring-violet-500/10 focus:outline-none shadow-sm"
            />
          </div>
        </div>

        <div className="space-y-2">
          <span className="cmm-text-caption font-black cmm-text-secondary uppercase tracking-widest text-[10px] opacity-70">
            {fr ? "Secteur géographique" : "Geographic area"}
          </span>
          <div className="relative">
            <select
              value={String(zoneFilter)}
              onChange={(event) => {
                const raw = event.target.value;
                if (raw === "all" || raw === "nearby") {
                  setActorCardsPage(1);
                  setZoneFilter(raw);
                  return;
                }
                setActorCardsPage(1);
                setZoneFilter(Number.parseInt(raw, 10) as ParisArrondissement);
              }}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 cmm-text-small cmm-text-primary transition-all focus:border-violet-400 focus:ring-4 focus:ring-violet-500/10 focus:outline-none shadow-sm appearance-none cursor-pointer"
            >
              <option value="all">{fr ? "Tout Paris" : "All Paris"}</option>
              {targetArrondissement ? <option value="nearby">{fr ? "Proches de moi" : "Nearby"}</option> : null}
              {PARIS_ARRONDISSEMENTS.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 4.5 3 3 3-3"/></svg>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-3 pt-2 relative z-10">
        <span className="cmm-text-caption font-black cmm-text-secondary uppercase tracking-widest text-[10px] opacity-70">
          {fr ? "Type de structure" : "Structure type"}
        </span>
        <div className="flex flex-wrap gap-2">
          {KIND_FILTERS.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setActorCardsPage(1);
                setFilterKind(item.value);
              }}
              className={cn(
                "rounded-xl px-4 py-2 cmm-text-caption font-bold transition-all duration-300 border shadow-sm",
                filterKind === item.value
                  ? "bg-violet-600 border-violet-600 text-white shadow-lg shadow-violet-100 -translate-y-0.5"
                  : "bg-white border-slate-200 cmm-text-secondary hover:border-violet-200 hover:bg-violet-50/50"
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2 pt-2 relative z-10">
        <span className="cmm-text-caption font-black cmm-text-secondary uppercase tracking-widest text-[10px] opacity-70">
          {fr ? "Besoin ou aide proposée" : "Need or help offered"}
        </span>
        <div className="relative">
          <select
            value={filterContribution}
            onChange={(event) => {
              setActorCardsPage(1);
              setFilterContribution(event.target.value as ContributionType | "all");
            }}
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 cmm-text-small cmm-text-primary transition-all focus:border-violet-400 focus:ring-4 focus:ring-violet-500/10 focus:outline-none shadow-sm appearance-none cursor-pointer"
          >
            {CONTRIBUTION_FILTERS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 4.5 3 3 3-3"/></svg>
          </div>
        </div>
      </div>

      {resultsCount === 0 ? (
        <div className="rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-white p-5 shadow-lg shadow-amber-100/50 animate-in fade-in slide-in-from-top-4 duration-500 relative z-10">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-full bg-amber-100 text-amber-600">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            </div>
            <p className="cmm-text-body font-bold text-amber-900">
              {fr ? "Aucun résultat trouvé" : "No results found"}
            </p>
          </div>
          <p className="cmm-text-caption text-amber-800 mb-5 leading-relaxed">
            {fr ? "Il n'y a pas encore de structure correspondant à ces critères exacts. Vous pouvez élargir votre recherche ou nous aider à enrichir l'annuaire." : "No structure matches these exact criteria yet. You can expand your search or help us grow the directory."}
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/partners/onboarding"
              className="rounded-xl bg-amber-500 px-5 py-2.5 cmm-text-small font-black text-white transition-all hover:bg-amber-600 hover:shadow-lg shadow-md uppercase tracking-wider"
            >
              {fr ? "Référencer une structure" : "Add a structure"}
            </Link>
            <button
              onClick={() => {
                setZoneFilter("all");
                setFilterKind("all");
                setFilterContribution("all");
                setSearchTerm("");
              }}
              className="rounded-xl border border-amber-200 bg-white px-5 py-2.5 cmm-text-small font-bold text-amber-900 transition-all hover:bg-amber-50 shadow-sm"
            >
              {fr ? "Réinitialiser" : "Reset filters"}
            </button>
          </div>
        </div>
      ) : null}
    </CmmCard>
  );
}
