"use client";

import { motion, AnimatePresence } from "framer-motion";
import { 
  TrendingDown, 
  Globe, 
  Wallet, 
  User, 
  Clock, 
  Droplets, 
  Info, 
  Users, 
  Trash2, 
  TrendingUp, 
  BarChart3, 
  ArrowRight, 
  Quote, 
  Sparkles, 
  Target,
  ShieldCheck,
  Zap,
  Leaf
} from "lucide-react";
import useSWR from "swr";
import { fetchActions } from "@/lib/actions/http";
import { CmmButton } from "@/components/ui/cmm-button";
import { CmmSkeleton } from "@/components/ui/cmm-skeleton";
import { SectionShell } from "@/components/sections/rubriques/shared";
import { useSitePreferences } from "@/components/ui/site-preferences-provider";
import { cn } from "@/lib/utils";

interface NationalStat {
  value: string;
  unit: string;
  title: string;
  desc: string;
  equivalent?: string;
  icon: any;
  color: string;
}

const CONTEXT_STATS: Record<string, NationalStat> = {
  annualToll: {
    value: "1M",
    unit: "tonnes",
    title: "Tonnage annuel",
    desc: "de déchets abandonnés chaque année en France métropolitaine",
    equivalent: "Soit l'équivalent de 100 Tours Eiffel",
    icon: Trash2,
    color: "text-amber-400"
  },
  cost: {
    value: "1.2Mds",
    unit: "€",
    title: "Coût annuel",
    desc: "dépensés par les collectivités pour le nettoyage des déchets sauvages",
    icon: Wallet,
    color: "text-rose-400"
  },
  perCapita: {
    value: "32",
    unit: "kg",
    title: "Par habitant",
    desc: "de déchets abandonnés annuellement par habitant",
    icon: User,
    color: "text-blue-400"
  },
  decomposition: {
    value: "450",
    unit: "ans",
    title: "Décomposition",
    desc: "pour un plastique classique dans la nature",
    icon: Clock,
    color: "text-purple-400"
  },
  waterImpact: {
    value: "80%",
    unit: "",
    title: "Pollution aquatique",
    desc: "des déchets abandonnés finissent dans les cours d'eau et les océans",
    icon: Droplets,
    color: "text-sky-400"
  },
};

const STAT_SOURCES: Record<string, string> = {
  annualToll: "ADEME / Gestes Propres",
  cost: "Ministère Transition écologique",
  perCapita: "ADEME 2023",
  decomposition: "Scientific literature",
  waterImpact: "Ocean Conservancy",
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 }
};

function formatNumber(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}k`;
  return num.toString();
}

function computePlatformStats(actions: any[]) {
  const totalKg = actions.reduce((sum, a) => sum + Number(a.waste_kg || 0), 0);
  const totalButts = actions.reduce((sum, a) => sum + Number(a.cigarette_butts || 0), 0);
  const totalMinutes = actions.reduce((sum, a) => sum + Number(a.duration_minutes || 0), 0);
  const volunteers = new Set(actions.map(a => a.created_by)).size;
  
  const waterSaved = totalButts * 500;
  const co2Avoided = totalKg * 2.5;
  
  return {
    totalKg: Math.round(totalKg),
    totalActions: actions.length,
    totalVolunteers: volunteers,
    waterSaved: Math.round(waterSaved),
    co2Avoided: Math.round(co2Avoided),
    hours: Math.round(totalMinutes / 60),
  };
}

export function NationalStatsSection() {
  const { locale } = useSitePreferences();
  const fr = locale === "fr";

  const { data, isLoading, error } = useSWR(["national-platform-stats"], () =>
    fetchActions({ status: "approved", limit: 5000 }),
  );

  const platformStats = data ? computePlatformStats(data.items) : null;

  return (
    <SectionShell
      id="impact-national"
      title={fr ? "Échelle & Impact" : "Scale & Impact"}
      subtitle={fr ? "Perspective globale et contribution de la plateforme à l'effort national." : "Global perspective and platform contribution to the national effort."}
      icon={Globe}
      gradient="from-sky-500/20 via-slate-500/10 to-transparent"
    >
      <div className="space-y-24 pt-8">
        {/* Context Grid - National Perspective */}
        <div className="space-y-12">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 px-4">
             <div className="space-y-4">
                <div className="inline-flex items-center gap-3 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 shadow-2xl">
                   <Target size={14} />
                   {fr ? "Le Défi National" : "The National Challenge"}
                </div>
                <h2 className="text-4xl md:text-5xl font-black text-white tracking-tighter leading-tight">
                   L'état des lieux <br/> métropolitain
                </h2>
             </div>
             <p className="max-w-md text-lg text-slate-400 font-bold leading-relaxed opacity-80">
                {fr ? "Comprendre l'ampleur du problème pour mieux dimensionner nos solutions locales." : "Understand the scale of the problem to better size our local solutions."}
             </p>
          </div>

          <motion.div 
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
          >
            {Object.entries(CONTEXT_STATS).map(([key, stat], i) => (
              <motion.article
                key={key}
                variants={itemVariants}
                className="group relative overflow-hidden rounded-[3rem] border border-white/10 bg-slate-900/40 p-10 backdrop-blur-3xl shadow-2xl transition-all hover:bg-white/5"
              >
                <div className="relative z-10 space-y-8">
                  <div className={cn(
                    "flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-950/40 border border-white/10 shadow-2xl group-hover:scale-110 transition-transform duration-500",
                    stat.color
                  )}>
                    <stat.icon size={32} />
                  </div>
                  <div>
                    <div className="flex items-baseline gap-2">
                      <p className="text-5xl font-black tracking-tighter text-white">{stat.value}</p>
                      <p className="text-xl font-black text-slate-500 uppercase tracking-tighter">{stat.unit}</p>
                    </div>
                    <p className="mt-2 text-sm font-black text-white uppercase tracking-widest">{stat.title}</p>
                  </div>
                  <div className="space-y-4">
                    <p className="text-sm font-bold text-slate-400 leading-relaxed opacity-80">{stat.desc}</p>
                    {stat.equivalent && (
                      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-white/5 border border-white/5 text-[10px] font-black uppercase tracking-widest text-slate-500 italic">
                        {stat.equivalent}
                      </div>
                    )}
                  </div>
                  <div className="pt-6 border-t border-white/5 flex items-center justify-between">
                     <span className="text-[9px] font-black uppercase tracking-widest text-slate-600">Source: {STAT_SOURCES[key]}</span>
                     <Info size={12} className="text-slate-700" />
                  </div>
                </div>
                <div className={cn(
                  "absolute -right-16 -bottom-16 opacity-5 transition-all duration-1000 group-hover:scale-125 group-hover:opacity-10",
                  stat.color
                )}>
                  <stat.icon size={250} />
                </div>
              </motion.article>
            ))}
          </motion.div>
        </div>

        {/* Platform Contribution - Hero Impact Section */}
        {isLoading ? (
          <CmmSkeleton className="h-[500px] rounded-[4rem]" />
        ) : platformStats && (
          <motion.section 
            initial={{ opacity: 0, scale: 0.98 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="relative p-12 md:p-20 rounded-[4rem] border border-sky-500/30 bg-slate-900/40 backdrop-blur-3xl shadow-[0_0_100px_rgba(14,165,233,0.1)] overflow-hidden group"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-sky-500/10 via-blue-500/5 to-transparent opacity-50" />
            <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none group-hover:scale-110 transition-transform duration-1000">
               <Sparkles size={300} className="text-sky-400" />
            </div>

            <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
              <div className="space-y-12">
                <div className="space-y-6">
                  <div className="inline-flex items-center gap-3 px-5 py-2 rounded-2xl bg-sky-500/10 border border-sky-500/20 text-[10px] font-black uppercase tracking-[0.3em] text-sky-400 shadow-2xl">
                    <Sparkles size={16} className="animate-pulse" />
                    {fr ? "Impact de la Plateforme" : "Platform Impact"}
                  </div>
                  <h2 className="text-5xl md:text-6xl font-black text-white tracking-tighter leading-tight">
                    Notre contribution <br/> collective
                  </h2>
                  <p className="text-xl text-slate-400 font-bold leading-relaxed max-w-lg opacity-80">
                    {fr ? "Chaque geste sur le terrain se transforme en indicateur de changement positif pour le territoire." : "Every action on the field transforms into a positive change indicator for the territory."}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-8">
                  <div className="space-y-2">
                    <p className="text-5xl font-black text-white tracking-tighter">{formatNumber(platformStats.totalKg)}</p>
                    <p className="text-[10px] font-black text-sky-400 uppercase tracking-[0.2em]">KG Collectés</p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-5xl font-black text-white tracking-tighter">{formatNumber(platformStats.totalVolunteers)}</p>
                    <p className="text-[10px] font-black text-blue-400 uppercase tracking-[0.2em]">Bénévoles Actifs</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[
                  { label: fr ? "Eau préservée" : "Water saved", val: `${formatNumber(platformStats.waterSaved)}L`, icon: Droplets, color: "text-sky-400", bg: "bg-sky-500/5", border: "border-sky-500/10" },
                  { label: fr ? "CO2 Évité" : "CO2 Avoided", val: `${formatNumber(platformStats.co2Avoided)}kg`, icon: Leaf, color: "text-emerald-400", bg: "bg-emerald-500/5", border: "border-emerald-500/10" },
                  { label: fr ? "Actions menées" : "Actions led", val: platformStats.totalActions, icon: Zap, color: "text-amber-400", bg: "bg-amber-500/5", border: "border-amber-500/10" },
                  { label: fr ? "Heures terrain" : "Field hours", val: platformStats.hours, icon: Clock, color: "text-indigo-400", bg: "bg-indigo-500/5", border: "border-indigo-500/10" },
                ].map((item, i) => (
                  <div key={i} className={cn("p-8 rounded-[2.5rem] border backdrop-blur-xl group/card hover:bg-white/5 transition-all", item.bg, item.border)}>
                     <item.icon size={24} className={cn("mb-6 group-hover/card:scale-125 transition-transform duration-500", item.color)} />
                     <p className="text-2xl font-black text-white tracking-tight">{item.val}</p>
                     <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500 mt-1">{item.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </motion.section>
        )}

        {/* Final Methodology Callout */}
        <div className="p-12 rounded-[3rem] border border-white/5 bg-slate-900/20 backdrop-blur-xl flex flex-col md:flex-row items-center justify-between gap-8 relative overflow-hidden group">
           <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none group-hover:rotate-12 transition-transform duration-1000">
              <BarChart3 size={120} className="text-slate-400" />
           </div>
           <div className="flex items-start gap-8 relative z-10">
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 text-slate-500">
                 <Info size={28} />
              </div>
              <div className="space-y-2 max-w-2xl">
                 <h4 className="text-lg font-black text-white tracking-tight uppercase tracking-[0.1em]">{fr ? "Rigueur des données" : "Data Rigor"}</h4>
                 <p className="text-sm font-bold text-slate-400 leading-relaxed opacity-80">
                    Les indicateurs de la plateforme sont calculés selon les ratios de l'ADEME et les publications scientifiques de référence (ex: 1 mégot pollue 500L d'eau). Notre base de données est auditable et ouverte aux chercheurs.
                 </p>
              </div>
           </div>
           <CmmButton href="/methodologie" tone="secondary" variant="pill" className="relative z-10 px-8 py-4 text-[10px] font-black uppercase tracking-[0.2em] gap-3">
              En savoir plus
              <ArrowRight size={16} />
           </CmmButton>
        </div>
      </div>
    </SectionShell>
  );
}
