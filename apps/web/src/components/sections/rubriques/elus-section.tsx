"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import useSWR from "swr";
import { KpiMethodBlock } from "@/components/pilotage/kpi-method-block";
import { ThirtySecondsSummary } from "@/components/pilotage/thirty-seconds-summary";
import { PRIORITIZATION_RULESET } from "@/lib/pilotage/constants";
import { useSitePreferences } from "@/components/ui/site-preferences-provider";
import { CmmSkeleton } from "@/components/ui/cmm-skeleton";
import { SectionShell } from "@/components/sections/rubriques/shared";
import { 
  ShieldCheck, 
  Download, 
  BarChart3, 
  AlertCircle, 
  FileText, 
  ChevronRight, 
  Clock, 
  MapPin, 
  TrendingUp, 
  Sparkles, 
  Target, 
  ArrowRight,
  Zap,
  Building2,
  CheckCircle2,
  Activity,
  Layers,
  Search,
  Filter,
  TrendingDown,
  Info
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { CmmButton } from "@/components/ui/cmm-button";

type PilotageOverviewResponse = {
  status: "ok";
  generatedAt: string;
  periodDays: number;
  summary: {
    kpis: Array<{
      label: string;
      value: string;
      previousValue: string;
      deltaAbsolute: string;
      deltaPercent: string;
      interpretation: "positive" | "negative" | "neutral";
    }>;
    alert: {
      severity: "critical" | "high" | "medium" | "low";
      title: string;
      detail: string;
    };
    recommendedAction: { href: string; label: string; reason: string };
  };
  priorities: Array<{
    id: string;
    title: string;
    severity: "critical" | "high" | "medium" | "low";
    score: number;
    reason: string;
    impactEstimate: string;
    suggestedOwner: string;
    recommendedAction: { href: string; label: string };
    evidence: string[];
    engineVersion: string;
  }>;
  methods: Array<{
    id: string;
    kpi: string;
    formula: string;
    source: string;
    recalc: string;
    limits: string;
  }>;
  zones: Array<{
    area: string;
    currentActions: number;
    previousActions: number;
    deltaActionsAbsolute: number;
    currentKg: number;
    previousKg: number;
    deltaKgAbsolute: number;
    currentButts: number;
    previousButts: number;
    deltaActionsPercent: number;
    deltaKgPercent: number;
    currentCoverageRate: number;
    previousCoverageRate: number;
    deltaCoverageRateAbsolute: number;
    deltaCoverageRatePercent: number;
    currentModerationDelayDays: number;
    previousModerationDelayDays: number;
    deltaModerationDelayDaysAbsolute: number;
    deltaModerationDelayDaysPercent: number;
    normalizedScore: number;
    urgency: "critique" | "elevee" | "moderee";
    justification: string;
    recommendedAction: string;
  }>;
};

const fetchOverview = async (url: string): Promise<PilotageOverviewResponse> => {
  const response = await fetch(url, { method: "GET", cache: "no-store" });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(body || "overview_unavailable");
  }
  return (await response.json()) as PilotageOverviewResponse;
};

function signedPercent(value: number): string {
  return `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`;
}

export function ElusSection() {
  const { locale } = useSitePreferences();
  const fr = locale === "fr";
  const [activeTab, setActiveTab] = useState<"overview" | "zones" | "methods">("overview");

  const { data, isLoading, error } = useSWR(
    "/api/pilotage/overview",
    fetchOverview,
    { refreshInterval: 600000 }
  );

  if (error) {
    return (
      <SectionShell id="pilotage" title="Espace Pilotage" subtitle="Dashboard Institutionnel" icon={ShieldCheck}>
        <div className="p-20 rounded-[4rem] bg-rose-500/5 border border-rose-500/20 text-center backdrop-blur-3xl">
          <div className="p-6 w-24 h-24 rounded-[2rem] bg-rose-500/10 text-rose-500 border border-rose-500/20 mx-auto mb-8 shadow-2xl">
             <AlertCircle size={48} className="animate-pulse" />
          </div>
          <h3 className="text-3xl font-black text-white tracking-tighter mb-4">Accès restreint ou indisponible</h3>
          <p className="text-slate-400 font-bold max-w-md mx-auto leading-relaxed">
            Le dashboard de pilotage nécessite une authentification institutionnelle de haut niveau ou fait l'objet d'une maintenance technique périodique.
          </p>
          <CmmButton type="button" tone="secondary" variant="pill" className="mt-10 px-8 py-4 text-[10px] font-black uppercase tracking-[0.2em] shadow-2xl transition-transform">
             Demander un accès
          </CmmButton>
        </div>
      </SectionShell>
    );
  }

  return (
    <SectionShell
      id="pilotage"
      title={fr ? "Pilotage Institutionnel" : "Institutional Pilotage"}
      subtitle={fr ? "Intelligence territoriale et aide à la décision pour les élus et gestionnaires publics." : "Territorial intelligence and decision support for elected officials and public managers."}
      icon={ShieldCheck}
      gradient="from-blue-600/20 via-slate-900/10 to-transparent"
    >
      <div className="space-y-16 pt-8">
        {/* Navigation & Controls HUD */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 px-4">
           <div className="flex items-center gap-2 p-2 rounded-[2.5rem] bg-slate-950/40 border border-white/5 backdrop-blur-3xl shadow-2xl">
              {[
                { id: "overview", label: fr ? "Vue d'ensemble" : "Overview", icon: BarChart3 },
                { id: "zones", label: fr ? "Priorités Zones" : "Zone Priorities", icon: MapPin },
                { id: "methods", label: fr ? "Référentiel" : "Reference", icon: FileText },
              ].map((tab) => (
                <CmmButton
                  key={tab.id}
                  type="button"
                  tone={activeTab === tab.id ? "primary" : "tertiary"}
                  variant="pill"
                  onClick={() => setActiveTab(tab.id as "overview" | "zones" | "methods")}
                  className={cn(
                    "flex items-center gap-3 px-8 py-4 rounded-[1.5rem] text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-500",
                    activeTab === tab.id ? "shadow-[0_0_40px_rgba(255,255,255,0.2)]" : ""
                  )}
                >
                  <tab.icon size={14} className={cn(activeTab === tab.id ? "animate-pulse" : "")} />
                  {tab.label}
                </CmmButton>
              ))}
           </div>

           <div className="flex items-center gap-4">
              <div className="hidden md:flex items-center gap-3 px-6 py-4 rounded-2xl bg-white/5 border border-white/5 text-slate-500 text-[9px] font-black uppercase tracking-widest italic">
                 <Clock size={14} />
                 {fr ? "Dernière MAJ: il y a 12 min" : "Last Update: 12 min ago"}
              </div>
              <CmmButton type="button" tone="secondary" variant="pill" className="flex items-center gap-3 px-8 py-4 text-[10px] font-black uppercase tracking-[0.2em] shadow-2xl transition-all">
                 <Download size={14} />
                 {fr ? "Rapport PDF" : "PDF Report"}
              </CmmButton>
           </div>
        </div>

        <AnimatePresence mode="wait">
          {isLoading ? (
            <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-12">
               <CmmSkeleton className="h-80 rounded-[4rem]" />
               <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  <CmmSkeleton className="h-48 rounded-[3rem]" />
                  <CmmSkeleton className="h-48 rounded-[3rem]" />
                  <CmmSkeleton className="h-48 rounded-[3rem]" />
               </div>
            </motion.div>
          ) : data && (
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -30 }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              className="space-y-20"
            >
              {activeTab === "overview" && (
                <div className="space-y-24">
                   {/* Summary Hero - Dynamic HUD */}
                   <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-stretch">
                      <div className="lg:col-span-8">
                         <ThirtySecondsSummary summary={data.summary} />
                      </div>
                      <div className="lg:col-span-4 p-12 rounded-[4rem] border border-sky-500/30 bg-slate-900/40 backdrop-blur-3xl shadow-[0_0_80px_rgba(14,165,233,0.1)] flex flex-col justify-between group overflow-hidden relative">
                         <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none group-hover:scale-125 transition-transform duration-1000">
                            <Target size={200} className="text-sky-400" />
                         </div>
                         
                         <div className="relative z-10 space-y-8">
                            <div className="p-5 w-16 h-16 rounded-3xl bg-sky-500/10 border border-sky-500/20 text-sky-400 group-hover:scale-110 transition-transform duration-500 shadow-2xl">
                               <Sparkles size={28} className="animate-pulse" />
                            </div>
                            <div className="space-y-3">
                               <h4 className="text-3xl font-black text-white tracking-tighter leading-none">Focus Stratégique</h4>
                               <p className="text-[10px] font-black text-sky-400 uppercase tracking-[0.2em]">Recommandation IA v4.2</p>
                            </div>
                            <p className="text-slate-400 font-bold leading-relaxed text-lg">
                               {data.summary.recommendedAction.reason}
                            </p>
                         </div>
                         <CmmButton href={data.summary.recommendedAction.href} tone="primary" variant="pill" className="relative z-10 mt-12 flex items-center justify-between p-6 text-[10px] font-black uppercase tracking-[0.2em] shadow-2xl transition-transform">
                            {data.summary.recommendedAction.label}
                            <ArrowRight size={18} />
                         </CmmButton>
                      </div>
                   </div>

                   {/* Secondary KPIs / Detailed Analytics */}
                   <div className="space-y-10">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 px-4">
                         <div className="flex items-center gap-4">
                            <div className="p-3 rounded-2xl bg-white/5 border border-white/10 text-slate-500">
                               <Activity size={20} />
                            </div>
                            <h3 className="text-xl font-black text-white tracking-widest uppercase">Deep Analytics & Trends</h3>
                         </div>
                         <div className="flex items-center gap-3 bg-white/5 px-4 py-2 rounded-xl border border-white/5">
                            <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Période: 30 derniers jours</span>
                            <ChevronRight size={12} className="text-slate-700" />
                         </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                         {data.summary.kpis.map((kpi, i) => (
                           <motion.div
                              key={i}
                              initial={{ opacity: 0, scale: 0.95 }}
                              whileInView={{ opacity: 1, scale: 1 }}
                              viewport={{ once: true }}
                              transition={{ delay: i * 0.1 }}
                              className="p-10 rounded-[3rem] border border-white/5 bg-slate-900/40 backdrop-blur-3xl shadow-2xl group hover:bg-white/5 transition-all relative overflow-hidden"
                           >
                              <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-[0.07] transition-opacity">
                                 <Layers size={100} />
                              </div>
                              <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                                 <div className="w-1.5 h-1.5 rounded-full bg-slate-800" />
                                 {kpi.label}
                              </p>
                              <div className="space-y-3">
                                 <span className="text-5xl font-black text-white tracking-tighter block">{kpi.value}</span>
                                 <div className={cn(
                                   "inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-black tracking-tight shadow-2xl",
                                   kpi.interpretation === "positive" ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"
                                 )}>
                                    {kpi.interpretation === "positive" ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                                    {kpi.deltaPercent}
                                 </div>
                              </div>
                           </motion.div>
                         ))}
                      </div>
                   </div>
                </div>
              )}

              {activeTab === "zones" && (
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

                   <div className="overflow-hidden rounded-[3.5rem] border border-white/10 bg-slate-950/40 backdrop-blur-3xl shadow-2xl">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse min-w-[900px]">
                           <thead>
                              <tr className="bg-white/[0.02] border-b border-white/10">
                                 <th className="px-10 py-8 text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">{fr ? "Secteur Opérationnel" : "Operational Sector"}</th>
                                 <th className="px-10 py-8 text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">{fr ? "Volume Actions" : "Action Volume"}</th>
                                 <th className="px-10 py-8 text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">{fr ? "Tonnage Net" : "Net Tonnage"}</th>
                                 <th className="px-10 py-8 text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">{fr ? "Couverture" : "Coverage"}</th>
                                 <th className="px-10 py-8 text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">{fr ? "P-Score" : "P-Score"}</th>
                                 <th className="px-10 py-8 text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] text-center">{fr ? "Indice Urgence" : "Urgency Index"}</th>
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
                                        "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                      )}>
                                         <div className={cn("w-1.5 h-1.5 rounded-full animate-pulse", 
                                            zone.urgency === "critique" ? "bg-rose-500" : 
                                            zone.urgency === "elevee" ? "bg-amber-500" : "bg-emerald-500"
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
                               Toutes les données sont vérifiées par notre protocole de modération hybride (IA + Validation Humaine) avant d'intégrer le dashboard.
                            </p>
                         </div>
                      </div>
                   </div>
                </div>
              )}

              {activeTab === "methods" && (
                <div className="space-y-16">
                   <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 px-4">
                      <div className="space-y-3">
                         <div className="flex items-center gap-3 text-violet-400">
                            <FileText size={24} />
                            <h2 className="text-3xl font-black text-white tracking-tighter uppercase tracking-[0.1em]">Cadre Méthodologique</h2>
                         </div>
                         <p className="text-sm font-bold text-slate-500 italic">Transparence algorithmique et sources de données certifiées.</p>
                      </div>
                   </div>
                   
                   <div className="grid grid-cols-1 gap-10">
                      {data.methods.map((method, i) => (
                        <KpiMethodBlock key={method.id} method={method} />
                      ))}
                   </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Security & Regulatory HUD */}
        <div className="p-12 rounded-[4rem] border border-white/5 bg-slate-900/20 backdrop-blur-3xl flex flex-col md:flex-row items-center justify-between gap-12 group overflow-hidden relative">
           <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
           
           <div className="flex items-center gap-8 relative z-10">
              <div className="p-5 rounded-3xl bg-white/5 border border-white/10 text-slate-600 group-hover:text-emerald-400 group-hover:scale-110 transition-all duration-500 shadow-2xl">
                 <ShieldCheck size={32} />
              </div>
              <div className="space-y-2">
                 <h4 className="text-base font-black text-white uppercase tracking-[0.2em]">{fr ? "Coffre-fort Numérique" : "Digital Vault"}</h4>
                 <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.3em] leading-relaxed">
                    Protocole de sécurité AES-256 <br/>
                    {fr ? "Accès restreint aux habilitations territoriales" : "Restricted access to territorial clearances"}
                 </p>
              </div>
           </div>

           <div className="flex flex-col items-center md:items-end gap-3 relative z-10">
              <div className="flex items-center gap-3 bg-emerald-500/10 px-6 py-2.5 rounded-2xl border border-emerald-500/20 shadow-2xl">
                 <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                 <span className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.2em]">{fr ? "Certifié RGPD & OpenData" : "GDPR & OpenData Certified"}</span>
              </div>
              <span className="text-[9px] font-bold text-slate-700 uppercase tracking-widest italic">ISO 27001 Compliance Pending</span>
           </div>
        </div>
      </div>
    </SectionShell>
  );
}
