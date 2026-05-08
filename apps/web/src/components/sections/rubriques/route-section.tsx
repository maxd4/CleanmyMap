"use client";

import { CmmSkeleton } from "@/components/ui/cmm-skeleton";
import { useRouteData } from "./route/hooks/use-route-data";
import { RouteSummaryCards } from "./route/components/route-summary-cards";
import { RouteConstraintsForm } from "./route/components/route-constraints-form";
import { RouteAssistant } from "./route/components/route-assistant";
import { RouteList } from "./route/components/route-list";
import { SectionShell } from "@/components/sections/rubriques/shared";
import { Navigation, MapPin, Zap, Info, Clock, Route as RouteIcon, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

export function RouteSection() {
  const {
    constraints,
    setConstraints,
    data,
    isLoading,
    error,
    picks,
    totalKm,
    totalMinutes,
    hasData,
    hasRoute,
    fr,
  } = useRouteData();

  return (
    <SectionShell
      id="route"
      title={fr ? "Optimisation de Parcours" : "Route Optimization"}
      subtitle={fr 
        ? "Intelligence spatiale pour planifier vos collectes et maximiser l'impact terrain." 
        : "Spatial intelligence to plan your collections and maximize field impact."}
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
             
             <RouteSummaryCards constraints={constraints} fr={fr} />
             <RouteConstraintsForm constraints={constraints} setConstraints={setConstraints} fr={fr} />
             <RouteAssistant data={data} hasData={hasData} fr={fr} />
          </div>
        </aside>

        {/* Main Content Area */}
        <div className="space-y-8">
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
                {fr
                  ? "Impossible de calculer les points prioritaires. Vérifiez les paramètres de géolocalisation."
                  : "Unable to compute priority stops. Check location settings."}
              </p>
            </motion.div>
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
                            {fr ? "Parcours optimisé" : "Optimized route"}
                         </div>
                         <div className="flex items-baseline gap-4">
                            <span className="text-5xl font-black text-white tracking-tighter">{totalKm.toFixed(2)}</span>
                            <span className="text-xl font-black text-slate-500 tracking-widest uppercase">km</span>
                            <span className="text-4xl font-black text-white/20 mx-4">/</span>
                            <span className="text-5xl font-black text-white tracking-tighter">{totalMinutes}</span>
                            <span className="text-xl font-black text-slate-500 tracking-widest uppercase">min</span>
                         </div>
                      </div>

                      <div className="text-right space-y-2">
                         <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{fr ? "Score IA Global" : "Overall AI Score"}</p>
                         <p className="text-6xl font-black text-white tracking-tighter leading-none">{data.scoreBreakdown.global}</p>
                      </div>
                   </div>
                </div>

                {/* Tradeoffs & Logic */}
                {hasData && (
                   <div className="p-10 rounded-[3rem] border border-white/5 bg-slate-900/40 backdrop-blur-3xl shadow-2xl space-y-8">
                      <div className="flex items-center gap-4">
                         <div className="p-3 rounded-2xl bg-white/5 border border-white/10 text-slate-400">
                            <Info size={20} />
                         </div>
                         <h3 className="text-xl font-black text-white tracking-tight">
                            {fr ? "Ajustements automatiques" : "Automatic adjustments"}
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
                <RouteList hasRoute={hasRoute} picks={picks} fr={fr} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </SectionShell>
  );
}
