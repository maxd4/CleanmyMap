import type { Metadata } from "next";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { loadPilotageOverview } from "@/lib/pilotage/overview";
import { fetchUnifiedActionContracts } from "@/lib/actions/unified-source";
import { aggregateMonthlyAnalytics } from "@/lib/pilotage/analytics-data-utils";
import Link from "next/link";
import dynamic from "next/dynamic";
import { Globe, ShieldCheck, ArrowRight, Activity, Zap, Eye, BarChart3, Users, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { SectionShell } from "@/components/sections/rubriques/shared";
import { RubriqueCard } from "@/components/ui/rubrique-card";
import { RubriquePdfExportButton } from "@/components/ui/rubrique-pdf-export-button";

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
  const observatoirePdfData = overview
    ? {
        title: "Rapport observatoire public",
        summary: [
          "Synthèse publique des données de dépollution citoyenne visibles sur l'observatoire.",
          `Période analysée: ${overview.periodDays} jours.`,
          overview.summary.alert.detail,
        ],
        stats: [
          { label: "Volume total extrait", value: `${overview.comparison.current.impactVolumeKg.toFixed(1)} kg` },
          { label: "Bénévoles mobilisés", value: overview.comparison.current.mobilizationCount },
          { label: "Actions validées", value: overview.comparison.current.approvedActions },
          { label: "Couverture géographique", value: `${overview.comparison.current.coverageRate.toFixed(1)}%` },
          { label: "Qualité data", value: `${overview.comparison.current.qualityScore.toFixed(1)}%` },
        ],
        rows: monthlyData.map((item) => ({
          Mois: item.month,
          Masse_Kg: item.kg,
          Bénévoles: item.volunteers,
        })),
        columns: [
          { key: "Mois", label: "Mois" },
          { key: "Masse_Kg", label: "Masse (kg)" },
          { key: "Bénévoles", label: "Bénévoles" },
        ],
        generatedAt: overview.generatedAt,
      }
    : null;

  return (
    <SectionShell
      id="observatoire"
      title="Impact Global"
      subtitle="Transparence totale sur l'état de la dépollution citoyenne. Suivez les indicateurs clés et l'évolution de la propreté de nos territoires."
      gradient="from-amber-500/20 via-slate-500/10 to-transparent"
    >
      <div className="space-y-24 pt-8">
        {/* Badges Status */}
        <div className="flex flex-wrap gap-3">
          <div className="inline-flex items-center gap-3 px-6 py-2.5 rounded-full border border-amber-400/20 bg-amber-400/5 backdrop-blur-md">
            <Globe size={14} className="text-amber-400 animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-amber-400">Observatoire Public</span>
          </div>
          <div className="inline-flex items-center gap-3 px-5 py-2.5 bg-white/5 rounded-full border border-white/5 text-[10px] font-black uppercase tracking-widest text-white/40 backdrop-blur-md">
            <Eye size={12} className="text-amber-400/60" />
            Données Ouvertes
          </div>
          <RubriquePdfExportButton
            rubrique="observatoire"
            periode={`365_jours_${new Date().getFullYear()}`}
            organizationType="public"
            defaultTitle="Rapport observatoire public"
            data={observatoirePdfData}
            disabled={!overview}
            className="w-full max-w-xl"
          />
        </div>

        {/* Main Observatory Stats */}
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {[
            { 
              label: "Volume Total Extrait", 
              value: overview ? `${overview.comparison.current.impactVolumeKg.toLocaleString()}kg` : "---", 
              color: "text-amber-400",
              icon: Activity
            },
            { 
              label: "Bénévoles Mobilisés", 
              value: overview ? overview.comparison.current.mobilizationCount.toLocaleString() : "---", 
              color: "text-white",
              icon: Users
            },
            { 
              label: "Actions Validées", 
              value: overview ? overview.comparison.current.approvedActions.toLocaleString() : "---", 
              color: "text-white",
              icon: CheckCircle
            },
          ].map((stat, i) => (
            <RubriqueCard 
              key={i} 
              themeColor={i === 0 ? "amber" : "slate"}
              withTopBar={false}
              className="p-12 flex flex-col justify-between aspect-square group"
            >
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/20 group-hover:text-white/40 transition-colors">{stat.label}</p>
              <p className={cn("text-6xl font-black tracking-tighter transition-transform group-hover:scale-105", stat.color)}>{stat.value}</p>
            </RubriqueCard>
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
            <RubriqueCard 
              themeColor="amber"
              withTopBar={true}
              topBarContent="Rapport d'activité mensuel"
              className="lg:col-span-2 p-1 sm:p-12 min-h-[600px]"
            >
              <div className="relative z-10 h-full">
                <AnalyticsCockpit data={monthlyData} />
              </div>
            </RubriqueCard>

            <div className="space-y-10">
              <RubriqueCard themeColor="slate" withTopBar={false} className="p-10 space-y-8">
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
              </RubriqueCard>

              <RubriqueCard themeColor="amber" withTopBar={false} className="p-10 space-y-8 group cursor-pointer">
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
              </RubriqueCard>
            </div>
          </div>
        </section>

      </div>
    </SectionShell>
  );
}
