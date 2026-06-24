"use client";

import { memo } from "react";
import { motion } from "framer-motion";
import { 
  Recycle, 
  MapPin, 
  BarChart3, 
  ArrowRight, 
  CheckCircle2, 
  Database,
  Zap,
  Layers,
  ArrowUpRight,
  Droplets
} from "lucide-react";
import { cn } from "@/lib/utils";

type RecyclingStats = {
  totalKg: number;
  totalButts: number;
  withTrace: number;
  mixedIndex: number;
};

type RecyclingStreamLine = {
  category: string;
  kg: number;
  sharePercent: number;
  entries: number;
};

type RecyclingBreakdown = {
  lines: RecyclingStreamLine[];
};

type RecyclingQualitySummary = {
  elevee: number;
  moyenne: number;
  faible: number;
};

export const RecyclingKpiGrid = memo(function RecyclingKpiGrid({
  fr,
  stats,
}: {
  fr: boolean;
  stats: RecyclingStats;
}) {
  const cards = [
    {
      label: fr ? "Volume triable" : "Sortable volume",
      value: `${stats.totalKg.toFixed(1)} kg`,
      icon: Recycle,
      color: "text-emerald-400",
      bg: "bg-emerald-500/10",
      border: "border-emerald-500/20",
    },
    {
      label: fr ? "Mégots collectés" : "Cigarette butts",
      value: stats.totalButts.toLocaleString(),
      icon: Droplets,
      color: "text-amber-400",
      bg: "bg-amber-500/10",
      border: "border-amber-500/20",
    },
    {
      label: fr ? "Traçabilité géo" : "Geo traceability",
      value: stats.withTrace.toString(),
      icon: MapPin,
      color: "text-blue-400",
      bg: "bg-blue-500/10",
      border: "border-blue-500/20",
    },
    {
      label: fr ? "Indice tri propre" : "Clean sorting index",
      value: `${stats.mixedIndex}/100`,
      icon: BarChart3,
      color: "text-purple-400",
      bg: "bg-purple-500/10",
      border: "border-purple-500/20",
    },
  ];

  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card, i) => (
        <motion.article
          key={i}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.1 }}
          className={cn(
            "group relative overflow-hidden rounded-[2.5rem] border p-8 backdrop-blur-3xl shadow-2xl transition-all hover:bg-white/5",
            card.border, card.bg
          )}
        >
          <div className="relative z-10 space-y-6">
            <div className={cn(
              "flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-900/40 border shadow-2xl group-hover:scale-110 transition-all duration-500",
              card.border, card.color
            )}>
              <card.icon size={28} />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/50 mb-1">
                {card.label}
              </p>
              <p className="text-4xl font-black tracking-tighter text-white">
                {card.value}
              </p>
            </div>
          </div>
          <div className={cn(
            "absolute -right-12 -bottom-12 opacity-5 transition-all duration-1000 group-hover:scale-125 group-hover:opacity-10",
            card.color
          )}>
            <card.icon size={220} />
          </div>
        </motion.article>
      ))}
    </div>
  );
});

export const RecyclingStreamTable = memo(function RecyclingStreamTable({
  breakdown,
  fr,
}: {
  breakdown?: RecyclingBreakdown;
  fr: boolean;
}) {
  if (!breakdown) return null;

  return (
    <div className="rounded-[3rem] border border-white/10 bg-slate-900/40 backdrop-blur-3xl shadow-2xl overflow-hidden">
      <div className="p-8 border-b border-white/10 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-black text-white tracking-tight uppercase tracking-[0.1em]">{fr ? "Répartition des Flux" : "Stream Breakdown"}</h3>
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-1">Analyse volumétrique par catégorie</p>
        </div>
        <div className="p-2.5 rounded-xl bg-white/5 text-slate-500">
          <Layers size={18} />
        </div>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-white/5 bg-slate-950/20">
              <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Catégorie</th>
              <th className="px-6 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Volume (KG)</th>
              <th className="px-6 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Part (%)</th>
              <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Occurrences</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {breakdown.lines.map((line) => (
              <tr key={line.category} className="group hover:bg-white/[0.02] transition-all">
                <td className="px-8 py-6">
                  <div className="flex items-center gap-4">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]" />
                    <span className="text-base font-black text-white group-hover:text-emerald-400 transition-colors tracking-tight uppercase">{line.category}</span>
                  </div>
                </td>
                <td className="px-6 py-6">
                  <span className="text-lg font-black text-slate-200">{line.kg.toFixed(1)}</span>
                </td>
                <td className="px-6 py-6">
                  <div className="flex items-center gap-4">
                    <div className="flex-1 h-1.5 rounded-full bg-white/5 overflow-hidden w-24">
                       <motion.div 
                        initial={{ width: 0 }}
                        whileInView={{ width: `${line.sharePercent}%` }}
                        className="h-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.3)]"
                       />
                    </div>
                    <span className="text-[10px] font-black text-emerald-400">{line.sharePercent.toFixed(1)}%</span>
                  </div>
                </td>
                <td className="px-8 py-6">
                  <span className="text-sm font-black text-slate-500">{line.entries} reports</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
});

export const RecyclingQualitySummary = memo(function RecyclingQualitySummary({ quality, fr }: { quality?: RecyclingQualitySummary; fr: boolean }) {
  if (!quality) return null;

  const items = [
    { label: fr ? "Haute Qualité" : "High Quality", val: quality.elevee, color: "bg-emerald-500", text: "text-emerald-400" },
    { label: fr ? "Mixte / Standard" : "Mixed / Standard", val: quality.moyenne, color: "bg-amber-500", text: "text-amber-400" },
    { label: fr ? "Faible Qualité" : "Low Quality", val: quality.faible, color: "bg-rose-500", text: "text-rose-400" },
  ];

  return (
    <div className="p-8 rounded-[3rem] border border-white/10 bg-slate-900/40 backdrop-blur-3xl shadow-2xl space-y-10">
      <div className="flex items-center gap-4">
        <div className="p-3 rounded-2xl bg-white/5 border border-white/10">
          <Zap size={20} className="text-amber-400" />
        </div>
        <h3 className="text-xl font-black text-white tracking-tight uppercase tracking-[0.1em]">{fr ? "Indice de Pureté" : "Purity Index"}</h3>
      </div>

      <div className="space-y-8">
        <div className="flex h-4 rounded-2xl overflow-hidden bg-white/5 p-1 border border-white/5">
          {items.map((item, i) => (
            <motion.div 
              key={i}
              initial={{ scaleX: 0 }}
              whileInView={{ scaleX: 1 }}
              style={{ width: `${item.val}%`, originX: 0 }}
              className={cn("h-full", item.color)}
            />
          ))}
        </div>

        <div className="grid gap-6">
          {items.map((item, i) => (
            <div key={i} className="flex items-center justify-between group">
              <div className="flex items-center gap-4">
                <div className={cn("w-3 h-3 rounded-full shadow-lg", item.color)} />
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 group-hover:text-white transition-colors">{item.label}</span>
              </div>
              <span className={cn("text-lg font-black tracking-tighter", item.text)}>{item.val}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
});

export const RecyclingWorkflowCard = memo(function RecyclingWorkflowCard({ fr }: { fr: boolean }) {
  return (
    <div className="p-8 rounded-[2.5rem] bg-emerald-500/5 border border-emerald-500/10 space-y-6 group">
      <div className="flex items-center gap-4">
        <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-2xl group-hover:rotate-12 transition-transform duration-500">
          <CheckCircle2 size={24} />
        </div>
        <h3 className="text-sm font-black text-white uppercase tracking-[0.2em]">{fr ? "Circuit de Valorisation" : "Recovery Workflow"}</h3>
      </div>
      <p className="text-xs text-slate-400 leading-relaxed font-bold opacity-80">
        Chaque action terrain alimente notre base de données circulaire. Les flux sont dirigés vers les centres de tri partenaires pour une réintroduction dans l&apos;économie locale.
      </p>
      <div className="pt-4 border-t border-white/5 flex items-center justify-between">
         <span className="text-[10px] font-black uppercase tracking-widest text-emerald-500">Flux Optimisé</span>
         <ArrowRight size={14} className="text-emerald-500 group-hover:translate-x-2 transition-transform" />
      </div>
    </div>
  );
});

export const RecyclingDataUsageCard = memo(function RecyclingDataUsageCard({ fr }: { fr: boolean }) {
  return (
    <div className="p-8 rounded-[2.5rem] bg-blue-500/5 border border-blue-500/10 space-y-6 group">
      <div className="flex items-center gap-4">
        <div className="p-3 rounded-2xl bg-blue-500/10 text-blue-400 border border-blue-500/20 shadow-2xl group-hover:rotate-12 transition-transform duration-500">
          <Database size={24} />
        </div>
        <h3 className="text-sm font-black text-white uppercase tracking-[0.2em]">{fr ? "Open Data Circulaire" : "Circular Open Data"}</h3>
      </div>
      <p className="text-xs text-slate-400 leading-relaxed font-bold opacity-80">
        Vos données de tri sont exportées en temps réel vers les plateformes territoriales pour aider les élus à dimensionner les infrastructures de collecte.
      </p>
      <div className="pt-4 border-t border-white/5 flex items-center justify-between">
         <span className="text-[10px] font-black uppercase tracking-widest text-blue-500">Synchronisation Live</span>
         <ArrowUpRight size={14} className="text-blue-500 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
      </div>
    </div>
  );
});
