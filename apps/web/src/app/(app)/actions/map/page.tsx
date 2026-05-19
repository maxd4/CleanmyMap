"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import { BarChart3, Compass, Table2, ArrowRight } from "lucide-react";
import { buildHomeMetrics } from "@/lib/accueil/config";
import { ActionsMapFeed } from "@/components/actions/map-feed/actions-map-feed";
import { ActionsMapTable } from "@/components/actions/actions-map-table";
import { ActionsVisualizationPanel } from "@/components/actions/actions-visualization-panel";
import { ActionStoriesCarousel } from "@/components/map/ActionStoriesCarousel";
import { useActionsMapFilters } from "@/components/actions/map/use-actions-map-filters";
import { isVisibleWithCategoryFilter } from "@/components/actions/map-marker-categories";
import type { MarkerCategory } from "@/components/actions/map-marker-categories";
import { fetchMapActions } from "@/lib/actions/http";
import { IMPACT_PROXY_CONFIG } from "@/lib/gamification/impact-proxy-config";
import type { ActionMapItem } from "@/lib/actions/types";
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

  const [railTab, setRailTab] = useState<"insights" | "journal">("insights");
  const [selectedActionId, setSelectedActionId] = useState<string | null>(null);
  
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
  const mapItems = useMemo(() => mapDataQuery.data?.items ?? [], [mapDataQuery.data?.items]);
  const filteredMapItems = useMemo(
    () => mapItems.filter((item) => isVisibleWithCategoryFilter(item, visibleCategories)),
    [mapItems, visibleCategories],
  );
  const visibleCount = filteredMapItems.length;
  const loadedCount = mapItems.length;
  const stats = useMapKpiStats(filteredMapItems);
  const impactMetrics = useMemo(
    () =>
      buildHomeMetrics(
        {
          wasteKg: stats.wasteKg,
          butts: stats.butts,
          volunteers: stats.volunteers,
          co2AvoidedKg: stats.wasteKg * IMPACT_PROXY_CONFIG.factors.co2KgPerWasteKg,
          waterSavedLiters: Math.round(stats.butts * IMPACT_PROXY_CONFIG.factors.waterLitersPerCigaretteButt),
          euroSaved: Math.round(stats.wasteKg * IMPACT_PROXY_CONFIG.factors.euroSavedPerWasteKg),
        },
        visibleCount > 0,
      ),
    [stats.butts, stats.volunteers, stats.wasteKg, visibleCount],
  );

  const surfaceCard = "rounded-[3rem] border border-cyan-200/70 bg-cyan-50/90 backdrop-blur-3xl transition-all duration-700 relative overflow-hidden shadow-[0_24px_56px_-32px_rgba(8,145,178,0.24)]";

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(103,232,249,0.35),transparent_28%),radial-gradient(circle_at_top_right,rgba(186,230,253,0.55),transparent_24%),linear-gradient(180deg,#ecfeff_0%,#f0f9ff_45%,#f8fafc_100%)] text-slate-950 pb-24">
      <div className="mx-auto max-w-[1680px] px-6 py-8 space-y-10">
        {/* Premium Header - Lecture Spatiale */}
        <header className="relative space-y-8 pt-10 lg:pt-12">
          <div className="absolute -top-24 -left-24 w-[600px] h-[600px] bg-sky-500/10 rounded-full blur-[120px] pointer-events-none" />
          
          <div className="flex flex-wrap gap-3">
            <div className="inline-flex items-center gap-3 px-6 py-2.5 rounded-full border border-cyan-200/90 bg-cyan-100/90 backdrop-blur-md">
              <Compass size={14} className="text-cyan-700 animate-spin-slow" />
              <span className="cmm-text-caption font-semibold tracking-[0.14em] text-slate-950">Visualiser / cartographie</span>
            </div>
          </div>

          <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,0.6fr)] xl:gap-8">
            <div className="max-w-4xl space-y-5">
              <h1 className="text-[clamp(2.4rem,5.2vw,5.7rem)] leading-[0.92] tracking-[-0.05em] text-slate-950 font-bold lg:whitespace-nowrap">
                Cartographie des actions
              </h1>
              <p className="text-[clamp(0.95rem,1.6vw,1.25rem)] font-medium leading-[1.42] text-slate-700/90 lg:whitespace-nowrap">
                Visualisez les interventions, suivez leur répartition et pilotez les données terrain en temps réel.
              </p>
              <div className="flex flex-wrap items-center gap-3 pt-1">
                <Link href="/actions/new" className="inline-flex items-center gap-3 rounded-full border border-cyan-200/80 bg-cyan-200 px-5 py-2.5 cmm-text-caption font-semibold tracking-[0.12em] text-slate-950 transition-colors hover:bg-cyan-100">
                  Déclarer <ArrowRight size={14} className="transition-transform hover:translate-x-1" />
                </Link>
                <Link href="/observatoire" className="inline-flex items-center gap-3 rounded-full border border-cyan-200/80 bg-white/80 px-5 py-2.5 cmm-text-caption font-semibold tracking-[0.12em] text-slate-700 transition-colors hover:text-slate-950 hover:bg-white">
                  Observatoire <ArrowRight size={14} />
                </Link>
                <Link href="/actions/history" className="inline-flex items-center gap-3 rounded-full border border-cyan-200/80 bg-white/80 px-5 py-2.5 cmm-text-caption font-semibold tracking-[0.12em] text-cyan-700 transition-colors hover:text-slate-950 hover:bg-white">
                  Historique détaillé <ArrowRight size={14} />
                </Link>
                <Link href="/methodologie" className="inline-flex items-center gap-3 rounded-full border border-cyan-200/80 bg-white/80 px-5 py-2.5 cmm-text-caption font-semibold tracking-[0.12em] text-cyan-700 transition-colors hover:text-slate-950 hover:bg-white">
                  Méthodologie <ArrowRight size={14} />
                </Link>
              </div>
            </div>
          </div>
        </header>

        <section className="relative left-1/2 right-1/2 mx-auto w-[calc(100vw-1rem)] -translate-x-1/2 lg:w-[calc(100vw-1.5rem)]">
          <ActionsMapFeed
            presentation="immersive"
            showIntro={false}
            fullViewport
            showStoriesCarousel={false}
            days={days}
            statusFilter={statusFilter}
            impactFilter={impactFilter}
            qualityMin={qualityMin}
            visibleCategories={visibleCategories}
            selectedActionId={selectedActionId}
            onOpenAction={handleSelectAction}
          />
        </section>

        <div className="mx-auto max-w-[1680px] px-6 space-y-10">
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.62fr)_minmax(340px,0.88fr)]">
            <div className="space-y-6">
              <MapKpiRibbon metrics={impactMetrics} />

              <MapControlTower
                filters={filters}
                initialDays={INITIAL_DAYS}
                visibleCount={visibleCount}
                loadedCount={loadedCount}
                filteredMapItems={filteredMapItems}
                onDaysChange={handleDaysChange}
                onStatusChange={handleStatusChange}
                onCategoryToggle={handleCategoryToggle}
                onReset={handleResetFilters}
              />

              <section className={cn(surfaceCard, "p-8 space-y-8")}>
                <div className="flex items-center justify-between gap-4">
                  <div className="space-y-1">
                    <p className="flex items-center gap-3 cmm-text-caption font-semibold tracking-[0.14em] text-slate-950">
                      <span className="h-4 w-4 rounded-full bg-cyan-500 shadow-[0_0_18px_rgba(34,211,238,0.55)]" />
                      Analyses
                    </p>
                    <p className="text-sm font-medium leading-relaxed text-slate-600">
                      Lecture détaillée des flux terrain et des répartitions par période.
                    </p>
                  </div>
                  <div className="relative flex rounded-[2rem] border border-cyan-200/80 bg-cyan-50/90 p-1.5">
                    <button
                      type="button"
                      onClick={() => setRailTab("insights")}
                      className={cn(
                        "relative z-10 flex items-center justify-center gap-3 px-5 py-3 cmm-text-caption font-semibold tracking-[0.12em] transition-all duration-500",
                        railTab === "insights" ? "text-slate-950" : "text-slate-600 hover:text-slate-950"
                      )}
                    >
                      <BarChart3 size={16} />
                      Analytique
                    </button>
                    <button
                      type="button"
                      onClick={() => setRailTab("journal")}
                      className={cn(
                        "relative z-10 flex items-center justify-center gap-3 px-5 py-3 cmm-text-caption font-semibold tracking-[0.12em] transition-all duration-500",
                        railTab === "journal" ? "text-slate-950" : "text-slate-600 hover:text-slate-950"
                      )}
                    >
                      <Table2 size={16} />
                      Journal
                    </button>
                    <div
                      className="absolute left-1.5 top-1.5 bottom-1.5 w-[calc(50%-4.5px)] rounded-[1.5rem] bg-cyan-200 border border-cyan-300 shadow-2xl transition-transform duration-700 ease-out"
                      style={{
                        transform: railTab === "insights" ? "translateX(0)" : "translateX(calc(100% + 6px))",
                      }}
                    />
                  </div>
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
              </section>
            </div>

            <aside className="space-y-6 self-start xl:sticky xl:top-8">
              <section className={cn(surfaceCard, "p-6 sm:p-8")}>
                <ActionStoriesCarousel items={filteredMapItems} onOpenAction={handleSelectAction} />
              </section>

              <section className={cn(surfaceCard, "p-6 sm:p-8 space-y-4")}>
                <div className="space-y-2">
                  <p className="flex items-center gap-3 cmm-text-caption font-semibold tracking-[0.14em] text-slate-950">
                    <span className="h-4 w-4 rounded-full bg-cyan-500 shadow-[0_0_18px_rgba(34,211,238,0.55)]" />
                    Méthodologie
                  </p>
                  <p className="text-sm font-medium leading-relaxed text-slate-600">
                    Les formules, sources et marges d’erreur restent disponibles pour vérifier la lecture.
                  </p>
                </div>
                <Link
                  href="/methodologie"
                  className="inline-flex w-full items-center justify-center gap-3 rounded-[2rem] border border-cyan-200/80 bg-white/80 px-6 py-4 cmm-text-caption font-semibold tracking-[0.12em] text-slate-700 transition-colors hover:text-slate-950 hover:bg-white"
                >
                  Voir la méthodologie
                  <ArrowRight size={14} />
                </Link>
              </section>

              <MapSupervision />
            </aside>
          </div>
        </div>

      </div>
    </main>
  );
}
