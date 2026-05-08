"use client";

import { motion } from "framer-motion";
import { ShieldCheck, Info, Clock, CheckCircle2, AlertCircle } from "lucide-react";
import type { PilotageComparisonResult } from "@/lib/pilotage/metrics";
import { KpiComparisonGrid, type KpiCardKey } from "./kpi-comparison-grid";
import { cn } from "@/lib/utils";

type KpiWindowsPanelProps = {
  comparisonsByWindow:
    | Record<"30" | "90" | "365", PilotageComparisonResult>
    | null
    | undefined;
  title?: string;
  unavailableMessage?: string;
  fr?: boolean;
};

const REPORT_ORDER: KpiCardKey[] = [
  "actions",
  "volume",
  "coverage",
  "mobilization",
  "quality",
  "moderationDelay",
];

function reliabilityTone(level: "elevee" | "moyenne" | "faible"): { text: string; bg: string; border: string; icon: any } {
  if (level === "elevee") {
    return { 
      text: "text-emerald-400", 
      bg: "bg-emerald-400/10", 
      border: "border-emerald-400/20",
      icon: CheckCircle2 
    };
  }
  if (level === "moyenne") {
    return { 
      text: "text-amber-400", 
      bg: "bg-amber-400/10", 
      border: "border-amber-400/20",
      icon: Clock 
    };
  }
  return { 
    text: "text-rose-400", 
    bg: "bg-rose-400/10", 
      border: "border-rose-400/20",
      icon: AlertCircle 
    };
}

export function KpiWindowsPanel({
  comparisonsByWindow,
  title = "Comparatifs N vs N-1 par fenêtre",
  unavailableMessage = "Données de comparaison temporairement indisponibles. Vérifiez la source pilotage.",
  fr = true,
}: KpiWindowsPanelProps) {
  if (!comparisonsByWindow) {
    return (
      <section className="rounded-[3rem] border border-amber-500/20 bg-amber-500/5 p-8 backdrop-blur-3xl">
        <div className="flex items-center gap-4">
          <AlertCircle className="text-amber-400" size={24} />
          <p className="text-sm font-bold text-amber-400">{unavailableMessage}</p>
        </div>
      </section>
    );
  }

  return (
    <motion.section 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-[3.5rem] border border-white/10 bg-slate-900/40 p-12 shadow-2xl backdrop-blur-3xl"
    >
      <div className="flex items-center gap-4 mb-12 pb-8 border-b border-white/5">
        <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
          <ShieldCheck size={28} />
        </div>
        <div>
          <h2 className="text-2xl font-black text-white tracking-tight">{title}</h2>
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mt-1">
            {fr ? "Algorithmes de comparaison multicritères" : "Multi-criteria comparison algorithms"}
          </p>
        </div>
      </div>

      <div className="grid gap-10 lg:grid-cols-3">
        {(["30", "90", "365"] as const).map((windowKey, i) => {
          const windowResult = comparisonsByWindow[windowKey];
          const tone = reliabilityTone(windowResult.current.reliability.level);
          const ReliabilityIcon = tone.icon;

          return (
            <motion.article
              key={windowKey}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.1 }}
              className="group flex flex-col rounded-[2.5rem] border border-white/5 bg-white/[0.02] p-8 transition-all hover:bg-white/[0.05] hover:border-white/10 shadow-inner"
            >
              <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                <div className="flex items-center gap-3">
                  <div className="h-1.5 w-1.5 rounded-full bg-violet-500 shadow-[0_0_8px_rgba(139,92,246,0.6)]" />
                  <p className="text-[12px] font-black uppercase tracking-[0.3em] text-white">
                    {windowKey === "365" ? (fr ? "12 MOIS" : "12 MONTHS") : `${windowKey} ${fr ? "JOURS" : "DAYS"}`}
                  </p>
                </div>
                
                <div className={cn(
                  "flex items-center gap-2 rounded-full border px-4 py-1.5 text-[9px] font-black uppercase tracking-widest shadow-lg transition-transform group-hover:scale-105",
                  tone.bg,
                  tone.border,
                  tone.text
                )}>
                  <ReliabilityIcon size={12} />
                  {fr ? "FIABILITÉ" : "RELIABILITY"} {windowResult.current.reliability.level.toUpperCase()}
                </div>
              </div>

              <div className="mb-10 p-6 rounded-2xl bg-slate-950/40 border border-white/5 shadow-inner">
                <p className="text-[10px] font-bold text-slate-400 leading-relaxed italic mb-4">
                  {windowResult.current.reliability.reason}
                </p>
                <div className="grid grid-cols-3 gap-4">
                  {[
                    { label: "COMPLET", val: windowResult.current.reliability.completeness },
                    { label: "GEOLOC", val: windowResult.current.reliability.geoloc },
                    { label: "FRAIS", val: windowResult.current.reliability.freshness },
                  ].map((stat) => (
                    <div key={stat.label} className="text-center">
                      <p className="text-[8px] font-black text-slate-500 mb-1">{stat.label}</p>
                      <p className="text-[11px] font-black text-white">{stat.val.toFixed(1)}%</p>
                    </div>
                  ))}
                </div>
              </div>

              <KpiComparisonGrid
                comparison={windowResult}
                className="mt-auto grid gap-3"
                order={REPORT_ORDER}
                labels={{
                  actions: fr ? "Actions" : "Actions",
                  volume: fr ? "Volume" : "Volume",
                  coverage: fr ? "Couverture" : "Coverage",
                }}
              />
            </motion.article>
          );
        })}
      </div>
    </motion.section>
  );
}
