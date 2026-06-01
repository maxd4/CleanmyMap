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
import { AccountCompletionGate } from "@/components/account/account-completion-gate";

import { ThirtySecondsSummary } from"@/components/pilotage/thirty-seconds-summary";
import { ActionsReportPanel } from"@/components/reports/actions-report-panel";
import { ClerkRequiredGate } from"@/components/ui/clerk-required-gate";
import { PageHeader, PageHeaderBadge } from "@/components/ui/page-header";
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
import { loadAccountCompletionGateState } from "@/lib/auth/account-completion-gate";
import { resolvePageFamily } from "@/lib/ui/page-families";

export const metadata: Metadata = {
  title: 'Administration du site - CleanMyMap',
  description: 'Back-office du site pour gérer les utilisateurs, la modération et les demandes.',
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
  const { userId, clerkReachable } = await getSafeAuthSession();
  const locale = await getServerLocale();

  if (!userId) {
    return (
        <ClerkRequiredGate
        isAuthenticated={false}
        mode="blur"
        title="Administration du site"
        description="Accès réservé aux comptes Clerk autorisés."
        lockedPreview={
          <div className="grid gap-6 md:grid-cols-3 rounded-[3rem] border border-stone-400/18 p-8 bg-[rgba(44,28,15,0.40)] backdrop-blur-2xl">
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

  const accountCompletion = userId
    ? await loadAccountCompletionGateState({ userId, clerkReachable }).catch(() => null)
    : null;
  const role = await getCurrentUserRoleLabel();
  const profile = toProfile(role);
  const primaryAction = getProfilePrimaryAction(profile);
  const pageFamily = resolvePageFamily("/admin");

  if (!isAdminLikeProfile(profile)) {
    return (
      <div className="p-12">
        <RubriqueCard themeColor="amber" withTopBar={false} className="p-12 text-center">
          <div className="inline-flex p-4 rounded-3xl bg-amber-400/10 text-amber-400 mb-6">
            <ShieldCheck size={32} />
          </div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-400/60">Accès Restreint</p>
          <h2 className="mt-4 text-4xl font-black tracking-tight text-white">
            Privilèges d'administration du site requis
          </h2>
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
      iconBg: "bg-amber-500/10",
      iconColor: "text-amber-400",
      accent: "from-amber-600/10 to-stone-900/20",
      ring: "ring-amber-500/20",
      dot: "bg-amber-400",
      href: "#governance",
    },
    {
      icon: AlertTriangle,
      title: "Alertes",
      desc: "Écarts à traiter rapidement.",
      iconBg: "bg-orange-500/10",
      iconColor: "text-orange-400",
      accent: "from-orange-600/10 to-stone-900/20",
      ring: "ring-orange-500/20",
      dot: "bg-orange-400",
      href: "#alerts",
    },
    {
      icon: FileSearch,
      title: "Modération",
      desc: "Validation des actions et preuves.",
      iconBg: "bg-amber-500/10",
      iconColor: "text-amber-300",
      accent: "from-amber-700/10 to-stone-900/20",
      ring: "ring-amber-500/20",
      dot: "bg-amber-300",
      href: "#moderation",
    },
    {
      icon: Settings,
      title: "Services",
      desc: "État des API et de l'infrastructure.",
      iconBg: "bg-stone-500/10",
      iconColor: "text-stone-400",
      accent: "from-stone-600/10 to-stone-950/20",
      ring: "ring-stone-500/20",
      dot: "bg-stone-400",
      href: "/admin/services",
    },
    {
      icon: Zap,
      title: "Journal Codex",
      desc: "Saisie hebdomadaire de l'usage IA et historique projet.",
      iconBg: "bg-amber-500/10",
      iconColor: "text-amber-400",
      accent: "from-amber-600/10 to-stone-900/20",
      ring: "ring-amber-500/20",
      dot: "bg-amber-400",
      href: "/admin/services#codex-usage",
    },
    {
      icon: HardDrive,
      title: "Stockage",
      desc: "Quota Supabase, usage et croissance mensuelle.",
      iconBg: "bg-orange-500/10",
      iconColor: "text-orange-400",
      accent: "from-orange-600/10 to-stone-900/20",
      ring: "ring-orange-500/20",
      dot: "bg-orange-400",
      href: "/admin/services#storage",
    },
    {
      icon: Database,
      title: "Plans gratuits",
      desc: "Vercel, Resend, Clerk et autres proxys mensuels.",
      iconBg: "bg-stone-500/10",
      iconColor: "text-stone-300",
      accent: "from-stone-600/10 to-stone-900/20",
      ring: "ring-stone-500/20",
      dot: "bg-stone-300",
      href: "/admin/services#free-plans",
    },
    {
      icon: FileSearch,
      title: "Rapport mensuel",
      desc: "PDF central de gouvernance et archive publique.",
      iconBg: "bg-amber-500/10",
      iconColor: "text-amber-400",
      accent: "from-amber-600/10 to-stone-900/20",
      ring: "ring-amber-500/20",
      dot: "bg-amber-400",
      href: "/admin/services#governance-report",
    },
    {
      icon: Database,
      title: "Impact CO2e",
      desc: "Capture manuelle et historique environnemental.",
      iconBg: "bg-orange-500/10",
      iconColor: "text-orange-300",
      accent: "from-orange-600/10 to-stone-900/20",
      ring: "ring-orange-500/20",
      dot: "bg-orange-300",
      href: "/admin/services#environmental-impact",
    },
  ];

  return (
    <AccountCompletionGate state={accountCompletion}>
      <SectionShell
        id="admin"
        hideHeader
        gradient="from-amber-700/20 via-stone-500/10 to-transparent"
      >
        <div className="space-y-20 pt-8">
        <PageHeader
          family={pageFamily}
          eyebrow="Back-office central"
          title="Administration du site"
          subtitle="Console centrale pour la supervision des flux, la modération et la gestion des privilèges."
          badges={
            <>
              <PageHeaderBadge family={pageFamily}>
                <Zap size={12} className="mr-2 inline-block align-[-2px]" />
                Console active
              </PageHeaderBadge>
              <PageHeaderBadge family={pageFamily} muted>
                Rôle: {role}
              </PageHeaderBadge>
            </>
          }
          action={
            <RubriquePdfExportButton
              rubrique="administration-du-site"
              periode={`30_jours_${new Date().getFullYear()}`}
              organizationType="admin"
              defaultTitle="Rapport administration du site"
              data={adminPdfData}
              className="w-full max-w-xl"
            />
          }
          className="max-w-5xl"
        />
        
        {/* Résumé Décisionnel (ThirtySecondsSummary) */}
        {overview && (
          <ThirtySecondsSummary
            kpis={overview.summary.kpis}
            alert={overview.summary.alert}
            recommendedAction={{
              href: overview.summary.recommendedAction.href ?? primaryAction.href,
              label: overview.summary.recommendedAction.label ?? primaryAction.label[locale],
            }}
            recommendedReason={overview.summary.recommendedAction.reason}
          />
        )}

        {/* Navigation Grid Premium */}
        <RubriqueCard themeColor="amber" withTopBar={true} topBarContent="Administration du site" className="p-12">
          <NavigationGrid items={navigationItems} columns={{ default: 1, sm: 2, md: 4, xl: 5 }} />
        </RubriqueCard>

        {profile === "max" && (
          <>
            <RubriqueCard 
              themeColor="amber" 
              withTopBar={true} 
              topBarContent="Accès privilégié"
              className="p-12"
            >
              <div className="mb-10">
                <h2 className="text-4xl font-black tracking-tight text-white mt-2">Demandes de collaboration</h2>
                <p className="mt-4 text-sm text-amber-100/40 max-w-2xl leading-relaxed">
                  Supervision des flux entrants : promotion, événements et partenariats stratégiques.
                </p>
              </div>
              <CreatorInboxPanel initialItems={creatorInboxItems} />
            </RubriqueCard>

          <RubriqueCard 
            themeColor="amber" 
            withTopBar={true} 
            topBarContent="Gestion des rôles"
            className="p-12"
          >
              <div className="mb-10">
                <h2 className="text-4xl font-black tracking-tight text-white mt-2">Comptes et rôles</h2>
              </div>
              <RoleManagementPanel initialAccounts={roleAccounts} currentUserId={userId} />
            </RubriqueCard>
          </>
        )}

        <div id="governance" className="space-y-12">
          <RubriqueCard themeColor="amber" withTopBar={true} topBarContent="Governance Monitor" className="p-12">
            <div className="grid gap-8 md:grid-cols-3">
              {[
                { title: "Onboarding Partenaires", stats: onboardingStatus, color: "text-amber-400" },
                { title: "Publication Annuaire", stats: publicationStatus, color: "text-orange-400" },
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
          <RubriqueCard themeColor="amber" withTopBar={true} topBarContent="Modération Terrain" className="p-12">
            <ActionsReportPanel />
          </RubriqueCard>
        </div>

        <div className="rounded-[3rem] border border-white/5 bg-white/5 p-4">
          <RolePrimaryActions profile={profile} tone="dark" />
        </div>

        </div>
      </SectionShell>
    </AccountCompletionGate>
  );
}
