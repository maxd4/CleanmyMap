"use client";

import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, Minus, Info, Calendar, ShieldCheck } from "lucide-react";
import type {
  MetricDelta,
  PeriodComparisonResult,
} from "@/lib/analytics/period-comparison";
import { cn } from "@/lib/utils";

type PeriodComparisonPanelProps = {
  title?: string;
  result: PeriodComparisonResult;
  fr?: boolean;
};

function formatSigned(value: number, unit: string): string {
  const sign = value > 0 ? "+" : value < 0 ? "" : "+/-";
  return `${sign}${value.toFixed(1)}${unit}`;
}

function describeDelta(
  delta: MetricDelta,
  betterWhenLower: boolean,
): { label: string; tone: string; icon: any } {
  const improves = betterWhenLower
    ? delta.direction === "down"
    : delta.direction === "up";
  
  if (delta.strength === "stable" || delta.direction === "flat") {
    return { label: "Stable", tone: "text-slate-400 bg-slate-400/10 border-slate-400/20", icon: Minus };
  }
  
  if (improves) {
    return {
      label: delta.strength === "strong" ? "Amélioration forte" : "Amélioration",
      tone: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20",
      icon: TrendingUp,
    };
  }
  
  return {
    label: delta.strength === "strong" ? "Alerte forte" : "Vigilance",
    tone: "text-rose-400 bg-rose-400/10 border-rose-400/20",
    icon: TrendingDown,
  };
}

export function PeriodComparisonPanel({
  title = "Comparatif vs période précédente",
  result,
  fr = true,
}: PeriodComparisonPanelProps) {
  const stats = [
    { 
      label: fr ? "Actions" : "Actions", 
      value: result.current.actionsCount, 
      delta: result.deltas.actionsCount, 
      betterWhenLower: false,
      unit: ""
    },
    { 
      label: fr ? "Volume" : "Volume", 
      value: `${result.current.volumeKg.toFixed(1)} kg`, 
      delta: result.deltas.volumeKg, 
      betterWhenLower: false,
      unit: "%"
    },
    { 
      label: fr ? "Couverture Géo" : "Geo Coverage", 
      value: `${result.current.coverageRate.toFixed(1)}%`, 
      delta: result.deltas.coverageRate, 
      betterWhenLower: false,
      unit: " pt"
    },
    { 
      label: fr ? "Délai Modération" : "Moderation Delay", 
      value: `${result.current.moderationDelayDays.toFixed(1)} j`, 
      delta: result.deltas.moderationDelayDays, 
      betterWhenLower: true,
      unit: "%"
    },
  ];

  return (
    <motion.section 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-[3rem] border border-white/10 bg-slate-900/40 p-10 shadow-2xl backdrop-blur-3xl"
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 mb-10">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-2xl bg-violet-500/10 border border-violet-500/20 text-violet-400">
            <ShieldCheck size={24} />
          </div>
          <div>
            <h2 className="text-xl font-black text-white tracking-tight">{title}</h2>
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mt-1">
              {fr ? "Fenêtre" : "Window"}: {result.periodDays} {fr ? "jours vs N-1" : "days vs N-1"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 px-4 py-2 rounded-xl bg-white/5 border border-white/5">
           <Calendar size={14} className="text-slate-500" />
           <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
             {fr ? "Données Certifiées" : "Certified Data"}
           </span>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, i) => {
          const trend = describeDelta(stat.delta, stat.betterWhenLower);
          const TrendIcon = trend.icon;

          return (
            <motion.article 
              key={stat.label}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.1 }}
              className="group rounded-3xl border border-white/5 bg-white/[0.02] p-6 transition-all hover:bg-white/[0.05] hover:border-white/10"
            >
              <div className="flex items-center justify-between mb-6">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 group-hover:text-slate-400 transition-colors">
                  {stat.label}
                </p>
                <div className={cn(
                  "p-2 rounded-lg border text-xs shadow-inner",
                  trend.tone
                )}>
                  <TrendIcon size={14} />
                </div>
              </div>
              
              <p className="text-3xl font-black text-white tracking-tight mb-4">
                {stat.value}
              </p>

              <div className="space-y-1">
                <p className={cn("text-[10px] font-black uppercase tracking-widest", trend.tone.split(' ')[0])}>
                  {formatSigned(stat.delta.percent || stat.delta.absolute, stat.unit)}
                </p>
                <p className="text-[9px] font-bold text-slate-500 italic">
                  {trend.label}
                </p>
              </div>
            </motion.article>
          );
        })}
      </div>
    </motion.section>
  );
}
