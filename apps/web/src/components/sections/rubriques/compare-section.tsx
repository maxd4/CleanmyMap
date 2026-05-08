"use client";

import { useMemo, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import useSWR from "swr";
import { fetchActions } from "@/lib/actions/http";
import { computeZoneCompare } from "@/lib/analytics/compare-zones";
import { formatSigned } from "@/components/sections/rubriques/helpers";
import { CmmSkeleton } from "@/components/ui/cmm-skeleton";
import { dashboardPeriodStorage } from "@/lib/storage/ui-state-storage";
import { SectionShell } from "@/components/sections/rubriques/shared";
import { 
  BarChart3, 
  ArrowUpRight, 
  ArrowDownRight, 
  Minus, 
  AlertTriangle, 
  TrendingUp, 
  Trophy, 
  Target, 
  Zap,
  Info,
  Calendar,
  Layers,
  Sparkles,
  ArrowRight
} from "lucide-react";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 }
};

export function CompareSection() {
  const [periodDays, setPeriodDays] = useState<30 | 90 | 365>(() => {
    return (dashboardPeriodStorage.read() as any) ?? 90;
  });

  useEffect(() => {
    dashboardPeriodStorage.write(periodDays);
  }, [periodDays]);

  const { data, isLoading, error } = useSWR(["section-compare-v3"], () =>
    fetchActions({ status: "approved", limit: 1000 }),
  );

  const comparison = useMemo(() => {
    const records = (data?.items ?? []).map((item) => ({
      observedAt: item.action_date,
      locationLabel: item.location_label || "Hors arrondissement",
      wasteKg: Number(item.waste_kg || 0),
      butts: Number(item.cigarette_butts || 0),
      volunteersCount: Number(item.volunteers_count || 0),
    }));
    return computeZoneCompare({ records, periodDays });
  }, [data?.items, periodDays]);

  const topRows = comparison.rows.slice(0, 10);

  return (
    <SectionShell
      id="compare-zones"
      title="Benchmark Territorial"
      subtitle="Analyse comparative et performance relative des zones d'intervention."
      icon={BarChart3}
      gradient="from-indigo-500/20 via-slate-500/10 to-transparent"
    >
      <div className="space-y-12 pt-8">
        {/* Navigation & Period Selector */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 p-6 rounded-[2.5rem] border border-white/10 bg-slate-900/40 backdrop-blur-3xl shadow-2xl"
        >
          <div className="flex items-center gap-6">
            <div className="p-3 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
              <Calendar size={20} />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-0.5">Période d'analyse</p>
              <h3 className="text-xl font-black text-white tracking-tight">
                {periodDays === 365 ? "12 mois glissants" : `${periodDays} jours`}
              </h3>
            </div>
          </div>

          <div className="flex gap-2 p-1.5 bg-slate-950/40 rounded-[1.5rem] border border-white/5">
            {[30, 90, 365].map((value) => (
              <button
                key={`compare-${value}`}
                onClick={() => setPeriodDays(value as 30 | 90 | 365)}
                className={`px-8 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all ${
                  periodDays === value
                    ? "bg-white text-slate-950 shadow-xl"
                    : "text-slate-500 hover:text-white"
                }`}
              >
                {value === 365 ? "1 an" : `${value}j`}
              </button>
            ))}
          </div>
        </motion.div>

        {isLoading ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
            <div className="lg:col-span-8 space-y-8">
              <CmmSkeleton className="h-[600px] rounded-[3rem]" />
            </div>
            <div className="lg:col-span-4 space-y-8">
              <CmmSkeleton className="h-96 rounded-[3rem]" />
              <CmmSkeleton className="h-64 rounded-[3rem]" />
            </div>
          </div>
        ) : error ? (
          <div className="p-20 text-center rounded-[3rem] border border-white/5 bg-slate-900/20 backdrop-blur-xl">
            <AlertTriangle className="mx-auto text-rose-500 mb-6" size={48} />
            <h3 className="text-2xl font-black text-white mb-2">Erreur de chargement</h3>
            <p className="text-slate-400">Impossible de générer le benchmark territorial.</p>
          </div>
        ) : (
          <motion.div 
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start"
          >
            {/* Main Comparison Table */}
            <motion.div variants={itemVariants} className="lg:col-span-8 space-y-8">
              <div className="rounded-[3rem] border border-white/10 bg-slate-900/40 backdrop-blur-3xl shadow-2xl overflow-hidden">
                <div className="p-8 border-b border-white/10 flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-black text-white tracking-tight uppercase tracking-[0.1em]">Performance par Zone</h3>
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-1">Top 10 Arrondissements & Zones</p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white/5 text-slate-500">
                    <Layers size={18} />
                  </div>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-white/5 bg-slate-950/20">
                        <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Secteur</th>
                        <th className="px-6 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Activités</th>
                        <th className="px-6 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 text-center">KG/Action</th>
                        <th className="px-6 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Écart/Médiane</th>
                        <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Priorité</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {topRows.map((row) => (
                        <tr key={row.area} className="group hover:bg-white/[0.02] transition-all">
                          <td className="px-8 py-6">
                            <div className="flex flex-col">
                              <span className="text-base font-black text-white group-hover:text-indigo-400 transition-colors tracking-tight">{row.area}</span>
                              <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest mt-0.5">{row.trend}</span>
                            </div>
                          </td>
                          <td className="px-6 py-6">
                            <div className="flex items-baseline gap-1.5">
                              <span className="text-lg font-black text-slate-200">{row.currentActions}</span>
                              <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest">acts</span>
                            </div>
                          </td>
                          <td className="px-6 py-6 text-center">
                            <span className="text-lg font-black text-white">{row.kgPerAction.toFixed(1)}</span>
                          </td>
                          <td className="px-6 py-6">
                            <div className={`inline-flex items-center gap-2 font-black text-sm ${
                              row.medianGapKgPerAction > 0 ? "text-rose-400" : "text-emerald-400"
                            }`}>
                              {row.medianGapKgPerAction > 0 ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
                              {formatSigned(row.medianGapKgPerAction, 1)}
                            </div>
                          </td>
                          <td className="px-8 py-6">
                            <span className={`inline-flex items-center px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest border ${
                              row.effort === "fort" ? "bg-rose-500/10 text-rose-400 border-rose-500/20" :
                              row.effort === "moyen" ? "bg-amber-500/10 text-amber-400 border-amber-500/20" :
                              "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                            }`}>
                              {row.effort}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Methodology Guide */}
              <div className="p-8 rounded-[2.5rem] bg-indigo-500/5 border border-indigo-500/10 flex gap-8 items-start relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none group-hover:scale-110 transition-transform duration-700">
                  <Info size={120} className="text-indigo-400" />
                </div>
                <div className="p-4 rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 shrink-0">
                  <Info size={28} />
                </div>
                <div className="space-y-3 relative z-10">
                  <h4 className="text-sm font-black text-white uppercase tracking-[0.2em]">Protocole de Benchmark</h4>
                  <p className="text-sm text-slate-400 leading-relaxed font-medium">
                    Les indicateurs sont normalisés par densité d'activité territoriale. L'indice <span className="text-indigo-400 font-black">« Priorité »</span> identifie les secteurs où l'écart à la médiane suggère un besoin de renforcement logistique ou une pression de déchets atypique.
                  </p>
                </div>
              </div>
            </motion.div>

            {/* Side Insights */}
            <div className="lg:col-span-4 space-y-12">
              {/* Leaderboard Card */}
              <motion.div variants={itemVariants} className="p-8 rounded-[3rem] border border-white/10 bg-slate-900/40 backdrop-blur-3xl shadow-2xl space-y-8 relative overflow-hidden">
                <div className="absolute -top-10 -right-10 p-12 opacity-5 text-amber-400">
                  <Trophy size={140} />
                </div>
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
                    <Trophy size={20} />
                  </div>
                  <h3 className="text-lg font-black text-white uppercase tracking-widest">Zones Leader</h3>
                </div>
                
                <div className="space-y-4">
                  {comparison.normalizedRanking.slice(0, 5).map((area, index) => (
                    <div key={`leader-${area}`} className="flex items-center justify-between p-5 rounded-[1.5rem] bg-white/5 border border-white/5 hover:border-amber-500/30 transition-all group cursor-default">
                      <div className="flex items-center gap-5">
                        <span className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-black ${
                          index === 0 ? "bg-amber-500 text-slate-950 shadow-[0_0_15px_rgba(245,158,11,0.4)]" : 
                          index === 1 ? "bg-slate-300 text-slate-950" :
                          index === 2 ? "bg-orange-400 text-slate-950" :
                          "bg-white/10 text-white"
                        }`}>
                          {index + 1}
                        </span>
                        <span className="text-sm font-black text-slate-300 group-hover:text-white transition-colors">{area}</span>
                      </div>
                      <ArrowRight size={14} className="text-slate-600 group-hover:text-white opacity-0 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0" />
                    </div>
                  ))}
                </div>
              </motion.div>

              {/* Priority Zones Card */}
              <motion.div variants={itemVariants} className="p-8 rounded-[3rem] bg-gradient-to-br from-rose-500/20 to-orange-500/10 border border-rose-500/20 shadow-2xl space-y-8 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-10 opacity-10 text-rose-400">
                  <Zap size={100} className="group-hover:animate-pulse" />
                </div>
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400">
                    <Target size={20} />
                  </div>
                  <h3 className="text-lg font-black text-white uppercase tracking-widest">Focus Urgent</h3>
                </div>
                
                <div className="space-y-4 relative z-10">
                  {comparison.priorityZones.slice(0, 3).map((zone) => (
                    <div key={`prior-${zone.area}`} className="p-6 rounded-[2rem] bg-slate-950/40 border border-white/5 space-y-4 hover:bg-slate-950/60 transition-all">
                      <div className="flex justify-between items-center">
                        <p className="text-base font-black text-white tracking-tight">{zone.area}</p>
                        <span className="text-[9px] font-black uppercase tracking-widest text-rose-400 px-3 py-1 rounded-lg bg-rose-400/10 border border-rose-400/20">Priorité {zone.effort}</span>
                      </div>
                      <p className="text-xs text-slate-400 leading-relaxed font-bold opacity-80">{zone.reason}</p>
                    </div>
                  ))}
                  {comparison.priorityZones.length === 0 && (
                    <div className="text-center py-10 space-y-4">
                      <Sparkles className="mx-auto text-emerald-400" size={32} />
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Équilibre Territorial Atteint</p>
                    </div>
                  )}
                </div>
              </motion.div>

              {/* Quick Pulse Stats */}
              <motion.div variants={itemVariants} className="grid grid-cols-1 gap-4">
                <div className="p-6 rounded-[2.5rem] bg-emerald-500/5 border border-emerald-500/10 flex items-center justify-between group">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400">
                      <TrendingUp size={18} />
                    </div>
                    <div>
                      <p className="text-[9px] font-black text-emerald-500 uppercase tracking-widest mb-0.5">Momentum Positif</p>
                      <p className="text-sm font-black text-white truncate w-32 group-hover:text-emerald-400 transition-colors">{comparison.improvingZones[0] || "Stabilité"}</p>
                    </div>
                  </div>
                </div>
                <div className="p-6 rounded-[2.5rem] bg-rose-500/5 border border-rose-500/10 flex items-center justify-between group">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-xl bg-rose-500/10 text-rose-400">
                      <AlertTriangle size={18} />
                    </div>
                    <div>
                      <p className="text-[9px] font-black text-rose-400 uppercase tracking-widest mb-0.5">Surveillance</p>
                      <p className="text-sm font-black text-white truncate w-32 group-hover:text-rose-400 transition-colors">{comparison.degradingZones[0] || "Aucune"}</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          </motion.div>
        )}
      </div>
    </SectionShell>
  );
}
