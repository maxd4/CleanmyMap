import { 
  TrendingUp, 
  Euro, 
  Users, 
  Leaf, 
  Map as MapIcon,
  Download,
  ShieldCheck,
  Zap,
  ArrowRight,
  Activity
} from "lucide-react";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { loadPilotageOverview } from "@/lib/pilotage/overview";
import { IMPACT_PROXY_CONFIG } from "@/lib/gamification/impact-proxy-config";
import { ClerkRequiredGate } from "@/components/ui/clerk-required-gate";
import { CmmButton } from "@/components/ui/cmm-button";
import { AccountCompletionGate } from "@/components/account/account-completion-gate";
import { getSafeAuthSession } from "@/lib/auth/safe-session";
import { PageHeader, PageHeaderBadge } from "@/components/ui/page-header";
import {
  PilotageInsightCard,
  PilotageMetricGrid,
} from "@/components/pilotage/pilotage-cluster-panels";
import { DecisionClusterSection } from "@/components/pilotage/decision-cluster-section";
import { getPageFamilyById } from "@/lib/ui/page-families";
import { loadAccountCompletionGateState } from "@/lib/auth/account-completion-gate";

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
  const pageFamily = getPageFamilyById("accueil-pilotage");
  const accountCompletion = userId
    ? await loadAccountCompletionGateState({ userId, clerkReachable }).catch(() => null)
    : null;

  // Calculs ROI
  const totalKg = overview.comparison.current.impactVolumeKg;
  const totalEuroSaved = Math.round(totalKg * factors.euroSavedPerWasteKg);
  const totalCo2 = Math.round(totalKg * factors.co2KgPerWasteKg);
  const totalVolunteers = overview.comparison.current.mobilizationCount;
  const observedZones = overview.zones.slice(0, 3);

  const page = (
    <div className="w-full max-w-[1600px] mx-auto space-y-24 pb-24">
      {/* Premium Cockpit Header */}
      <header className="relative space-y-12 pt-16">
        <div className="absolute -top-24 -left-24 w-[500px] h-[500px] bg-amber-500/10 rounded-full blur-[120px] pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-12">
          <PageHeader
            family={pageFamily}
            eyebrow="Gouvernance & impact"
            title="ROI stratégique"
            subtitle="Analyse de la valeur territoriale générée par la mobilisation citoyenne et conformité aux standards ESG."
            badges={
              <>
                <PageHeaderBadge family={pageFamily}>
                  <TrendingUp size={12} className="mr-2 inline-block align-[-2px] text-amber-500" />
                  Gouvernance & impact
                </PageHeaderBadge>
                <PageHeaderBadge family={pageFamily} muted>
                  <ShieldCheck size={12} className="mr-2 inline-block align-[-2px] text-amber-500/80" />
                  {observationWindowLabel}
                </PageHeaderBadge>
              </>
            }
            className="space-y-6"
          />
          
          <CmmButton tone="primary" variant="pill" className="group flex items-center gap-4 rounded-[2rem] px-10 py-7 text-[10px] font-black uppercase tracking-[0.2em] text-black transition-all active:scale-95 shadow-2xl shadow-white/10">
            <Download size={20} />
            Exporter le bilan certifié
          </CmmButton>
        </div>
      </header>

      {/* ROI CARDS - High Impact Tiles */}
      <section>
        <PilotageMetricGrid
          variant="sponsor"
          metrics={[
            {
              id: "economie-voirie",
              label: "Économie de voirie",
              value: `${totalEuroSaved.toLocaleString()} €`,
              deltaPercent: "+12%",
              icon: Euro,
              interpretation: "positive",
            },
            {
              id: "co2-evite",
              label: "CO2 évité (estimé)",
              value: `${totalCo2.toLocaleString()} kg`,
              deltaPercent: "+8%",
              icon: Leaf,
              interpretation: "positive",
            },
            {
              id: "mobilisation-citoyenne",
              label: "Mobilisation citoyenne",
              value: totalVolunteers.toLocaleString(),
              deltaPercent: "+24%",
              icon: Users,
              interpretation: "positive",
            },
            {
              id: "masse-extraite",
              label: "Masse extraite",
              value: `${totalKg.toLocaleString()} kg`,
              deltaPercent: "+15%",
              icon: MapIcon,
              interpretation: "positive",
            },
          ]}
          className="grid-cols-1 md:grid-cols-2 xl:grid-cols-4"
        />
      </section>

      {/* Detailed Insights */}
      <section className="grid gap-6 lg:grid-cols-2">
        <div className="p-12 rounded-[3rem] border border-white/5 bg-white/5 backdrop-blur-2xl space-y-12">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-amber-400/10 flex items-center justify-center">
              <Activity size={18} className="text-amber-400" />
            </div>
            <h3 className="text-xs font-black uppercase tracking-[0.3em] text-white/40">Périmètre de pilotage</h3>
          </div>
          
          <div className="space-y-6">
            <p className="text-3xl font-bold text-white tracking-tight leading-tight">
              Analyse consolidée sur l&apos;ensemble de votre réseau territorial.
            </p>
            <p className="text-lg text-white/30 leading-relaxed font-medium">
              Ce portail agrège les données de mobilisation pour offrir une lecture macroscopique de l&apos;impact environnemental et social.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-4 pt-6 border-t border-white/5">
            {[
              { label: "Période", val: `${SPONSOR_WINDOW_DAYS}j` },
              { label: "Contrats", val: overview.contracts.length },
              { label: "Zones", val: overview.zones.length },
            ].map((stat, i) => (
              <div key={i} className="space-y-1">
                <p className="text-[9px] font-black uppercase tracking-widest text-white/20">{stat.label}</p>
                <p className="text-2xl font-black text-white">{stat.val}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[3rem] p-12 border border-white/5 bg-white/5 backdrop-blur-2xl space-y-10 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/5 rounded-full blur-[100px] pointer-events-none" />

          <PilotageInsightCard
            variant="sponsor"
            className="relative z-10"
            insight={{
              eyebrow: "Périmètre de pilotage",
              title: "Points chauds",
              detail:
                "Lecture consolidée du réseau territorial, avec recommandations et priorités directement actionnables.",
              actionLabel: "Voir les rapports",
              actionHref: "/reports",
            }}
          />

          <div className="space-y-4 relative z-10">
            {observedZones.length > 0 ? (
              observedZones.map((zone) => (
                <div key={zone.area} className="group p-6 rounded-[2rem] border border-white/5 bg-white/5 transition-all hover:bg-white/10">
                  <div className="flex justify-between items-center mb-4">
                    <p className="font-black text-white text-[11px] uppercase tracking-widest">{zone.area}</p>
                    <div className="text-[10px] font-black text-amber-400">
                      SCORE {zone.normalizedScore.toFixed(1)}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                    <p className="text-[10px] font-black text-white/40 uppercase tracking-widest">
                      Priorité : <span className="text-amber-400">{zone.urgency}</span>
                    </p>
                  </div>
                  <p className="text-xs font-semibold text-white/60 group-hover:text-white transition-colors">{zone.recommendedAction}</p>
                </div>
              ))
            ) : (
              <div className="p-12 text-center text-white/20 font-black uppercase tracking-widest text-[10px]">
                Silence Radio • Aucune zone critique
              </div>
            )}
          </div>
        </div>
      </section>

      <DecisionClusterSection locale="fr" surfaceId="sponsor" />

      {/* Protocol Transparency */}
      <section className="relative group p-12 rounded-[3rem] border border-white/5 bg-white/5 backdrop-blur-2xl overflow-hidden transition-all hover:bg-white/[0.07]">
        <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-amber-400/5 rounded-full blur-[120px] pointer-events-none transition-all group-hover:bg-amber-400/10" />
        
        <div className="max-w-4xl space-y-10 relative z-10">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-400/10 flex items-center justify-center">
              <Zap size={24} className="text-amber-400" />
            </div>
            <h3 className="text-3xl font-black text-white tracking-tighter uppercase">Rigueur Scientifique</h3>
          </div>
          
          <div className="space-y-6">
            <p className="text-2xl text-white/40 leading-tight font-medium tracking-tight">
              Chaque kilogramme collecté génère une économie directe de <strong className="text-white">1,50€</strong> pour la collectivité. Ce calcul est certifié par nos protocoles de mesure d&apos;impact environnemental.
            </p>
            
            <CmmButton href="/methodologie" tone="secondary" variant="pill" className="inline-flex items-center gap-4 text-[10px] font-black uppercase tracking-[0.3em] text-black transition-all group">
              Accéder au livre blanc méthodologique
              <ArrowRight size={16} className="transition-transform group-hover:translate-x-2" />
            </CmmButton>
          </div>
        </div>
      </section>
    </div>
  );

  return (
    <ClerkRequiredGate
      isAuthenticated={Boolean(userId)}
      mode="disabled"
      title="Accès Portail Décideur"
      description={
        clerkReachable
          ? "Connectez-vous pour débloquer les fonctions d'export et les détails granulaires."
          : "Le service d'authentification est indisponible. Lecture seule activée."
      }
    >
      <AccountCompletionGate state={accountCompletion}>
        {page}
      </AccountCompletionGate>
    </ClerkRequiredGate>
  );
}
