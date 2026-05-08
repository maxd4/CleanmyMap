import React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { 
  KIND_FILTERS, 
  CONTRIBUTION_FILTERS, 
  type EntityKind, 
  type ContributionType, 
  type ZoneFilter 
} from "./annuaire-filters";
import { PARIS_ARRONDISSEMENTS, type ParisArrondissement } from "@/lib/geo/paris-arrondissements";
import { Search, MapPin, Building2, Zap, RotateCcw, AlertCircle, PlusCircle, ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

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
    <div className="space-y-10 relative z-10">
      {/* Search & Area Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-3">
          <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">
            {fr ? "Recherche textuelle" : "Text search"}
          </span>
          <div className="relative group">
            <Search size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-violet-400 transition-colors" />
            <input
              value={searchTerm}
              onChange={(event) => {
                setActorCardsPage(1);
                setSearchTerm(event.target.value);
              }}
              placeholder={fr ? "Nom, mission, mot-clé..." : "Name, mission, keyword..."}
              className="w-full h-14 rounded-2xl border border-white/5 bg-slate-950/40 pl-14 pr-6 text-sm font-bold text-white shadow-inner transition-all placeholder:text-slate-600 focus:outline-none focus:border-violet-500/40 focus:ring-4 focus:ring-violet-500/10"
            />
          </div>
        </div>

        <div className="space-y-3">
          <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">
            {fr ? "Rayon d'action" : "Action radius"}
          </span>
          <div className="relative group">
            <MapPin size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-violet-400 transition-colors" />
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
              className="w-full h-14 cursor-pointer appearance-none rounded-2xl border border-white/5 bg-slate-950/40 pl-14 pr-12 text-sm font-bold text-white shadow-inner transition-all focus:border-violet-500/40 focus:outline-none focus:ring-4 focus:ring-violet-500/10"
            >
              <option value="all">{fr ? "Tout Paris" : "All Paris"}</option>
              {targetArrondissement ? <option value="nearby">{fr ? "Proches de moi" : "Nearby"}</option> : null}
              {PARIS_ARRONDISSEMENTS.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
            <ChevronDown size={18} className="pointer-events-none absolute right-5 top-1/2 -translate-y-1/2 text-slate-600" />
          </div>
        </div>
      </div>

      {/* Type Filter */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
           <Building2 size={14} className="text-slate-500" />
           <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">
              {fr ? "Type de structure" : "Structure type"}
           </span>
        </div>
        <div className="flex flex-wrap gap-2">
          {KIND_FILTERS.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setActorCardsPage(1);
                setFilterKind(item.value);
              }}
              className={cn(
                "px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 border",
                filterKind === item.value
                  ? "border-violet-500 bg-violet-600/20 text-violet-300 shadow-lg scale-105"
                  : "border-white/5 bg-white/5 text-slate-500 hover:border-white/20 hover:text-white"
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Contribution Filter */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
           <Zap size={14} className="text-slate-500" />
           <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">
              {fr ? "Leviers & Besoins" : "Levers & Needs"}
           </span>
        </div>
        <div className="flex flex-wrap gap-2">
          {CONTRIBUTION_FILTERS.map((item) => (
            <button
              key={item.value}
              onClick={() => {
                setActorCardsPage(1);
                setFilterContribution(item.value as ContributionType | "all");
              }}
              className={cn(
                "px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 border",
                filterContribution === item.value
                  ? "border-violet-500 bg-violet-600/20 text-violet-300 shadow-lg scale-105"
                  : "border-white/5 bg-white/5 text-slate-500 hover:border-white/20 hover:text-white"
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Empty State / Reset */}
      <AnimatePresence>
        {resultsCount === 0 && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="p-8 rounded-[2rem] border border-amber-500/20 bg-amber-500/5 backdrop-blur-3xl"
          >
            <div className="flex flex-col md:flex-row items-center justify-between gap-8">
               <div className="flex items-start gap-6">
                  <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-400">
                     <AlertCircle size={24} />
                  </div>
                  <div className="space-y-2">
                     <h4 className="text-sm font-black text-white uppercase tracking-widest">{fr ? "Aucun résultat" : "No results"}</h4>
                     <p className="text-xs font-bold text-slate-400 leading-relaxed max-w-sm">
                        {fr ? "Essayez d'élargir le périmètre ou de retirer certains filtres." : "Try widening the radius or removing some filters."}
                     </p>
                  </div>
               </div>
               <div className="flex items-center gap-4">
                  <button
                    onClick={() => {
                      setZoneFilter("all");
                      setFilterKind("all");
                      setFilterContribution("all");
                      setSearchTerm("");
                    }}
                    className="flex items-center gap-3 px-6 py-3 rounded-xl border border-white/10 bg-white/5 text-[10px] font-black uppercase tracking-[0.2em] text-white hover:bg-white/10 transition-all"
                  >
                    <RotateCcw size={14} />
                    {fr ? "Réinitialiser" : "Reset"}
                  </button>
                  <Link
                    href="/partners/onboarding"
                    className="flex items-center gap-3 px-6 py-3 rounded-xl bg-amber-500 text-slate-950 text-[10px] font-black uppercase tracking-[0.2em] shadow-2xl hover:scale-105 transition-all"
                  >
                    <PlusCircle size={14} />
                    {fr ? "Proposer" : "Propose"}
                  </Link>
               </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
