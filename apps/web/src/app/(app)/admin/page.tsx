import { auth } from"@clerk/nextjs/server";
import { 
  ShieldCheck, 
  FileSearch, 
  Settings,
  AlertTriangle,
} from"lucide-react";
import type { Metadata } from "next";
import { BusinessAlertsPanel } from"@/components/dashboard/business-alerts-panel";
import { CreatorInboxPanel } from"@/components/admin/creator-inbox-panel";
import { RoleManagementPanel } from"@/components/admin/role-management-panel";
import { RolePrimaryActions } from"@/components/navigation/role-primary-actions";

import { ThirtySecondsSummary } from"@/components/pilotage/thirty-seconds-summary";
import { ActionsReportPanel } from"@/components/reports/actions-report-panel";
import { ClerkRequiredGate } from"@/components/ui/clerk-required-gate";
import { RubriquePdfExportButton } from"@/components/ui/rubrique-pdf-export-button";
import { listAdminOperationAudit } from"@/lib/admin/operation-audit";
import { listManagedRoleAccounts } from"@/lib/admin/role-management";
import { getCurrentUserRoleLabel } from"@/lib/authz";
import { loadCreatorInboxItems } from"@/lib/community/creator-inbox-loader";
import { loadPilotageOverview } from"@/lib/pilotage/overview";
import { listPublishedPartnerAnnuaireEntries } from"@/lib/partners/published-annuaire-entries-store";
import { isAdminLikeProfile } from"@/lib/profiles";
import { getProfilePrimaryAction, toProfile } from"@/lib/profiles";
import { getServerLocale } from"@/lib/server-preferences";
import { getSupabaseServerClient } from"@/lib/supabase/server";
import { getBlockClasses } from "@/lib/ui/block-accents";
import { cn } from "@/lib/utils";
import { NavigationGrid, type NavigationGridItem } from"@/components/ui/navigation-grid";

export const metadata: Metadata = {
  title: 'Administration - CleanMyMap',
  description: 'Panel d\'administration pour gérer les utilisateurs, la modération et les demandes.',
};

async function loadAdminOverview() {
 const supabase = getSupabaseServerClient();
 return loadPilotageOverview({
 supabase,
 periodDays: 30,
 limit: 1800,
 });
}

export default async function AdminPage() {
  const { userId } = await auth();
  const locale = await getServerLocale();
  const classes = getBlockClasses("pilot");

  if (!userId) {
    return (
      <ClerkRequiredGate
        isAuthenticated={false}
        mode="blur"
        title="Pilotage administratif"
        description="Accès réservé aux comptes Clerk autorisés."
        lockedPreview={
          <div className={cn("grid gap-6 md:grid-cols-3 rounded-[3rem] border p-8", classes.surface)}>
            {[
              { label: "Supervision", desc: "Alertes et priorités de l'administration." },
              { label: "Modération", desc: "Actions réservées au back-office connecté." },
              { label: "Export", desc: "Les livrables d'administration nécessitent un compte autorisé." }
            ].map((item, i) => (
              <article key={i} className="rounded-[2rem] border border-white/5 bg-white/5 p-8">
                <p className="text-[10px] font-black uppercase tracking-widest text-amber-400/60">
                  {item.label}
                </p>
                <p className="mt-3 text-sm text-amber-100/40 leading-relaxed">
                  {item.desc}
                </p>
              </article>
            ))}
          </div>
        }
      >
        <div />
      </ClerkRequiredGate>
    );
  }

  const role = await getCurrentUserRoleLabel();
  const profile = toProfile(role);
  const primaryAction = getProfilePrimaryAction(profile);

  if (!isAdminLikeProfile(profile)) {
    return (
      <section className="rounded-[3rem] border border-amber-500/20 bg-amber-500/5 p-12 text-center">
        <div className="inline-flex p-4 rounded-3xl bg-amber-400/10 text-amber-400 mb-6">
          <ShieldCheck size={32} />
        </div>
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-400/60">Accès Restreint</p>
        <h1 className="mt-4 text-4xl font-black tracking-tight text-white">
          Privilèges administrateur requis
        </h1>
        <p className="mt-4 text-sm text-amber-100/40 max-w-md mx-auto leading-relaxed">
          Votre compte actuel ne dispose pas des autorisations nécessaires pour accéder au pilotage système. Contactez un administrateur Clerk.
        </p>
      </section>
    );
  }

  const [overview, creatorInboxItems, roleAccounts, publishedEntries, adminAudit] = 
    await Promise.all([
      loadAdminOverview().catch(() => null),
      profile === "max" ? loadCreatorInboxItems().catch(() => []) : Promise.resolve([]),
      profile === "max" ? listManagedRoleAccounts().catch(() => []) : Promise.resolve([]),
      listPublishedPartnerAnnuaireEntries().catch(() => []),
      listAdminOperationAudit(25).catch(() => []),
    ]);

  const onboardingStatus = {
    pending: creatorInboxItems.filter(item => item.source === "partner" && item.sourceStatus === "pending_admin_review").length,
    accepted: creatorInboxItems.filter(item => item.source === "partner" && item.sourceStatus === "accepted").length,
    rejected: creatorInboxItems.filter(item => item.source === "partner" && item.sourceStatus === "rejected").length,
  };

  const publicationStatus = {
    pending: publishedEntries.filter(item => item.publicationStatus === "pending_admin_review").length,
    accepted: publishedEntries.filter(item => item.publicationStatus === "accepted").length,
    rejected: publishedEntries.filter(item => item.publicationStatus === "rejected").length,
  };

  const moderationAudit = {
    success: adminAudit.filter(item => item.outcome === "success").length,
    error: adminAudit.filter(item => item.outcome === "error").length,
  };

  const navigationItems: NavigationGridItem[] = [
    {
      icon: ShieldCheck,
      title: "Gouvernance",
      desc: "Décisions et statuts clés.",
      iconBg: "bg-blue-500/10",
      iconColor: "text-blue-400",
      accent: "from-blue-600/10 to-blue-900/20",
      ring: "ring-blue-500/20",
      dot: "bg-blue-400",
      href: "#governance",
    },
    {
      icon: AlertTriangle,
      title: "Alertes",
      desc: "Écarts à traiter rapidement.",
      iconBg: "bg-amber-500/10",
      iconColor: "text-amber-400",
      accent: "from-amber-600/10 to-amber-900/20",
      ring: "ring-amber-500/20",
      dot: "bg-amber-400",
      href: "#alerts",
    },
    {
      icon: FileSearch,
      title: "Modération",
      desc: "Validation des actions et preuves.",
      iconBg: "bg-emerald-500/10",
      iconColor: "text-emerald-400",
      accent: "from-emerald-600/10 to-emerald-900/20",
      ring: "ring-emerald-500/20",
      dot: "bg-emerald-400",
      href: "#moderation",
    },
    {
      icon: Settings,
      title: "Services",
      desc: "État des API et de l'infrastructure.",
      iconBg: "bg-slate-500/10",
      iconColor: "text-slate-400",
      accent: "from-slate-600/10 to-slate-900/20",
      ring: "ring-slate-500/20",
      dot: "bg-slate-400",
      href: "/admin/services",
    },
  ];

  const kpis = overview ? overview.summary.kpis : [];

  return (
    <main className="min-h-screen bg-[#050505] text-white p-6 md:p-12 selection:bg-amber-400/30">
      <div className="max-w-[1400px] mx-auto space-y-24">
        
        {/* Résumé Décisionnel (ThirtySecondsSummary) */}
        {overview && (
          <ThirtySecondsSummary
            kpis={overview.summary.kpis as any}
            alert={overview.summary.alert}
            recommendedAction={{
              href: overview.summary.recommendedAction.href ?? primaryAction.href,
              label: overview.summary.recommendedAction.label ?? primaryAction.label[locale],
            }}
            recommendedReason={overview.summary.recommendedAction.reason}
          />
        )}

        {/* Header Premium High-Impact */}
        <header className="relative py-12 md:py-20 overflow-hidden">
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-amber-500/10 rounded-full blur-[120px] -z-10 animate-pulse" />
          
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-12 relative z-10">
            <div className="space-y-8 max-w-4xl">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-2xl bg-amber-400/10 border border-amber-400/20 text-amber-400">
                  <ShieldCheck size={24} />
                </div>
                <div className="h-px w-12 bg-white/10" />
                <span className="text-[10px] font-black uppercase tracking-[0.4em] text-white/30">Administration Centrale</span>
              </div>
              
              <h1 className="text-6xl md:text-8xl font-black tracking-tighter leading-[0.85] text-white">
                Pilotage Système.
              </h1>
              
              <div className="flex flex-wrap items-center gap-8">
                <div className="flex items-center gap-3">
                  <div className="h-2 w-2 rounded-full bg-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.5)]" />
                  <p className="text-sm font-black uppercase tracking-widest text-white/60">
                    Console Back-Office
                  </p>
                </div>
                <div className="h-8 w-px bg-white/5 hidden md:block" />
                <div className="flex items-center gap-4">
                  <RubriquePdfExportButton rubriqueTitle="Administration" />
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Navigation Grid Premium */}
        <section className={cn(
          "rounded-[3rem] border border-white/5 bg-white/[0.02] backdrop-blur-2xl p-12 transition-all duration-700",
          "hover:border-white/10 hover:bg-white/[0.04]"
        )}>
          <div className="mb-10">
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/20">Accès Rapides</p>
            <h2 className="text-3xl font-black tracking-tight text-white mt-2">Navigation Opérationnelle</h2>
          </div>
          <NavigationGrid items={navigationItems} columns={{ default: 1, sm: 2, md: 4, xl: 4 }} />
        </section>

        {profile === "max" && (
          <>
            <section className={cn(
              "rounded-[3rem] border p-12 relative overflow-hidden transition-all duration-700",
              classes.surface
            )}>
              <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-amber-500/5 rounded-full blur-[100px] -z-10" />
              <div className="mb-10">
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-amber-400/40">Inbox Créateur</p>
                <h2 className="text-4xl font-black tracking-tight text-white mt-2">Demandes de Collaboration</h2>
                <p className="mt-4 text-sm text-amber-100/40 max-w-2xl leading-relaxed">
                  Supervision des flux entrants : promotion, événements et partenariats stratégiques.
                </p>
              </div>
              <CreatorInboxPanel initialItems={creatorInboxItems} />
            </section>

            <section className={cn(
              "rounded-[3rem] border p-12 relative overflow-hidden transition-all duration-700",
              classes.surface
            )}>
              <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-amber-500/5 rounded-full blur-[100px] pointer-events-none" />
              <div className="mb-10">
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-amber-400/40">Gestion de Flotte</p>
                <h2 className="text-4xl font-black tracking-tight text-white mt-2">Comptes & Rôles</h2>
              </div>
              <RoleManagementPanel initialAccounts={roleAccounts} currentUserId={userId} />
            </section>
          </>
        )}

        <div id="governance" className="space-y-12">
          <section className="rounded-[3rem] border border-white/5 bg-white/[0.02] backdrop-blur-2xl p-12">
            <div className="mb-10">
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/20">Governance Monitor</p>
              <h2 className="text-4xl font-black tracking-tight text-white mt-2">Indicateurs Métier</h2>
            </div>

            <div className="grid gap-8 md:grid-cols-3">
              {[
                { title: "Onboarding Partenaires", stats: onboardingStatus, color: "text-blue-400" },
                { title: "Publication Annuaire", stats: publicationStatus, color: "text-emerald-400" },
                { title: "Audit Opérations", stats: moderationAudit, color: "text-amber-400" }
              ].map((panel, idx) => (
                <article key={idx} className="rounded-[2.5rem] border border-white/5 bg-white/5 p-8 group hover:bg-white/[0.08] transition-all duration-500">
                  <h3 className={cn("text-sm font-black uppercase tracking-widest mb-6", panel.color)}>
                    {panel.title}
                  </h3>
                  <div className="space-y-3">
                    {Object.entries(panel.stats).map(([key, val]) => (
                      <div key={key} className="flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase tracking-widest text-white/20 group-hover:text-white/40 transition-colors">{key}</span>
                        <span className="text-lg font-black text-white">{val}</span>
                      </div>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          </section>
        </div>

        <div id="alerts" className="relative group">
          <div className="absolute -inset-1 bg-gradient-to-r from-amber-500/20 via-transparent to-rose-500/10 rounded-[3.5rem] blur-xl opacity-20" />
          <div className="relative rounded-[3rem] border border-white/5 bg-white/[0.02] backdrop-blur-2xl p-12">
            <BusinessAlertsPanel />
          </div>
        </div>

        <div id="moderation" className="relative group">
          <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500/20 via-transparent to-sky-500/10 rounded-[3.5rem] blur-xl opacity-20" />
          <div className="relative rounded-[3rem] border border-white/5 bg-white/[0.02] backdrop-blur-2xl p-12">
            <ActionsReportPanel />
          </div>
        </div>

        <div className="rounded-[3rem] border border-white/5 bg-white/5 p-4">
          <RolePrimaryActions profile={profile} />
        </div>

        <footer className="pt-12 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-6 opacity-30">
          <p className="text-[10px] font-bold uppercase tracking-widest">CleanMyMap Cockpit v4.2.0 • Admin Edition</p>
          <div className="flex gap-8">
            <span className="text-[10px] font-bold uppercase tracking-widest">Region: EU-WEST-3</span>
            <span className="text-[10px] font-bold uppercase tracking-widest">Node: {userId.slice(0, 4).toUpperCase()}</span>
          </div>
        </footer>
      </div>
    </main>
  );
}
