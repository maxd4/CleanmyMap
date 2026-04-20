import { getSupabaseServerClient } from "@/lib/supabase/server";
import { loadPilotageOverview } from "@/lib/pilotage/overview";
import { fetchUnifiedActionContracts } from "@/lib/actions/unified-source";
import { aggregateMonthlyAnalytics } from "@/lib/pilotage/analytics-data-utils";
import { AnalyticsCockpit } from "@/components/reports/analytics-cockpit";
import { ThirtySecondsSummary } from "@/components/pilotage/thirty-seconds-summary";
import Link from "next/link";
import { Globe, ShieldCheck, Zap } from "lucide-react";

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
  const data = await loadPublicStats().catch(() => null);
  const overview = data?.overview;
  const monthlyData = data ? aggregateMonthlyAnalytics(data.contracts) : [];

  const kpis = overview ? [
    { label: "Masse Totale (kg)", value: overview.comparison.current.totalKg.toLocaleString() },
    { label: "Bénévoles Mobilisés", value: overview.comparison.current.volunteersCount.toLocaleString() },
    { label: "Actions Validées", value: overview.comparison.current.actionsCount.toLocaleString() },
  ] : [];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 sm:p-12 space-y-12">
      <header className="max-w-5xl mx-auto space-y-4">
        <div className="flex items-center gap-2 text-emerald-400 font-black uppercase tracking-widest text-xs">
          <Globe size={14} />
          OBSERVATOIRE PUBLIC D'IMPACT
        </div>
        <h1 className="text-4xl sm:text-6xl font-black tracking-tighter bg-gradient-to-br from-white to-slate-500 bg-clip-text text-transparent">
          La Science du Nettoyage. <br />Transparence Totale.
        </h1>
        <p className="max-w-2xl text-slate-400 text-lg">
          Accédez en temps réel aux données de dépollution nationale. 
          Un effort collectif mesuré par des protocoles scientifiques rigoureux.
        </p>
      </header>

      <div className="max-w-5xl mx-auto grid gap-6 md:grid-cols-3">
        {kpis.map((kpi, idx) => (
          <div key={idx} className="bg-slate-900 border border-slate-800 p-6 rounded-3xl space-y-2 group hover:border-emerald-500/50 transition-colors">
            <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">{kpi.label}</p>
            <p className="text-4xl font-black text-white group-hover:text-emerald-400 transition-colors">{kpi.value}</p>
          </div>
        ))}
      </div>

      <div className="max-w-5xl mx-auto rounded-[2.5rem] bg-slate-900 border border-slate-800 p-8 shadow-2xl overflow-hidden relative">
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-[100px] pointer-events-none"></div>
        <AnalyticsCockpit data={monthlyData} />
      </div>

      <footer className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6 pt-12 border-t border-slate-800">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-slate-400 font-bold text-sm">
            <ShieldCheck size={16} className="text-emerald-500" />
            Source de Donnée Certifiée CleanMyMap
          </div>
          <p className="text-xs text-slate-500">Mise à jour en temps réel via Supabase & Protocoles ADEME.</p>
        </div>
        <Link 
          href="/sign-in"
          className="px-6 py-3 rounded-xl bg-white text-slate-950 font-black text-sm uppercase tracking-wider hover:bg-emerald-400 transition-all active:scale-95"
        >
          Rejoindre le mouvement
        </Link>
      </footer>
    </div>
  );
}
