"use client";

import { useMemo, useState } from "react";
import useSWR from "swr";
import { fetchActions } from "@/lib/actions/http";
import { computeClimateContext } from "@/lib/analytics/climate-context";
import { useSitePreferences } from "@/components/ui/site-preferences-provider";
import { CmmSkeleton } from "@/components/ui/cmm-skeleton";
import { SectionShell } from "@/components/sections/rubriques/shared";
import { 
  ClimateIndicatorGrid, 
  ClimateDecisionList, 
  ClimateMethodology, 
  ClimateAlertBanner 
} from "./climate-components";
import { motion, AnimatePresence } from "framer-motion";
import { Calendar, RefreshCw, Leaf, Globe, Wind, ArrowRight, Info, Sparkles } from "lucide-react";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0 },
};

export function ClimateSection() {
  const { locale } = useSitePreferences();
  const fr = locale === "fr";
  const [periodDays, setPeriodDays] = useState<30 | 90 | 365>(30);
  
  const { data, isLoading, error, mutate } = useSWR(["section-climate-v2"], () =>
    fetchActions({ status: "approved", limit: 500 }),
  );

  const context = useMemo(() => {
    const records = (data?.items ?? []).map((item: any) => ({
      observedAt: item.action_date,
      kg: Number(item.waste_kg || 0),
      isTraceable: (item.contract?.geometry.kind ?? item.geometry_kind ?? "point") !== "point",
    }));
    return computeClimateContext(records, periodDays);
  }, [data?.items, periodDays]);

  const priorityIndicator = useMemo(() => {
    return context.indicators.find(ind => ind.status === "alert") || context.indicators[0];
  }, [context.indicators]);

  return (
    <SectionShell
      id="climate"
      title={fr ? "Impact Climat & Biodiversité" : "Climate & Biodiversity Impact"}
      subtitle={fr ? "Analyse de la contribution environnementale et évitement carbone" : "Analysis of environmental contribution and carbon avoidance"}
      icon={Globe}
      gradient="from-blue-500/20 via-emerald-500/10 to-transparent"
    >
      <div className="space-y-16 pt-8">
        {/* Sub-header with period picker */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 pb-10 border-b border-white/5">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-2xl bg-white/5 border border-white/10">
              <Calendar size={20} className="text-slate-400" />
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{fr ? "Période d'analyse" : "Analysis Period"}</p>
              <h3 className="text-lg font-black text-white">{fr ? "Impact Temporel" : "Temporal Impact"}</h3>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-slate-950/50 p-2 rounded-2xl border border-white/10 backdrop-blur-xl">
            {[30, 90, 365].map((days) => (
              <button
                key={days}
                onClick={() => setPeriodDays(days as any)}
                className={`relative px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-300 ${
                  periodDays === days
                    ? "text-white"
                    : "text-slate-500 hover:text-white hover:bg-white/5"
                }`}
              >
                <span className="relative z-10">{days === 365 ? (fr ? "An" : "Year") : `${days}d`}</span>
                {periodDays === days && (
                  <motion.div 
                    layoutId="active-period-climate"
                    className="absolute inset-0 bg-blue-500 rounded-xl shadow-2xl shadow-blue-500/40"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                  />
                )}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="py-20 flex flex-col items-center text-center">
            <div className="p-4 bg-rose-500/10 rounded-full text-rose-500 mb-6">
              <Info size={40} />
            </div>
            <p className="text-rose-400 font-bold uppercase tracking-widest">{fr ? "Erreur de chargement" : "Loading error"}</p>
            <button 
              onClick={() => mutate()}
              className="mt-8 flex items-center gap-2 px-6 py-3 bg-white/5 hover:bg-white/10 rounded-xl text-white font-black transition-all"
            >
              <RefreshCw size={18} />
              {fr ? "Réessayer" : "Retry"}
            </button>
          </div>
        )}

        <AnimatePresence mode="wait">
          {isLoading ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-12"
            >
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                {[...Array(4)].map((_, i) => (
                  <CmmSkeleton key={i} className="h-44 w-full rounded-[2.5rem]" />
                ))}
              </div>
              <CmmSkeleton className="h-96 w-full rounded-[3rem]" />
            </motion.div>
          ) : (
            <motion.div
              key="content"
              variants={containerVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              className="space-y-16"
            >
              <motion.div variants={itemVariants}>
                <ClimateIndicatorGrid 
                  indicators={context.indicators} 
                  comparison={context.comparison}
                  fr={fr} 
                />
              </motion.div>

              <div className="grid gap-12 lg:grid-cols-[2.5fr_1fr] items-start">
                <div className="space-y-12">
                  <motion.div variants={itemVariants} className="grid gap-8 md:grid-cols-2">
                    <ClimateAlertBanner indicator={priorityIndicator} fr={fr} />
                    <div className="flex items-center gap-8 rounded-[3rem] border border-emerald-500/20 bg-emerald-500/5 p-8 backdrop-blur-3xl shadow-2xl relative overflow-hidden group">
                      <div className="absolute -right-12 -top-12 w-32 h-32 bg-emerald-500/10 blur-3xl rounded-full" />
                      <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-400 shadow-xl shadow-emerald-500/20">
                        <RefreshCw className="h-8 w-8 animate-spin-slow" />
                      </div>
                      <div className="space-y-1">
                        <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-500">Flux Temps Réel</h4>
                        <p className="text-xl font-black text-white tracking-tight">Sync. active</p>
                        <p className="text-xs text-slate-400 font-medium">{fr ? "Calculé à l'instant" : "Calculated just now"}</p>
                      </div>
                    </div>
                  </motion.div>

                  <motion.div variants={itemVariants} className="relative group">
                    <div className="p-12 rounded-[4rem] border border-white/10 bg-slate-900/40 backdrop-blur-3xl relative overflow-hidden shadow-2xl">
                      <div className="absolute top-0 right-0 p-16 opacity-[0.03] pointer-events-none group-hover:scale-110 transition-transform duration-1000 group-hover:opacity-[0.05]">
                        <Globe size={240} className="text-white" />
                      </div>
                      <div className="relative z-10 space-y-8">
                        <div className="flex items-center gap-6">
                          <div className="w-14 h-14 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shadow-lg shadow-blue-500/10">
                            <Wind size={28} className="text-blue-400" />
                          </div>
                          <h3 className="text-3xl font-black text-white tracking-tighter">Focus Ocean & Eaux</h3>
                        </div>
                        <p className="text-slate-300 text-xl leading-relaxed max-w-3xl font-medium">
                          {fr 
                            ? "80% des déchets abandonnés finissent dans les cours d'eau. Vos actions empêchent cette fuite plastique vers les océans, protégeant directement la biodiversité marine."
                            : "80% of abandoned waste ends up in waterways. Your actions prevent this plastic leakage to the oceans, directly protecting marine biodiversity."}
                        </p>
                        <div className="pt-4">
                          <button className="flex items-center gap-3 text-blue-400 font-black text-xs uppercase tracking-[0.3em] hover:text-blue-300 transition-colors group">
                            {fr ? "En savoir plus sur l'impact hydrique" : "Learn more about water impact"}
                            <ArrowRight size={14} className="group-hover:translate-x-2 transition-transform" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                </div>

                <div className="space-y-12">
                  <motion.div variants={itemVariants}>
                    <ClimateDecisionList decisions={context.decisions} fr={fr} />
                  </motion.div>
                  <motion.div variants={itemVariants}>
                    <ClimateMethodology 
                      methods={context.methodology.methods} 
                      limits={context.methodology.interpretationLimits} 
                      version={context.methodology.version}
                      fr={fr} 
                    />
                  </motion.div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </SectionShell>
  );
}
