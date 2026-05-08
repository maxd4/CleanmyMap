"use client";

import { Info, Calculator, FlaskConical, Target, AlertCircle, ShieldCheck, ArrowRight, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

type ImpactMethodology = {
  proxyVersion: string;
  qualityRulesVersion: string;
  scope: string;
  pollutionScoreAverage: number;
  formulas: Array<{
    id: string;
    label: string;
    formula: string;
    interpretation: string;
  }>;
  approximations: string[];
  hypotheses: string[];
  errorMargins: {
    waterSavedLitersPct: number;
    co2AvoidedKgPct: number;
    surfaceCleanedM2Pct: number;
    pollutionScoreMeanPoints: number;
  };
  sources?: Record<string, string>;
};

type Props = {
  methodology: ImpactMethodology;
};

export function GamificationImpactMethodologyCard({ methodology }: Props) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-[2.5rem] border border-white/5 bg-slate-900/40 backdrop-blur-3xl p-8 shadow-2xl relative overflow-hidden group"
    >
      <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none group-hover:scale-110 transition-transform duration-1000">
         <FlaskConical size={120} className="text-white" />
      </div>

      <div className="flex flex-wrap items-start justify-between gap-6 mb-10 relative z-10">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
             <div className="p-2.5 rounded-xl bg-slate-500/10 border border-slate-500/20 text-slate-400">
                <Target size={18} />
             </div>
             <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Méthodologie Scientifique</p>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-[10px] font-black uppercase tracking-widest text-slate-500">
             <span className="flex items-center gap-1.5"><ShieldCheck size={12} className="text-emerald-500" /> Proxy {methodology.proxyVersion}</span>
             <div className="w-1 h-1 rounded-full bg-white/10" />
             <span>Qualité {methodology.qualityRulesVersion}</span>
          </div>
          <p className="text-xs font-bold text-slate-500 max-w-sm">{methodology.scope}</p>
        </div>

        <div className="px-6 py-4 rounded-2xl border border-white/5 bg-white/5 flex flex-col items-center">
           <p className="text-[9px] font-black uppercase tracking-widest text-slate-600 mb-1">Score Pollution Moyen</p>
           <div className="flex items-center gap-2">
              <Sparkles size={14} className="text-emerald-400 animate-pulse" />
              <p className="text-2xl font-black text-white tracking-tighter">{methodology.pollutionScoreAverage.toFixed(1)}<span className="text-sm text-slate-500">/100</span></p>
           </div>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-2 relative z-10">
        <div className="space-y-6">
          <div className="flex items-center gap-3">
             <Calculator size={16} className="text-slate-400" />
             <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Formules & Algorithmes</p>
          </div>
          <div className="grid gap-4">
            {methodology.formulas.map((item) => (
              <div key={item.id} className="rounded-2xl border border-white/5 bg-slate-950/40 p-5 group/item transition-all hover:bg-slate-950/60">
                <p className="text-[10px] font-black uppercase tracking-widest text-white mb-2">{item.label}</p>
                <div className="bg-slate-950/60 p-3 rounded-lg border border-white/5 mb-3 font-mono text-[11px] text-emerald-400 break-all">
                   {item.formula}
                </div>
                <p className="text-[10px] font-bold text-slate-500 leading-relaxed italic">{item.interpretation}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
            <div className="space-y-4">
               <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Approximations</p>
               <ul className="space-y-2">
                 {methodology.approximations.map((item) => (
                   <li key={item} className="flex items-start gap-3">
                      <div className="mt-1 w-1.5 h-1.5 rounded-full bg-slate-700 shrink-0" />
                      <p className="text-[11px] font-bold text-slate-400 leading-tight">{item}</p>
                   </li>
                 ))}
               </ul>
            </div>
            <div className="space-y-4">
               <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Hypothèses</p>
               <ul className="space-y-2">
                 {methodology.hypotheses.map((item) => (
                   <li key={item} className="flex items-start gap-3">
                      <div className="mt-1 w-1.5 h-1.5 rounded-full bg-emerald-500/30 shrink-0" />
                      <p className="text-[11px] font-bold text-slate-400 leading-tight">{item}</p>
                   </li>
                 ))}
               </ul>
            </div>
          </div>

          <div className="space-y-4">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 flex items-center gap-2">
               <AlertCircle size={14} className="text-amber-500" />
               Marges d&apos;erreur indicatives
            </p>
            <div className="grid grid-cols-2 gap-3">
               {[
                 { label: "Eau sauvée", value: `+/- ${methodology.errorMargins.waterSavedLitersPct}%` },
                 { label: "CO2 évité", value: `+/- ${methodology.errorMargins.co2AvoidedKgPct}%` },
                 { label: "Surface", value: `+/- ${methodology.errorMargins.surfaceCleanedM2Pct}%` },
                 { label: "Score moyen", value: `+/- ${methodology.errorMargins.pollutionScoreMeanPoints} pts` },
               ].map((err) => (
                 <div key={err.label} className="p-3 rounded-xl bg-white/5 border border-white/5">
                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1">{err.label}</p>
                    <p className="text-xs font-black text-white">{err.value}</p>
                 </div>
               ))}
            </div>
          </div>

          {methodology.sources && (
            <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-6 space-y-3">
              <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-emerald-400">
                 <Info size={14} />
                 Sources Scientifiques
              </div>
              <ul className="space-y-2">
                {Object.entries(methodology.sources).map(([key, value]) => (
                  <li key={key} className="text-[10px] font-bold text-emerald-400/70 italic flex items-start gap-2">
                     <span className="shrink-0">•</span>
                     <span>{value}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
