import dynamic from "next/dynamic";
import { useState } from "react";
import { Search, Filter, Map as MapIcon, Share2, Building2 } from "lucide-react";
import { AnnuaireNetworkGraph } from "./annuaire-network-graph";
import { AnnuairePartnerDrawer } from "./annuaire-partner-drawer";
import { AnnuaireFiltersCard } from "./annuaire-filters-card";
import { useAnnuaireLogic } from "./use-annuaire-logic";
import { CmmButton } from "@/components/ui/cmm-button";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { AnnuairePartnerList } from "./annuaire-partner-list";

const AnnuaireMapCanvas = dynamic(
  () => import("./annuaire-map-canvas").then((module) => module.AnnuaireMapCanvas),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full w-full items-center justify-center rounded-[3rem] border border-white/10 bg-slate-950/40 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 backdrop-blur-3xl">
        Chargement de la carte...
      </div>
    ),
  },
);

type AnnuaireExplorationViewProps = {
  searchTerm?: string;
  setSearchTerm?: (value: string) => void;
  fr?: boolean;
};

export function AnnuaireExplorationView({
  searchTerm: externalSearchTerm,
  setSearchTerm: externalSetSearchTerm,
  fr: externalFr,
}: AnnuaireExplorationViewProps) {
  const [selectedActorId, setSelectedActorId] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState<"map" | "network">("map");

  const {
    searchTerm: internalSearchTerm,
    setSearchTerm: internalSetSearchTerm,
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

  const fr = externalFr ?? (locale === "fr");
  const searchTerm = externalSearchTerm ?? internalSearchTerm;
  const setSearchTerm = externalSetSearchTerm ?? internalSetSearchTerm;
  const selectedActor = sortedAndFilteredEntries.find(e => e.id === selectedActorId) || null;

  const handleActorClick = (id: string) => {
    setSelectedActorId(id);
    const canvasAnchor = document.getElementById("exploration-canvas-anchor");
    canvasAnchor?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="flex flex-col lg:flex-row gap-12 items-start">
      {/* LEFT COLUMN: Search & List (60%) */}
      <div className="flex-1 lg:w-[60%] flex flex-col gap-12 order-2 lg:order-1">
        
        {/* Search & Filter Header - Premium Glass Shell */}
        <div className="relative overflow-hidden rounded-[3rem] border border-white/10 bg-slate-900/40 p-10 shadow-2xl backdrop-blur-3xl group">
          <div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
          
          <div className="flex flex-col md:flex-row gap-6 items-start md:items-center relative z-10">
            {/* Search Input */}
            <div className="relative flex-1 group/search w-full">
              <div className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-500 transition-all duration-300 group-focus-within/search:scale-110 group-focus-within/search:text-violet-400">
                <Search size={22} />
              </div>
              <input 
                type="text"
                placeholder={fr ? "Rechercher une structure, un domaine..." : "Search structures, domains..."}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-16 w-full rounded-2xl border border-white/10 bg-slate-950/40 pl-16 pr-8 text-lg font-bold text-white shadow-inner transition-all placeholder:text-slate-600 focus:outline-none focus:border-violet-500/40 focus:ring-4 focus:ring-violet-500/10"
              />
            </div>
            
            {/* Filter Toggle Button */}
            <CmmButton 
              tone={showFilters ? "primary" : "secondary"}
              variant="default"
              className={cn(
                "h-16 px-8 rounded-2xl font-black text-[11px] tracking-[0.2em] uppercase whitespace-nowrap transition-all duration-500 shadow-2xl",
                showFilters ? "bg-violet-600 border-violet-500" : "bg-white/5 border-white/10 hover:bg-white/10"
              )}
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter size={16} className={cn("mr-3 transition-transform duration-500", showFilters && "rotate-180")} />
              {fr ? "Filtres Avancés" : "Advanced Filters"}
            </CmmButton>
          </div>
          
          {/* Theme Quick Tags - Minimalist Style */}
          <div className="flex flex-wrap gap-2 mt-6 relative z-10">
            {[
              { id: "environnement", label: "ENVIRONNEMENT" },
              { id: "social", label: "SOCIAL" },
              { id: "humanitaire", label: "HUMANITAIRE" },
            ].map(theme => (
              <CmmButton
                key={theme.id}
                onClick={() => setSearchTerm(theme.id === searchTerm ? "" : theme.id)}
                tone={searchTerm === theme.id ? "primary" : "tertiary"}
                variant="pill"
                className={cn(
                  "rounded-xl px-4 py-2 text-[9px] font-black uppercase tracking-widest transition-all duration-300",
                  searchTerm === theme.id
                    ? "shadow-lg"
                    : "hover:shadow-md"
                )}
              >
                {theme.label}
              </CmmButton>
            ))}
          </div>

          {/* Advanced Filters Panel */}
          <AnimatePresence>
            {showFilters && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="mt-8 border-t border-white/5 pt-8">
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
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Results Metadata */}
        <div className="flex items-center justify-between px-4">
           <div className="flex items-center gap-4">
              <Building2 size={18} className="text-slate-500" />
              <h3 className="text-xl font-black text-white tracking-tighter uppercase tracking-[0.1em]">
                {fr ? "Structures partenaires" : "Partner structures"}
              </h3>
           </div>
           <div className="rounded-full border border-violet-500/20 bg-violet-500/10 px-4 py-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-violet-300 shadow-2xl">
              {sortedAndFilteredEntries.length} {fr ? "résultats trouvés" : "results found"}
           </div>
        </div>

        {/* Partner List */}
        <div className="min-h-[600px]">
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

      {/* RIGHT COLUMN: Sticky Map - Premium Frame (40%) */}
      <aside className="relative order-1 h-[600px] w-full min-w-[320px] overflow-hidden rounded-[4rem] border border-white/10 bg-slate-900/40 shadow-2xl lg:sticky lg:top-24 lg:h-[calc(100vh-140px)] lg:w-[40%] lg:order-2 group backdrop-blur-3xl">
        {/* Futuristic Map Overlay */}
        <div className="pointer-events-none absolute inset-0 z-10 bg-[linear-gradient(to_bottom,transparent_49%,rgba(255,255,255,0.01)_50%,transparent_51%)] bg-[length:100%_4px] opacity-20" />
        
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
        
        {/* View Mode Toggle - Premium Interface */}
        <div className="absolute top-8 right-8 z-20 flex rounded-2xl border border-white/10 bg-slate-950/60 p-1.5 backdrop-blur-3xl shadow-2xl">
          <CmmButton
            onClick={() => setViewMode("map")}
            tone={viewMode === "map" ? "primary" : "tertiary"}
            variant="pill"
            className={cn(
              "px-4 py-2.5 rounded-xl flex items-center justify-center transition-all",
              viewMode === "map" ? "shadow-2xl" : "hover:shadow-md"
            )}
          >
            <MapIcon size={18} />
          </CmmButton>
          <CmmButton
            onClick={() => setViewMode("network")}
            tone={viewMode === "network" ? "primary" : "tertiary"}
            variant="pill"
            className={cn(
              "px-4 py-2.5 rounded-xl flex items-center justify-center transition-all",
              viewMode === "network" ? "shadow-2xl" : "hover:shadow-md"
            )}
          >
            <Share2 size={18} />
          </CmmButton>
        </div>

        {/* Selected Actor Drawer - Integrated Experience */}
        <AnimatePresence>
          {selectedActorId && (
            <AnnuairePartnerDrawer 
              entry={selectedActor} 
              isOpen={!!selectedActorId} 
              onClose={() => setSelectedActorId(null)} 
              fr={fr}
            />
          )}
        </AnimatePresence>
      </aside>
    </div>
  );
}
