"use client";

import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, Minus, Info } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type KpiComparisonCardProps = {
  label: ReactNode;
  value: string;
  previousValue?: string;
  deltaAbsolute?: string;
  deltaPercent?: string;
  interpretation?: "positive" | "negative" | "neutral";
  hint?: string;
  icon?: LucideIcon;
};

function toneClass(interpretation: KpiComparisonCardProps["interpretation"]): string {
  if (interpretation === "positive") return "text-emerald-400 bg-emerald-400/10 border-emerald-400/20";
  if (interpretation === "negative") return "text-rose-400 bg-rose-400/10 border-rose-400/20";
  return "text-slate-400 bg-slate-400/10 border-slate-400/20";
}

function TrendIcon({ interpretation }: { interpretation: KpiComparisonCardProps["interpretation"] }) {
  if (interpretation === "positive") return <TrendingUp size={14} />;
  if (interpretation === "negative") return <TrendingDown size={14} />;
  return <Minus size={14} />;
}

export function KpiComparisonCard({
  label,
  value,
  previousValue,
  deltaAbsolute,
  deltaPercent,
  interpretation = "neutral",
  hint,
  icon: Icon = Info,
}: KpiComparisonCardProps) {
  return (
    <motion.article 
      whileHover={{ scale: 1.02, y: -4 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      className="group relative rounded-[2.5rem] border border-white/10 bg-slate-900/40 p-8 shadow-2xl backdrop-blur-3xl transition-all duration-500 hover:bg-white/[0.03] hover:border-violet-500/30 overflow-hidden"
    >
      {/* Background Accent Glow */}
      <div className={cn(
        "absolute -right-4 -top-4 h-24 w-24 rounded-full blur-[64px] opacity-10 transition-opacity group-hover:opacity-20",
        interpretation === "positive" ? "bg-emerald-400" : interpretation === "negative" ? "bg-rose-400" : "bg-violet-400"
      )} />

      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-white/5 border border-white/5 text-slate-400 group-hover:text-white transition-colors">
            <Icon size={16} />
          </div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 group-hover:text-slate-300 transition-colors">
            {label}
          </p>
        </div>
        
        {(deltaAbsolute || deltaPercent) && (
          <div className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-tighter border shadow-lg",
            toneClass(interpretation)
          )}>
            <TrendIcon interpretation={interpretation} />
            <span>
              {deltaAbsolute ? `${deltaAbsolute}` : ""}
              {deltaAbsolute && deltaPercent ? " | " : ""}
              {deltaPercent ? `${deltaPercent}` : ""}
            </span>
          </div>
        )}
      </div>
      
      <div className="space-y-4">
        <p className="text-4xl font-black text-white tracking-tight group-hover:text-violet-300 transition-colors">
          {value}
        </p>
        
        {previousValue && (
          <div className="flex items-center gap-3 pt-6 border-t border-white/5">
            <div className="h-1 w-4 rounded-full bg-slate-700" />
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">
              PRÉCÉDENT: <span className="text-slate-400">{previousValue}</span>
            </p>
          </div>
        )}
      </div>

      {hint && (
        <div className="mt-6 flex items-start gap-2 rounded-2xl bg-white/[0.02] p-4 border border-white/5 opacity-0 group-hover:opacity-100 transition-all transform translate-y-2 group-hover:translate-y-0">
          <Info size={12} className="text-violet-400 shrink-0 mt-0.5" />
          <p className="text-[10px] font-bold text-slate-400 leading-relaxed italic">
            {hint}
          </p>
        </div>
      )}
    </motion.article>
  );
}
