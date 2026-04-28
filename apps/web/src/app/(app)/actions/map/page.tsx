"use client";

import { useState, useMemo } from"react";
import { useUser } from"@clerk/nextjs";
import Link from"next/link";
import useSWR from"swr";
import { ActionsMapFeed } from"@/components/actions/actions-map-feed";
import { ActionsMapExportButton } from"@/components/actions/map/actions-map-export-button";
import { ActionsMapTable } from"@/components/actions/actions-map-table";
import { ActionsVisualizationPanel } from"@/components/actions/actions-visualization-panel";
import { ActionsMapFilterControls } from"@/components/actions/map/actions-map-filter-controls";
import { ActionsMapSelectedCard } from"@/components/actions/map/actions-map-selected-card";
import { buildActionsMapGeoQuality } from"@/components/actions/map/actions-map-quality";
import { useActionsMapFilters } from"@/components/actions/map/use-actions-map-filters";
import { isVisibleWithCategoryFilter } from"@/components/actions/map-marker-categories";
import { DecisionPageHeader } from"@/components/ui/decision-page-header";
import { RubriquePdfExportButton } from"@/components/ui/rubrique-pdf-export-button";
import { fetchMapActions } from"@/lib/actions/http";
import { mapItemWasteKg, mapItemCigaretteButts, mapItemCoordinates } from"@/lib/actions/data-contract";
import { BarChart3, MapPinned, Table2 } from"lucide-react";
import { cn } from "@/lib/utils";

const INITIAL_DAYS = Math.ceil(
 (new Date().getTime() - new Date(new Date().getFullYear(), 0, 1).getTime()) /
 (1000 * 60 * 60 * 24),
);

export default function ActionsMapPage() {
 // --- TOUR DE CONTRÔLE (ÉTAT GLOBAL) ---
 const {
  filters,
  setDays,
  setStatusFilter,
 setImpactFilter,
 setQualityMin,
 toggleCategory,
 resetFilters,
 } = useActionsMapFilters(INITIAL_DAYS);
 const { days, statusFilter, impactFilter, qualityMin, visibleCategories } =
  filters;
 
 // Rôle Utilisateur pour CTA dynamique
 const { user } = useUser();
 const isAuthenticated = Boolean(user?.id);
 const role = user?.publicMetadata?.role ||"volunteer";
 const isPublicVisitor = !isAuthenticated;
 
 const [railTab, setRailTab] = useState<"insights" |"journal">("insights");
 const [selectedActionId, setSelectedActionId] = useState<string | null>(null);
 const handleSelectAction = (actionId: string) => {
   setSelectedActionId((current) => (current === actionId ? null : actionId));
   setRailTab("journal");
 };
 const handleDaysChange = (daysValue: number) => {
   setSelectedActionId(null);
   setDays(daysValue);
 };
 const handleStatusChange = (statusValue: typeof statusFilter) => {
   setSelectedActionId(null);
   setStatusFilter(statusValue);
 };
 const handleImpactChange = (impactValue: typeof impactFilter) => {
   setSelectedActionId(null);
   setImpactFilter(impactValue);
 };
 const handleQualityMinChange = (qualityValue: number) => {
   setSelectedActionId(null);
   setQualityMin(qualityValue);
 };
 const handleCategoryToggle = (category: Parameters<typeof toggleCategory>[0]) => {
   setSelectedActionId(null);
   toggleCategory(category);
 };
 const handleResetFilters = () => {
   setSelectedActionId(null);
   resetFilters();
 };

 // --- RÉCUPÉRATION DES DONNÉES POUR LES KPI UNIFIÉS ---
 const mapDataQuery = useSWR(["map-page-kpis-map", days, statusFilter, impactFilter, qualityMin], () =>
 fetchMapActions({ 
 status: statusFilter, 
 days, 
 impact: impactFilter ==="all" ? undefined : impactFilter,
 qualityMin: qualityMin > 0 ? qualityMin : undefined,
 limit: 300 
 })
 );

 const mapItems = useMemo(() => mapDataQuery.data?.items ?? [], [mapDataQuery.data?.items]);
 const filteredMapItems = useMemo(
   () =>
     mapItems.filter((item) =>
       isVisibleWithCategoryFilter(item, visibleCategories),
     ),
   [mapItems, visibleCategories],
 );
 const selectedAction = useMemo(
   () => filteredMapItems.find((item) => item.id === selectedActionId) ?? null,
   [filteredMapItems, selectedActionId],
 );

  const geoQuality = useMemo(
    () => buildActionsMapGeoQuality(filteredMapItems),
    [filteredMapItems],
  );
  const visibleCount = filteredMapItems.length;
  const loadedCount = mapItems.length;

 const stats = useMemo(() => {
 const items = filteredMapItems;

 const totalKg = items.reduce((acc, item) => acc + (mapItemWasteKg(item) ?? 0), 0);
 const totalButts = items.reduce((acc, item) => acc + (mapItemCigaretteButts(item) ?? 0), 0);
 
 let volunteers = 0;
 let citizenHours = 0;
 for (const item of items) {
 const count = Number(item.contract?.metadata.volunteersCount || 0);
 const minutes = Number(item.contract?.metadata.durationMinutes || 0);
 volunteers += count;
 citizenHours += (count * Math.max(0, minutes)) / 60;
 }

 const geolocated = items.filter((item) => {
 const coords = mapItemCoordinates(item);
 return coords.latitude !== null && coords.longitude !== null;
 }).length;

 return {
 actions: items.length,
 wasteKg: totalKg,
 butts: totalButts,
 volunteers,
 citizenHours,
 geocoverage: items.length > 0 ? Math.round((geolocated / items.length) * 100) : 0,
 };
 }, [filteredMapItems]);

 const failedSources = mapDataQuery.data?.sourceHealth?.failedSources ?? [];
 const partialSourcesLabel =
 failedSources.length > 0 ? failedSources.join(", ") :"inconnues";
 const hasMapError = Boolean(mapDataQuery.error);
 const hasEmptyFilteredMap =
 !mapDataQuery.isLoading && !hasMapError && filteredMapItems.length === 0;

  const kpiRibbon = (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
      <article className="group relative overflow-hidden rounded-3xl border border-emerald-100 bg-white/80 p-5 shadow-xl shadow-emerald-500/5 backdrop-blur-xl transition-all hover:-translate-y-1 hover:shadow-2xl hover:shadow-emerald-500/10">
        <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-emerald-500/10 blur-2xl transition-all group-hover:bg-emerald-500/20" />
        <div className="relative flex items-center justify-between">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-800/60">Actions</p>
          <Link href="/methodologie" className="opacity-0 transition-opacity group-hover:opacity-100">
            <div className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">ⓘ</div>
          </Link>
        </div>
        <p className="relative mt-3 text-4xl font-black tracking-tighter text-slate-900">{stats.actions}</p>
        <div className="relative mt-4 h-1.5 w-full overflow-hidden rounded-full bg-emerald-50">
          <div className="h-full w-full bg-emerald-500 opacity-80" />
        </div>
      </article>

      <article className="group relative overflow-hidden rounded-3xl border border-teal-100 bg-white/80 p-5 shadow-xl shadow-teal-500/5 backdrop-blur-xl transition-all hover:-translate-y-1 hover:shadow-2xl hover:shadow-teal-500/10">
        <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-teal-500/10 blur-2xl transition-all group-hover:bg-teal-500/20" />
        <div className="relative flex items-center justify-between">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-teal-800/60">Déchets (kg)</p>
          <Link href="/methodologie" className="opacity-0 transition-opacity group-hover:opacity-100">
            <div className="flex h-5 w-5 items-center justify-center rounded-full bg-teal-50 text-teal-600">ⓘ</div>
          </Link>
        </div>
        <p className="relative mt-3 text-4xl font-black tracking-tighter text-slate-900">{stats.wasteKg.toFixed(1)}</p>
        <div className="relative mt-4 h-1.5 w-full overflow-hidden rounded-full bg-teal-50">
          <div className="h-full w-full bg-teal-500" />
        </div>
      </article>

      <article className="group relative overflow-hidden rounded-3xl border border-amber-100 bg-white/80 p-5 shadow-xl shadow-amber-500/5 backdrop-blur-xl transition-all hover:-translate-y-1 hover:shadow-2xl hover:shadow-amber-500/10">
        <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-amber-500/10 blur-2xl transition-all group-hover:bg-amber-500/20" />
        <div className="relative flex items-center justify-between">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-800/60">Mégots</p>
          <Link href="/methodologie" className="opacity-0 transition-opacity group-hover:opacity-100">
            <div className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-50 text-amber-600">ⓘ</div>
          </Link>
        </div>
        <p className="relative mt-3 text-4xl font-black tracking-tighter text-slate-900">{Math.round(stats.butts)}</p>
        <div className="relative mt-4 h-1.5 w-full overflow-hidden rounded-full bg-amber-50">
          <div className="h-full w-full bg-amber-500" />
        </div>
      </article>

      <article className="group relative overflow-hidden rounded-3xl border border-sky-100 bg-white/80 p-5 shadow-xl shadow-sky-500/5 backdrop-blur-xl transition-all hover:-translate-y-1 hover:shadow-2xl hover:shadow-sky-500/10">
        <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-sky-500/10 blur-2xl transition-all group-hover:bg-sky-500/20" />
        <div className="relative flex items-center justify-between">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-sky-800/60">Bénévoles</p>
          <Link href="/methodologie" className="opacity-0 transition-opacity group-hover:opacity-100">
            <div className="flex h-5 w-5 items-center justify-center rounded-full bg-sky-50 text-sky-600">ⓘ</div>
          </Link>
        </div>
        <p className="relative mt-3 text-4xl font-black tracking-tighter text-slate-900">{stats.volunteers}</p>
        <div className="relative mt-4 h-1.5 w-full overflow-hidden rounded-full bg-sky-50">
          <div className="h-full w-full bg-sky-500" />
        </div>
      </article>

      <article className="group relative overflow-hidden rounded-3xl border border-violet-100 bg-white/80 p-5 shadow-xl shadow-violet-500/5 backdrop-blur-xl transition-all hover:-translate-y-1 hover:shadow-2xl hover:shadow-violet-500/10">
        <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-violet-500/10 blur-2xl transition-all group-hover:bg-violet-500/20" />
        <div className="relative flex items-center justify-between">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-violet-800/60">Heures Citoyennes</p>
          <Link href="/methodologie" className="opacity-0 transition-opacity group-hover:opacity-100">
            <div className="flex h-5 w-5 items-center justify-center rounded-full bg-violet-50 text-violet-600">ⓘ</div>
          </Link>
        </div>
        <p className="relative mt-3 text-4xl font-black tracking-tighter text-slate-900">{stats.citizenHours.toFixed(0)}</p>
        <div className="relative mt-4 h-1.5 w-full overflow-hidden rounded-full bg-violet-50">
          <div className="h-full w-full bg-violet-500" />
        </div>
      </article>

      <article className="group relative overflow-hidden rounded-3xl border border-rose-100 bg-white/80 p-5 shadow-xl shadow-rose-500/5 backdrop-blur-xl transition-all hover:-translate-y-1 hover:shadow-2xl hover:shadow-rose-500/10">
        <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-rose-500/10 blur-2xl transition-all group-hover:bg-rose-500/20" />
        <div className="relative flex items-center justify-between">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-rose-800/60">Géo-couverture</p>
          <Link href="/methodologie" className="opacity-0 transition-opacity group-hover:opacity-100">
            <div className="flex h-5 w-5 items-center justify-center rounded-full bg-rose-50 text-rose-600">ⓘ</div>
          </Link>
        </div>
        <p className="relative mt-3 text-4xl font-black tracking-tighter text-slate-900">{stats.geocoverage}%</p>
        <div className="relative mt-4 h-1.5 w-full overflow-hidden rounded-full bg-rose-50">
          <div className="h-full bg-gradient-to-r from-rose-400 to-rose-600" style={{ width: `${stats.geocoverage}%` }} />
        </div>
      </article>
    </div>
  );

  const controlTower = (
    <section className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 rounded-[2rem] border border-slate-200/60 bg-white/80 p-4 shadow-xl shadow-slate-200/50 backdrop-blur-xl">
      <div className="flex items-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/20">
          <MapPinned size={24} />
        </div>
        <div>
          <h2 className="text-sm font-black uppercase tracking-widest text-slate-900">Cockpit Terrain</h2>
          <p className="text-xs font-bold text-slate-500">PARAMÉTRAGE DES DONNÉES</p>
        </div>
      </div>
      <ActionsMapFilterControls
        filters={filters}
        initialDays={INITIAL_DAYS}
        onDaysChange={handleDaysChange}
        onStatusChange={handleStatusChange}
        onImpactChange={handleImpactChange}
        onQualityMinChange={handleQualityMinChange}
        onCategoryToggle={handleCategoryToggle}
        onReset={handleResetFilters}
      />
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200/80 bg-slate-50/80 px-4 py-3 text-xs font-semibold text-slate-600 shadow-sm">
        <span className="inline-flex h-8 min-w-8 items-center justify-center rounded-full bg-white px-2 font-black text-slate-900 shadow-sm">
          {visibleCount}
        </span>
        <span>actions visibles</span>
        <span className="text-slate-300">/</span>
        <span className="inline-flex h-8 min-w-8 items-center justify-center rounded-full bg-white px-2 font-black text-slate-900 shadow-sm">
          {loadedCount}
        </span>
        <span>chargées</span>
        <div className="flex-1" />
        <ActionsMapExportButton items={filteredMapItems} />
      </div>
    </section>
  );

  const page = (
    <div data-rubrique-report-root className="space-y-6">
      <DecisionPageHeader
        context="Profil terrain"
        title="Cockpit de Pilotage Cartographique"
        objective="Superviser l'impact terrain, la mobilisation citoyenne et la fiabilité des données en temps réel."
        actions={
          role === "politician" || role === "admin"
            ? [
                { href: "/reports", label: "Générer Rapport", tone: "primary" },
                { href: "/actions/history", label: "Auditer Qualité" },
              ]
            : [
                { href: "/actions/new", label: "Déclarer une action", tone: "primary" },
                { href: "/actions/history", label: "Historique" },
              ]
        }
      />

      {isPublicVisitor ? (
        <section className="rounded-3xl border border-emerald-500/20 bg-emerald-50/50 dark:bg-emerald-950/20 p-6 text-sm text-emerald-950 dark:text-emerald-100 shadow-xl shadow-emerald-500/5 backdrop-blur-md">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="font-medium leading-relaxed">
              La carte est consultable librement. Connecte-toi uniquement pour
              déclarer une action, suivre ton historique ou exporter un rapport.
            </p>
            <Link
              href="/sign-in"
              className="inline-flex shrink-0 items-center justify-center rounded-2xl bg-emerald-600 px-6 py-3 text-sm font-black tracking-wide text-white transition hover:bg-emerald-700 shadow-lg shadow-emerald-600/20 hover:-translate-y-0.5"
            >
              Se connecter
            </Link>
          </div>
        </section>
      ) : null}

      {mapDataQuery.data?.partialSource ? (
        <section className="rounded-3xl border border-amber-300/50 bg-amber-50/80 p-5 text-sm font-semibold text-amber-950 shadow-lg shadow-amber-500/5">
          Sources partielles sur la carte: {partialSourcesLabel}. Les KPI et
          le journal restent synchronisés avec les données disponibles.
        </section>
      ) : null}

      {hasMapError ? (
        <section className="rounded-3xl border border-rose-300/60 bg-rose-50/80 p-5 text-sm font-semibold text-rose-900 shadow-lg shadow-rose-500/5">
          Impossible de charger les données cartographiques pour les KPI et le
          journal. La carte signale séparément son propre état de chargement.
        </section>
      ) : null}

      {hasEmptyFilteredMap ? (
        <section className="rounded-3xl border border-slate-200 bg-white/80 p-5 text-sm font-semibold text-slate-600 shadow-lg shadow-slate-200/50">
          Aucun point ne correspond aux filtres actifs. Ajuste la période, le
          niveau d&apos;impact, la qualité ou les catégories visibles.
        </section>
      ) : null}

      <div className="space-y-4">
        {/* TOUR DE CONTRÔLE UNIQUE */}
        {controlTower}
        <section className="grid gap-3 rounded-[2rem] border border-slate-200/60 bg-white/80 p-4 shadow-xl shadow-slate-200/50 backdrop-blur-xl sm:grid-cols-2 lg:grid-cols-5">
          <div>
            <p className="text-[10px] font-black uppercase text-slate-400">Géo qualité</p>
            <p className="mt-1 text-2xl font-black text-slate-900">{geoQuality.total}</p>
          </div>
          <div>
            <p className="text-[10px] font-black uppercase text-slate-400">Sans coord.</p>
            <p className="mt-1 text-2xl font-black text-rose-600">{geoQuality.missingCoordinates}</p>
          </div>
          <div>
            <p className="text-[10px] font-black uppercase text-slate-400">Réels</p>
            <p className="mt-1 text-2xl font-black text-emerald-700">{geoQuality.realGeometry}</p>
          </div>
          <div>
            <p className="text-[10px] font-black uppercase text-slate-400">Estimés</p>
            <p className="mt-1 text-2xl font-black text-amber-700">{geoQuality.estimatedGeometry}</p>
          </div>
          <div>
            <p className="text-[10px] font-black uppercase text-slate-400">Fallback</p>
            <p className="mt-1 text-2xl font-black text-slate-600">{geoQuality.fallbackPoint}</p>
          </div>
        </section>
      </div>

      {/* CŒUR DE PAGE : CARTE DOMINANTE (70%) + RAIL SECONDAIRE (30%) */}
      <div className="grid gap-6 xl:grid-cols-[7fr_3fr]">
        <section className="min-w-0 xl:sticky xl:top-6 self-start rounded-[2.5rem] border border-slate-200/60 bg-white/50 p-2 shadow-2xl shadow-slate-200/50 backdrop-blur-xl overflow-hidden">
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

        <aside className="min-w-0 self-start xl:sticky xl:top-6">
          <div className="rounded-[2.5rem] border border-slate-200/60 bg-white/80 p-5 shadow-xl shadow-slate-200/50 backdrop-blur-xl">
            {selectedAction ? (
              <div className="mb-5">
                <ActionsMapSelectedCard
                  item={selectedAction}
                  onClear={() => setSelectedActionId(null)}
                />
              </div>
            ) : null}

            {/* Premium Tabs */}
            <div className="relative flex w-full rounded-2xl bg-slate-100/80 p-1 backdrop-blur-md shadow-inner mb-6">
              <button
                type="button"
                onClick={() => setRailTab("insights")}
                className={cn(
                  "relative z-10 flex w-1/2 items-center justify-center gap-2 py-3 text-[10px] font-black uppercase tracking-widest transition-all duration-300",
                  railTab === "insights" ? "text-slate-900" : "text-slate-500 hover:text-slate-700"
                )}
              >
                <BarChart3 size={16} />
                Insights
              </button>
              <button
                type="button"
                onClick={() => setRailTab("journal")}
                className={cn(
                  "relative z-10 flex w-1/2 items-center justify-center gap-2 py-3 text-[10px] font-black uppercase tracking-widest transition-all duration-300",
                  railTab === "journal" ? "text-slate-900" : "text-slate-500 hover:text-slate-700"
                )}
              >
                <Table2 size={16} />
                Journal
              </button>

              {/* Active Pill Background */}
              <div
                className="absolute left-1 top-1 bottom-1 w-[calc(50%-4px)] rounded-xl bg-white shadow-sm transition-transform duration-300 ease-out"
                style={{
                  transform: railTab === "insights" ? "translateX(0)" : "translateX(calc(100% + 8px))",
                }}
              />
            </div>

            <div className="mt-4">
              {railTab === "insights" ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-3 rounded-2xl border border-emerald-100 bg-emerald-50/50 p-4">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                      <MapPinned size={14} />
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-700">
                        Lecture active
                      </p>
                      <p className="text-xs font-medium text-emerald-900/70">
                        La carte domine, les analyses restent secondaires.
                      </p>
                    </div>
                  </div>
                  <ActionsVisualizationPanel
                    days={days}
                    status={statusFilter}
                    impact={impactFilter}
                    qualityMin={qualityMin}
                    visibleCategories={visibleCategories}
                    compact
                  />
                </div>
 ) : (
<ActionsMapTable
   items={filteredMapItems}
   compact
   selectedActionId={selectedActionId}
   onSelectAction={handleSelectAction}
 />
)}
</div>
</div>
</aside>
 </div>

 {/* RUBAN KPI UNIFIÉ */}
 {kpiRibbon}

 {/* SUPERVISION TECHNIQUE */}
 <section className="cmm-card p-6 md:p-8">
 <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
 <div>
 <h2 className="text-xl font-semibold cmm-text-primary">Visualiser la carte</h2>
 <p className="cmm-text-small cmm-text-secondary">
 Espace dédié pour tester la carte et retrouver la sandbox de découverte.
 </p>
 </div>
 <RubriquePdfExportButton rubriqueTitle="Cockpit terrain complet" />
 </div>
 <div className="rounded-2xl border border-sky-500/20 bg-sky-50/50 dark:bg-sky-950/20 p-5">
 <p className="cmm-text-small text-sky-900 dark:text-sky-100">
 La sandbox complète est maintenant disponible dans la rubrique dédiée du
 bloc Visualiser.
 </p>
 <div className="mt-3 flex flex-wrap gap-2">
 <Link
 href="/sections/sandbox"
 className="rounded-xl bg-sky-600 px-5 py-2.5 cmm-text-small font-bold text-white transition hover:bg-sky-700 shadow-sm"
 >
 Ouvrir la sandbox
 </Link>
 <Link
 href="/actions/new"
 className="rounded-xl border cmm-border-color cmm-surface-muted px-5 py-2.5 cmm-text-small font-bold cmm-text-secondary transition hover:cmm-text-primary hover:cmm-surface shadow-sm"
 >
 Déclarer une action
 </Link>
 </div>
 </div>
 </section>

 <footer className="pt-6 border-t border-slate-200">
 <div className="space-y-2 cmm-text-caption cmm-text-muted">
 <p>
 Horodatage: {new Date().toLocaleString("fr-FR")} | Sources: Unified Map Endpoint & Data Connectors.
 </p>
 <p>
 Méthode: Agrégation dynamique basée sur la sélection temporelle.
 </p>
 </div>
 </footer>
 </div>
 );

 return page;
}
