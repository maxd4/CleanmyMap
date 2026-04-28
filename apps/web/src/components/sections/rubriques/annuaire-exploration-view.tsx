import { useState } from "react";
import { Search, Filter, Map as MapIcon, Share2 } from "lucide-react";
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
    <div id="exploration-canvas-anchor" className="flex flex-col lg:flex-row gap-10 items-start">
      {/* LEFT COLUMN: Search & List (60%) */}
      <div className="flex-1 lg:w-[60%] flex flex-col gap-10 order-2 lg:order-1">
        
        {/* Search & Filter Header */}
        <div className="bg-slate-900/80 rounded-[2.5rem] p-8 border border-slate-800/60 shadow-xl backdrop-blur-xl relative overflow-hidden group">
          {/* Subtle background glow on hover */}
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
          
          <div className="flex flex-col md:flex-row gap-6 items-start md:items-center relative z-10">
            {/* Search Input */}
            <div className="relative flex-1 group/search w-full">
              <div className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within/search:text-emerald-500 group-focus-within/search:scale-110 transition-all duration-300">
                <Search size={22} strokeWidth={2.5} />
              </div>
              <input 
                type="text"
                placeholder={fr ? "Rechercher une structure, un domaine..." : "Search structures, domains..."}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full h-16 pl-16 pr-8 rounded-2xl bg-slate-900/60 border border-slate-700/50 text-white placeholder:text-slate-500 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500/50 focus:bg-slate-900 shadow-inner transition-all font-bold text-lg"
              />
            </div>
            
            {/* Filter Toggle Button */}
            <CmmButton 
              tone="secondary" 
              variant="default" 
              className={cn(
                "h-16 px-8 rounded-2xl font-black text-sm tracking-wider uppercase whitespace-nowrap transition-all duration-300",
                showFilters ? "bg-emerald-600 text-white shadow-xl scale-95 border-emerald-500" : "bg-slate-900/40 border border-slate-800 hover:border-emerald-500/50"
              )}
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter size={18} strokeWidth={3} className={cn("mr-3 transition-transform", showFilters && "rotate-180")} />
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
                    ? "bg-emerald-600 border-emerald-600 text-white shadow-md shadow-emerald-600/20" 
                    : "bg-slate-900/60 border-slate-800 text-slate-500 hover:border-emerald-500/50 hover:text-emerald-400"
                )}
              >
                {theme.label}
              </button>
            ))}
          </div>

          {/* Advanced Filters Panel */}
          {showFilters && (
            <div className="mt-6 pt-6 border-t border-slate-800/60 animate-in fade-in slide-in-from-top-4 duration-500">
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
          <div className="bg-emerald-500/10 text-emerald-400 px-3 py-1 rounded-full text-xs font-black tracking-widest uppercase border border-emerald-500/20">
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
      <aside className="lg:w-[40%] w-full min-w-[320px] h-[550px] lg:h-[calc(100vh-140px)] lg:sticky lg:top-24 rounded-[3rem] overflow-hidden border-4 border-slate-800 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.5)] bg-slate-900 group relative order-1 lg:order-2">
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
              viewMode === "map" ? "bg-emerald-600 text-white shadow-lg" : "text-white/60 hover:text-white"
            )}
          >
            <MapIcon size={16} strokeWidth={2.5} />
          </button>
          <button 
            onClick={() => setViewMode("network")}
            className={cn(
              "px-3 py-2 rounded-lg flex items-center justify-center transition-all",
              viewMode === "network" ? "bg-emerald-600 text-white shadow-lg" : "text-white/60 hover:text-white"
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
