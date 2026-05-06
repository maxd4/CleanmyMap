"use client";

import { useTranslation } from "@/lib/i18n/use-translation";
import { motion } from "framer-motion";
import { TrendingDown, Globe, Wallet, User, Clock, Droplets, Info, Users, Trash2, TrendingUp, BarChart3 } from "lucide-react";
import Link from "next/link";
import useSWR from "swr";
import { fetchActions } from "@/lib/actions/http";
import { CmmSkeleton, SkeletonGrid } from "@/components/ui/cmm-skeleton";

interface NationalStat {
  value: string;
  unit: string;
  title: string;
  desc: string;
  equivalent?: string;
}

const CONTEXT_STATS: Record<string, NationalStat> = {
  annualToll: {
    value: "1M",
    unit: "tonnes",
    title: "Tonnage annuel",
    desc: "de déchets abandonnés chaque année en France métropolitaine",
    equivalent: "Soit l'équivalent de 100 Tours Eiffel",
  },
  cost: {
    value: "1.2Mds",
    unit: "€",
    title: "Coût annuel",
    desc: "dépensés par les collectivités pour le nettoyage des déchets sauvages",
  },
  perCapita: {
    value: "32",
    unit: "kg",
    title: "Par habitant",
    desc: "de déchets abandonnés annuellement par habitant",
  },
  decomposition: {
    value: "450",
    unit: "ans",
    title: "Temps de décomposition",
    desc: "pour un plastique classique dans la nature",
  },
  waterImpact: {
    value: "80%",
    unit: "",
    title: "Pollution aquatique",
    desc: "des déchets abandonnés finissent dans les cours d'eau et les océans",
  },
};

const STAT_SOURCES: Record<string, string> = {
  annualToll: "ADEME / Gestes Propres",
  cost: "Ministère Transition écologique",
  perCapita: "ADEME 2023",
  decomposition: "Scientific literature",
  waterImpact: "Ocean Conservancy",
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

function PlatformStatsSection() {
  const { data, isLoading } = useSWR("platform-stats", () => 
    fetchActions({ status: "approved", limit: 5000 }), 
    { revalidateOnFocus: false }
  );
  
  const stats = data?.items ? computePlatformStats(data.items) : null;
  
  const statItems = [
    { label: "Déchets collectés", value: stats ? `${formatNumber(stats.totalKg)} kg` : "...", icon: Trash2, bgClass: "bg-emerald-500/10", textClass: "text-emerald-600" },
    { label: "Actions validées", value: stats ? formatNumber(stats.totalActions) : "...", icon: TrendingUp, bgClass: "bg-rose-500/10", textClass: "text-rose-600" },
    { label: "Bénévoles actifs", value: stats ? formatNumber(stats.totalVolunteers) : "...", icon: Users, bgClass: "bg-orange-500/10", textClass: "text-orange-600" },
    { label: "Heures bénévoles", value: stats ? `${stats.hours}h` : "...", icon: Clock, bgClass: "bg-amber-500/10", textClass: "text-amber-600" },
  ];
  
  if (isLoading) {
    return (
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: i * 0.1 }}
            className="relative overflow-hidden rounded-[2rem] bg-white border border-slate-100 p-6 shadow-xl"
          >
            <CmmSkeleton variant="rectangular" className="w-10 h-10 rounded-2xl mb-4" />
            <CmmSkeleton variant="text" className="h-8 w-24 mb-2" />
            <CmmSkeleton variant="text" className="h-3 w-32" />
          </motion.div>
        ))}
      </div>
    );
  }
  
  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
      {statItems.map((item, i) => (
        <motion.div
          key={item.label}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.1 }}
          className="relative overflow-hidden rounded-[2rem] bg-white border border-slate-100 p-6 shadow-xl"
        >
          <div className={`w-10 h-10 rounded-2xl ${item.bgClass} flex items-center justify-center mb-4`}>
            <item.icon size={18} className={item.textClass} />
          </div>
          <p className="text-2xl font-black tracking-tight cmm-text-primary">{item.value}</p>
          <p className="text-xs font-medium text-slate-500 uppercase tracking-widest mt-1">{item.label}</p>
        </motion.div>
      ))}
    </div>
  );
}

function BarometerSection() {
  const { t } = useTranslation("nationalStats");
  
  const barometerData = [
    { label: "Français préoccupés par la propreté", value: "78%", trend: "+5%" },
    { label: "Considèrent la problématique grave", value: "65%", trend: "+8%" },
    { label: "Sont prêts à participer à des opérations", value: "42%", trend: "+3%" },
  ];
  
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <BarChart3 size={24} className="text-yellow-500" />
        <h3 className="text-xl font-black tracking-tight cmm-text-primary">Baromètre national</h3>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        {barometerData.map((item, i) => (
          <motion.div
            key={item.label}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.15 }}
            className="p-6 rounded-[2rem] bg-gradient-to-br from-yellow-50 to-amber-50 border border-yellow-100/50 shadow-sm"
          >
            <p className="text-3xl font-black text-amber-600">{item.value}</p>
            <p className="text-sm font-medium cmm-text-secondary mt-2">{item.label}</p>
            <span className="inline-block mt-3 text-xs font-bold text-amber-700 bg-amber-100/50 px-2 py-1 rounded-full">
              {item.trend} vs N-1
            </span>
          </motion.div>
        ))}
      </div>
      <p className="text-xs text-slate-400 text-center">Source : Enquête IFOP pour Gestes Propres 2024</p>
    </div>
  );
}

export function NationalStatsSection() {
  const { t } = useTranslation("nationalStats");

  const contextStats = [
    { key: "annualToll", icon: Globe, iconColor: "text-rose-500", bg: "bg-rose-500/10", border: "border-rose-500/20", textColor: "text-rose-600" },
    { key: "cost", icon: Wallet, iconColor: "text-orange-500", bg: "bg-orange-500/10", border: "border-orange-500/20", textColor: "text-orange-600" },
    { key: "perCapita", icon: User, iconColor: "text-amber-500", bg: "bg-amber-500/10", border: "border-amber-500/20", textColor: "text-amber-600" },
    { key: "decomposition", icon: Clock, iconColor: "text-yellow-500", bg: "bg-yellow-500/10", border: "border-yellow-500/20", textColor: "text-yellow-600" },
    { key: "waterImpact", icon: Droplets, iconColor: "text-emerald-500", bg: "bg-emerald-500/10", border: "border-emerald-500/20", textColor: "text-emerald-600" },
  ];

  return (
    <section className="w-full max-w-7xl mx-auto p-6 sm:p-8 xl:px-10 space-y-16">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center space-y-4"
      >
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-rose-500/10 text-rose-600 border border-rose-100 shadow-sm">
          <TrendingDown size={14} className="animate-pulse" />
          <span className="text-[10px] font-black uppercase tracking-[0.2em]">{t("header_suptitle")}</span>
        </div>
        <h2 className="text-3xl md:text-4xl font-black tracking-tight cmm-text-primary">{t("header_title")}</h2>
        <p className="text-lg cmm-text-secondary max-w-2xl mx-auto font-medium leading-relaxed">{t("header_desc")}</p>
      </motion.div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-5">
        {contextStats.map((stat, index) => {
          const data = CONTEXT_STATS[stat.key];
          if (!data) {
            return null;
          }
          const Icon = stat.icon;
          return (
            <motion.div
              key={stat.key}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`relative overflow-hidden rounded-[2rem] border ${stat.border} bg-white p-6 shadow-xl shadow-slate-200/50 `}
            >
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <Icon size={80} className={stat.iconColor} />
              </div>
              <div className="relative z-10 space-y-3">
                <div className={`w-10 h-10 rounded-2xl ${stat.bg} flex items-center justify-center`}>
                  <Icon size={18} className={stat.textColor} />
                </div>
                <div className="space-y-1">
                  <div className="flex items-baseline gap-1">
                    <span className={`text-3xl font-black tracking-tight ${stat.textColor}`}>{data.value}</span>
                    {data.unit && <span className="text-sm font-bold text-slate-500">{data.unit}</span>}
                  </div>
                  <p className="text-xs font-black uppercase tracking-widest text-slate-400">{data.title}</p>
                </div>
                <p className="text-sm cmm-text-secondary font-medium leading-relaxed">{data.desc}</p>
                {data.equivalent && (
                  <div className="pt-2 text-xs font-medium text-amber-600 bg-amber-50 px-3 py-1.5 rounded-lg">{data.equivalent}</div>
                )}
                <p className="text-[10px] font-medium text-slate-400 pt-2 border-t border-slate-100 ">Source: {STAT_SOURCES[stat.key]}</p>
              </div>
            </motion.div>
          );
        })}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="space-y-6"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 flex items-center justify-center">
            <Trash2 size={18} className="text-emerald-600" />
          </div>
          <h3 className="text-xl font-black tracking-tight cmm-text-primary">Impact de la communauté CleanMyMap</h3>
        </div>
        <p className="text-sm cmm-text-secondary max-w-2xl">
          Voici ce que la communauté a accompli ensemble. Ces chiffres sont mis à jour en temps réel à partir des actions déclarées et validées.
        </p>
        <PlatformStatsSection />
      </motion.div>

      <BarometerSection />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="flex flex-col sm:flex-row items-center justify-between gap-6 p-6 rounded-[2rem] bg-slate-50/50 backdrop-blur-sm border border-slate-100 "
      >
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-slate-200 flex items-center justify-center">
            <Info size={20} className="text-slate-600" />
          </div>
          <div>
            <p className="text-sm font-bold cmm-text-primary">Sources</p>
            <p className="text-xs cmm-text-muted space-y-1">
              <span className="block">📊 Baromètre : IFOP pour Gestes Propres 2024</span>
              <span className="block">🏛️ Stats nationales : ADEME 2023 • Ministère Transition écologique</span>
              <span className="block">♻️ Platform stats : Données CleanMyMap en temps réel</span>
            </p>
          </div>
        </div>
        <Link href="/methodologie" className="px-6 py-3 bg-slate-900 text-white rounded-full text-sm font-bold hover:opacity-90 transition-opacity">
          {t("cta.label")}
        </Link>
      </motion.div>

      <motion.blockquote
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.6 }}
        className="text-center p-8 rounded-[2rem] bg-gradient-to-r from-emerald-500/10 to-rose-500/10 border border-emerald-100/50 backdrop-blur-md"
      >
        <p className="text-xl font-medium italic cmm-text-primary">"{t("quote.text", { defaultValue: "Seul on va plus vite, ensemble on nettoie plus loin." })}"</p>
        <p className="text-sm font-bold text-slate-500 mt-2">— {t("quote.author", { defaultValue: "La communauté CleanMyMap" })}</p>
      </motion.blockquote>
    </section>
  );
}
