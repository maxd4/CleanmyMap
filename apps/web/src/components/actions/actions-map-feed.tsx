"use client";

import { useEffect, useMemo, useState, type ComponentType } from "react";
import { motion } from "framer-motion";
import useSWR from "swr";
import { fetchMapActions } from"@/lib/actions/http";
import type {
 ActionImpactLevel,
 ActionMapItem,
 ActionRecordType,
 ActionStatus,
} from"@/lib/actions/types";
import { swrRecentViewOptions } from"@/lib/swr-config";
import {
 DEFAULT_VISIBLE_CATEGORIES,
 INFRASTRUCTURE_ALERT_THRESHOLD,
 isVisibleWithCategoryFilter,
 type MarkerCategory,
} from"@/components/actions/map-marker-categories";
import {
 mapItemCigaretteButts,
 mapItemWasteKg,
} from"../../lib/actions/data-contract";
import { COLOR_TOKENS } from"./map-marker-categories";
import { ImpactHeatmap } from "@/components/map/ImpactHeatmap";
import { ActionStoriesCarousel } from "@/components/map/ActionStoriesCarousel";

type ActionsMapCanvasComponent = ComponentType<{
 items: ActionMapItem[];
}>;

type ActionsMapFeedProps = {
 types?: ActionRecordType[] |"all";
 days: number;
 statusFilter: ActionStatus |"all";
 impactFilter: ActionImpactLevel |"all";
 qualityMin: number;
 presentation?:"default" |"immersive";
};

export function ActionsMapFeed({
 types ="all",
 days,
 statusFilter,
 impactFilter,
 qualityMin,
 presentation ="default",
}: ActionsMapFeedProps) {
 const visibleCategories: Record<MarkerCategory, boolean> =
 DEFAULT_VISIBLE_CATEGORIES;
 const serializedTypes = useMemo(
 () => (types ==="all" ?"all" : [...new Set(types)].sort().join(",")),
 [types],
 );
 const swrKey = useMemo(
 () => [
"actions-map",
 String(days),
 statusFilter,
 serializedTypes,
 impactFilter,
 String(qualityMin),
 ],
 [days, statusFilter, serializedTypes, impactFilter, qualityMin],
 );

 const {
 data,
 error,
 isLoading,
 isValidating,
 mutate: reload,
 } = useSWR(
 swrKey,
 () =>
 fetchMapActions({
 status: statusFilter,
 days,
 impact: impactFilter ==="all" ? undefined : impactFilter,
 qualityMin: qualityMin > 0 ? qualityMin : undefined,
 limit: 120,
 types,
 }),
 swrRecentViewOptions,
 );

 const allItems = useMemo(() => data?.items ?? [], [data?.items]);
 const items = useMemo(
 () =>
 allItems.filter((item) =>
 isVisibleWithCategoryFilter(item, visibleCategories),
 ),
 [allItems, visibleCategories],
 );
 const summary = useMemo(() => {
 const totalKg = items.reduce((acc, item) => acc + (mapItemWasteKg(item) ?? 0), 0);
 const totalButts = items.reduce(
 (acc, item) => acc + (mapItemCigaretteButts(item) ?? 0),
 0,
 );
 return { totalKg, totalButts };
 }, [items]);
 const failedSources = data?.sourceHealth?.failedSources ?? [];
 const partialSourcesLabel =
 failedSources.length > 0 ? failedSources.join(",") :"inconnues";
 const isImmersive = presentation ==="immersive";
 const [MapCanvas, setMapCanvas] = useState<ActionsMapCanvasComponent | null>(null);
 const [mapCanvasError, setMapCanvasError] = useState<string | null>(null);

 useEffect(() => {
 let cancelled = false;

 void import("@/components/actions/actions-map-canvas")
 .then((mod) => {
 if (!cancelled) {
 setMapCanvas(() => mod.ActionsMapCanvas);
 setMapCanvasError(null);
 }
 })
 .catch((error: unknown) => {
 if (!cancelled) {
 const message =
                  error instanceof Error ? error.message : "Le module de cartographie n'a pas pu être chargé. Veuillez rafraîchir la page.";
 console.error("Map canvas import failed", error);
 setMapCanvasError(message);
 }
 });

 return () => {
 cancelled = true;
 };
 }, []);

 return (
 <section
 className={
 isImmersive
 ?"relative overflow-hidden rounded-[2.25rem] border border-slate-200/70 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 p-4 shadow-[0_28px_80px_-36px_rgba(15,23,42,0.7)] sm:p-6"
 :"rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
 }
 >
  {isImmersive ? (
    <>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.18),transparent_28%),radial-gradient(circle_at_top_right,rgba(59,130,246,0.18),transparent_26%),linear-gradient(180deg,rgba(255,255,255,0.04),rgba(15,23,42,0))]" />
      <div className="relative z-10 flex flex-col gap-6">
        <div className="flex flex-wrap items-start justify-between gap-3 rounded-[2.5rem] border border-white/10 bg-white/8 px-6 py-5 text-white backdrop-blur-xl shadow-2xl">
          <div className="max-w-2xl">
            {data?.partialSource ? (
              <span className="inline-flex items-center rounded-full border border-amber-300/40 bg-amber-400/10 px-2.5 py-1 cmm-text-caption font-semibold uppercase tracking-wide text-amber-100">
                Sources partielles: {partialSourcesLabel}
              </span>
            ) : null}
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <h2 className="text-2xl font-black tracking-tighter text-white sm:text-4xl">
                Cockpit Terrain
              </h2>
              <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-emerald-400">
                Live Impact
              </span>
            </div>
            <p className="mt-2 max-w-3xl text-sm font-medium leading-relaxed text-slate-300">
              Visualisation en temps réel des flux de pollution et des interventions citoyennes.
            </p>
          </div>
          <button
            onClick={() => void reload()}
            className="rounded-2xl border border-white/15 bg-white/10 px-6 py-3 text-xs font-black uppercase tracking-widest text-white transition hover:bg-white/18 active:scale-95"
          >
            {isValidating ? "Actualisation..." : "Rafraîchir les données"}
          </button>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
          {/* Main Visual: Heatmap */}
          <div className="relative min-h-[600px] overflow-hidden rounded-[3rem] border border-white/10 bg-slate-900/60 shadow-2xl">
            {MapCanvas ? (
              <ImpactHeatmap items={items} height="h-full" />
            ) : mapCanvasError ? (
              <div className="flex h-full items-center justify-center bg-slate-950 px-6 text-center text-white">
                <div className="max-w-md space-y-3 rounded-[2rem] border border-rose-400/20 bg-rose-500/10 px-8 py-10">
                  <p className="text-xs font-black uppercase tracking-widest text-rose-400">Erreur de rendu</p>
                  <p className="text-sm font-medium leading-relaxed text-rose-100/80">{mapCanvasError}</p>
                </div>
              </div>
            ) : (
              <div className="flex h-full items-center justify-center bg-slate-950 px-6 text-center text-white">
                <div className="max-w-md space-y-4">
                  <div className="mx-auto h-16 w-16 animate-spin rounded-full border-4 border-emerald-500/20 border-t-emerald-500" />
                  <p className="text-xs font-black uppercase tracking-widest text-slate-400">Initialisation Cockpit</p>
                </div>
              </div>
            )}
          </div>

          {/* Side Feed: Stories */}
          <div className="flex flex-col gap-6">
            <div className="flex-1 rounded-[3rem] border border-white/10 bg-slate-950/70 p-8 text-white shadow-2xl backdrop-blur-3xl flex flex-col">
              <ActionStoriesCarousel items={items} />
              
              <div className="mt-auto pt-8 border-t border-white/5 space-y-8">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-4">
                    Spectre d&apos;Urgence
                  </p>
                  <div className="space-y-3">
                    <div className="flex justify-between text-[9px] font-black uppercase tracking-widest text-slate-400 px-1">
                      <span>Traitement</span>
                      <span className="text-rose-500">Alerte Critique</span>
                    </div>
                    <div
                      className="h-3 w-full overflow-hidden rounded-full shadow-inner ring-1 ring-white/10"
                      style={{
                        background: `linear-gradient(to right, 
                        hsla(${COLOR_TOKENS.GREEN.h}, ${COLOR_TOKENS.GREEN.s}%, ${COLOR_TOKENS.GREEN.l}%, 0.45) 0%, 
                        hsla(${COLOR_TOKENS.ORANGE.h}, ${COLOR_TOKENS.ORANGE.s}%, ${COLOR_TOKENS.ORANGE.l}%, 0.7) 37%, 
                        hsla(${COLOR_TOKENS.RED.h}, ${COLOR_TOKENS.RED.s}%, ${COLOR_TOKENS.RED.l}%, 0.82) 75%, 
                        hsla(${COLOR_TOKENS.VIOLET.h}, ${COLOR_TOKENS.VIOLET.s}%, ${COLOR_TOKENS.VIOLET.l}%, 1.0) 100%
                        )`,
                      }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="rounded-3xl border border-white/5 bg-white/5 p-4 text-center">
                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1">Impact</p>
                    <p className="text-2xl font-black text-white">{items.length}</p>
                  </div>
                  <div className="rounded-3xl border border-white/5 bg-white/5 p-4 text-center">
                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1">Volume</p>
                    <p className="text-2xl font-black text-white">{summary.totalKg.toFixed(0)}<span className="text-sm">kg</span></p>
                  </div>
                  <div className="rounded-3xl border border-white/5 bg-white/5 p-4 text-center">
                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1">Mégots</p>
                    <p className="text-2xl font-black text-white">{Math.round(summary.totalButts / 1000)}<span className="text-sm">k</span></p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  ) : (
 <>
 <div className="flex flex-wrap items-start justify-between gap-3">
 <div>
 {data?.partialSource ? (
 <span className="inline-flex items-center rounded-full border border-amber-300 bg-amber-100 px-2.5 py-1 cmm-text-caption font-semibold uppercase tracking-wide text-amber-900">
 Sources partielles: {partialSourcesLabel}
 </span>
 ) : null}
 <h2 className="text-xl font-semibold cmm-text-primary">
 Lecture cartographique
 </h2>
 <p className="mt-1 cmm-text-small cmm-text-secondary">
 Flux géolocalisé depuis <code>/api/actions/map</code> pour piloter
 les interventions terrain. Par défaut, seules les données validées
 admin sont affichées.
 </p>
 </div>
 <button
 onClick={() => void reload()}
 className="rounded-lg border border-slate-300 bg-white px-3 py-2 cmm-text-small font-semibold cmm-text-secondary transition hover:bg-slate-100"
 >
 {isValidating ?"Actualisation..." :"Rafraîchir"}
 </button>
 </div>
 </>
 )}

 {!isImmersive ? (
 <>
 <div className="mt-5 overflow-hidden rounded-[1.75rem] border border-slate-200 bg-slate-950 shadow-inner">
 {MapCanvas ? (
 <MapCanvas items={items} />
 ) : mapCanvasError ? (
 <div className="flex h-[28rem] items-center justify-center rounded-[1.75rem] border border-rose-200 bg-rose-50 px-6 text-center text-rose-900">
 <div className="max-w-sm space-y-2 rounded-[1.5rem] border border-rose-200 bg-white px-5 py-6 shadow-sm">
 <p className="cmm-text-small font-semibold uppercase tracking-[0.16em] text-rose-700">
 Carte indisponible
 </p>
 <p className="cmm-text-small leading-6 text-rose-800">
 {mapCanvasError}
 </p>
 </div>
 </div>
 ) : (
 <div className="flex h-[28rem] items-center justify-center rounded-[1.75rem] border border-slate-200 bg-slate-950 px-6 text-center text-white">
 <div className="max-w-sm space-y-2">
 <div className="mx-auto h-10 w-10 animate-pulse rounded-2xl border border-white/15 bg-white/10" />
 <p className="cmm-text-small font-semibold uppercase tracking-[0.16em] text-slate-300">
 Initialisation de la carte
 </p>
 <p className="cmm-text-small leading-6 text-slate-200">
 Chargement des couches interactives.
 </p>
 </div>
 </div>
 )}
 </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            {/* Légende Dynamique d'Impact */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="rounded-3xl border border-slate-200/60 bg-white/40 p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] backdrop-blur-xl relative overflow-hidden group hover:border-emerald-200 transition-colors"
            >
              <div className="absolute -right-16 -top-16 w-32 h-32 bg-emerald-400/10 rounded-full blur-3xl group-hover:bg-emerald-400/20 transition-colors" />
              <div className="relative z-10">
                <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-6">
                  Légende d'Impact
                </p>
                
                <div className="space-y-6">
                  <div className="space-y-2">
                    <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider text-slate-400 px-1">
                      <span>Faible</span>
                      <span>Moyen</span>
                      <span>Fort</span>
                      <span className="text-rose-500">Critique</span>
                    </div>
                    <div 
                      className="h-4 w-full rounded-full shadow-inner relative overflow-hidden"
                      style={{
                        background: `linear-gradient(to right, 
                          hsla(${COLOR_TOKENS.GREEN.h}, ${COLOR_TOKENS.GREEN.s}%, ${COLOR_TOKENS.GREEN.l}%, 0.4) 0%, 
                          hsla(${COLOR_TOKENS.ORANGE.h}, ${COLOR_TOKENS.ORANGE.s}%, ${COLOR_TOKENS.ORANGE.l}%, 0.6) 37%, 
                          hsla(${COLOR_TOKENS.RED.h}, ${COLOR_TOKENS.RED.s}%, ${COLOR_TOKENS.RED.l}%, 0.8) 75%, 
                          hsla(${COLOR_TOKENS.VIOLET.h}, ${COLOR_TOKENS.VIOLET.s}%, ${COLOR_TOKENS.VIOLET.l}%, 1.0) 100%
                        )`
                      }}
                    >
                      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10 pointer-events-none"></div>
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="flex items-center gap-3 bg-white/60 p-3 rounded-2xl border border-slate-100 shadow-sm">
                      <div className="h-5 w-5 rounded-full bg-sky-500 shadow-sm ring-4 ring-sky-100 flex-shrink-0 animate-pulse"></div>
                      <div>
                        <p className="text-xs font-bold text-slate-700 uppercase tracking-wide">Lieu Propre</p>
                        <p className="text-[10px] font-semibold text-slate-400">Sans pollution signalée</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 bg-white/60 p-3 rounded-2xl border border-slate-100 shadow-sm">
                      <div className="flex -space-x-2 relative">
                        <div className="h-4 w-4 rounded-full bg-violet-500 opacity-100 absolute -top-1 left-1"></div>
                        <div className="h-5 w-5 rounded-full bg-violet-500 opacity-60"></div>
                        <div className="h-6 w-6 rounded-full bg-violet-500 opacity-30 absolute -bottom-1 -right-1"></div>
                      </div>
                      <div className="ml-2">
                        <p className="text-xs font-bold text-slate-700 uppercase tracking-wide">Opacité Dynamique</p>
                        <p className="text-[10px] font-semibold text-slate-400">Varie selon le score d'urgence</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Géométrie & Infrastructure */}
            <div className="space-y-6">
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="rounded-3xl border border-slate-200/60 bg-white/40 p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] backdrop-blur-xl relative overflow-hidden group hover:border-blue-200 transition-colors"
              >
                <div className="absolute -right-16 -top-16 w-32 h-32 bg-blue-400/10 rounded-full blur-3xl group-hover:bg-blue-400/20 transition-colors" />
                <div className="relative z-10">
                  <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4">
                    Nature de la Géométrie
                  </p>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="flex flex-col items-center text-center gap-2 rounded-2xl border border-emerald-100 bg-emerald-50/50 p-3">
                      <span className="inline-flex h-8 w-8 items-center justify-center rounded-full border-2 border-emerald-500 bg-white text-emerald-500 font-black">—</span>
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-900">Réel</p>
                        <p className="text-[9px] text-emerald-700/80 mt-1 leading-tight">Trait plein, forme exacte</p>
                      </div>
                    </div>
                    <div className="flex flex-col items-center text-center gap-2 rounded-2xl border border-amber-100 bg-amber-50/50 p-3">
                      <span className="inline-flex h-8 w-8 items-center justify-center rounded-full border-2 border-amber-500 border-dashed bg-white text-amber-500 font-black">- -</span>
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-amber-900">Estimé</p>
                        <p className="text-[9px] text-amber-700/80 mt-1 leading-tight">Pointillé, tracé routé</p>
                      </div>
                    </div>
                    <div className="flex flex-col items-center text-center gap-2 rounded-2xl border border-slate-200 bg-slate-50/50 p-3">
                      <span className="inline-flex h-8 w-8 items-center justify-center rounded-full border-2 border-slate-300 bg-white text-slate-400 font-black">•</span>
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-700">Fallback</p>
                        <p className="text-[9px] text-slate-500 mt-1 leading-tight">Point discret simple</p>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>

              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="rounded-3xl border border-emerald-200/60 bg-emerald-50/40 p-6 shadow-[0_8px_30px_rgb(16,185,129,0.04)] backdrop-blur-xl relative overflow-hidden"
              >
                <div className="relative z-10 flex items-start gap-4">
                  <div className="flex-1">
                    <p className="text-xs font-bold uppercase tracking-widest text-emerald-600 mb-2">
                      Infrastructures Suggérées
                    </p>
                    <p className="text-[10px] font-semibold text-emerald-800/70 mb-4">
                      Apparaissent au-delà de {INFRASTRUCTURE_ALERT_THRESHOLD}% d'urgence normalisée.
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <div className="flex items-center gap-2 bg-white/80 px-2.5 py-1.5 rounded-xl shadow-sm border border-emerald-100">
                        <span className="text-base">🗑️</span>
                        <span className="text-[10px] font-bold uppercase text-slate-600">Poubelle</span>
                      </div>
                      <div className="flex items-center gap-2 bg-white/80 px-2.5 py-1.5 rounded-xl shadow-sm border border-emerald-100">
                        <span className="text-base">🚬</span>
                        <span className="text-[10px] font-bold uppercase text-slate-600">Cendrier</span>
                      </div>
                      <div className="flex items-center gap-2 bg-white/80 px-2.5 py-1.5 rounded-xl shadow-sm border border-emerald-100">
                        <span className="text-base">💰</span>
                        <span className="text-[10px] font-bold uppercase text-slate-600">Combiné</span>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
 </>
 ) : null}

 {isLoading ? (
 <div className="mt-5 space-y-2">
 <div className="h-11 animate-pulse rounded-lg bg-slate-100" />
 <div className="h-11 animate-pulse rounded-lg bg-slate-100" />
 <div className="h-11 animate-pulse rounded-lg bg-slate-100" />
 </div>
 ) : null}

 {error ? (
 <p className="mt-5 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 cmm-text-small text-rose-700">
        {error instanceof Error ? error.message : "Impossible de récupérer les données de la carte. Veuillez vérifier votre connexion."}
 </p>
 ) : null}

 </section>
 );
}
