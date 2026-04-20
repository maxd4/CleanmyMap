import type { Metadata } from "next";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { loadPilotageOverview } from "@/lib/pilotage/overview";
import { fetchUnifiedActionContracts } from "@/lib/actions/unified-source";
import { aggregateMonthlyAnalytics } from "@/lib/pilotage/analytics-data-utils";
import { ThirtySecondsSummary } from "@/components/pilotage/thirty-seconds-summary";
import Link from "next/link";
import dynamic from "next/dynamic";
import { Globe, ShieldCheck, Zap } from "lucide-react";
import { getServerDisplayMode } from "@/lib/server-preferences";

export const revalidate = 60; // 1 minute Cache for public observatory

const AnalyticsCockpit = dynamic(
  () => import("@/components/reports/analytics-cockpit").then(mod => mod.AnalyticsCockpit),
  { ssr: false, loading: () => <div className="h-96 w-full animate-pulse bg-slate-800/10 rounded-3xl" /> }
);

export const metadata: Metadata = {
  title: "Observatoire Public - CleanMyMap",
  description: "Accédez en temps réel aux données de dépollution nationale. Un effort collectif mesuré par des protocoles scientifiques rigoureux.",
  openGraph: {
    title: "Observatoire Public d'Impact | CleanMyMap",
    description: "Indicateurs de masse totale, mobilisation et actions validées en temps réel.",
    type: "website",
  },
};

async function loadPublicStats() {
  const supabase = getSupabaseServerClient();
  const overview = await loadPilotageOverview({
    supabase,
    periodDays: 365, // Vue annuelle pour l'observatoire
    limit: 2000,
  });
  
  const { items: contracts } = await fetchUnifiedActionContracts(supabase, {
    limit: 1000,
    status: "approved",
    floorDate: null,
    requireCoordinates: false,
    types: null,
  });

  return { overview, contracts };
}

export default async function ObservatoirePage() {
  const displayMode = await getServerDisplayMode();
  const isSober = displayMode === "sobre";
  const data = await loadPublicStats().catch(() => null);
  const overview = data?.overview;
  const monthlyData = data ? aggregateMonthlyAnalytics(data.contracts) : [];

  const kpis = overview ? [
    { label: "Masse Totale (kg)", value: overview.comparison.current.impactVolumeKg.toLocaleString() },
    { label: "Bénévoles Mobilisés", value: overview.comparison.current.mobilizationCount.toLocaleString() },
    { label: "Actions Validées", value: overview.comparison.current.approvedActions.toLocaleString() },
  ] : [];

  return (
    <div className={`min-h-screen p-6 sm:p-12 space-y-12 transition-colors duration-500 ${isSober ? 'bg-white text-slate-900' : 'bg-slate-950 text-slate-100'}`}>
      <header className="max-w-5xl mx-auto space-y-4">
        <div className={`flex items-center gap-2 font-black uppercase tracking-widest text-xs ${isSober ? 'text-slate-500' : 'text-emerald-400'}`}>
          <Globe size={14} />
          OBSERVATOIRE PUBLIC D'IMPACT
        </div>
        <h1 className={`text-4xl sm:text-6xl font-black tracking-tighter ${isSober ? 'text-slate-900' : 'bg-gradient-to-br from-white to-slate-500 bg-clip-text text-transparent'}`}>
          La Science du Nettoyage. <br />{isSober ? 'Transparence Totale' : 'Transparence Totale.'}
        </h1>
        <p className={`max-w-2xl text-lg ${isSober ? 'text-slate-600 font-medium' : 'text-slate-400'}`}>
          Accédez en temps réel aux données de dépollution nationale. 
          Un effort collectif mesuré par des protocoles scientifiques rigoureux.
        </p>
      </header>

      <div className="max-w-5xl mx-auto grid gap-6 md:grid-cols-3">
        {kpis.map((kpi, idx) => (
          <div key={idx} className={`p-6 rounded-3xl border transition-all ${isSober ? 'bg-slate-50 border-slate-200' : 'bg-slate-900 border-slate-800 hover:border-emerald-500/50'} space-y-2 group`}>
            <p className={`text-xs font-bold uppercase tracking-widest ${isSober ? 'text-slate-400' : 'text-slate-500'}`}>{kpi.label}</p>
            <p className={`text-4xl font-black transition-colors ${isSober ? 'text-slate-900' : 'text-white group-hover:text-emerald-400'}`}>{kpi.value}</p>
          </div>
        ))}
      </div>

      <div className={`max-w-5xl mx-auto rounded-[2.5rem] border p-8 shadow-2xl overflow-hidden relative transition-all ${isSober ? 'bg-white border-slate-200 shadow-none rounded-xl' : 'bg-slate-900 border-slate-800 shadow-emerald-500/5'}`}>
        {!isSober && <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-[100px] pointer-events-none"></div>}
        <AnalyticsCockpit data={monthlyData} />
      </div>

      <footer className={`max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6 pt-12 border-t ${isSober ? 'border-slate-200' : 'border-slate-800'}`}>
        <div className="space-y-1">
          <div className={`flex items-center gap-2 font-bold text-sm ${isSober ? 'text-slate-600' : 'text-slate-400'}`}>
            <ShieldCheck size={16} className="text-emerald-500" />
            Source de Donnée Certifiée CleanMyMap
          </div>
          <p className="text-xs text-slate-500">Mise à jour en temps réel via Supabase & Protocoles ADEME.</p>
        </div>
        <Link 
          href="/sign-in"
          className={`px-6 py-3 rounded-xl font-black text-sm uppercase tracking-wider transition-all active:scale-95 ${isSober ? 'bg-slate-900 text-white hover:bg-slate-800' : 'bg-white text-slate-950 hover:bg-emerald-400'}`}
        >
          Rejoindre le mouvement
        </Link>
      </footer>
    </div>
  );
}
