import type { Metadata } from "next";
import { AccountCompletionGate } from "@/components/account/account-completion-gate";
import { AdminCreatorConsole } from "@/components/admin/admin-creator-console";
import { AdminAccessState } from "@/components/ui/admin-access-state";
import { PageHeader, PageHeaderBadge } from "@/components/ui/page-header";
import {
  AdminActionGrid,
  AdminHeroStrip,
  AdminInfoBanner,
  AdminOperationalMetricGrid,
  AdminPillLink,
  AdminProfileSwitchStrip,
  AdminSectionHeader,
} from "@/components/admin/admin-dashboard-ui";
import type { AdminActionItem } from "@/components/admin/admin-dashboard-ui";
import {
  ModerationByBlockPanel,
} from "@/components/admin/moderation-by-block-panel";
import { ActionsReportPanel } from "@/components/reports/actions-report-panel";
import { getCurrentUserIdentity, getCurrentUserRoleLabel } from "@/lib/authz";
import { getSafeAuthSession } from "@/lib/auth/safe-session";
import { loadAccountCompletionGateState } from "@/lib/auth/account-completion-gate";
import {
  getProfileLabel,
  getSwitchableProfiles,
  isAdminLikeProfile,
  toProfile,
} from "@/lib/profiles";
import { getServerLocale } from "@/lib/server-preferences";
import { buildProfileRoute, ADMIN_GODMODE_ROUTE } from "@/lib/accueil-pilotage-routes";
import { resolvePageFamily } from "@/lib/ui/page-families";
import { resolvePublicContactEmail } from "@/lib/email-config";
import {
  buildAdminAlert,
  buildAdminMetricItems,
  buildModerationBlockSummaries,
  getCreatorInboxNeedsAttention,
  getPendingPublishedEntries,
  loadAdminSources,
} from "@/lib/admin/admin-dashboard-contract";
import {
  parseAdminModerationParam,
} from "@/components/reports/admin-workflow/helpers";

export const metadata: Metadata = {
  title: "Administration - CleanMyMap",
  description:
    "Back-office du site pour gérer les utilisateurs, la modération et les demandes.",
};

export default async function AdminPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
} = {}) {
  const resolvedSearchParams = await searchParams;
  const moderationPreset = parseAdminModerationParam(resolvedSearchParams?.moderation);
  const { userId, clerkReachable } = await getSafeAuthSession();
  const locale = await getServerLocale();

  if (!clerkReachable) {
    return (
      <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_rgba(255,249,243,0.98)_0%,_rgba(246,239,228,0.96)_48%,_rgba(238,231,219,0.98)_100%)] px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-4xl items-center justify-center">
          <AdminAccessState className="w-full" authUnavailable />
        </div>
      </div>
    );
  }

  if (!userId) {
    return (
      <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_rgba(255,249,243,0.98)_0%,_rgba(246,239,228,0.96)_48%,_rgba(238,231,219,0.98)_100%)] px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-4xl items-center justify-center">
          <AdminAccessState className="w-full" />
        </div>
      </div>
    );
  }

  const accountCompletion = await loadAccountCompletionGateState({
    userId,
    clerkReachable,
  }).catch(() => null);

  const role = await getCurrentUserRoleLabel();
  const profile = toProfile(role);
  const pageFamily = resolvePageFamily("/admin");
  const contactEmail = resolvePublicContactEmail() ?? "contact@cleanmymap.fr";
  const creatorIdentity =
    role === "max"
      ? await getCurrentUserIdentity().catch(() => null)
      : null;
  const creatorDisplayName =
    creatorIdentity?.displayName?.trim() ||
    creatorIdentity?.firstName?.trim() ||
    creatorIdentity?.username ||
    creatorIdentity?.handle ||
    "Administration avancée";

  if (!isAdminLikeProfile(profile)) {
    return (
      <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_rgba(255,249,243,0.98)_0%,_rgba(246,239,228,0.96)_48%,_rgba(238,231,219,0.98)_100%)] px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-4xl items-center justify-center">
          <AdminAccessState className="w-full" />
        </div>
      </div>
    );
  }

  const adminSources = await loadAdminSources();
  const adminAlert = buildAdminAlert(adminSources);
  const metricItems = buildAdminMetricItems(adminSources);
  const switchableProfiles = getSwitchableProfiles(profile);
  const profileLink = buildProfileRoute(profile);
  const profileCountLabel =
    switchableProfiles.length > 1
      ? `${switchableProfiles.length} profils`
      : "Profil actif";

  const creatorInboxNeedsAttention =
    adminSources.creatorInbox.status === "available"
      ? getCreatorInboxNeedsAttention(adminSources.creatorInbox.data)
      : null;
  const pendingPartnerInboxItems = creatorInboxNeedsAttention
    ? creatorInboxNeedsAttention.filter((item) => item.source === "partner")
    : null;
  const pendingPublishedEntries =
    adminSources.publishedEntries.status === "available"
      ? getPendingPublishedEntries(adminSources.publishedEntries.data)
      : null;
  const auditErrors =
    adminSources.audit.status === "available"
      ? adminSources.audit.data.filter((item) => item.outcome === "error")
      : null;

  const actionTiles: AdminActionItem[] = [
    {
      id: "creator-inbox",
      icon: "Inbox",
      title: "Inbox créateur",
      description:
        pendingPartnerInboxItems === null
          ? "Source indisponible."
          : pendingPartnerInboxItems.length > 0
            ? `${pendingPartnerInboxItems.length} demandes prioritaires à traiter.`
          : "Aucune demande prioritaire en attente.",
      href: "/admin/services#governance-report",
      badge: "Prioritaire",
    },
    {
      id: "export-data",
      icon: "Download",
      title: "Exporter les données",
      description:
        pendingPublishedEntries === null
          ? "Source indisponible."
          : pendingPublishedEntries.length > 0
            ? `${pendingPublishedEntries.length} publications partenaires à revoir.`
          : "Suivre les exports et les journaux.",
      href: "/admin/services#governance-report",
      badge: "Rapide",
    },
    {
      id: "system-control",
      icon: "Activity",
      title: "Contrôle système",
      description:
        auditErrors === null
          ? "Source indisponible."
          : auditErrors.length > 0
            ? `${auditErrors.length} incidents techniques à inspecter.`
          : "Ouvrir l'arbitrage et les outils sensibles.",
      href: ADMIN_GODMODE_ROUTE,
      badge: "Rapide",
    },
  ];

  const quickAccessTiles: AdminActionItem[] = [
    {
      id: "declare-action",
      icon: "Activity",
      title: "Déclarer une action",
      description: "Enregistrer une intervention terrain.",
      href: "/actions/new",
      badge: "Rapide",
      iconWrapClassName: "bg-amber-100 text-amber-700 border-amber-200/60",
      iconClassName: "text-amber-700",
    },
    {
      id: "manage-data",
      icon: "Database",
      title: "Gérer les données",
      description: "Valider, corriger, enrichir.",
      href: "/actions/history",
      badge: "Rapide",
      iconWrapClassName: "bg-emerald-100 text-emerald-700 border-emerald-200/60",
      iconClassName: "text-emerald-700",
    },
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
      id: "traceability",
      icon: "ShieldCheck",
      title: "Renforcer traçabilité",
      description: "Consulter les journaux d'administration.",
      href: "/admin/services#governance-report",
      badge: "Rapide",
      iconWrapClassName: "bg-violet-100 text-violet-700 border-violet-200/60",
      iconClassName: "text-violet-700",
    },
    {
      id: "site-health",
      icon: "HardDrive",
      title: "Santé du site",
      description: "Contrôler les flux et l'état général.",
      href: "/admin/services",
      badge: "Rapide",
      iconWrapClassName: "bg-sky-100 text-sky-700 border-sky-200/60",
      iconClassName: "text-sky-700",
    },
  ];

  const privacyTiles: AdminActionItem[] = [
    {
      id: "account-settings",
      icon: "Settings",
      title: "Paramètres du compte",
      description: "Gérer vos préférences et vos données.",
      href: "/reglages",
      badge: "Accès",
      iconWrapClassName: "bg-amber-100 text-amber-700 border-amber-200/60",
      iconClassName: "text-amber-700",
    },
    {
      id: "privacy",
      icon: "ShieldCheck",
      title: "Confidentialité",
      description: "Gérez comment vos données sont utilisées et partagées.",
      href: "/politique-confidentialite",
      badge: "Protection",
      iconWrapClassName: "bg-emerald-100 text-emerald-700 border-emerald-200/60",
      iconClassName: "text-emerald-700",
    },
    {
      id: "delete-account",
      icon: "Trash2",
      title: "Suppression du compte",
      description: "Vous pouvez supprimer votre compte à tout moment.",
      href: `mailto:${contactEmail}?subject=${encodeURIComponent(
        "Demande RGPD - Suppression de compte",
      )}`,
      badge: "Urgent",
      iconWrapClassName: "bg-rose-100 text-rose-700 border-rose-200/60",
      iconClassName: "text-rose-700",
    },
  ];

  const moderationBlocks = buildModerationBlockSummaries(adminSources);

  return (
    <AccountCompletionGate state={accountCompletion}>
      <main className="relative min-h-screen overflow-hidden bg-[radial-gradient(ellipse_at_top,_rgba(255,249,243,0.98)_0%,_rgba(248,239,228,0.95)_45%,_rgba(239,231,220,0.98)_100%)] text-stone-950">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute inset-x-0 top-0 h-44 bg-[linear-gradient(180deg,rgba(32,28,39,0.94)_0%,rgba(32,28,39,0.8)_62%,rgba(32,28,39,0)_100%)]" />
          <div className="absolute -left-24 top-24 h-96 w-96 rounded-full bg-amber-300/22 blur-2xl" />
          <div className="absolute right-0 top-40 h-[30rem] w-[30rem] rounded-full bg-stone-200/22 blur-2xl" />
          <div className="absolute bottom-0 left-1/2 h-[24rem] w-[28rem] -translate-x-1/2 rounded-full bg-white/30 blur-2xl" />
        </div>

        <div className="relative mx-auto max-w-[1440px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <AdminHeroStrip
            icon="ShieldCheck"
            eyebrow="Espace administratif"
            description="Supervision système et modération critique."
            accessLabel="Accès administration"
            action={
              <AdminPillLink href={profileLink} subdued>
                Voir profil
              </AdminPillLink>
            }
          />

          <div className="mt-8 grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_auto] xl:items-end">
            <PageHeader
              family={pageFamily}
              eyebrow="Espace administratif"
              title="Mon espace"
              subtitle="Cockpit opérationnel de l'administration."
              badges={
                <>
                  <PageHeaderBadge family={pageFamily}>
                    Console active
                  </PageHeaderBadge>
                  <PageHeaderBadge family={pageFamily} muted>
                    Rôle: {role}
                  </PageHeaderBadge>
                </>
              }
              action={
                <AdminPillLink href={profileLink}>
                  Voir profil
                </AdminPillLink>
              }
              className="max-w-none w-full"
            />
          </div>

          <AdminInfoBanner
            eyebrow="Alerte"
            title={adminAlert.title}
            description={adminAlert.detail}
            icon="AlertTriangle"
            tone="light"
            action={
              adminAlert.action ? (
                <AdminPillLink href={adminAlert.action.href}>
                  {adminAlert.action.label}
                </AdminPillLink>
              ) : undefined
            }
            className="mt-8"
          />

          <AdminOperationalMetricGrid items={metricItems} className="mt-8" />

          <section className="mt-10">
            <AdminSectionHeader
              eyebrow="À faire maintenant"
              description="Les actions prioritaires restent accessibles depuis les sous-rubriques dédiées."
              action={
                <AdminPillLink href="/admin/services">
                  Voir toutes les actions
                </AdminPillLink>
              }
            />

            <AdminActionGrid items={actionTiles} className="mt-4" />
          </section>

          <div id="moderation-par-bloc" className="mt-10">
            <ModerationByBlockPanel blocks={moderationBlocks} />
          </div>

          <section className="mt-10" id="workflow-administration">
            <AdminSectionHeader
              eyebrow="Workflow administration"
              description="Filtrer, prévisualiser, confirmer et journaliser les opérations d'export et de modération."
            />
            <div className="mt-4">
              <ActionsReportPanel
                initialRecordTypeFilter={
                  moderationPreset === "signalements" ? "signalements" : undefined
                }
                initialStatus={moderationPreset === "signalements" ? "pending" : undefined}
              />
            </div>
          </section>

          <section className="mt-10">
            <AdminSectionHeader
              eyebrow="Accès rapides"
              description="Les raccourcis de la console restent triés par usage courant."
            />

            <AdminActionGrid
              items={quickAccessTiles}
              compact
              className="mt-4"
            />
          </section>

          <section className="mt-10 rounded-[2rem] border border-stone-200/80 bg-white/76 p-5 shadow-[0_16px_40px_-32px_rgba(69,45,28,0.26)] backdrop-blur-sm">
            <AdminSectionHeader
              eyebrow="Confidentialité & compte"
              description="Les accès sensibles et les options de compte sont centralisés ici."
            />

            <AdminActionGrid
              items={privacyTiles}
              compact
              columnsClassName="md:grid-cols-3"
              className="mt-4"
            />
          </section>

          <section className="mt-10 space-y-4">
            <AdminSectionHeader
              eyebrow="Informations système"
              description="Les repères internes restent concentrés dans un seul espace de supervision."
              action={
                <PageHeaderBadge family={pageFamily} muted>
                  {profileCountLabel}
                </PageHeaderBadge>
              }
            />

            <AdminInfoBanner
              eyebrow="Privilèges système"
              title="Vous avez déjà un niveau de supervision élevé."
              description="Le formulaire de promotion est réservé aux profils de terrain et de coordination nécessitant des droits étendus."
              icon="ShieldCheck"
              tone="warm"
              action={
                <AdminPillLink href={profileLink} subdued>
                  Évolution du compte
                </AdminPillLink>
              }
            />

            <AdminProfileSwitchStrip
              profiles={switchableProfiles}
              activeProfile={profile}
              getProfileLabel={getProfileLabel}
              locale={locale}
              label="Switch de profil (Admin)"
              getHref={buildProfileRoute}
            />
          </section>

          {role === "max" ? (
            <AdminCreatorConsole
              displayName={creatorDisplayName}
              embedded
              className="mt-10"
            />
          ) : null}
        </div>
      </main>
    </AccountCompletionGate>
  );
}
