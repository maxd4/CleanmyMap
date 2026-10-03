"use client";

import { Filter, Info, MapPin, Search, ShieldCheck, TrendingDown, TrendingUp } from "lucide-react";
import { motion } from "framer-motion";
import { CmmButton } from "@/components/ui/cmm-button";
import type { PilotageOverview } from "@/lib/pilotage/overview.types";
import { cn } from "@/lib/utils";

type ElusSectionZonesPanelProps = {
  data: PilotageOverview;
  fr: boolean;
};

function signedPercent(value: number): string {
  return `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`;
}

export function ElusSectionZonesPanel({ data, fr }: ElusSectionZonesPanelProps) {
  return (
    <div className="space-y-16">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 px-4">
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <MapPin size={24} className="text-sky-500" />
            <h2 className="text-3xl font-black text-white tracking-tighter uppercase tracking-[0.1em]">Cartographie des Priorités</h2>
          </div>
          <p className="text-sm font-bold text-slate-500 italic">Analyse sectorielle de la performance opérationnelle du territoire.</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative group/search">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600 group-hover/search:text-white transition-colors" size={16} />
            <input
              type="text"
              placeholder={fr ? "Filtrer zone..." : "Filter zone..."}
              className="bg-slate-950/40 border border-white/10 rounded-2xl pl-12 pr-6 py-4 text-xs font-black text-white placeholder-slate-700 outline-none focus:border-sky-500/50 transition-all w-64 backdrop-blur-3xl"
            />
          </div>
          <CmmButton tone="tertiary" variant="pill" className="p-4 rounded-2xl text-slate-500 hover:text-white transition-all">
            <Filter size={18} />
          </CmmButton>
        </div>
      </div>

      <div className="cmm-data-table-wrap">
        <div>
          <table className="cmm-data-table min-w-[900px]">
            <thead>
              <tr className="bg-white/[0.02] border-b border-white/10">
                <th scope="col" className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">{fr ? "Secteur Opérationnel" : "Operational Sector"}</th>
                <th scope="col" className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">{fr ? "Volume Actions" : "Action Volume"}</th>
                <th scope="col" className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">{fr ? "Tonnage Net" : "Net Tonnage"}</th>
                <th scope="col" className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">{fr ? "Couverture" : "Coverage"}</th>
                <th scope="col" className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">{fr ? "P-Score" : "P-Score"}</th>
                <th scope="col" className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] text-center">{fr ? "Indice Urgence" : "Urgency Index"}</th>
              </tr>
            </thead>
            <tbody>
              {data.zones.map((zone, i) => (
                <tr key={i} className="group hover:bg-white/[0.03] transition-all border-b border-white/5 last:border-0">
                  <td className="px-10 py-8">
                    <div className="flex items-center gap-5">
                      <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-slate-500 group-hover:scale-110 group-hover:text-sky-400 transition-all duration-500">
                        <MapPin size={18} />
                      </div>
                      <div className="space-y-1">
                        <span className="text-lg font-black text-white tracking-tight block">{zone.area}</span>
                        <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest italic">{fr ? "Périmètre Urbain" : "Urban Perimeter"}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-10 py-8">
                    <div className="space-y-1">
                      <span className="text-lg font-black text-white block">{zone.currentActions}</span>
                      <div className={cn("inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-black tracking-tight", zone.deltaActionsPercent >= 0 ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400")}>
                        {zone.deltaActionsPercent >= 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                        {signedPercent(zone.deltaActionsPercent)}
                      </div>
                    </div>
                  </td>
                  <td className="px-10 py-8">
                    <div className="space-y-1">
                      <span className="text-lg font-black text-white block">{zone.currentKg}kg</span>
                      <div className={cn("inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-black tracking-tight", zone.deltaKgPercent >= 0 ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400")}>
                        {signedPercent(zone.deltaKgPercent)}
                      </div>
                    </div>
                  </td>
                  <td className="px-10 py-8">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-[10px] font-black text-slate-500">
                        <span>{(zone.currentCoverageRate * 100).toFixed(0)}%</span>
                      </div>
                      <div className="w-24 h-1.5 rounded-full bg-slate-900 overflow-hidden border border-white/5">
                        <motion.div
                          initial={{ width: 0 }}
                          whileInView={{ width: `${zone.currentCoverageRate * 100}%` }}
                          transition={{ duration: 1, delay: 0.5 }}
                          className="h-full bg-sky-500 shadow-[0_0_10px_rgba(14,165,233,0.5)]"
                        />
                      </div>
                    </div>
                  </td>
                  <td className="px-10 py-8">
                    <span className="text-2xl font-black text-white tracking-tighter group-hover:text-sky-400 transition-colors">{(zone.normalizedScore * 10).toFixed(1)}</span>
                  </td>
                  <td className="px-10 py-8 text-center">
                    <span className={cn(
                      "inline-flex items-center gap-2 px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-[0.2em] shadow-2xl",
                      zone.urgency === "critique" ? "bg-rose-500/10 text-rose-400 border border-rose-500/20" :
                        zone.urgency === "elevee" ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" :
                          "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
                    )}>
                      <span className={cn("w-1.5 h-1.5 rounded-full animate-pulse",
                        zone.urgency === "critique" ? "bg-rose-500" :
                          zone.urgency === "elevee" ? "bg-amber-500" : "bg-emerald-500",
                      )} />
                      {zone.urgency}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Contextual Intelligence */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="p-10 rounded-[3rem] bg-slate-900/40 border border-white/5 backdrop-blur-3xl flex items-start gap-8 group">
          <div className="p-4 rounded-2xl bg-sky-500/10 border border-sky-500/20 text-sky-400 group-hover:rotate-12 transition-transform">
            <Info size={24} />
          </div>
          <div className="space-y-3">
            <h4 className="text-lg font-black text-white tracking-tight uppercase tracking-[0.1em]">Intelligence des Scores</h4>
            <p className="text-sm font-bold text-slate-500 leading-relaxed italic opacity-80">
              {fr ? "Les scores sont recalculés toutes les 24h sur la base de la densité de signalements, de la récurrence et du taux de couverture opérationnelle." : "Scores are recalculated every 24h based on report density, recurrence and operational coverage rate."}
            </p>
          </div>
        </div>

        <div className="p-10 rounded-[3rem] bg-emerald-500/5 border border-emerald-500/10 backdrop-blur-3xl flex items-start gap-8 group">
          <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 group-hover:scale-110 transition-transform">
            <ShieldCheck size={24} />
          </div>
          <div className="space-y-3">
            <h4 className="text-lg font-black text-white tracking-tight uppercase tracking-[0.1em]">Garantie de Précision</h4>
            <p className="text-sm font-bold text-slate-500 leading-relaxed italic opacity-80">
              Toutes les données sont vérifiées par notre protocole de modération hybride (IA + Validation Humaine) avant d&apos;intégrer le dashboard.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
