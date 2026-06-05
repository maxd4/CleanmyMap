"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { BarChart3, Table2, ArrowRight } from "lucide-react";
import { buildHomeMetrics } from "@/lib/accueil/config";
import { ActionsMapFeedContent } from "@/components/actions/map-feed/actions-map-feed";
import { ActionsMapTable } from "@/components/actions/actions-map-table";
import { CmmButton } from "@/components/ui/cmm-button";
import { CmmSkeleton } from "@/components/ui/cmm-skeleton";
import { useActionsMapFilters } from "@/components/actions/map/use-actions-map-filters";
import type { MarkerCategory } from "@/components/actions/map-marker-categories";
import type { MapViewportState } from "@/components/actions/map/map-export.types";
import { PageHeader, PageHeaderBadge } from "@/components/ui/page-header";
import { IMPACT_PROXY_CONFIG } from "@/lib/gamification/impact-proxy-config";
import { resolvePageFamily } from "@/lib/ui/page-families";
import { cn } from "@/lib/utils";
import { useMapKpiStats } from "./_hooks/use-map-kpi-stats";
import { MapKpiRibbon } from "./_components/map-kpi-ribbon";
import { MapControlTower } from "./_components/map-control-tower";
import { MapSidebarAid } from "./_components/map-sidebar-aid";
import { useMapFeedData } from "@/components/actions/map-feed/use-map-feed-data";
import {
  ActionPollutionScoreReferencesProvider,
  useActionPollutionScoreReferences,
} from "@/components/actions/map/action-pollution-score-references-context";

const ActionsVisualizationPanel = dynamic(
  () =>
    import("@/components/actions/actions-visualization-panel").then(
      (mod) => mod.ActionsVisualizationPanel,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="rounded-[2.5rem] border border-sky-200/80 bg-white p-8">
        <div className="space-y-4">
          <CmmSkeleton variant="title" className="w-40" />
          <CmmSkeleton variant="chart" className="h-40" />
        </div>
      </div>
    ),
  },
);

const ActionStoriesCarousel = dynamic(
  () => import("@/components/map/ActionStoriesCarousel").then((mod) => mod.ActionStoriesCarousel),
  {
    ssr: false,
    loading: () => (
      <div className="space-y-4 rounded-[2rem] border border-cyan-200/80 bg-white/80 p-5">
        <CmmSkeleton variant="title" className="w-40" />
        <CmmSkeleton variant="card" className="h-[340px]" />
      </div>
    ),
  },
);

const INITIAL_DAYS = Math.ceil(
  (new Date().getTime() - new Date(new Date().getFullYear(), 0, 1).getTime()) /
    (1000 * 60 * 60 * 24),
);

export default function ActionsMapPage() {
  return (
    <ActionPollutionScoreReferencesProvider>
      <ActionsMapPageContent />
    </ActionPollutionScoreReferencesProvider>
  );
}

function ActionsMapPageContent() {
  const pageFamily = resolvePageFamily("/actions/map");
  const { references } = useActionPollutionScoreReferences();
  const {
    filters,
    setDateScope,
    setStatusFilter,
    setZoneQuery,
    toggleCategory,
    resetFilters,
  } = useActionsMapFilters(INITIAL_DAYS);
  const {
    days,
    dateScope,
    statusFilter,
    impactFilter,
    qualityMin,
    zoneQuery,
    visibleCategories,
  } = filters;

  const [railTab, setRailTab] = useState<"insights" | "journal">("insights");
  const [selectedActionId, setSelectedActionId] = useState<string | null>(null);
  const [mapViewport, setMapViewport] = useState<MapViewportState | null>(null);
  const mapExportTargetRef = useRef<HTMLDivElement | null>(null);
  const handleSelectAction = (actionId: string) => {
    setSelectedActionId((current) => (current === actionId ? null : actionId));
    setRailTab("journal");
  };

  const handleDateScopeChange = useCallback((dateScopeValue: typeof dateScope) => {
    setSelectedActionId(null);
    setDateScope(dateScopeValue);
  }, [setDateScope]);

  const handleStatusChange = useCallback((statusValue: typeof statusFilter) => {
    setSelectedActionId(null);
    setStatusFilter(statusValue);
  }, [setStatusFilter]);

  const handleZoneQueryChange = useCallback((zoneQueryValue: string) => {
    setSelectedActionId(null);
    setZoneQuery(zoneQueryValue);
  }, [setZoneQuery]);

  const handleCategoryToggle = useCallback((category: MarkerCategory) => {
    setSelectedActionId(null);
    toggleCategory(category);
  }, [toggleCategory]);

  const handleResetFilters = useCallback(() => {
    setSelectedActionId(null);
    resetFilters();
  }, [resetFilters]);

  const mapFeedData = useMapFeedData({
    types: "all",
    days,
    dateScope,
    statusFilter,
    impactFilter,
    qualityMin,
    zoneQuery,
    visibleCategories,
    pollutionScoreReferences: references,
    limit: 300,
  });
  const filteredMapItems = useMemo(() => mapFeedData.items ?? [], [mapFeedData.items]);
  const loadedItems = useMemo(() => mapFeedData.allItems ?? [], [mapFeedData.allItems]);
  const visibleCount = filteredMapItems.length;
  const loadedCount = loadedItems.length;
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

  const surfaceCard = "rounded-[3rem] border border-sky-200/70 bg-sky-50/90 backdrop-blur-3xl transition-all duration-700 relative overflow-hidden shadow-[0_24px_56px_-32px_rgba(14,165,233,0.22)]";

  return (
    <main className="min-h-screen text-slate-950 pb-24">
      <div className="mx-auto max-w-[1680px] px-6 py-8 space-y-10">
        {/* Premium Header - Lecture Spatiale */}
        <header className="relative space-y-8 pt-10 lg:pt-12">
          <div className="absolute -top-24 -left-24 w-[600px] h-[600px] bg-sky-500/10 rounded-full blur-[120px] pointer-events-none" />

          <PageHeader
            family={pageFamily}
            eyebrow="Visualiser / cartographie"
            title="Cartographie des actions"
            subtitle="Suivez les interventions et les données terrain en temps réel."
            badges={
              <>
                <PageHeaderBadge family={pageFamily}>Lecture terrain</PageHeaderBadge>
                <PageHeaderBadge family={pageFamily} muted>
                  Données en temps réel
                </PageHeaderBadge>
              </>
            }
            className="max-w-4xl"
          />

          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
            <CmmButton href="/actions/new" tone="primary" variant="pill" className="w-full justify-center px-5 py-2.5 text-[10px] font-black uppercase tracking-[0.2em] gap-3 sm:w-auto">
              Déclarer <ArrowRight size={14} className="transition-transform hover:translate-x-1" />
            </CmmButton>
            <CmmButton href="/methodologie" tone="tertiary" variant="pill" className="w-full justify-center px-5 py-2.5 text-[10px] font-black uppercase tracking-[0.2em] gap-3 sm:w-auto">
              Méthodologie <ArrowRight size={14} />
            </CmmButton>
          </div>
        </header>

        <section className="relative mx-auto w-full lg:left-1/2 lg:right-1/2 lg:w-[calc(100vw-1.5rem)] lg:-translate-x-1/2">
          <ActionsMapFeedContent
            feedData={mapFeedData}
            presentation="immersive"
            showIntro={false}
            fullViewport
          showStoriesCarousel={false}
          zoneQuery={zoneQuery}
          selectedActionId={selectedActionId}
          onOpenAction={handleSelectAction}
          onResetFilters={handleResetFilters}
          mapExportTargetRef={mapExportTargetRef}
          onViewportChange={setMapViewport}
        />
        </section>

        <div className="mx-auto max-w-[1680px] px-6 space-y-10">
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.62fr)_minmax(340px,0.88fr)]">
            <div className="space-y-6">
              <MapKpiRibbon metrics={impactMetrics} />

              <MapControlTower
                filters={filters}
                visibleCount={visibleCount}
                loadedCount={loadedCount}
                allMapItems={loadedItems}
                filteredMapItems={filteredMapItems}
                freshnessLabel={mapFeedData.freshnessLabel}
                mapExportTargetRef={mapExportTargetRef}
                viewport={mapViewport}
                onZoneQueryChange={handleZoneQueryChange}
                onDateScopeChange={handleDateScopeChange}
                onStatusChange={handleStatusChange}
                onCategoryToggle={handleCategoryToggle}
                onReset={handleResetFilters}
              />

              <section className={cn(surfaceCard, "p-8 space-y-8")}>
                <div className="flex items-center justify-between gap-4">
                  <div className="space-y-1">
                    <p className="flex items-center gap-3 cmm-text-caption font-semibold tracking-[0.14em] text-slate-950">
                      <span className="h-4 w-4 rounded-full bg-sky-500 shadow-[0_0_18px_rgba(56,189,248,0.45)]" />
                      Lecture terrain
                    </p>
                    <p className="text-sm font-medium leading-relaxed text-slate-600">
                      Flux terrain et répartition par période.
                    </p>
                  </div>
                  <div className="relative flex rounded-[2rem] border border-sky-200/80 bg-sky-50/90 p-1.5">
                    <CmmButton
                      type="button"
                      onClick={() => setRailTab("insights")}
                      tone={railTab === "insights" ? "primary" : "tertiary"}
                      variant="pill"
                      className={cn(
                        "relative z-10 flex items-center justify-center gap-3 px-5 py-3 cmm-text-caption font-semibold tracking-[0.12em] transition-all duration-500",
                        railTab === "insights" ? "text-slate-950" : "text-slate-600 hover:text-slate-950"
                      )}
                    >
                      <BarChart3 size={16} />
                      Analytique
                    </CmmButton>
                    <CmmButton
                      type="button"
                      onClick={() => setRailTab("journal")}
                      tone={railTab === "journal" ? "primary" : "tertiary"}
                      variant="pill"
                      className={cn(
                        "relative z-10 flex items-center justify-center gap-3 px-5 py-3 cmm-text-caption font-semibold tracking-[0.12em] transition-all duration-500",
                        railTab === "journal" ? "text-slate-950" : "text-slate-600 hover:text-slate-950"
                      )}
                    >
                      <Table2 size={16} />
                      Journal
                    </CmmButton>
                    <div
                      className="absolute left-1.5 top-1.5 bottom-1.5 w-[calc(50%-4.5px)] rounded-[1.5rem] bg-sky-200 border border-sky-300 shadow-2xl transition-transform duration-700 ease-out"
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
                        items={filteredMapItems}
                        isLoading={mapFeedData.isLoading}
                        error={mapFeedData.error instanceof Error ? mapFeedData.error : null}
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

            <aside className="space-y-4 self-start xl:sticky xl:top-8">
              <section className={cn(surfaceCard, "p-5 sm:p-6")}>
                <ActionStoriesCarousel items={filteredMapItems} onOpenAction={handleSelectAction} compact />
              </section>

              <MapSidebarAid />
            </aside>
          </div>
        </div>
      </div>
    </main>
  );
}
