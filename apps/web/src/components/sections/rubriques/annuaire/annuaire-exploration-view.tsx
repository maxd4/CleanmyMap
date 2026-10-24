import dynamic from "next/dynamic";
import { useState, type RefObject } from "react";
import {
  Search,
  Filter,
  Map as MapIcon,
  Share2,
  Building2,
} from "lucide-react";
import { AnnuaireNetworkGraph } from "./annuaire-network-graph";
import { AnnuairePartnerDrawer } from "./annuaire-partner-drawer";
import { AnnuaireFiltersCard } from "./annuaire-filters-card";
import type { AnnuaireLogic } from "./use-annuaire-logic";
import { CmmButton } from "@/components/ui/cmm-button";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { AnnuairePartnerList } from "./annuaire-partner-list";
import { useInViewOnce } from "@/components/ui/use-in-view-once";

const AnnuaireMapCanvas = dynamic(
  () =>
    import("./annuaire-map-canvas").then((module) => module.AnnuaireMapCanvas),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full w-full items-center justify-center rounded-[3rem] border border-white/10 bg-slate-950/40 cmm-text-caption font-black uppercase tracking-[0.2em] text-slate-500 backdrop-blur-3xl">
        Chargement de la carte...
      </div>
    ),
  },
);

type AnnuaireExplorationViewProps = {
  logic: AnnuaireLogic;
  fr?: boolean;
  selectedActorId: string | null;
  onSelectedActorIdChange: (id: string | null) => void;
};

function AnnuaireMapPanel({
  fr,
  viewMode,
  setViewMode,
  isMapVisible,
  sortedAndFilteredEntries,
  selectedActorId,
  selectedActor,
  handleActorClick,
  mapShellRef,
  setSelectedActorId,
}: {
  fr: boolean;
  viewMode: "map" | "network";
  setViewMode: (mode: "map" | "network") => void;
  isMapVisible: boolean;
  sortedAndFilteredEntries: AnnuaireLogic["sortedAndFilteredEntries"];
  selectedActorId: string | null;
  selectedActor:
    | AnnuaireLogic["sortedAndFilteredEntries"][number]
    | null;
  handleActorClick: (id: string) => void;
  mapShellRef: RefObject<HTMLElement | null>;
  setSelectedActorId: (id: string | null) => void;
}) {
  return (
    <aside
      ref={mapShellRef}
      className="group relative order-1 h-[600px] w-full min-w-0 overflow-hidden rounded-[4rem] border border-white/10 bg-slate-900/40 shadow-2xl backdrop-blur-3xl lg:order-2 lg:sticky lg:top-24 lg:h-[calc(100vh-140px)] lg:w-[40%]"
    >
      <div className="pointer-events-none absolute inset-0 z-10 bg-[linear-gradient(to_bottom,transparent_49%,rgba(255,255,255,0.01)_50%,transparent_51%)] bg-[length:100%_4px] opacity-20" />
      {isMapVisible ? (
        viewMode === "map" ? (
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
        )
      ) : (
        <div className="flex h-full items-center justify-center bg-slate-950/70">
          <div className="space-y-3 text-center">
            <div className="mx-auto h-12 w-12 rounded-full border-2 border-violet-500/20 border-t-violet-500 animate-spin" />
            <p className="cmm-text-caption font-black uppercase tracking-[0.3em] text-slate-500">
              Chargement de la carte...
            </p>
          </div>
        </div>
      )}
      <div className="absolute top-8 right-8 z-20 flex rounded-2xl border border-white/10 bg-slate-950/60 p-1.5 backdrop-blur-3xl shadow-2xl">
        <CmmButton
          onClick={() => setViewMode("map")}
          tone={viewMode === "map" ? "primary" : "tertiary"}
          variant="pill"
          ariaLabel={fr ? "Afficher la carte" : "Show map"}
          className={cn(
            "px-4 py-2.5 rounded-xl flex items-center justify-center transition-all",
            viewMode === "map" ? "shadow-2xl" : "hover:shadow-md",
          )}
        >
          <MapIcon size={18} />
        </CmmButton>
        <CmmButton
          onClick={() => setViewMode("network")}
          tone={viewMode === "network" ? "primary" : "tertiary"}
          variant="pill"
          ariaLabel={fr ? "Afficher le réseau" : "Show network"}
          className={cn(
            "px-4 py-2.5 rounded-xl flex items-center justify-center transition-all",
            viewMode === "network" ? "shadow-2xl" : "hover:shadow-md",
          )}
        >
          <Share2 size={18} />
        </CmmButton>
      </div>
      <AnimatePresence>
        {selectedActorId ? (
          <AnnuairePartnerDrawer
            entry={selectedActor}
            isOpen={!!selectedActorId}
            onClose={() => setSelectedActorId(null)}
            fr={fr}
          />
        ) : null}
      </AnimatePresence>
    </aside>
  );
}

function AnnuaireSearchPanel({
  fr,
  searchTerm,
  setSearchTerm,
  showFilters,
  setShowFilters,
  filterKind,
  setFilterKind,
  filterContribution,
  setFilterContribution,
  engagementDomain,
  setEngagementDomain,
  zoneFilter,
  setZoneFilter,
  setActorCardsPage,
  resetFilters,
  targetArrondissement,
  resultsCount,
}: {
  fr: boolean;
  searchTerm: string;
  setSearchTerm: (value: string) => void;
  showFilters: boolean;
  setShowFilters: (value: boolean) => void;
  filterKind: AnnuaireLogic["filterKind"];
  setFilterKind: AnnuaireLogic["setFilterKind"];
  filterContribution: AnnuaireLogic["filterContribution"];
  setFilterContribution: AnnuaireLogic["setFilterContribution"];
  engagementDomain: AnnuaireLogic["engagementDomain"];
  setEngagementDomain: AnnuaireLogic["setEngagementDomain"];
  zoneFilter: AnnuaireLogic["zoneFilter"];
  setZoneFilter: AnnuaireLogic["setZoneFilter"];
  setActorCardsPage: AnnuaireLogic["setActorCardsPage"];
  resetFilters: AnnuaireLogic["resetFilters"];
  targetArrondissement: AnnuaireLogic["targetArrondissement"];
  resultsCount: number;
}) {
  return (
    <div className="relative overflow-hidden rounded-[3rem] border border-white/10 bg-slate-900/40 p-10 shadow-2xl backdrop-blur-3xl group">
      <div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
      <div className="flex flex-col md:flex-row gap-6 items-start md:items-center relative z-10">
        <div className="relative flex-1 group/search w-full">
          <div className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-500 transition-all duration-300 group-focus-within/search:scale-110 group-focus-within/search:text-violet-400">
            <Search size={22} />
          </div>
          <input
            type="text"
            placeholder={
              fr
                ? "Rechercher une structure, un domaine..."
                : "Search structures, domains..."
            }
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="h-16 w-full rounded-2xl border border-white/10 bg-slate-950/40 pl-16 pr-8 cmm-text-body cmm-text-inverse font-bold shadow-inner transition-all focus:outline-none focus:border-violet-500/40 focus:ring-4 focus:ring-violet-500/10"
          />
        </div>
        <CmmButton
          tone={showFilters ? "primary" : "secondary"}
          variant="default"
          className={cn(
            "h-16 px-8 rounded-2xl cmm-text-caption font-black tracking-[0.2em] uppercase whitespace-nowrap transition-all duration-500 shadow-2xl",
            showFilters
              ? "bg-violet-600 border-violet-500"
              : "bg-white/5 border-white/10 hover:bg-white/10",
          )}
          onClick={() => setShowFilters(!showFilters)}
        >
          <Filter
            size={16}
            className={cn(
              "mr-3 transition-transform duration-500",
              showFilters && "rotate-180",
            )}
          />
          {fr ? "Filtres Avancés" : "Advanced Filters"}
        </CmmButton>
      </div>
      <div className="relative z-10 mt-6 space-y-3">
        <p className="cmm-text-caption font-black uppercase tracking-[0.2em] text-slate-500">
          {fr ? "Domaines déclarés ou éditoriaux" : "Declared or editorial domains"}
        </p>
        <div className="flex flex-wrap gap-2">
          {[
            { id: "environnemental" as const, label: fr ? "ENVIRONNEMENT" : "ENVIRONMENT" },
            { id: "social" as const, label: "SOCIAL" },
            { id: "humanitaire" as const, label: fr ? "HUMANITAIRE" : "HUMANITARIAN" },
          ].map((theme) => (
            <CmmButton
              key={theme.id}
              onClick={() =>
                setEngagementDomain(theme.id === engagementDomain ? "all" : theme.id)
              }
              tone={engagementDomain === theme.id ? "primary" : "tertiary"}
              variant="pill"
              className={cn(
                "rounded-xl px-4 py-2 cmm-text-caption font-black uppercase tracking-widest transition-all duration-300",
                engagementDomain === theme.id ? "shadow-lg" : "hover:shadow-md",
              )}
            >
              {theme.label}
            </CmmButton>
          ))}
        </div>
        <p className="cmm-text-caption font-black uppercase tracking-[0.2em] text-slate-500">
          {fr ? "Mots-clés" : "Keywords"}
        </p>
        <div className="flex flex-wrap gap-2">
          {[
            { id: "propreté", label: fr ? "PROPRETÉ" : "CLEANLINESS" },
            { id: "climat", label: "CLIMAT" },
            { id: "sensibilisation", label: fr ? "SENSIBILISATION" : "AWARENESS" },
          ].map((theme) => (
            <CmmButton
              key={theme.id}
              onClick={() => setSearchTerm(theme.id === searchTerm ? "" : theme.id)}
              tone={searchTerm === theme.id ? "primary" : "tertiary"}
              variant="pill"
              className={cn(
                "rounded-xl px-4 py-2 cmm-text-caption font-black uppercase tracking-widest transition-all duration-300",
                searchTerm === theme.id ? "shadow-lg" : "hover:shadow-md",
              )}
            >
              {theme.label}
            </CmmButton>
          ))}
        </div>
        <p className="cmm-text-caption cmm-text-muted">
          {fr
            ? "Les domaines proviennent du classement éditorial ou des déclarations des structures. Ils ne constituent pas une certification."
            : "Domains come from editorial classification or structure declarations. They are not a certification."}
        </p>
      </div>
      <AnimatePresence>
        {showFilters && (
          <motion.div
            data-motion-role="conditional"
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
                engagementDomain={engagementDomain}
                setEngagementDomain={setEngagementDomain}
                zoneFilter={zoneFilter}
                setZoneFilter={setZoneFilter}
                setActorCardsPage={setActorCardsPage}
                resetFilters={resetFilters}
                targetArrondissement={targetArrondissement}
                resultsCount={resultsCount}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function AnnuaireExplorationView({
  logic,
  fr: externalFr,
  selectedActorId,
  onSelectedActorIdChange,
}: AnnuaireExplorationViewProps) {
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState<"map" | "network">("map");

  const {
    searchTerm,
    setSearchTerm,
    filterKind,
    setFilterKind,
    filterContribution,
    setFilterContribution,
    engagementDomain,
    setEngagementDomain,
    zoneFilter,
    setZoneFilter,
    actorCardsPage,
    setActorCardsPage,
    resetFilters,
    targetArrondissement,
    enrichedEntries,
    sortedAndFilteredEntries,
    totalPages,
    paginatedEntries,
    locale,
  } = logic;

  const fr = externalFr ?? locale === "fr";
  const setSelectedActorId = onSelectedActorIdChange;
  const selectedActor =
    enrichedEntries.find((e) => e.id === selectedActorId) || null;
  const { ref: mapShellRef, isInView: isMapVisible } =
    useInViewOnce<HTMLElement>({
      rootMargin: "280px 0px",
    });

  const handleActorClick = (id: string) => {
    setSelectedActorId(id);
    const canvasAnchor = document.getElementById("exploration-canvas-anchor");
    canvasAnchor?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="flex min-w-0 w-full flex-col items-start gap-12 overflow-x-clip lg:flex-row">
      {/* LEFT COLUMN: Search & List (60%) */}
      <div className="order-2 flex min-w-0 w-full flex-1 flex-col gap-12 lg:order-1 lg:w-[60%]">
        <AnnuaireSearchPanel
          fr={fr}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          showFilters={showFilters}
          setShowFilters={setShowFilters}
          filterKind={filterKind}
          setFilterKind={setFilterKind}
          filterContribution={filterContribution}
          setFilterContribution={setFilterContribution}
          engagementDomain={engagementDomain}
          setEngagementDomain={setEngagementDomain}
          zoneFilter={zoneFilter}
          setZoneFilter={setZoneFilter}
          setActorCardsPage={setActorCardsPage}
          resetFilters={resetFilters}
          targetArrondissement={targetArrondissement}
          resultsCount={sortedAndFilteredEntries.length}
        />

        {/* Results Metadata */}
        <div className="flex items-center justify-between px-4">
          <div className="flex items-center gap-4">
            <Building2 size={18} className="text-slate-500" />
            <h3 className="text-xl font-black text-white tracking-tighter uppercase tracking-[0.1em]">
              {fr ? "Acteurs de l'annuaire" : "Directory actors"}
            </h3>
          </div>
          <div className="rounded-full border border-violet-500/20 bg-violet-500/10 px-4 py-1.5 cmm-text-caption font-black uppercase tracking-[0.2em] text-violet-300 shadow-2xl">
            {sortedAndFilteredEntries.length}{" "}
            {fr ? "résultats trouvés" : "results found"}
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

      <AnnuaireMapPanel
        fr={fr}
        viewMode={viewMode}
        setViewMode={setViewMode}
        isMapVisible={isMapVisible}
        sortedAndFilteredEntries={sortedAndFilteredEntries}
        selectedActorId={selectedActorId}
        selectedActor={selectedActor}
        handleActorClick={handleActorClick}
        mapShellRef={mapShellRef}
        setSelectedActorId={setSelectedActorId}
      />
    </div>
  );
}
