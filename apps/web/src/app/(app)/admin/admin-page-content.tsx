import {
  AdminActionGrid,
  AdminInfoBanner,
  AdminOperationalMetricGrid,
  AdminPillLink,
  AdminProfileSwitchStrip,
  AdminSectionHeader,
} from "@/components/admin/admin-dashboard-ui";
import type { AdminActionItem } from "@/components/admin/admin-dashboard-ui";
import { AdminMaxTools } from "@/components/admin/admin-max-tools";
import { AdminCockpitInbox } from "@/components/admin/admin-cockpit-inbox";
import { AdminOperationsAuditPanel } from "@/components/admin/admin-operations-audit-panel";
import { AdminCockpitTabs } from "@/components/admin/admin-cockpit-tabs";
import { AdminCockpitLegacyAnchor } from "@/components/admin/admin-cockpit-legacy-anchor";
import { CmmCard } from "@/components/ui/cmm-card";
import { CmmButton } from "@/components/ui/cmm-button";
import { adminCockpitHref, type AdminCockpitTab } from "@/lib/admin/cockpit-tabs";
import { ModerationByBlockPanel } from "@/components/admin/moderation-by-block-panel";
import { ActionsReportPanel } from "@/components/reports/actions-report-panel";
import { CmmPageLayout, CmmSectionGroup } from "@/components/ui/cmm-section";
import { PageHeader } from "@/components/ui/page-header";
import { canUseSupabaseServerPersistence } from "@/lib/persistence/runtime-store";
import { buildProfileRoute, ADMIN_GODMODE_ROUTE } from "@/lib/accueil-pilotage-routes";
import { getProfileLabel, getSwitchableProfiles, type AppProfile } from "@/lib/profiles";
import { resolvePageFamily } from "@/lib/ui/page-families";
import { buildAdminAlert, buildAdminMetricItems, buildModerationBlockSummaries, loadAdminSources } from "@/lib/admin/admin-dashboard-contract";
import { isImuOwnerIdentity } from "@/lib/auth/role-resolution";
import { env } from "@/lib/env";
import type { UserIdentity } from "@/lib/authz-identity";

type AdminPageContentProps = {
  adminSources: Awaited<ReturnType<typeof loadAdminSources>> | null;
  inboxSource: import("@/lib/admin/admin-dashboard-contract").AdminSources["creatorInbox"] | null;
  auditSource: import("@/lib/admin/admin-dashboard-contract").AdminSources["audit"] | null;
  activeTab: AdminCockpitTab;
  identity: UserIdentity;
  profile: AppProfile;
  role: UserIdentity["activeRole"];
  grantedRole: UserIdentity["role"];
  locale: "fr" | "en";
  moderationPreset: "signalements" | null;
};

export function AdminPageContent({
  adminSources,
  inboxSource,
  auditSource,
  activeTab,
  identity,
  profile,
  role,
  grantedRole,
  locale,
  moderationPreset,
}: AdminPageContentProps) {
  const adminAlert = adminSources ? buildAdminAlert(adminSources) : null;
  const metricItems = adminSources ? buildAdminMetricItems(adminSources) : [];
  const moderationBlocks = adminSources ? buildModerationBlockSummaries(adminSources) : [];
  const switchableProfiles = getSwitchableProfiles(grantedRole);
  const profileLink = buildProfileRoute(profile);
  const profileCountLabel = formatProfileCountLabel(switchableProfiles.length);
  const creatorDisplayName = getCreatorDisplayName(role, identity);
  const moderationFilters = getModerationFilters(moderationPreset);
  const adminTools: AdminActionItem[] = [
    {
      id: "quiz-bank",
      icon: "BookOpenText",
      title: "Revue quiz",
      description: "Filtrer et corriger la banque de questions.",
      href: "/admin/quiz-bank",
      badge: "Audit",
      iconWrapClassName: "bg-amber-100 text-amber-700 border-amber-200/60",
      iconClassName: "text-amber-700",
    },
    {
      id: "site-health",
      icon: "HardDrive",
      title: "Services & santé",
      description: "Contrôler les flux et l’état général.",
      href: "/admin/services",
      badge: "Rapide",
      iconWrapClassName: "bg-sky-100 text-sky-700 border-sky-200/60",
      iconClassName: "text-sky-700",
    },
    {
      id: "system-control",
      icon: "Activity",
      title: "Contrôle système",
      description: "Ouvrir l’arbitrage et les outils sensibles.",
      href: ADMIN_GODMODE_ROUTE,
      badge: "Supervision",
      iconWrapClassName: "bg-violet-100 text-violet-700 border-violet-200/60",
      iconClassName: "text-violet-700",
    },
  ];

  return (
    <main className="min-h-screen cmm-text-primary">
      <CmmPageLayout className="relative z-10">
        <PageHeader
          family={resolvePageFamily("/admin")}
          title="Cockpit opérationnel"
          subtitle="Supervision des files, du workflow et de l’état des services."
          action={<div className="flex flex-wrap items-center justify-center gap-3"><span className="text-sm cmm-text-secondary">{getProfileLabel(profile, locale)}</span><AdminPillLink href={profileLink}>Voir profil</AdminPillLink></div>}
        />
        <AdminCockpitTabs activeTab={activeTab} isMax={role === "max"} locale={locale} />
        <AdminCockpitLegacyAnchor activeTab={activeTab} />
        <CmmSectionGroup>
          {activeTab === "summary" && adminAlert && (
            <>
              <AdminInfoBanner eyebrow="Alerte" title={adminAlert.title} description={adminAlert.detail}
                icon="AlertTriangle" tone="light" compact={adminAlert.title === "Aucune urgence de modération détectée"}
                action={adminAlert.action ? <AdminPillLink href={adminAlert.action.href === "#workflow-administration" ? adminCockpitHref("audit") : adminAlert.action.href}>{adminAlert.action.label}</AdminPillLink> : undefined} />
              <AdminOperationalMetricGrid items={metricItems} className="gap-4" />
              <div id="moderation-par-bloc"><ModerationByBlockPanel blocks={moderationBlocks} /></div>
              <CmmCard className="flex flex-wrap items-center justify-between gap-3">
                <div><h2 className="font-bold cmm-text-primary">Traitement des dossiers</h2><p className="text-sm cmm-text-secondary">Ouvrez les outils dédiés pour filtrer, vérifier et décider.</p></div>
                <div className="flex flex-wrap gap-2">
                  <CmmButton href={adminCockpitHref("moderation")} tone="primary">Modération</CmmButton>
                  <CmmButton href={adminCockpitHref("inbox")} tone="secondary">Boîte créateur</CmmButton>
                </div>
              </CmmCard>
            </>
          )}
          {activeTab === "moderation" && (
            <section id="workflow-administration" className="scroll-mt-28 space-y-3">
              <p className="text-sm cmm-text-secondary">Les saisies non confirmées ne sont pas conservées si vous quittez cette vue.</p>
              <ActionsReportPanel key={moderationPreset ?? "default"}
                initialRecordTypeFilter={moderationFilters.initialRecordTypeFilter}
                initialStatus={moderationFilters.initialStatus} />
            </section>
          )}
          {activeTab === "inbox" && inboxSource && (
            <AdminCockpitInbox source={inboxSource} canQualify={isImuOwnerIdentity(identity, env.CLERK_IMU_OWNER_USER_ID) && canUseSupabaseServerPersistence()} />
          )}
          {activeTab === "audit" && auditSource && (
            auditSource.status === "available"
              ? <AdminOperationsAuditPanel entries={auditSource.data} />
              : <AdminInfoBanner eyebrow="Journal" title="Journal administrateurs indisponible" description="La lecture du journal a échoué. Les autres files restent indépendantes." icon="AlertTriangle" tone="light" />
          )}
          {activeTab === "tools" && (
            <>
              <section>
                <AdminSectionHeader eyebrow="Outils d’administration" description="Accès directs aux fonctions propres à la supervision." />
                <AdminActionGrid items={adminTools} compact columnsClassName="md:grid-cols-2 xl:grid-cols-3" className="mt-3" />
              </section>
              {switchableProfiles.length > 1 && (
                <section aria-label="Profils administratifs disponibles">
                  <AdminProfileSwitchStrip profiles={switchableProfiles} activeProfile={profile}
                    getProfileLabel={getProfileLabel} locale={locale} label={`${profileCountLabel} disponibles`} getHref={buildProfileRoute} />
                </section>
              )}
            </>
          )}
          {activeTab === "advanced" && role === "max" && <AdminMaxTools displayName={creatorDisplayName} identity={identity} />}
        </CmmSectionGroup>
      </CmmPageLayout>
    </main>
  );
}

function formatProfileCountLabel(count: number) {
  return count > 1 ? `${count} profils` : "Profil actif";
}

function getCreatorDisplayName(role: UserIdentity["activeRole"], identity: UserIdentity) {
  if (role !== "max") return "Administration avancée";
  return identity.displayName?.trim() || identity.firstName?.trim() || identity.handle || identity.username || "Administration avancée";
}

function getModerationFilters(preset: "signalements" | null) {
  if (preset === "signalements") return { initialRecordTypeFilter: "signalements" as const, initialStatus: "pending" as const };
  return { initialRecordTypeFilter: undefined, initialStatus: undefined };
}
