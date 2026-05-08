"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Info, ArrowRight, AlertTriangle, ShieldCheck, TrendingUp, TrendingDown, Minus, Target, Sparkles, Activity } from "lucide-react";
import { cn } from "@/lib/utils";

type SummaryKpi = {
  label: string;
  value: string;
  previousValue: string;
  deltaAbsolute?: string;
  deltaPercent?: string;
  interpretation?: "positive" | "negative" | "neutral";
};

type ThirtySecondsSummaryProps = {
  summary: {
    kpis: Array<SummaryKpi>;
    alert?: {
      severity: "critical" | "high" | "medium" | "low";
      title: string;
      detail: string;
    };
  };
};

function deltaStyles(v: SummaryKpi["interpretation"]) {
  if (v === "positive") return { color: "text-emerald-400", bg: "bg-emerald-500/10", icon: TrendingUp };
  if (v === "negative") return { color: "text-rose-400", bg: "bg-rose-500/10", icon: TrendingDown };
  return { color: "text-slate-500", bg: "bg-white/5", icon: Minus };
}

function alertStyles(severity: string) {
  if (severity === "critical" || severity === "high")
    return { border: "border-rose-500/30", bg: "bg-rose-500/5", text: "text-rose-400", badge: "bg-rose-500/20 text-rose-300", glow: "shadow-[0_0_50px_rgba(244,63,94,0.1)]" };
  if (severity === "medium")
    return { border: "border-amber-500/30", bg: "bg-amber-500/5", text: "text-amber-400", badge: "bg-amber-500/20 text-amber-300", glow: "shadow-[0_0_50px_rgba(245,158,11,0.1)]" };
  return { border: "border-white/10", bg: "bg-white/5", text: "text-slate-400", badge: "bg-white/10 text-slate-300", glow: "" };
}

export function ThirtySecondsSummary({ summary }: ThirtySecondsSummaryProps) {
  const { kpis, alert } = summary;

  return (
    <div className="space-y-8">
      {/* Alert Section (If exists) */}
      {alert && (() => {
        const styles = alertStyles(alert.severity);
        return (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
              "p-10 rounded-[3rem] border backdrop-blur-3xl relative overflow-hidden group",
              styles.border, styles.bg, styles.glow
            )}
          >
            <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none group-hover:scale-110 transition-transform duration-1000">
               <AlertTriangle size={160} className={styles.text} />
            </div>

            <div className="flex flex-col md:flex-row items-start md:items-center gap-8 relative z-10">
              <div className={cn("p-5 rounded-3xl bg-white/5 border border-white/10 shadow-2xl group-hover:scale-110 transition-transform duration-500", styles.text)}>
                <AlertTriangle size={32} className="animate-pulse" />
              </div>
              <div className="space-y-4 flex-1">
                <div className="flex items-center gap-3">
                  <span className={cn("px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-[0.2em] shadow-2xl", styles.badge)}>
                    {alert.severity === "critical" ? "Critique" : alert.severity === "high" ? "Urgent" : "Attention"}
                  </span>
                  <div className="h-1 w-1 rounded-full bg-slate-700" />
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Protocole d'Alerte Alpha</span>
                </div>
                <h4 className="text-3xl font-black text-white tracking-tighter leading-none">{alert.title}</h4>
                <p className="text-sm font-bold text-slate-400 leading-relaxed max-w-3xl opacity-80">{alert.detail}</p>
              </div>
              <button className="shrink-0 px-8 py-4 rounded-2xl bg-white text-slate-950 text-[10px] font-black uppercase tracking-[0.2em] hover:translate-x-2 transition-transform shadow-2xl flex items-center gap-3">
                 Résoudre
                 <ArrowRight size={16} />
              </button>
            </div>
          </motion.div>
        );
      })()}

      {/* KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {kpis.map((kpi, i) => {
          const styles = deltaStyles(kpi.interpretation);
          const DeltaIcon = styles.icon;
          
          return (
            <motion.div
              key={kpi.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="p-10 rounded-[3rem] border border-white/5 bg-slate-900/40 backdrop-blur-3xl shadow-2xl relative overflow-hidden group hover:bg-white/5 transition-all"
            >
              <div className="absolute top-0 right-0 h-32 w-32 bg-white/5 blur-3xl rounded-full translate-x-16 -translate-y-16" />
              
              <div className="relative z-10 space-y-8">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                     <div className="p-2 rounded-lg bg-white/5 border border-white/5 text-slate-600">
                        <Activity size={14} />
                     </div>
                     <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">{kpi.label}</span>
                  </div>
                  <Link href="/methodologie" className="p-2 rounded-lg bg-white/5 text-slate-600 hover:text-white hover:bg-white/10 transition-all">
                    <Info size={14} />
                  </Link>
                </div>

                <div className="space-y-2">
                  <div className="flex items-baseline gap-3">
                     <p className="text-6xl font-black text-white tracking-tighter">{kpi.value}</p>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <div className={cn("inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black tracking-tight", styles.bg, styles.color)}>
                      <DeltaIcon size={12} />
                      {kpi.deltaPercent}
                    </div>
                    <span className="text-[10px] font-bold text-slate-600 italic">vs last period</span>
                  </div>
                </div>

                <div className="pt-6 border-t border-white/5">
                   <p className="text-[10px] font-bold text-slate-500 leading-relaxed italic">
                      Previous baseline: <span className="text-slate-400 font-black">{kpi.previousValue}</span>
                   </p>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
