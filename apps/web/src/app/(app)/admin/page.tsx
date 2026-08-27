import type { Metadata } from "next";
import { AccountCompletionGate } from "@/components/account/account-completion-gate";
import { AdminCreatorConsole } from "@/components/admin/admin-creator-console";
import { AdminAccessState } from "@/components/ui/admin-access-state";
import { PageHeader, PageHeaderBadge } from "@/components/ui/page-header";
import {
  AdminActionGrid,
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
import {
  buildAdminAlert,
  buildAdminMetricItems,
  buildModerationBlockSummaries,
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

  const moderationBlocks = buildModerationBlockSummaries(adminSources);

  return (
    <AccountCompletionGate state={accountCompletion}>
      <main className="min-h-screen bg-[linear-gradient(180deg,#fffaf5_0%,#f7efe6_52%,#efe4d8_100%)] text-stone-950">
        <div className="relative mx-auto max-w-[1440px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <PageHeader
            family={pageFamily}
            eyebrow="Administration"
            title="Cockpit opérationnel"
            subtitle="Supervision des files, du workflow et de l’état des services."
            badge={
              <PageHeaderBadge family={pageFamily}>
                Accès administration · rôle : {role}
              </PageHeaderBadge>
            }
            action={<AdminPillLink href={profileLink}>Voir profil</AdminPillLink>}
            className="w-full"
          />

          <AdminInfoBanner
            eyebrow="Alerte"
            title={adminAlert.title}
            description={adminAlert.detail}
            icon="AlertTriangle"
            tone="light"
            compact={adminAlert.title === "Aucune urgence de modération détectée"}
            action={
              adminAlert.action ? (
                <AdminPillLink href={adminAlert.action.href}>
                  {adminAlert.action.label}
                </AdminPillLink>
              ) : undefined
            }
            className="mt-6"
          />

          <AdminOperationalMetricGrid items={metricItems} className="mt-6 gap-4" />

          <div id="moderation-par-bloc" className="mt-10">
            <ModerationByBlockPanel blocks={moderationBlocks} />
          </div>

          <section className="mt-10" id="workflow-administration">
            <ActionsReportPanel
              initialRecordTypeFilter={
                moderationPreset === "signalements" ? "signalements" : undefined
              }
              initialStatus={moderationPreset === "signalements" ? "pending" : undefined}
            />
          </section>

          <section className="mt-10">
            <AdminSectionHeader
              eyebrow="Outils d’administration"
              description="Accès directs aux fonctions propres à la supervision."
            />

            <AdminActionGrid
              items={adminTools}
              compact
              columnsClassName="md:grid-cols-2 xl:grid-cols-3"
              className="mt-3"
            />
          </section>

          {switchableProfiles.length > 1 ? (
            <section className="mt-8" aria-label="Profils administratifs disponibles">
              <AdminProfileSwitchStrip
                profiles={switchableProfiles}
                activeProfile={profile}
                getProfileLabel={getProfileLabel}
                locale={locale}
                label={`${profileCountLabel} disponibles`}
                getHref={buildProfileRoute}
              />
            </section>
          ) : null}

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
