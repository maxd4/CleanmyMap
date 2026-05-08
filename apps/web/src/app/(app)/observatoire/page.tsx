import type { Metadata } from "next";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { loadPilotageOverview } from "@/lib/pilotage/overview";
import { fetchUnifiedActionContracts } from "@/lib/actions/unified-source";
import { aggregateMonthlyAnalytics } from "@/lib/pilotage/analytics-data-utils";
import Link from "next/link";
import dynamic from "next/dynamic";
import { Globe, ShieldCheck, ArrowRight, Activity, Zap, Eye, BarChart3 } from "lucide-react";
import { getBlockClasses } from "@/lib/ui/block-accents";
import { cn } from "@/lib/utils";

export const revalidate = 60; // 1 minute Cache for public observatory

const AnalyticsCockpit = dynamic(
  () => import("@/components/reports/analytics-cockpit").then(mod => mod.AnalyticsCockpit),
  { loading: () => <div className="h-96 w-full animate-pulse bg-white/5 rounded-[3rem] border border-white/5" /> }
);

export const metadata: Metadata = {
  title: "Observatoire public d'impact | CleanMyMap",
  description: "Données publiques de dépollution, mises à jour en continu et lues avec une méthode documentée.",
  openGraph: {
    title: "Observatoire public d'impact | CleanMyMap",
    description: "Indicateurs de masse totale, mobilisation et actions validées en temps réel.",
    type: "website",
  },
};

async function loadPublicStats() {
  const supabase = getSupabaseServerClient();
  
  const [overview, contractsResult] = await Promise.all([
    loadPilotageOverview({
      supabase,
      periodDays: 365,
      limit: 2000,
    }),
    fetchUnifiedActionContracts(supabase, {
      limit: 1000,
      status: "approved",
      floorDate: null,
      requireCoordinates: false,
      types: null,
    }),
  ]);

  return { overview, contracts: contractsResult.items };
}

export default async function ObservatoirePage() {
  const data = await loadPublicStats().catch(() => null);
  const overview = data?.overview;
  const monthlyData = data ? aggregateMonthlyAnalytics(data.contracts) : [];
  const classes = getBlockClasses("pilot");

  return (
    <div className="w-full max-w-[1400px] mx-auto space-y-24 pb-24 px-6 sm:px-0">
      {/* Premium Observatory Header */}
      <header className="relative space-y-12 pt-16">
        <div className="absolute -top-24 -left-24 w-[600px] h-[600px] bg-amber-500/10 rounded-full blur-[120px] pointer-events-none" />
        
        <div className="flex flex-wrap gap-3">
          <div className="inline-flex items-center gap-3 px-6 py-2.5 rounded-full border border-amber-400/20 bg-amber-400/5 backdrop-blur-md">
            <Globe size={14} className="text-amber-400 animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-amber-400">Observatoire Public</span>
          </div>
          <div className="inline-flex items-center gap-3 px-5 py-2.5 bg-white/5 rounded-full border border-white/5 text-[10px] font-black uppercase tracking-widest text-white/40 backdrop-blur-md">
            <Eye size={12} className="text-amber-400/60" />
            Données Ouvertes
          </div>
        </div>

        <div className="space-y-6">
          <h1 className="text-7xl md:text-8xl xl:text-9xl font-black text-white tracking-tighter leading-[0.85] uppercase">
            Impact <br/>Global
          </h1>
          <p className="text-2xl text-white/30 max-w-2xl font-medium leading-tight tracking-tight">
            Transparence totale sur l&apos;état de la dépollution citoyenne. Suivez les indicateurs clés et l&apos;évolution de la propreté de nos territoires.
          </p>
        </div>
      </header>

      {/* Main Observatory Stats */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[
          { 
            label: "Volume Total Extrait", 
            value: overview ? `${overview.comparison.current.impactVolumeKg.toLocaleString()}kg` : "---", 
            color: "text-amber-400" 
          },
          { 
            label: "Bénévoles Mobilisés", 
            value: overview ? overview.comparison.current.mobilizationCount.toLocaleString() : "---", 
            color: "text-white" 
          },
          { 
            label: "Actions Validées", 
            value: overview ? overview.comparison.current.approvedActions.toLocaleString() : "---", 
            color: "text-white" 
          },
        ].map((stat, i) => (
          <div key={i} className={cn(
            "rounded-[3.5rem] border border-white/5 bg-white/5 backdrop-blur-3xl p-12 flex flex-col justify-between aspect-square transition-all duration-700 hover:bg-white/10",
            classes.shadow
          )}>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/20">{stat.label}</p>
            <p className={cn("text-6xl font-black tracking-tighter", stat.color)}>{stat.value}</p>
          </div>
        ))}
      </section>

      {/* Interactive Visualization Zone */}
      <section className="space-y-12">
        <div className="flex items-center gap-4 px-2">
          <div className="p-3 rounded-2xl bg-amber-400/10 text-amber-400">
            <BarChart3 size={20} />
          </div>
          <h2 className="text-xs font-black uppercase tracking-[0.4em] text-white/40">Analyse Comparative</h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          <div className={cn(
            "lg:col-span-2 rounded-[4rem] border border-white/5 bg-white/5 backdrop-blur-3xl p-1 sm:p-12 min-h-[600px] relative overflow-hidden",
            classes.shadow
          )}>
            <div className="absolute -top-40 -right-40 w-[600px] h-[600px] bg-amber-500/5 rounded-full blur-[120px] pointer-events-none" />
            <div className="relative z-10 h-full">
              <AnalyticsCockpit data={monthlyData} />
            </div>
          </div>

          <div className="space-y-10">
            <div className={cn(
              "rounded-[3rem] border border-white/5 bg-white/5 backdrop-blur-3xl p-10 space-y-8",
              classes.shadow
            )}>
              <div className="space-y-2">
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-amber-400">Méthodologie</p>
                <h3 className="text-xl font-black text-white uppercase tracking-tighter">Données Certifiées</h3>
              </div>
              <p className="text-sm text-white/30 font-medium leading-relaxed">
                Chaque kg de déchet et chaque mégot affiché ici provient d&apos;une action terrain géolocalisée et vérifiée par notre protocole Cockpit.
              </p>
              <div className="pt-4 flex flex-col gap-3">
                <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-widest text-white/40">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  Source : Rapports Citoyens
                </div>
                <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-widest text-white/40">
                  <div className="w-1.5 h-1.5 rounded-full bg-sky-400" />
                  Calcul : Algorithmes CleanMyMap
                </div>
              </div>
            </div>

            <div className={cn(
              "rounded-[3rem] border border-white/5 bg-white/5 backdrop-blur-3xl p-10 space-y-8 group hover:bg-white/10 transition-all cursor-pointer",
              classes.shadow
            )}>
              <div className="flex items-center justify-between">
                <Zap className="text-amber-400" size={24} />
                <ArrowRight className="text-white/20 group-hover:translate-x-2 transition-transform" size={20} />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-black text-white uppercase tracking-tighter">Devenir Sponsor</h3>
                <p className="text-sm text-white/30 font-medium leading-relaxed">
                  Accédez à des rapports personnalisés et boostez votre RSE en parrainant des zones de nettoyage.
                </p>
              </div>
              <Link 
                href="/sponsor-portal" 
                className="block w-full py-5 rounded-2xl bg-white text-black text-center text-[10px] font-black uppercase tracking-[0.2em] transition-all active:scale-95"
              >
                Accéder au Portail
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer Info */}
      <footer className="pt-16 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-8">
        <div className="flex items-center gap-6 text-[10px] font-black uppercase tracking-[0.3em] text-white/20">
          <span>Open Data v2.4</span>
          <div className="w-1.5 h-1.5 rounded-full bg-amber-400" />
          <span>Mise à jour quotidienne</span>
        </div>
        <p className="text-[10px] font-black uppercase tracking-widest text-white/10">
          © {new Date().getFullYear()} CleanMyMap Cockpit • Tous droits réservés
        </p>
      </footer>
    </div>
  );
}
