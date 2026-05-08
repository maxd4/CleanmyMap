"use client";

import { FileText, Cpu, Database, RefreshCw, AlertCircle, Info, Terminal, Box } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

// Assuming MethodDefinition is consistent with the usage
export interface MethodDefinition {
  id: string;
  kpi: string;
  formula: string;
  source: string;
  recalc: string;
  limits: string;
}

type KpiMethodBlockProps = {
  title?: string;
  methods?: MethodDefinition[];
  method?: MethodDefinition;
};

export function KpiMethodBlock({
  title = "Référentiel Méthodologique",
  methods: methodsProp,
  method,
}: KpiMethodBlockProps) {
  const methods = methodsProp || (method ? [method] : []);

  return (
    <section className="space-y-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 px-4">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-2xl bg-white/5 border border-white/10 shadow-2xl">
             <FileText size={24} className="text-slate-400" />
          </div>
          <div className="space-y-1">
             <h2 className="text-2xl font-black text-white tracking-tighter uppercase tracking-[0.1em]">{title}</h2>
             <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Institutional Standard v2.4</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3 bg-slate-950/40 border border-white/5 px-4 py-2 rounded-xl backdrop-blur-3xl">
           <Terminal size={14} className="text-emerald-500" />
           <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest animate-pulse">Live Computation Engine Active</span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8">
        {methods.map((method, idx) => (
          <motion.article
            key={method.id}
            initial={{ opacity: 0, scale: 0.98 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ delay: idx * 0.1, duration: 0.5 }}
            className="p-12 rounded-[3.5rem] border border-white/5 bg-slate-900/40 backdrop-blur-3xl shadow-2xl relative overflow-hidden group hover:border-white/10 transition-all"
          >
            <div className="absolute top-0 right-0 h-64 w-64 bg-white/5 blur-[100px] rounded-full translate-x-32 -translate-y-32 transition-transform duration-1000 group-hover:scale-150" />
            
            <div className="relative z-10 space-y-10">
               <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-8 border-b border-white/5">
                  <div className="space-y-3">
                     <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-sky-500 shadow-[0_0_10px_rgba(14,165,233,0.5)]" />
                        <h3 className="text-3xl font-black text-white tracking-tighter leading-none">{method.kpi}</h3>
                     </div>
                     <p className="text-[10px] font-bold text-slate-500 leading-relaxed max-w-xl italic">
                        Ce KPI constitue une brique fondamentale du score de performance territoriale.
                     </p>
                  </div>
                  <div className="shrink-0 flex items-center gap-4">
                     <div className="px-4 py-1.5 rounded-full bg-slate-950/60 border border-white/10 text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] shadow-2xl">
                        INDEX: {method.id}
                     </div>
                     <div className="p-2 rounded-xl bg-white/5 border border-white/5 text-slate-700">
                        <Box size={16} />
                     </div>
                  </div>
               </div>

               <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                  <div className="space-y-8">
                     <div className="space-y-4">
                        <div className="flex items-center gap-3 text-sky-400 group/label">
                           <Cpu size={16} className="group-hover/label:rotate-90 transition-transform" />
                           <span className="text-[10px] font-black uppercase tracking-[0.2em]">Algorithme de Calcul</span>
                        </div>
                        <div className="relative group/code">
                           <div className="absolute inset-0 bg-sky-500/5 blur-xl opacity-0 group-hover/code:opacity-100 transition-opacity" />
                           <p className="text-sm font-bold text-slate-300 leading-relaxed bg-slate-950/60 p-6 rounded-2xl border border-white/10 font-mono relative z-10 shadow-2xl overflow-x-auto">
                              {method.formula}
                           </p>
                        </div>
                     </div>

                     <div className="space-y-4">
                        <div className="flex items-center gap-3 text-emerald-400">
                           <Database size={16} />
                           <span className="text-[10px] font-black uppercase tracking-[0.2em]">Infrastructure de Données</span>
                        </div>
                        <div className="p-6 rounded-2xl bg-emerald-500/5 border border-emerald-500/10 transition-colors hover:bg-emerald-500/10">
                           <p className="text-sm font-black text-white tracking-tight">{method.source}</p>
                        </div>
                     </div>
                  </div>

                  <div className="space-y-8">
                     <div className="space-y-4">
                        <div className="flex items-center gap-3 text-violet-400">
                           <RefreshCw size={16} className="animate-[spin_10s_linear_infinite]" />
                           <span className="text-[10px] font-black uppercase tracking-[0.2em]">Cycle de Synchronisation</span>
                        </div>
                        <div className="p-6 rounded-2xl bg-violet-500/5 border border-violet-500/10 transition-colors hover:bg-violet-500/10">
                           <p className="text-sm font-black text-white tracking-tight">{method.recalc}</p>
                        </div>
                     </div>

                     <div className="space-y-4">
                        <div className="flex items-center gap-3 text-amber-400">
                           <AlertCircle size={16} />
                           <span className="text-[10px] font-black uppercase tracking-[0.2em]">Analyse des Biais & Limites</span>
                        </div>
                        <div className="p-6 rounded-2xl bg-amber-500/5 border border-amber-500/10 transition-colors hover:bg-amber-500/10">
                           <p className="text-sm font-bold text-slate-400 leading-relaxed italic opacity-80">
                              {method.limits}
                           </p>
                        </div>
                     </div>
                  </div>
               </div>
               
               <div className="pt-8 border-t border-white/5 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                     <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                     <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Audité par l'équipe scientifique</span>
                  </div>
                  <button className="flex items-center gap-2 text-[9px] font-black text-slate-500 hover:text-white transition-colors uppercase tracking-[0.2em]">
                     Consulter le livre blanc
                     <ArrowRight size={12} />
                  </button>
               </div>
            </div>
          </motion.article>
        ))}
      </div>
    </section>
  );
}
