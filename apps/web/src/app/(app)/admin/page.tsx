import { 
  ShieldCheck, 
  FileSearch, 
  Settings,
  AlertTriangle,
  Zap,
  HardDrive,
  Database,
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
import { cn } from "@/lib/utils";
import { NavigationGrid, type NavigationGridItem } from"@/components/ui/navigation-grid";
import { SectionShell } from "@/components/sections/rubriques/shared";
import { RubriqueCard } from "@/components/ui/rubrique-card";
import { getSafeAuthSession } from "@/lib/auth/safe-session";

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
  const { userId } = await getSafeAuthSession();
  const locale = await getServerLocale();

  if (!userId) {
    return (
      <ClerkRequiredGate
        isAuthenticated={false}
        mode="blur"
        title="Pilotage administratif"
        description="Accès réservé aux comptes Clerk autorisés."
        lockedPreview={
          <div className="grid gap-6 md:grid-cols-3 rounded-[3rem] border border-white/5 p-8 bg-slate-900/40 backdrop-blur-2xl">
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
      <div className="p-12">
        <RubriqueCard themeColor="amber" withTopBar={false} className="p-12 text-center">
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
        </RubriqueCard>
      </div>
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
  const adminPdfData = {
    title: "Rapport administration CleanMyMap",
    summary: [
      "Synthèse des flux administratifs visibles sur la console.",
      `Rôle actif: ${profile}.`,
      overview
        ? `Fenêtre pilotage: ${overview.periodDays} jours, générée le ${new Date(overview.generatedAt).toLocaleString("fr-FR")}.`
        : "Indicateurs pilotage indisponibles au moment de l'export.",
    ],
    stats: [
      { label: "Onboarding partenaires en attente", value: onboardingStatus.pending },
      { label: "Publications annuaire en attente", value: publicationStatus.pending },
      { label: "Opérations admin réussies", value: moderationAudit.success },
      { label: "Opérations admin en erreur", value: moderationAudit.error },
      ...(overview
        ? overview.summary.kpis.map((kpi) => ({
            label: kpi.label,
            value: kpi.value,
            detail: `N-1 ${kpi.previousValue}, delta ${kpi.deltaAbsolute}`,
          }))
        : []),
    ],
    rows: adminAudit.slice(0, 25).map((item) => ({
      Date: item.at,
      Action: item.operationType,
      Cible: item.targetId ?? "n/a",
      Résultat: item.outcome,
    })),
    columns: [
      { key: "Date", label: "Date" },
      { key: "Action", label: "Action" },
      { key: "Cible", label: "Cible" },
      { key: "Résultat", label: "Résultat" },
    ],
    ...(overview ? { generatedAt: overview.generatedAt } : {}),
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
    {
      icon: Zap,
      title: "Journal Codex",
      desc: "Saisie hebdomadaire de l'usage IA et historique projet.",
      iconBg: "bg-indigo-500/10",
      iconColor: "text-indigo-400",
      accent: "from-indigo-600/10 to-indigo-900/20",
      ring: "ring-indigo-500/20",
      dot: "bg-indigo-400",
      href: "/admin/services#codex-usage",
    },
    {
      icon: HardDrive,
      title: "Stockage",
      desc: "Quota Supabase, usage et croissance mensuelle.",
      iconBg: "bg-emerald-500/10",
      iconColor: "text-emerald-400",
      accent: "from-emerald-600/10 to-emerald-900/20",
      ring: "ring-emerald-500/20",
      dot: "bg-emerald-400",
      href: "/admin/services#storage",
    },
    {
      icon: Database,
      title: "Plans gratuits",
      desc: "Vercel, Resend, Clerk et autres proxys mensuels.",
      iconBg: "bg-sky-500/10",
      iconColor: "text-sky-400",
      accent: "from-sky-600/10 to-sky-900/20",
      ring: "ring-sky-500/20",
      dot: "bg-sky-400",
      href: "/admin/services#free-plans",
    },
    {
      icon: FileSearch,
      title: "Rapport mensuel",
      desc: "PDF central de gouvernance et archive publique.",
      iconBg: "bg-violet-500/10",
      iconColor: "text-violet-400",
      accent: "from-violet-600/10 to-violet-900/20",
      ring: "ring-violet-500/20",
      dot: "bg-violet-400",
      href: "/admin/services#governance-report",
    },
    {
      icon: Database,
      title: "Impact CO2e",
      desc: "Capture manuelle et historique environnemental.",
      iconBg: "bg-rose-500/10",
      iconColor: "text-rose-400",
      accent: "from-rose-600/10 to-rose-900/20",
      ring: "ring-rose-500/20",
      dot: "bg-rose-400",
      href: "/admin/services#environmental-impact",
    },
  ];

  return (
    <SectionShell
      id="admin"
      title="Pilotage Système"
      subtitle="Console d'administration centrale pour la supervision des flux, la modération et la gestion des privilèges."
      gradient="from-amber-600/20 via-slate-500/10 to-transparent"
    >
      <div className="space-y-20 pt-8">
        
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

        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-3 px-6 py-2.5 rounded-full border border-amber-400/20 bg-amber-400/5 backdrop-blur-md">
            <Zap size={14} className="text-amber-400 animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-amber-400">Console Active</span>
          </div>
          <RubriquePdfExportButton
            rubrique="administration"
            periode={`30_jours_${new Date().getFullYear()}`}
            organizationType="admin"
            defaultTitle="Rapport administration"
            data={adminPdfData}
            className="w-full max-w-xl"
          />
        </div>

        {/* Navigation Grid Premium */}
        <RubriqueCard themeColor="slate" withTopBar={true} topBarContent="Accès Rapides" className="p-12">
          <NavigationGrid items={navigationItems} columns={{ default: 1, sm: 2, md: 4, xl: 5 }} />
        </RubriqueCard>

        {profile === "max" && (
          <>
            <RubriqueCard 
              themeColor="amber" 
              withTopBar={true} 
              topBarContent="Inbox Créateur"
              className="p-12"
            >
              <div className="mb-10">
                <h2 className="text-4xl font-black tracking-tight text-white mt-2">Demandes de Collaboration</h2>
                <p className="mt-4 text-sm text-amber-100/40 max-w-2xl leading-relaxed">
                  Supervision des flux entrants : promotion, événements et partenariats stratégiques.
                </p>
              </div>
              <CreatorInboxPanel initialItems={creatorInboxItems} />
            </RubriqueCard>

            <RubriqueCard 
              themeColor="slate" 
              withTopBar={true} 
              topBarContent="Gestion de Flotte"
              className="p-12"
            >
              <div className="mb-10">
                <h2 className="text-4xl font-black tracking-tight text-white mt-2">Comptes & Rôles</h2>
              </div>
              <RoleManagementPanel initialAccounts={roleAccounts} currentUserId={userId} />
            </RubriqueCard>
          </>
        )}

        <div id="governance" className="space-y-12">
          <RubriqueCard themeColor="slate" withTopBar={true} topBarContent="Governance Monitor" className="p-12">
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
          </RubriqueCard>
        </div>

        <div id="alerts" className="relative">
          <RubriqueCard themeColor="amber" withTopBar={true} topBarContent="Business Alerts" className="p-12">
            <BusinessAlertsPanel />
          </RubriqueCard>
        </div>

        <div id="moderation" className="relative">
          <RubriqueCard themeColor="emerald" withTopBar={true} topBarContent="Modération Terrain" className="p-12">
            <ActionsReportPanel />
          </RubriqueCard>
        </div>

        <div className="rounded-[3rem] border border-white/5 bg-white/5 p-4">
          <RolePrimaryActions profile={profile} />
        </div>

      </div>
    </SectionShell>
  );
}
