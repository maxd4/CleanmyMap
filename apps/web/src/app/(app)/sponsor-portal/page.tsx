import { 
  TrendingUp, 
  Euro, 
  Users, 
  Leaf, 
  Map as MapIcon,
  Download,
  Info 
} from "lucide-react";
import Link from "next/link";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { loadPilotageOverview } from "@/lib/pilotage/overview";
import { IMPACT_PROXY_CONFIG } from "@/lib/gamification/impact-proxy-config";
import { ClerkRequiredGate } from "@/components/ui/clerk-required-gate";
import { getSafeAuthSession } from "@/lib/auth/safe-session";

const SPONSOR_WINDOW_DAYS = 730;

async function loadSponsorOverview() {
  const supabase = getSupabaseServerClient();
  return loadPilotageOverview({
    supabase, // Wider default view for sponsors
    periodDays: SPONSOR_WINDOW_DAYS,
    limit: 5000,
  });
}

export default async function SponsorPortalPage() {
  const { userId, clerkReachable } = await getSafeAuthSession();
  const overview = await loadSponsorOverview();
  const factors = IMPACT_PROXY_CONFIG.factors;
  const observedUntil = new Date();
  const observedFrom = new Date(observedUntil);
  observedFrom.setDate(observedFrom.getDate() - SPONSOR_WINDOW_DAYS + 1);
  const observationWindowLabel = `${observedFrom.toLocaleDateString("fr-FR")} -> ${observedUntil.toLocaleDateString("fr-FR")}`;

  // Calculs ROI
  const totalKg = overview.comparison.current.impactVolumeKg;
  const totalEuroSaved = Math.round(totalKg * factors.euroSavedPerWasteKg);
  const totalCo2 = Math.round(totalKg * factors.co2KgPerWasteKg);
  const totalVolunteers = overview.comparison.current.mobilizationCount;
  const observedZones = overview.zones.slice(0, 3);

  const page = (
    <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-12 bg-slate-50 min-h-screen">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 bg-white p-8 rounded-3xl shadow-sm border border-slate-200">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-amber-600 font-bold uppercase tracking-widest text-xs">
            <TrendingUp size={16} />
            Gouvernance / sponsors
          </div>
          <h1 className="text-4xl font-black tracking-tight text-slate-900">
            Impact Territorial & ROI.
          </h1>
          <p className="text-slate-500 max-w-xl">
            Visualisez la valeur générée par la mobilisation citoyenne pour votre ville et votre stratégie ESG.
          </p>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
            Fenêtre d&apos;observation: {observationWindowLabel} ({SPONSOR_WINDOW_DAYS} jours glissants)
          </p>
        </div>
        <div className="flex gap-3">
          <button className="flex items-center gap-2 rounded-xl bg-slate-900 px-6 py-3 text-sm font-bold text-white transition hover:bg-slate-800">
            <Download size={18} /> Export Bilan Annuel
          </button>
        </div>
      </header>

      <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        Les KPI ci-dessous agrègent une fenêtre longue pour la lecture stratégique.
        Pour comparer avec des vues 30/90 jours, utilisez le même périmètre temporel.
      </section>

      {/* ROI CARDS */}
      <section className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-amber-600 text-white p-8 rounded-3xl shadow-xl shadow-amber-600/20 flex flex-col justify-between aspect-square">
          <Euro size={32} className="opacity-50" />
          <div>
            <p className="text-4xl font-black">{totalEuroSaved.toLocaleString()} €</p>
            <p className="text-xs uppercase font-bold tracking-widest mt-2 opacity-80">Économie de voirie</p>
          </div>
        </div>
        
        <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between aspect-square">
          <Leaf size={32} className="text-emerald-500" />
          <div>
            <p className="text-4xl font-black text-slate-900">{totalCo2.toLocaleString()} kg</p>
            <p className="text-xs uppercase font-bold tracking-widest mt-2 text-slate-400">CO2 évité (estimé)</p>
          </div>
        </div>

        <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between aspect-square">
          <Users size={32} className="text-blue-500" />
          <div>
            <p className="text-4xl font-black text-slate-900">{totalVolunteers.toLocaleString()}</p>
            <p className="text-xs uppercase font-bold tracking-widest mt-2 text-slate-400">Mobilisation citoyenne</p>
          </div>
        </div>

        <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between aspect-square">
          <MapIcon size={32} className="text-rose-500" />
          <div>
            <p className="text-4xl font-black text-slate-900">{totalKg.toLocaleString()} kg</p>
            <p className="text-xs uppercase font-bold tracking-widest mt-2 text-slate-400">Déchets extraits</p>
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center gap-2 text-slate-900 font-bold uppercase tracking-widest text-xs">
            <Info size={16} className="text-amber-500" />
            Réseau observé
          </div>
          <p className="text-sm text-slate-600 leading-relaxed">
            Le portail affiche maintenant un périmètre plus large pour éviter une lecture trop
            promotionnelle du réseau. La fenêtre d&apos;observation couvre deux ans, avec les
            zones les plus actives mises en avant ci-dessous.
          </p>
          <div className="grid sm:grid-cols-3 gap-3 text-sm">
            <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4">
              <p className="text-xs uppercase tracking-wide text-slate-400">Fenêtre</p>
              <p className="mt-1 font-semibold text-slate-900">{SPONSOR_WINDOW_DAYS} jours</p>
            </div>
            <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4">
              <p className="text-xs uppercase tracking-wide text-slate-400">Contrats chargés</p>
              <p className="mt-1 font-semibold text-slate-900">{overview.contracts.length}</p>
            </div>
            <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4">
              <p className="text-xs uppercase tracking-wide text-slate-400">Zones analysées</p>
              <p className="mt-1 font-semibold text-slate-900">{overview.zones.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-slate-900 rounded-3xl p-8 text-white space-y-4 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/20 rounded-full blur-3xl" />
          <h3 className="text-xl font-bold relative z-10">Zones à suivre</h3>
          <ul className="space-y-3 relative z-10">
            {observedZones.length > 0 ? (
              observedZones.map((zone) => (
                <li key={zone.area} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="font-semibold text-white">{zone.area}</p>
                  <p className="mt-1 text-sm text-slate-300">
                    Score {zone.normalizedScore.toFixed(1)} | priorité {zone.urgency}
                  </p>
                  <p className="mt-1 text-xs text-slate-400">{zone.recommendedAction}</p>
                </li>
              ))
            ) : (
              <li className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300">
                Aucune zone prioritaire détectée sur la fenêtre courante.
              </li>
            )}
          </ul>
        </div>
      </section>

      {/* DETAILS GRID */}
      <div className="grid lg:grid-cols-3 gap-8">
        {/* ROI Explanation */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white p-8 rounded-3xl border border-slate-200 space-y-6">
            <h3 className="text-xl font-bold flex items-center gap-2">
              <Info className="text-amber-500" size={20} />
              Comment calculons-nous le ROI ?
            </h3>
            <p className="text-slate-600 text-sm leading-relaxed">
              L'économie de voirie est calculée sur la base d'un coût moyen de <strong>1,50€ par kilogramme</strong> de déchet collecté de manière diffuse. Ce montant inclut l'amortissement du matériel, le temps de trajet des équipes municipales et les coûts de traitement optimisés grâce au tri citoyen.
            </p>
            <div className="pt-4 border-t border-slate-100 italic text-[11px] text-slate-400">
              Note: Ce calcul est un proxy validé par le conseil scientifique CleanMyMap v1.
            </div>
            <Link 
              href="/methodologie" 
              className="inline-block text-xs font-bold text-amber-600 hover:underline"
            >
              Voir le protocole complet →
            </Link>
          </div>
        </div>

        {/* Call to Active */}
        <div className="bg-slate-900 rounded-3xl p-8 text-white space-y-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/20 rounded-full blur-3xl" />
          <h3 className="text-xl font-bold relative z-10">Optimisez l'Engagement.</h3>
          <p className="text-slate-400 text-sm leading-relaxed relative z-10">
            Plus la qualité des actions est élevée, plus le ROI pour la collectivité est précis. 
            Encouragez vos citoyens à utiliser le mode "Expert" pour leurs déclarations.
          </p>
          <button className="w-full py-4 bg-emerald-600 rounded-2xl font-bold text-sm hover:bg-emerald-700 transition relative z-10">
            Lancer un Challenge de Ville
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <ClerkRequiredGate
      isAuthenticated={Boolean(userId)}
      mode="disabled"
      title="Portail décideur"
      description={
        clerkReachable
          ? "Cette vue reste lisible, mais les actions sont réservées aux comptes connectés."
          : "Connexion Clerk temporairement indisponible. La vue reste lisible, les actions restent désactivées."
      }
    >
      {page}
    </ClerkRequiredGate>
  );
}
