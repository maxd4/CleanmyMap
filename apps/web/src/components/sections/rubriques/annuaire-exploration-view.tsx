import dynamic from "next/dynamic";
import { useState } from "react";
import { Search, Filter, Map as MapIcon, Share2 } from "lucide-react";
import { AnnuaireNetworkGraph } from "./annuaire-network-graph";
import { AnnuairePartnerDrawer } from "./annuaire-partner-drawer";
import { AnnuaireFiltersCard } from "./annuaire-filters-card";
import { useAnnuaireLogic } from "./use-annuaire-logic";
import { CmmButton } from "@/components/ui/cmm-button";
import { cn } from "@/lib/utils";

import { AnnuairePartnerList } from "./annuaire-partner-list";

const AnnuaireMapCanvas = dynamic(
  () => import("./annuaire-map-canvas").then((module) => module.AnnuaireMapCanvas),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full w-full items-center justify-center rounded-[2rem] border border-violet-300/14 bg-[rgba(20,14,48,0.96)] text-sm font-semibold text-violet-100/60">
        Chargement de la carte...
      </div>
    ),
  },
);

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
        <div className="relative overflow-hidden rounded-[2.5rem] border border-violet-300/16 bg-[rgba(28,20,58,0.94)] p-8 shadow-xl backdrop-blur-xl group">
          {/* Subtle background glow on hover */}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-violet-500/8 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
          
          <div className="flex flex-col md:flex-row gap-6 items-start md:items-center relative z-10">
            {/* Search Input */}
            <div className="relative flex-1 group/search w-full">
              <div className="absolute left-6 top-1/2 -translate-y-1/2 text-violet-200/52 transition-all duration-300 group-focus-within/search:scale-110 group-focus-within/search:text-violet-300">
                <Search size={22} strokeWidth={2.5} />
              </div>
              <input 
                type="text"
                placeholder={fr ? "Rechercher une structure, un domaine..." : "Search structures, domains..."}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-16 w-full rounded-2xl border border-violet-300/14 bg-[rgba(20,14,48,0.92)] pl-16 pr-8 text-lg font-bold text-white shadow-inner transition-all placeholder:text-violet-100/24 focus:outline-none focus:border-violet-300/40 focus:bg-[rgba(24,17,54,0.96)] focus:ring-4 focus:ring-violet-500/10"
              />
            </div>
            
            {/* Filter Toggle Button */}
            <CmmButton 
              tone="secondary" 
              variant="default" 
              className={cn(
                "h-16 px-8 rounded-2xl font-black text-sm tracking-wider uppercase whitespace-nowrap transition-all duration-300",
                showFilters ? "bg-violet-600 text-white shadow-xl scale-95 border-violet-500" : "bg-[rgba(20,14,48,0.92)] border border-violet-300/12 hover:border-violet-300/30"
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
                  "rounded-xl border px-4 py-1.5 text-[10px] font-black uppercase tracking-widest transition-all duration-300",
                  searchTerm === theme.id 
                    ? "border-violet-500 bg-violet-600 text-white shadow-md shadow-violet-600/20" 
                    : "border-violet-300/12 bg-[rgba(20,14,48,0.92)] text-violet-100/48 hover:border-violet-300/30 hover:text-violet-50"
                )}
              >
                {theme.label}
              </button>
            ))}
          </div>

          {/* Advanced Filters Panel */}
          {showFilters && (
            <div className="mt-6 animate-in fade-in slide-in-from-top-4 border-t border-violet-300/12 pt-6 duration-500">
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
          <div className="rounded-full border border-violet-300/16 bg-violet-400/10 px-3 py-1 text-xs font-black uppercase tracking-widest text-violet-100">
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
      <aside className="relative order-1 h-[550px] w-full min-w-[320px] overflow-hidden rounded-[3rem] border border-violet-300/16 bg-[rgba(20,14,48,0.96)] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.55)] lg:sticky lg:top-24 lg:h-[calc(100vh-140px)] lg:w-[40%] lg:order-2 group">
        {/* Futuristic Map Overlay */}
        <div className="pointer-events-none absolute inset-0 z-10 bg-[linear-gradient(to_bottom,transparent_49%,rgba(255,255,255,0.02)_50%,transparent_51%)] bg-[length:100%_4px] opacity-20" />
        
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
        <div className="absolute top-6 right-6 z-20 flex rounded-xl border border-violet-300/16 bg-violet-400/10 p-1 backdrop-blur-md">
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
