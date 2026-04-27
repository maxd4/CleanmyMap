import React, { useState } from "react";
import { Search, Filter, Map as MapIcon, Share2, Info } from "lucide-react";
import { AnnuaireMapCanvas } from "./annuaire-map-canvas";
import { AnnuaireNetworkGraph } from "./annuaire-network-graph";
import { AnnuairePartnerDrawer } from "./annuaire-partner-drawer";
import { AnnuaireFiltersCard } from "./annuaire-filters-card";
import { useAnnuaireLogic } from "./use-annuaire-logic";
import { CmmButton } from "@/components/ui/cmm-button";
import { cn } from "@/lib/utils";

import { AnnuairePartnerList } from "./annuaire-partner-list";

export function AnnuaireExplorationView() {
  const [selectedActorId, setSelectedActorId] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState<"map" | "network">("map");

  const {
    searchTerm, setSearchTerm,
    filterKind, setFilterKind,
    filterContribution, setFilterContribution,
    zoneFilter, setZoneFilter,
    actorCardsPage, setActorCardsPage,
    targetArrondissement,
    sortedAndFilteredEntries,
    totalPages,
    paginatedEntries,
    locale,
  } = useAnnuaireLogic();

  const fr = locale === "fr";
  const selectedActor = sortedAndFilteredEntries.find(e => e.id === selectedActorId) || null;

  const handleActorClick = (id: string) => {
    setSelectedActorId(id);
    const canvasAnchor = document.getElementById("exploration-canvas-anchor");
    canvasAnchor?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div id="exploration-canvas-anchor" className="flex flex-col xl:flex-row gap-8">
      {/* LEFT COLUMN: Search & List (60%) */}
      <div className="flex-1 xl:w-[60%] flex flex-col gap-8">
        
        {/* Search & Filter Header */}
        <div className="bg-slate-900/5 rounded-[2rem] p-6 border border-slate-200/60 shadow-xl shadow-slate-200/50 backdrop-blur-xl">
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
            {/* Search Input */}
            <div className="relative flex-1 group/search w-full">
              <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within/search:text-violet-600 transition-colors">
                <Search size={20} strokeWidth={3} />
              </div>
              <input 
                type="text"
                placeholder={fr ? "Rechercher une structure, un domaine..." : "Search structures, domains..."}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full h-14 pl-14 pr-6 rounded-2xl bg-white border border-slate-200/60 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-violet-500/10 focus:border-violet-500 shadow-sm transition-all font-bold text-base"
              />
            </div>
            
            {/* Filter Toggle Button */}
            <CmmButton 
              tone="slate" 
              variant="outline" 
              className={cn("h-14 px-6 rounded-2xl font-bold whitespace-nowrap", showFilters && "bg-slate-100 ring-2 ring-slate-200")}
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter size={18} strokeWidth={2.5} className="mr-2" />
              {fr ? "Filtres" : "Filters"}
            </CmmButton>
          </div>
          
          {/* Theme Quick Tags */}
          <div className="flex flex-wrap gap-2 mt-4">
            {[
              { id: "environnement", label: "ECO" },
              { id: "social", label: "SOCIAL" },
              { id: "humanitaire", label: "HUMANITAIRE" },
            ].map(theme => (
              <button
                key={theme.id}
                onClick={() => setSearchTerm(theme.id === searchTerm ? "" : theme.id)}
                className={cn(
                  "px-4 py-1.5 rounded-xl text-[10px] font-black tracking-widest border transition-all duration-300 uppercase",
                  searchTerm === theme.id 
                    ? "bg-violet-600 border-violet-600 text-white shadow-md shadow-violet-600/20" 
                    : "bg-white border-slate-200 text-slate-500 hover:border-violet-300 hover:text-violet-600"
                )}
              >
                {theme.label}
              </button>
            ))}
          </div>

          {/* Advanced Filters Panel */}
          {showFilters && (
            <div className="mt-6 pt-6 border-t border-slate-200/60 animate-in fade-in slide-in-from-top-4 duration-500">
              <AnnuaireFiltersCard 
                fr={fr}
                searchTerm={searchTerm}
                setSearchTerm={setSearchTerm}
                filterKind={filterKind}
                setFilterKind={setFilterKind}
                filterContribution={filterContribution}
                setFilterContribution={setFilterContribution}
                zoneFilter={zoneFilter}
                setZoneFilter={setZoneFilter}
                setActorCardsPage={setActorCardsPage}
                targetArrondissement={targetArrondissement}
                resultsCount={sortedAndFilteredEntries.length}
              />
            </div>
          )}
        </div>

        {/* Results Header */}
        <div className="flex items-center justify-between px-2">
          <h3 className="cmm-text-h3 cmm-text-primary">
            {fr ? "Structures partenaires" : "Partner structures"}
          </h3>
          <div className="bg-violet-100 text-violet-700 px-3 py-1 rounded-full text-xs font-black tracking-widest uppercase">
            {sortedAndFilteredEntries.length} {fr ? "résultats" : "results"}
          </div>
        </div>

        {/* Partner List */}
        <div className="min-h-[500px]">
          <AnnuairePartnerList 
            fr={fr}
            entries={paginatedEntries}
            currentPage={actorCardsPage}
            totalPages={totalPages}
            onPageChange={setActorCardsPage}
            onFocusMap={handleActorClick}
          />
        </div>
      </div>

      {/* RIGHT COLUMN: Sticky Map (40%) */}
      <aside className="xl:w-[40%] min-w-[320px] h-[500px] xl:h-[calc(100vh-120px)] xl:sticky xl:top-24 rounded-[2.5rem] overflow-hidden border border-slate-200/60 shadow-2xl shadow-slate-200/50 bg-slate-900 group relative">
        {/* Futuristic Map Overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(to_bottom,transparent_49%,rgba(255,255,255,0.02)_50%,transparent_51%)] bg-[length:100%_4px] pointer-events-none opacity-20 z-10" />
        
        {viewMode === "map" ? (
          <AnnuaireMapCanvas 
            items={sortedAndFilteredEntries} 
            variant="exploration"
            onItemClick={handleActorClick}
            highlightedItemId={selectedActorId}
          />
        ) : (
          <AnnuaireNetworkGraph 
            entries={sortedAndFilteredEntries}
            onSelectPartner={(entry) => handleActorClick(entry.id)}
          />
        )}
        
        {/* Toggle Map / Network Mode */}
        <div className="absolute top-6 right-6 z-20 flex bg-white/10 backdrop-blur-md p-1 rounded-xl border border-white/20">
          <button 
            onClick={() => setViewMode("map")}
            className={cn(
              "px-3 py-2 rounded-lg flex items-center justify-center transition-all",
              viewMode === "map" ? "bg-violet-600 text-white shadow-lg" : "text-white/60 hover:text-white"
            )}
          >
            <MapIcon size={16} strokeWidth={2.5} />
          </button>
          <button 
            onClick={() => setViewMode("network")}
            className={cn(
              "px-3 py-2 rounded-lg flex items-center justify-center transition-all",
              viewMode === "network" ? "bg-violet-600 text-white shadow-lg" : "text-white/60 hover:text-white"
            )}
          >
            <Share2 size={16} strokeWidth={2.5} />
          </button>
        </div>

        {/* Selected Actor Drawer inside the Map container */}
        <AnnuairePartnerDrawer 
          entry={selectedActor} 
          isOpen={!!selectedActorId} 
          onClose={() => setSelectedActorId(null)} 
          fr={fr}
        />
      </aside>
    </div>
  );
}
