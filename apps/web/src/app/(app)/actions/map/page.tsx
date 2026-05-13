"use client";

import { useCallback, useMemo, useState } from "react";
import { useUser } from "@clerk/nextjs";
import Link from "next/link";
import useSWR from "swr";
import { BarChart3, Compass, MapPinned, Table2, ArrowRight, Zap } from "lucide-react";
import { ActionsMapFeed } from "@/components/actions/map-feed/actions-map-feed";
import { ActionsMapTable } from "@/components/actions/actions-map-table";
import { ActionsVisualizationPanel } from "@/components/actions/actions-visualization-panel";
import { ActionsMapSelectedCard } from "@/components/actions/map/actions-map-selected-card";
import { useActionsMapFilters } from "@/components/actions/map/use-actions-map-filters";
import { isVisibleWithCategoryFilter } from "@/components/actions/map-marker-categories";
import type { MarkerCategory } from "@/components/actions/map-marker-categories";
import { fetchMapActions } from "@/lib/actions/http";
import { getBlockClasses } from "@/lib/ui/block-accents";
import { cn } from "@/lib/utils";
import { useMapKpiStats } from "./_hooks/use-map-kpi-stats";
import { MapKpiRibbon } from "./_components/map-kpi-ribbon";
import { MapControlTower } from "./_components/map-control-tower";
import { MapSupervision } from "./_components/map-supervision";

const INITIAL_DAYS = Math.ceil(
  (new Date().getTime() - new Date(new Date().getFullYear(), 0, 1).getTime()) /
    (1000 * 60 * 60 * 24),
);

export default function ActionsMapPage() {
  const {
    filters,
    setDays,
    setStatusFilter,
    setImpactFilter,
    setQualityMin,
    toggleCategory,
    resetFilters,
  } = useActionsMapFilters(INITIAL_DAYS);
  const { days, statusFilter, impactFilter, qualityMin, visibleCategories } = filters;

  const { user } = useUser();
  const isAuthenticated = Boolean(user?.id);
  const isPublicVisitor = !isAuthenticated;

  const [railTab, setRailTab] = useState<"insights" | "journal">("insights");
  const [selectedActionId, setSelectedActionId] = useState<string | null>(null);
  
  const classes = getBlockClasses("visualize");

  const handleSelectAction = (actionId: string) => {
    setSelectedActionId((current) => (current === actionId ? null : actionId));
    setRailTab("journal");
  };

  const handleDaysChange = useCallback((daysValue: number) => {
    setSelectedActionId(null);
    setDays(daysValue);
  }, [setDays]);

  const handleStatusChange = useCallback((statusValue: typeof statusFilter) => {
    setSelectedActionId(null);
    setStatusFilter(statusValue);
  }, [setStatusFilter]);

  const handleImpactChange = useCallback((impactValue: typeof impactFilter) => {
    setSelectedActionId(null);
    setImpactFilter(impactValue);
  }, [setImpactFilter]);

  const handleQualityMinChange = useCallback((qualityValue: number) => {
    setSelectedActionId(null);
    setQualityMin(qualityValue);
  }, [setQualityMin]);

  const handleCategoryToggle = useCallback((category: MarkerCategory) => {
    setSelectedActionId(null);
    toggleCategory(category);
  }, [toggleCategory]);

  const handleResetFilters = useCallback(() => {
    setSelectedActionId(null);
    resetFilters();
  }, [resetFilters]);

  const mapDataQuery = useSWR(["map-page-kpis-map", days, statusFilter, impactFilter, qualityMin], () =>
    fetchMapActions({
      status: statusFilter,
      days,
      impact: impactFilter === "all" ? undefined : impactFilter,
      qualityMin: qualityMin > 0 ? qualityMin : undefined,
      limit: 300,
    }),
  );
  const approvedStatsQuery = useSWR(["map-page-approved-kpis", days, impactFilter, qualityMin], () =>
    fetchMapActions({
      status: "approved",
      days,
      impact: impactFilter === "all" ? undefined : impactFilter,
      qualityMin: qualityMin > 0 ? qualityMin : undefined,
      limit: 300,
    }),
  );

  const mapItems = useMemo(() => mapDataQuery.data?.items ?? [], [mapDataQuery.data?.items]);
  const approvedStatsItems = useMemo(
    () => approvedStatsQuery.data?.items ?? [],
    [approvedStatsQuery.data?.items],
  );
  const filteredMapItems = useMemo(
    () => mapItems.filter((item) => isVisibleWithCategoryFilter(item, visibleCategories)),
    [mapItems, visibleCategories],
  );
  const approvedFilteredItems = useMemo(
    () => approvedStatsItems.filter((item) => isVisibleWithCategoryFilter(item, visibleCategories)),
    [approvedStatsItems, visibleCategories],
  );
  const selectedAction = useMemo(
    () => filteredMapItems.find((item) => item.id === selectedActionId) ?? null,
    [filteredMapItems, selectedActionId],
  );
  const visibleCount = filteredMapItems.length;
  const loadedCount = mapItems.length;
  
  const stats = useMapKpiStats(approvedFilteredItems);

  const surfaceCard = cn("rounded-[3rem] border border-white/5 bg-white/5 backdrop-blur-3xl transition-all duration-700 relative overflow-hidden", classes.shadow);

  return (
    <main className={cn("min-h-screen text-white pb-24", classes.gradientDeep)}>
      <div className="mx-auto max-w-[1700px] px-6 py-8 space-y-16">
        {/* Premium Header - Lecture Spatiale */}
        <header className="relative space-y-12 pt-16">
          <div className="absolute -top-24 -left-24 w-[600px] h-[600px] bg-sky-500/10 rounded-full blur-[120px] pointer-events-none" />
          
          <div className="flex flex-wrap gap-3">
            <div className="inline-flex items-center gap-3 px-6 py-2.5 rounded-full border border-sky-400/20 bg-sky-400/5 backdrop-blur-md">
              <Compass size={14} className="text-sky-400 animate-spin-slow" />
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-sky-400">Visualiser / Cartographie</span>
            </div>
            <div className="inline-flex items-center gap-3 px-5 py-2.5 bg-white/5 rounded-full border border-white/5 text-[10px] font-black uppercase tracking-widest text-white/40 backdrop-blur-md">
              <Zap size={12} className="text-sky-400/60" />
              {stats.actions} Points Validés
            </div>
          </div>

          <div className="flex flex-col xl:flex-row items-start xl:items-end justify-between gap-12">
            <div className="space-y-6">
              <h1 className="text-7xl md:text-8xl xl:text-9xl font-black text-white tracking-tighter leading-[0.85] uppercase">
                Lecture <br />Spatiale
              </h1>
              <p className="max-w-2xl text-2xl font-medium leading-tight tracking-tight text-white/30">
                Analysez la distribution de la pollution, comparez les points d&apos;impact et vérifiez la qualité géographique des données en temps réel.
              </p>
            </div>
            
            <div className={cn("p-10 rounded-[3rem] border border-white/5 bg-white/5 backdrop-blur-2xl flex items-center gap-12 min-w-[400px]", classes.shadow)}>
              <div className="space-y-2">
                <p className="text-[10px] font-black uppercase tracking-widest text-sky-400/40">Couverture Géo</p>
                <p className="text-6xl font-black text-white tracking-tighter leading-none">{stats.geocoverage}%</p>
              </div>
              <div className="w-px h-16 bg-white/5" />
              <div className="flex flex-col gap-3">
                <Link href="/actions/new" className="flex items-center gap-3 text-[11px] font-black uppercase tracking-widest text-sky-400 hover:text-sky-300 transition-colors group">
                  Déclarer <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" />
                </Link>
                <Link href="/observatoire" className="flex items-center gap-3 text-[11px] font-black uppercase tracking-widest text-white/20 hover:text-white/40 transition-colors">
                  Observatoire <ArrowRight size={14} />
                </Link>
              </div>
            </div>
          </div>
        </header>

        {isPublicVisitor && (
          <section className={cn(surfaceCard, "p-12 border-sky-400/20")}>
            <div className="flex flex-col gap-8 sm:flex-row sm:items-center sm:justify-between relative z-10">
              <div className="space-y-2">
                <p className="text-2xl font-black uppercase tracking-tighter text-sky-100/90">Accès Visiteur Public</p>
                <p className="text-lg text-sky-100/30 font-medium tracking-tight">La carte est consultable librement. Connectez-vous pour exporter ou déclarer.</p>
              </div>
              <Link
                href="/sign-in"
                className="inline-flex shrink-0 items-center justify-center rounded-[2rem] bg-sky-400 px-10 py-5 text-xs font-black tracking-widest text-slate-950 transition-all hover:bg-sky-300 hover:-translate-y-1 shadow-2xl shadow-sky-400/30 active:scale-95"
              >
                IDENTIFICATION
              </Link>
            </div>
          </section>
        )}

        <MapKpiRibbon stats={stats} />

        {/* Main Cockpit Interface */}
        <div className="grid gap-12 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-12">
            <MapControlTower
              filters={filters}
              initialDays={INITIAL_DAYS}
              visibleCount={visibleCount}
              loadedCount={loadedCount}
              filteredMapItems={filteredMapItems}
              onDaysChange={handleDaysChange}
              onStatusChange={handleStatusChange}
              onImpactChange={handleImpactChange}
              onQualityMinChange={handleQualityMinChange}
              onCategoryToggle={handleCategoryToggle}
              onReset={handleResetFilters}
            />

            {/* Map Feed - Immersive Surface */}
            <section className={cn(surfaceCard, "p-2 min-h-[700px] border-white/10")}>
              <ActionsMapFeed
                presentation="immersive"
                days={days}
                statusFilter={statusFilter}
                impactFilter={impactFilter}
                qualityMin={qualityMin}
                visibleCategories={visibleCategories}
                selectedActionId={selectedActionId}
              />
            </section>
          </div>

          {/* Side Control Rail */}
          <aside className="space-y-12 self-start xl:sticky xl:top-8">
            <div className={cn(surfaceCard, "p-10 space-y-10")}>
              {selectedAction ? (
                <div className="animate-in fade-in slide-in-from-top-4 duration-700">
                  <ActionsMapSelectedCard item={selectedAction} onClear={() => setSelectedActionId(null)} />
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-20 text-center space-y-6">
                  <div className="w-24 h-24 rounded-[2rem] bg-white/5 border border-white/5 text-white/10 flex items-center justify-center">
                    <MapPinned size={48} strokeWidth={1.5} />
                  </div>
                  <div className="space-y-2">
                    <p className="text-xs font-black text-white/30 uppercase tracking-[0.3em]">Cible non assignée</p>
                    <p className="text-sm text-white/10 font-medium max-w-[200px] mx-auto">Sélectionnez un point d&apos;impact sur la carte pour engager l&apos;analyse.</p>
                  </div>
                </div>
              )}

              <div className="space-y-8">
                <div className="relative flex w-full rounded-[2rem] border border-white/5 bg-white/5 p-1.5">
                  <button
                    type="button"
                    onClick={() => setRailTab("insights")}
                    className={cn(
                      "relative z-10 flex w-1/2 items-center justify-center gap-3 py-4 text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-500",
                      railTab === "insights" ? "text-white" : "text-white/20 hover:text-white/40"
                    )}
                  >
                    <BarChart3 size={16} />
                    Analytique
                  </button>
                  <button
                    type="button"
                    onClick={() => setRailTab("journal")}
                    className={cn(
                      "relative z-10 flex w-1/2 items-center justify-center gap-3 py-4 text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-500",
                      railTab === "journal" ? "text-white" : "text-white/20 hover:text-white/40"
                    )}
                  >
                    <Table2 size={16} />
                    Journal
                  </button>
                  <div
                    className="absolute left-1.5 top-1.5 bottom-1.5 w-[calc(50%-4.5px)] rounded-[1.5rem] bg-white/5 border border-white/10 shadow-2xl transition-transform duration-700 ease-out"
                    style={{
                      transform: railTab === "insights" ? "translateX(0)" : "translateX(calc(100% + 6px))",
                    }}
                  />
                </div>

                <div className="min-h-[450px]">
                  {railTab === "insights" ? (
                    <div className="animate-in fade-in zoom-in-95 duration-700">
                      <ActionsVisualizationPanel
                        days={days}
                        status="approved"
                        impact={impactFilter}
                        qualityMin={qualityMin}
                        visibleCategories={visibleCategories}
                        compact
                      />
                    </div>
                  ) : (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
                      <ActionsMapTable
                        items={filteredMapItems}
                        compact
                        selectedActionId={selectedActionId}
                        onSelectAction={handleSelectAction}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>

            <MapSupervision />
          </aside>
        </div>

        <footer className="pt-16 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-6 text-[10px] font-black uppercase tracking-[0.3em] text-white/20">
            <span>Cockpit Cartographie v2.4</span>
            <div className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse" />
            <span>Flux Certifié Temps Réel</span>
          </div>
          <div className="flex items-center gap-8">
            <p className="text-[10px] font-black uppercase tracking-widest text-white/10">
              Système de Coordonnées WGS84
            </p>
            <p className="text-[10px] font-black uppercase tracking-widest text-sky-400/30">
              Sync : {new Date().toLocaleTimeString()}
            </p>
          </div>
        </footer>
      </div>
    </main>
  );
}
