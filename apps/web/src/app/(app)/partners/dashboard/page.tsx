import { INITIAL_ANNUAIRE_ENTRIES } from "@/components/sections/rubriques/annuaire/seed-index";
import { hasRecentActivity } from "@/components/sections/rubriques/annuaire-helpers";
import { ClerkRequiredGate } from "@/components/ui/clerk-required-gate";
import { AccountCompletionGate } from "@/components/account/account-completion-gate";
import { PublishedAnnuaireReviewPanel } from "@/components/partners/published-annuaire-review-panel";
import { getCurrentUserRoleLabel } from "@/lib/authz";
import { getSafeAuthSession } from "@/lib/auth/safe-session";
import { loadAccountCompletionGateState } from "@/lib/auth/account-completion-gate";
import { countPartnerOnboardingRequests } from "@/lib/partners/onboarding-requests-store";
import { listPublishedPartnerAnnuaireEntries } from "@/lib/partners/published-annuaire-entries-store";
import { canUseSupabaseServerPersistence } from "@/lib/persistence/runtime-store";
import { getBlockClasses } from "@/lib/ui/block-accents";
import { PageHeader, PageHeaderBadge } from "@/components/ui/page-header";
import { resolvePageFamily } from "@/lib/ui/page-families";
import { cn } from "@/lib/utils";
import { Network, ShieldCheck, ClipboardCheck, Users, MapPin, AlertCircle } from "lucide-react";

export default async function PartnersDashboardPage() {
  const { userId, clerkReachable } = await getSafeAuthSession();
  const classes = getBlockClasses("network");
  const pageFamily = resolvePageFamily("/partners/dashboard");
  const accountCompletion = userId
    ? await loadAccountCompletionGateState({ userId, clerkReachable }).catch(() => null)
    : null;
  const publishedEntries = await listPublishedPartnerAnnuaireEntries().catch(() => []);
  const currentRole = userId ? await getCurrentUserRoleLabel().catch(() => null) : null;
  
  const acceptedPublishedEntries = publishedEntries.filter(
    (entry) => entry.publicationStatus === "accepted",
  );
  const reviewPublishedEntries = publishedEntries.filter(
    (entry) => entry.publicationStatus !== "accepted",
  );
  const allEntries = (() => {
    const seen = new Set<string>();
    const output = [...INITIAL_ANNUAIRE_ENTRIES.slice(0, 0)];
    for (const entry of [...INITIAL_ANNUAIRE_ENTRIES, ...acceptedPublishedEntries]) {
      const key = `${entry.name.trim().toLowerCase()}::${entry.legalIdentity.trim().toLowerCase()}`;
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      output.push(entry);
    }
    return output;
  })();

  const totalEntries = allEntries.length;
  const activeEntries = allEntries.filter(
    (entry) =>
      entry.qualificationStatus === "partenaire_actif" &&
      entry.verificationStatus === "verifie" &&
      hasRecentActivity(entry.recentActivityAt),
  );
  const staleEntries = allEntries.filter(
    (entry) =>
      entry.verificationStatus !== "verifie" || !hasRecentActivity(entry.recentActivityAt),
  );
  
  let onboardingRequestCount: number | null = null;
  let onboardingLoadError: string | null = null;
  if (!canUseSupabaseServerPersistence()) {
    onboardingLoadError = "Demandes onboarding indisponibles (configuration persistance).";
  } else {
    try {
      onboardingRequestCount = await countPartnerOnboardingRequests();
    } catch (error) {
      console.error("Partner onboarding requests load failed", error);
      onboardingLoadError = "Demandes onboarding indisponibles (configuration persistance).";
    }
  }
  const coveredZones = new Set(allEntries.flatMap((entry) => entry.coveredArrondissements));

  const page = (
    <div className="w-full max-w-7xl mx-auto space-y-10 pb-20">
      <PageHeader
        family={pageFamily}
        eyebrow="Pilotage réseau"
        title="Gouvernance des partenariats"
        subtitle="Suivi des demandes d'onboarding, modération des fiches et analyse de la couverture territoriale."
        badges={
          <>
            <PageHeaderBadge family={pageFamily}>
              <Network size={12} className="mr-2 inline-block align-[-2px] animate-pulse" />
              Réseau actif
            </PageHeaderBadge>
            <PageHeaderBadge family={pageFamily} muted>
              Fiches et demandes
            </PageHeaderBadge>
          </>
        }
        className="pt-10"
      />

      {/* Stats Grid */}
      <section className="grid grid-cols-2 gap-6 md:grid-cols-4 lg:grid-cols-5">
        {[
          { label: "Fiches publiées", val: totalEntries, icon: <ClipboardCheck size={20} />, color: "slate" },
          { label: "Partenaires actifs", val: activeEntries.length, icon: <Users size={20} />, color: "emerald" },
          { label: "Zones couvertes", val: coveredZones.size, icon: <MapPin size={20} />, color: "sky" },
          { label: "À valider", val: onboardingRequestCount ?? "n/a", icon: <ShieldCheck size={20} />, color: "amber", sub: "Décision requise" },
          { label: "Fiches à revoir", val: reviewPublishedEntries.length, icon: <AlertCircle size={20} />, color: "rose" },
        ].map((card, i) => (
          <div key={i} className={cn(
            "p-8 rounded-[2.5rem] border flex flex-col justify-between transition-all duration-700 group relative overflow-hidden",
            classes.surface,
            classes.shadow,
            "hover:border-slate-400/30"
          )}>
            <div className={cn("transition-transform group-hover:scale-110 duration-700 mb-6", `text-${card.color}-400`)}>
              {card.icon}
            </div>
            <div className="space-y-1">
              <p className="text-3xl font-black text-white">{card.val}</p>
              <p className="text-[9px] font-black uppercase tracking-widest text-white/20">{card.label}</p>
              {card.sub && <p className="text-[9px] font-bold text-amber-400/60 mt-1">{card.sub}</p>}
            </div>
          </div>
        ))}
      </section>

      {onboardingLoadError && (
        <section className="rounded-[2rem] border border-amber-400/20 bg-amber-400/5 p-6 flex items-center gap-4 text-amber-200/60 text-sm font-medium">
          <AlertCircle size={20} className="text-amber-400 shrink-0" />
          {onboardingLoadError}
        </section>
      )}

      <div className="grid lg:grid-cols-3 gap-10">
        <section className={cn("lg:col-span-2 p-10 rounded-[3rem] border space-y-8", classes.surface, classes.shadow)}>
          <div className="flex items-center gap-3 text-slate-400">
            <ClipboardCheck size={16} />
            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-white/40">Feuille de route Prioritaire</h3>
          </div>
          <ul className="grid gap-4">
            {[
              "Traiter les demandes de partenariat en attente sous 72h",
              "Revoir les fiches publiées en attente de validation",
              "Renforcer les contributions en zones sous-couvertes",
              "Publier les mises à jour de fiches partenaires cette semaine"
            ].map((item, i) => (
              <li key={i} className="flex items-center gap-4 p-5 rounded-2xl bg-white/5 border border-white/5 group hover:bg-white/[0.07] transition-all">
                <span className="w-8 h-8 rounded-lg bg-slate-400/10 flex items-center justify-center text-[10px] font-black text-slate-400 group-hover:bg-slate-400 group-hover:text-black transition-all">0{i+1}</span>
                <span className="text-sm font-medium text-white/60 group-hover:text-white transition-colors">{item}</span>
              </li>
            ))}
          </ul>
        </section>

        <aside className="space-y-10">
          <div className="bg-white/5 rounded-[3rem] p-10 space-y-6 border border-white/5 shadow-inner relative overflow-hidden">
             <div className="absolute top-0 right-0 w-32 h-32 bg-slate-400/5 rounded-full blur-[80px]" />
             <h3 className="text-xl font-black text-white tracking-tight relative z-10 flex items-center gap-3">
               <ShieldCheck size={20} className="text-slate-400" />
               Vérification
             </h3>
             <p className="text-sm text-slate-100/40 leading-relaxed font-medium relative z-10">
               {staleEntries.length} fiches nécessitent une confirmation de données ou une vérification d&apos;activité récente.
             </p>
          </div>

          {currentRole === "admin" && reviewPublishedEntries.length > 0 && (
            <PublishedAnnuaireReviewPanel items={reviewPublishedEntries} />
          )}
        </aside>
      </div>
    </div>
  );

  return (
    <ClerkRequiredGate
      isAuthenticated={Boolean(userId)}
      mode="disabled"
    >
      <AccountCompletionGate state={accountCompletion}>
        {page}
      </AccountCompletionGate>
    </ClerkRequiredGate>
  );
}
