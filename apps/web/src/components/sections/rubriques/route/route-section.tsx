"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import Link from "next/link";
import { CmmSkeleton } from "@/components/ui/cmm-skeleton";
import { useEffectiveAuthState } from "@/lib/auth/use-effective-auth-state";
import { useRouteData } from "./hooks/use-route-data";
import { RouteSummaryCards } from "./components/route-summary-cards";
import { RouteOptionsForm } from "./components/route-constraints-form";
import { RouteAssistant } from "./components/route-assistant";
import { RouteList } from "./components/route-list";
import { RouteExplanation } from "./components/route-explanation";
import { RouteEventSelector } from "./components/route-event-selector";
import {
  getRouteOriginLabel,
  getRouteRecommendationErrorMessage,
} from "./route-origin";
import { SectionShell } from "@/components/sections/rubriques/shared";
import { Navigation, Zap, Info, Route as RouteIcon, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { RouteGeometry } from "@/lib/route/route-contract";
import type { RouteGroupRoute } from "@/lib/route/route-response-contract";

const EMPTY_ROUTE_GEOMETRY: RouteGeometry = {
  isLoop: true,
  origin: null,
  returnLeg: null,
  coordinates: [],
  distanceKm: 0,
  durationMinutes: 0,
  legs: [],
  provider: "none",
  profile: null,
  mode: "fallback",
  estimated: true,
};

const RouteMap = dynamic(
  () => import("./components/route-map").then((module) => module.RouteMap),
  { ssr: false },
);

export function RouteSection() {
  const [selectedStopId, setSelectedStopId] = useState<string | null>(null);
  const [selectedGroupIndex, setSelectedGroupIndex] = useState<number | null>(null);
  const { isLoaded, isSignedIn } = useEffectiveAuthState();
  const {
    options,
    setOptions,
    data,
    isLoading,
    error,
    picks,
    totalKm,
    totalMinutes,
    hasData,
    hasRoute,
    fr,
    recommendationRequested,
    planningMode,
    setPlanningMode,
    originMode,
    setOriginMode,
    mapOrigin,
    setMapOrigin,
    clearMapOrigin,
    originSelectionError,
    isResolvingOrigin,
    isRequestInFlight,
    requestRecommendation,
  } = useRouteData();
  const groupRoutes: RouteGroupRoute[] = data?.groupRoutes ?? [];
  const selectedGroup = selectedGroupIndex === null
    ? null
    : groupRoutes.find(({ groupIndex }) => groupIndex === selectedGroupIndex) ?? null;
  const visibleStops = selectedGroup?.stops ?? picks;
  const visibleGeometry = selectedGroup?.routeGeometry ?? data?.routeGeometry ?? EMPTY_ROUTE_GEOMETRY;

  const dataStatusMessage = data
    ? data.status === "empty"
      ? fr
        ? "Aucune donnée géolocalisée exploitable n'est disponible pour cette recommandation."
        : "No usable geolocated data is available for this recommendation."
      : data.status === "degraded"
        ? fr
          ? data.dataStatus === "unavailable"
            ? "Recommandation dégradée : la source de signalements est indisponible."
            : data.routeGeometry.mode === "fallback"
              ? "Recommandation dégradée : l'itinéraire affiché est estimé."
              : "Recommandation dégradée : les données disponibles ne sont pas exhaustives."
          : data.dataStatus === "unavailable"
            ? "Degraded recommendation: the report source is unavailable."
            : data.routeGeometry.mode === "fallback"
              ? "Degraded recommendation: the displayed route is estimated."
              : "Degraded recommendation: the available data is not exhaustive."
      : null
    : null;

  return (
    <SectionShell
      id="route"
      title={fr ? "Où agir" : "Where to act"}
      subtitle={fr 
        ? "Décidez rapidement où agir selon la priorité opérationnelle, le déplacement et le nombre d’arrêts."
        : "Choose where to act using operational priority, travel, and the number of stops."}
      icon={Navigation}
      gradient="from-blue-500/20 via-indigo-500/10 to-transparent"
    >
      <div className="grid gap-10 xl:grid-cols-[1fr_1.5fr] pt-12 pb-20">
        {/* Sidebar Controls */}
        <aside className="space-y-8">
          <div className="p-8 rounded-[3rem] border border-white/5 bg-slate-900/40 backdrop-blur-3xl shadow-2xl space-y-8">
             <div className="flex items-center gap-4">
                <div className="p-3 rounded-2xl bg-white/5 border border-white/10 text-slate-400">
                   <Zap size={20} />
                </div>
                <h3 className="text-xl font-black text-white tracking-tight">{fr ? "Configuration" : "Settings"}</h3>
             </div>
             
             <RouteSummaryCards options={options} fr={fr} />
             <RouteEventSelector
               planningMode={planningMode}
               setPlanningMode={setPlanningMode}
               fr={fr}
             />
             <fieldset className="rounded-[1.75rem] border border-emerald-300/18 bg-[rgba(11,39,30,0.88)] p-5">
               <legend className="px-1 text-[11px] font-black uppercase tracking-[0.28em] text-emerald-100/68">
                 {fr ? "Point de départ" : "Starting point"}
               </legend>
               <div className="mt-3 grid gap-3">
                 <label className="flex items-center gap-3 text-sm font-semibold text-white">
                   <input
                     type="radio"
                     name="route-origin-mode"
                     value="browser"
                     checked={originMode === "browser"}
                     onChange={() => setOriginMode("browser")}
                     className="accent-emerald-300"
                   />
                   {fr ? "Ma position actuelle" : "My current position"}
                 </label>
                 <label className="flex items-center gap-3 text-sm font-semibold text-white">
                   <input
                     type="radio"
                     name="route-origin-mode"
                     value="map"
                     checked={originMode === "map"}
                     onChange={() => setOriginMode("map")}
                     className="accent-emerald-300"
                   />
                   {fr ? "Choisir sur la carte" : "Choose on the map"}
                 </label>
               </div>
               {originMode === "map" ? (
                 <div
                   role="status"
                   className={`mt-4 rounded-2xl border px-4 py-3 text-xs font-semibold ${
                     originSelectionError || !mapOrigin
                       ? "border-amber-300/25 bg-amber-500/10 text-amber-50"
                       : "border-emerald-300/20 bg-emerald-500/10 text-emerald-50"
                   }`}
                 >
                   {mapOrigin
                     ? fr
                       ? "Point choisi sur la carte. Vous pouvez le déplacer en cliquant à nouveau."
                       : "Point chosen on the map. Click again to move it."
                     : fr
                       ? "Cliquez sur la carte pour choisir un point de départ avant de calculer."
                       : "Click the map to choose a starting point before calculating."}
                   {mapOrigin ? (
                     <button
                       type="button"
                       onClick={clearMapOrigin}
                       className="ml-3 underline underline-offset-2"
                     >
                       {fr ? "Réinitialiser" : "Reset"}
                     </button>
                   ) : null}
                 </div>
               ) : null}
             </fieldset>
             <RouteOptionsForm options={options} setOptions={setOptions} fr={fr} />
             <div className="rounded-[1.75rem] border border-emerald-300/18 bg-[rgba(13,46,34,0.88)] p-5 shadow-[0_24px_56px_-32px_rgba(52,211,153,0.28)]">
               {isLoaded && isSignedIn ? (
                 <button
                   type="button"
                   onClick={() => {
                     void requestRecommendation();
                   }}
                   disabled={
                     isLoading ||
                     isRequestInFlight ||
                     (originMode === "map" && !mapOrigin)
                   }
                   aria-busy={isResolvingOrigin || isLoading || isRequestInFlight}
                   className="min-h-11 w-full rounded-2xl bg-emerald-500 px-4 py-3 text-sm font-black uppercase tracking-widest text-slate-950 transition hover:bg-emerald-400 disabled:cursor-wait disabled:opacity-60"
                 >
                   {originMode === "map" && !mapOrigin
                     ? fr
                       ? "Choisir un point sur la carte"
                       : "Choose a point on the map"
                     : isResolvingOrigin
                     ? fr
                       ? "Localisation en cours…"
                       : "Locating…"
                     : isLoading || isRequestInFlight
                       ? fr
                         ? "Calcul en cours…"
                         : "Calculating…"
                       : fr
                         ? recommendationRequested
                           ? "Recalculer la recommandation"
                           : "Calculer la recommandation"
                         : recommendationRequested
                           ? "Recalculate recommendation"
                           : "Calculate recommendation"}
                 </button>
               ) : (
                 <Link
                   href="/sign-in?redirect_url=%2Fsections%2Froute"
                   className="inline-flex min-h-11 w-full items-center justify-center rounded-2xl bg-emerald-500 px-4 py-3 text-center text-sm font-black uppercase tracking-widest text-slate-950 transition hover:bg-emerald-400"
                 >
                   {fr ? "Se connecter pour calculer" : "Sign in to calculate"}
                 </Link>
               )}
             </div>
             <RouteAssistant data={data} hasData={hasData} fr={fr} />
          </div>
        </aside>

        {/* Main Content Area */}
        <div className="space-y-8">
          {originMode === "map" && !hasRoute && (
            <RouteMap
              stops={[]}
              routeGeometry={EMPTY_ROUTE_GEOMETRY}
              origin={mapOrigin}
              onSelectOrigin={setMapOrigin}
              onClearOrigin={clearMapOrigin}
              fr={fr}
            />
          )}

          {isLoading && (
            <div className="p-10 rounded-[3rem] border border-white/5 bg-slate-900/40 backdrop-blur-3xl shadow-2xl space-y-6">
              <CmmSkeleton className="h-12 w-1/3 rounded-xl bg-white/5" />
              <div className="grid grid-cols-2 gap-6">
                <CmmSkeleton className="h-24 rounded-2xl bg-white/5" />
                <CmmSkeleton className="h-24 rounded-2xl bg-white/5" />
              </div>
              <CmmSkeleton className="h-[400px] rounded-[2rem] bg-white/5" />
            </div>
          )}

          {error && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="p-10 rounded-[3rem] border border-rose-500/20 bg-rose-500/5 backdrop-blur-3xl shadow-2xl flex items-center gap-8"
            >
              <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-500">
                 <Info size={32} />
              </div>
              <p className="text-lg font-black text-white tracking-tight leading-snug">
                {getRouteRecommendationErrorMessage(error, fr)}
              </p>
            </motion.div>
          )}

          {dataStatusMessage && data && (
            <div
              role="status"
              data-route-status={data.status}
              data-route-data-status={data.dataStatus}
              className="rounded-2xl border border-amber-300/20 bg-amber-500/10 px-5 py-4 text-sm font-semibold text-amber-50"
            >
              <p>{dataStatusMessage}</p>
              {data.isTruncated && (
                <p className="mt-1 text-xs font-medium text-amber-100/75">
                  {fr
                    ? "Le volume chargé a atteint la limite de recommandation."
                    : "The loaded volume reached the recommendation limit."}
                </p>
              )}
              {data.sourceHealth.warnings.map((warning) => (
                <p key={warning} className="mt-1 text-xs font-medium text-amber-100/75">
                  {warning}
                </p>
              ))}
            </div>
          )}

          {data && (
            <p
              role="status"
              data-route-origin-source={data.origin.source}
              className="rounded-2xl border border-blue-300/15 bg-blue-500/5 px-5 py-3 text-sm font-semibold text-blue-50"
            >
              {fr ? "Point de départ utilisé : " : "Starting point used: "}
              {getRouteOriginLabel(data.origin.source, fr)}
            </p>
          )}

          <AnimatePresence mode="wait">
            {hasRoute && data && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-8"
              >
                {/* Route Overview Header */}
                <div className="p-10 rounded-[3rem] border border-white/5 bg-slate-900/40 backdrop-blur-3xl shadow-2xl group overflow-hidden relative">
                   <div className="absolute top-0 right-0 p-10 opacity-5 pointer-events-none group-hover:scale-110 transition-transform duration-1000">
                      <RouteIcon size={120} className="text-blue-400" />
                   </div>
                   
                   <div className="flex flex-wrap items-center justify-between gap-10 relative z-10">
                      <div className="space-y-6">
                         <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-[10px] font-black uppercase tracking-[0.3em] text-blue-400">
                            <Sparkles size={12} />
                            {fr ? "Où agir" : "Where to act"}
                         </div>
                         <div className="flex items-baseline gap-4">
                            <span className="text-5xl font-black text-white tracking-tighter">{totalKm.toFixed(2)}</span>
                            <span className="text-xl font-black text-slate-500 tracking-widest uppercase">km</span>
                            <span className="text-4xl font-black text-white/20 mx-4">/</span>
                            <span className="text-5xl font-black text-white tracking-tighter">{totalMinutes}</span>
                            <span className="text-xl font-black text-slate-500 tracking-widest uppercase">min</span>
                         </div>
                         {data.isLoop ? (
                         <p className="text-sm font-semibold text-emerald-100/80">
                             {groupRoutes.length > 1
                               ? `${data.volunteers} bénévoles · ${data.groupCount} groupes · ${data.multiRoute.totalDistanceKm.toFixed(2)} km cumulés`
                               : `Boucle de ${totalKm.toFixed(2)} km · départ et arrivée au même endroit`}
                         </p>
                         ) : null}
                      </div>

                      <div className="text-right space-y-2">
                         <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{fr ? "Priorité moyenne" : "Average priority"}</p>
                         <p className="text-6xl font-black text-white tracking-tighter leading-none">{data.scoreBreakdown.priority}</p>
                      </div>
                   </div>
                </div>

                {groupRoutes.length > 1 ? (
                  <section
                    aria-label={fr ? "Sélection des groupes" : "Group selection"}
                    className="rounded-[2rem] border border-emerald-300/18 bg-[rgba(11,39,30,0.88)] p-5"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-[11px] font-black uppercase tracking-[0.28em] text-emerald-100/68">
                          {fr ? "Boucles coordonnées" : "Coordinated loops"}
                        </p>
                        <p className="mt-2 text-sm font-semibold text-white/80">
                          {fr
                            ? "Chaque groupe reçoit une boucle différente afin de couvrir davantage de rues."
                            : "Each group receives a different loop to cover more streets."}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2" role="tablist">
                        <button
                          type="button"
                          role="tab"
                          aria-selected={selectedGroupIndex === null}
                          onClick={() => setSelectedGroupIndex(null)}
                          className="rounded-full border border-white/15 px-3 py-2 text-xs font-bold text-white transition hover:border-emerald-300/50"
                        >
                          {fr ? "Tous les groupes" : "All groups"}
                        </button>
                        {groupRoutes.map((group) => (
                          <button
                            key={group.groupIndex}
                            type="button"
                            role="tab"
                            aria-selected={selectedGroupIndex === group.groupIndex}
                            onClick={() => setSelectedGroupIndex(group.groupIndex)}
                            className="rounded-full border border-emerald-300/25 bg-emerald-400/10 px-3 py-2 text-xs font-bold text-emerald-50 transition hover:border-emerald-300/60"
                          >
                            {fr ? `Groupe ${group.groupIndex}` : `Group ${group.groupIndex}`}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="mt-4 grid gap-3 md:grid-cols-3">
                      {groupRoutes.map((group) => (
                        <button
                          key={`summary-${group.groupIndex}`}
                          type="button"
                          onClick={() => setSelectedGroupIndex(group.groupIndex)}
                          className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-left transition hover:border-emerald-300/40"
                        >
                          <p className="font-black text-white">{fr ? `Groupe ${group.groupIndex}` : `Group ${group.groupIndex}`}</p>
                          <p className="mt-2 text-xs text-slate-300">
                            {group.volunteerCount} {fr ? "bénévoles" : "volunteers"} · {group.travelDistanceKm.toFixed(2)} km · {group.travelMinutes} min · {group.targetCount} {fr ? "stops" : "stops"}
                          </p>
                        </button>
                      ))}
                    </div>
                    <p className="mt-4 text-xs text-emerald-100/70">
                      {fr
                        ? `Couverture : ${data.multiRoute.coverageGain.toFixed(2)} · recouvrement des cibles : ${(data.multiRoute.sharedTargetRatio * 100).toFixed(0)} % · distance partagée réseau : ${data.multiRoute.sharedDistanceRatio === null ? "non mesurée" : `${(data.multiRoute.sharedDistanceRatio * 100).toFixed(1)} %`}.`
                        : `Coverage: ${data.multiRoute.coverageGain.toFixed(2)} · shared targets: ${(data.multiRoute.sharedTargetRatio * 100).toFixed(0)}% · network shared distance: ${data.multiRoute.sharedDistanceRatio === null ? "not measured" : `${(data.multiRoute.sharedDistanceRatio * 100).toFixed(1)}%`}.`}
                    </p>
                  </section>
                ) : null}

                {/* Tradeoffs & Logic */}
                {hasData && (
                   <div className="p-10 rounded-[3rem] border border-white/5 bg-slate-900/40 backdrop-blur-3xl shadow-2xl space-y-8">
                      <div className="flex items-center gap-4">
                         <div className="p-3 rounded-2xl bg-white/5 border border-white/10 text-slate-400">
                            <Info size={20} />
                         </div>
                         <h3 className="text-xl font-black text-white tracking-tight">
                            {fr ? "Méthode de sélection" : "Selection method"}
                         </h3>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {data.tradeoffs.length > 0 ? (
                           data.tradeoffs.map((line, i) => (
                             <div key={i} className="p-5 rounded-2xl bg-white/5 border border-white/5 text-xs font-bold text-slate-300 leading-relaxed flex items-center gap-4 group hover:bg-white/10 transition-all">
                                <div className="w-1.5 h-1.5 rounded-full bg-blue-500/40 group-hover:bg-blue-400" />
                                {line}
                             </div>
                           ))
                        ) : (
                           <div className="col-span-2 p-10 rounded-2xl border border-dashed border-white/10 text-center text-slate-500 font-bold text-sm">
                              {fr ? "Aucun ajustement majeur nécessaire." : "No major adjustment needed."}
                           </div>
                        )}
                      </div>
                   </div>
                )}

                {/* Stops List */}
                <RouteMap
                  stops={visibleStops}
                  routeGeometry={visibleGeometry}
                  groupRoutes={groupRoutes}
                  selectedGroupIndex={selectedGroupIndex}
                  origin={data.origin}
                  onSelectOrigin={originMode === "map" ? setMapOrigin : undefined}
                  onClearOrigin={originMode === "map" ? clearMapOrigin : undefined}
                  selectedStopId={selectedStopId}
                  onSelectStop={setSelectedStopId}
                  fr={fr}
                />
                <RouteList
                  hasRoute={hasRoute}
                  picks={visibleStops}
                  fr={fr}
                  selectedStopId={selectedStopId}
                  onSelectStop={setSelectedStopId}
                />
              </motion.div>
            )}
          </AnimatePresence>
          {data ? <RouteExplanation data={data} fr={fr} /> : null}
        </div>
      </div>
    </SectionShell>
  );
}
