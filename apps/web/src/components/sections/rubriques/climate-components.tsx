"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Leaf, 
  Wind, 
  Droplets, 
  Zap, 
  ShieldCheck, 
  AlertTriangle, 
  TrendingUp, 
  TrendingDown, 
  Activity,
  Info,
  Calendar,
  Globe,
  CheckCircle2,
  ChevronRight,
  ChevronDown,
  Scaling,
  MousePointer2,
  Scale
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ClimateIndicator, IndicatorConfidence, ClimateDecision, ClimateMethodDefinition } from "@/lib/analytics/climate-context";

// --- Types ---

interface ClimateKpiProps {
  label: string;
  value: string | number;
  unit?: string;
  delta?: {
    text: string;
    isPositive: boolean;
    tone: string;
  };
  icon: React.ReactNode;
  confidence?: IndicatorConfidence;
  className?: string;
}

// --- Components ---

export function ClimateKpiCard({ label, value, unit, delta, icon, confidence, className }: ClimateKpiProps) {
  const confidenceColor = {
    eleve: "text-emerald-400",
    moyen: "text-amber-400",
    faible: "text-rose-400"
  }[confidence || "moyen"];

  const confidenceBg = {
    eleve: "bg-emerald-500/10",
    moyen: "bg-amber-500/10",
    faible: "bg-rose-500/10"
  }[confidence || "moyen"];

  return (
    <motion.div
      whileHover={{ y: -8, scale: 1.02 }}
      className={cn(
        "relative overflow-hidden rounded-[2.5rem] border border-white/10 bg-slate-900/40 p-8 backdrop-blur-3xl shadow-2xl transition-all group",
        className
      )}
    >
      <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
        {icon}
      </div>

      <div className="flex flex-col h-full justify-between gap-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className={cn("rounded-2xl bg-white/5 p-4 text-white/70 shadow-lg group-hover:scale-110 transition-transform")}>
              {icon}
            </div>
            {confidence && (
              <div className={cn("flex items-center gap-2 rounded-full px-4 py-1.5 border border-white/5", confidenceBg)}>
                <div className={cn("h-1.5 w-1.5 rounded-full animate-pulse", confidenceColor.replace("text", "bg"))} />
                <span className={cn("text-[10px] font-black uppercase tracking-[0.2em]", confidenceColor)}>
                  {confidence}
                </span>
              </div>
            )}
          </div>

          <div className="space-y-1">
            <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 group-hover:text-slate-400 transition-colors">
              {label}
            </h4>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-black tracking-tighter text-white">{value}</span>
              {unit && <span className="text-sm font-black text-slate-500 uppercase tracking-widest">{unit}</span>}
            </div>
          </div>
        </div>
        
        {delta && (
          <div className="flex items-center gap-3 bg-white/5 rounded-2xl px-4 py-3 border border-white/5 w-fit">
            <div className={cn("p-1 rounded-lg", delta.isPositive ? "bg-emerald-500/20" : "bg-blue-500/20")}>
              {delta.isPositive ? (
                <TrendingUp className={cn("h-4 w-4", delta.isPositive ? "text-emerald-400" : "text-blue-400")} />
              ) : (
                <TrendingDown className={cn("h-4 w-4", delta.isPositive ? "text-emerald-400" : "text-blue-400")} />
              )}
            </div>
            <div className="flex flex-col">
              <span className={cn("text-xs font-black", delta.isPositive ? "text-emerald-400" : "text-blue-400")}>
                {delta.text}
              </span>
              <span className="text-[9px] text-slate-500 font-black uppercase tracking-widest">vs période préc.</span>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}

export function ClimateIndicatorGrid({ indicators, fr }: { indicators: ClimateIndicator[]; fr: boolean }) {
  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
      {indicators.map((ind, i) => (
        <ClimateKpiCard
          key={ind.label.en}
          label={fr ? ind.label.fr : ind.label.en}
          value={ind.value}
          unit={ind.unit}
          confidence={ind.confidence}
          icon={(() => {
            switch(ind.id) {
              case 'co2': return <Leaf size={24} />;
              case 'biodiv': return <Activity size={24} />;
              case 'h2o': return <Droplets size={24} />;
              case 'trace': return <Scaling size={24} />;
              default: return <Wind size={24} />;
            }
          })()}
          delta={ind.delta}
        />
      ))}
    </div>
  );
}

export function ClimateAlertBanner({ indicator, fr }: { indicator: ClimateIndicator; fr: boolean }) {
  if (!indicator) return null;

  return (
    <motion.div
      whileHover={{ scale: 1.01 }}
      className="relative overflow-hidden rounded-[3rem] border border-rose-500/20 bg-rose-500/5 p-8 lg:p-12 backdrop-blur-3xl shadow-2xl flex flex-col md:flex-row items-center gap-8 group"
    >
      <div className="absolute -left-12 -bottom-12 w-48 h-48 bg-rose-500/10 blur-[80px] rounded-full" />
      
      <div className="relative z-10 flex h-20 w-20 shrink-0 items-center justify-center rounded-[1.5rem] bg-rose-500/10 text-rose-500 border border-rose-500/20 shadow-2xl shadow-rose-500/20 group-hover:scale-110 transition-transform">
        <AlertTriangle className="h-10 w-10 animate-pulse" />
      </div>

      <div className="relative z-10 space-y-3 text-center md:text-left flex-1">
        <div className="flex items-center justify-center md:justify-start gap-3">
          <span className="px-3 py-1 rounded-full bg-rose-500/20 text-[10px] font-black uppercase tracking-[0.3em] text-rose-500 border border-rose-500/20">
            Alerte Impact
          </span>
        </div>
        <h3 className="text-2xl lg:text-3xl font-black text-white tracking-tighter">
          {fr ? "Seuil de vigilance biodiversité" : "Biodiversity vigilance threshold"}
        </h3>
        <p className="text-slate-400 font-medium leading-relaxed max-w-2xl">
          {fr 
            ? "Les volumes de micro-plastiques collectés sur les points d'eau indiquent une pression critique sur les écosystèmes locaux. Une intervention prioritaire est recommandée."
            : "Micro-plastic volumes collected at water points indicate critical pressure on local ecosystems. Priority intervention is recommended."}
        </p>
      </div>

      <div className="relative z-10">
        <button className="px-8 py-4 bg-rose-500 hover:bg-rose-600 rounded-2xl text-white font-black text-sm uppercase tracking-widest transition-all shadow-xl shadow-rose-500/40">
          {fr ? "Détails" : "Details"}
        </button>
      </div>
    </motion.div>
  );
}

export function ClimateDecisionList({ decisions, fr }: { decisions: ClimateDecision[]; fr: boolean }) {
  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <div className="p-3 rounded-2xl bg-white/5 border border-white/10">
          <ShieldCheck size={20} className="text-emerald-400" />
        </div>
        <h3 className="text-xl font-black text-white tracking-tight">{fr ? "Actions & Décisions" : "Actions & Decisions"}</h3>
      </div>

      <div className="space-y-4">
        {decisions.map((decision, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.1 }}
            className="p-6 rounded-3xl border border-white/5 bg-slate-900/20 hover:bg-white/5 transition-all group cursor-default"
          >
            <div className="flex gap-6">
              <div className="mt-1">
                <div className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]" />
              </div>
              <div className="space-y-2">
                <p className="text-sm font-bold text-white leading-relaxed group-hover:text-blue-400 transition-colors">
                  {fr ? decision.label.fr : decision.label.en}
                </p>
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                    {decision.type === 'action' ? (fr ? "Impact Direct" : "Direct Impact") : (fr ? "Stratégique" : "Strategic")}
                  </span>
                  <div className="w-1 h-1 rounded-full bg-white/10" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                    Confiance {decision.confidence}%
                  </span>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

export function ClimateMethodology({ methods, limits, version, fr }: { methods: ClimateMethodDefinition[]; limits: string[]; version: string; fr: boolean }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="rounded-[2.5rem] border border-white/10 bg-slate-900/40 backdrop-blur-xl overflow-hidden shadow-2xl">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-8 flex items-center justify-between hover:bg-white/5 transition-all group"
      >
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-2xl bg-white/5 border border-white/10 group-hover:scale-110 transition-transform">
            <Scale size={20} className="text-slate-400" />
          </div>
          <div className="text-left">
            <h4 className="text-lg font-black text-white tracking-tight">{fr ? "Méthodologie" : "Methodology"}</h4>
            <p className="text-xs font-black text-slate-500 uppercase tracking-widest mt-1">Version {version}</p>
          </div>
        </div>
        <div className={cn("p-2 rounded-xl bg-white/5 text-slate-400 transition-transform duration-300", isOpen && "rotate-180")}>
          <ChevronDown size={20} />
        </div>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-white/5"
          >
            <div className="p-8 space-y-10">
              <div className="space-y-6">
                <h5 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">{fr ? "Calculs & Ratios" : "Calculations & Ratios"}</h5>
                <div className="grid gap-4">
                  {methods.map((m, i) => (
                    <div key={i} className="flex gap-4 group">
                      <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-blue-500/50 group-hover:bg-blue-500 transition-colors" />
                      <div className="space-y-1">
                        <p className="text-sm font-bold text-slate-300">{m.name}</p>
                        <p className="text-xs text-slate-500 leading-relaxed">{m.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-6">
                <h5 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">{fr ? "Limites d'interprétation" : "Interpretation Limits"}</h5>
                <div className="grid gap-4">
                  {limits.map((l, i) => (
                    <div key={i} className="flex items-center gap-4 bg-white/5 p-4 rounded-2xl border border-white/5">
                      <Info size={14} className="text-amber-500/60" />
                      <p className="text-xs font-medium text-slate-400">{l}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
