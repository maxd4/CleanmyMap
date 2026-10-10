import { Suspense } from "react";
import { DashboardOverviewSection } from "@/components/dashboard/dashboard-overview-section";
import { DashboardNotificationsSection } from "@/components/dashboard/dashboard-notifications-section";
import { DashboardEntrance } from "@/components/dashboard/dashboard-entrance";
import { AccountEvolutionStatusLink } from "@/components/account/account-evolution-status-link";
import { IdentityProfileBanner } from "@/components/ui/identity-profile-banner";
import { RolePrimaryActions } from "@/components/navigation/role-primary-actions";
import { AccountCompletionGate } from "@/components/account/account-completion-gate";
import { getSafeAuthSession } from "@/lib/auth/safe-session";
import { getCurrentUserIdentity } from "@/lib/authz";
import {
  getProfileLabel,
  getProfilePrimaryAction,
  getSwitchableProfiles,
  isAdminLikeProfile,
} from "@/lib/profiles";
import {
  getServerLocale,
} from "@/lib/server-preferences";
import { getTranslation } from "@/lib/i18n/server-translation";
import {
  loadDashboardPageData,
} from "@/lib/dashboard/page-data";
import { Shield } from "lucide-react";
import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/page-header";
import { CmmPageLayout } from "@/components/ui/cmm-section";
import { resolvePageFamily } from "@/lib/ui/page-families";
import { DASHBOARD_ROUTE } from "@/lib/accueil-pilotage-routes";
import { DashboardAccountControls } from "@/components/dashboard/dashboard-account-controls";
import { DashboardAuthRequiredPreview } from "@/components/dashboard/dashboard-auth-required-preview";
import { DashboardOverviewSkeleton } from "@/components/dashboard/dashboard-overview-skeleton";
import { DashboardPriorityAction } from "@/components/dashboard/dashboard-priority-action";
import { DashboardProfileSwitcher } from "@/components/dashboard/dashboard-profile-switcher";
import { DashboardReferralCard } from "@/components/dashboard/dashboard-referral-card";
import { DashboardUserLevelRanking } from "@/components/dashboard/dashboard-user-level-ranking";

export const metadata: Metadata = {
  title: "Mon espace",
  description:
    "Suivez votre impact, consultez vos statistiques et gérez votre compte depuis un espace centralisé.",
};

export default async function DashboardPage() {
  const { userId, clerkReachable } = await getSafeAuthSession();
  const locale = await getServerLocale();

  if (!userId) {
    return <DashboardAuthRequiredPreview />;
  }

  const {
    accountCompletion,
    displayMode,
    profile,
    userLevelRanking,
    referralSummary,
    overviewPromise,
  } = await loadDashboardPageData({ userId, clerkReachable, locale });
  const identity = await getCurrentUserIdentity({ userId }).catch(() => null);
  const grantedRole = identity?.role ?? profile;
  const roleLabel = getProfileLabel(profile, locale);
  const primaryAction = getProfilePrimaryAction(profile);
  const { t } = getTranslation("dashboard", locale);
  const pageFamily = resolvePageFamily(DASHBOARD_ROUTE);
  const isAdmin = isAdminLikeProfile(profile);
  const switchableProfiles = isAdmin
    ? getSwitchableProfiles(profile)
    : [profile];

  return (
    <AccountCompletionGate state={accountCompletion}>
      <main
        className="relative min-h-screen overflow-hidden"
        data-display-mode={displayMode}
      >
        <DashboardEntrance className="relative z-10">
          <CmmPageLayout>
          {/* ── Configuration active ── */}
          <div data-gsap-reveal className="space-y-3">
            <IdentityProfileBanner profile={profile} />
            <div className="flex justify-end">
              <AccountEvolutionStatusLink
                label="Faire évoluer mon compte"
                pendingLabel="Voir ma demande"
                className="border-amber-900/20 bg-amber-950/10 text-amber-950 hover:bg-amber-950/16"
              />
            </div>
          </div>

          {/* ── Header ── */}
          <div
            data-gsap-reveal
            className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"
          >
            <PageHeader
              family={pageFamily}
              title={t("title_v1")}
              className="flex-1"
            />
            <div className="flex items-center gap-2.5 pb-1">
              <span className="h-2 w-2 rounded-full bg-amber-300 shadow-[0_0_8px_rgba(251,191,36,0.55)]" />
              <span className="text-sm font-semibold text-amber-900">
                {roleLabel}
              </span>
              <span className="rounded-lg border border-amber-200/18 bg-[rgba(69,26,3,0.72)] px-3 py-1 cmm-text-caption font-mono font-bold text-amber-50 shadow-sm">
                <Shield size={10} className="mr-1.5 inline text-amber-300" />
                {userId.slice(-8).toUpperCase()}
              </span>
            </div>
          </div>

          {/* ── Résumé décisionnel + Plan de journée ── */}
          <div data-gsap-reveal>
            <Suspense fallback={<DashboardOverviewSkeleton />}>
              <DashboardOverviewSection
                overviewPromise={overviewPromise}
                locale={locale}
                profile={profile}
                primaryAction={primaryAction}
              />
            </Suspense>
          </div>

          <div data-gsap-reveal>
            <DashboardNotificationsSection />
          </div>

          {/* ── Séparateur ── */}
          <div className="h-px bg-amber-200/24" />

          {/* ── Action prioritaire ── */}
          <DashboardPriorityAction locale={locale} />

          {/* ── Séparateur ── */}
          <div className="h-px bg-amber-200/24" />

          {/* ── Accès rapides ── */}
          <div data-gsap-reveal>
            <p className="mb-6 cmm-text-caption font-bold uppercase tracking-[0.3em] text-amber-100/78">
              {locale === "fr" ? "Accès rapides" : "Quick access"}
            </p>
            <RolePrimaryActions profile={profile} title="" tone="warm" />
          </div>

          <div className="h-px bg-amber-200/24" />

          {/* ── Parrainages + Classement global des niveaux utilisateur ── */}
          <div
            data-gsap-reveal
            className="grid gap-6 xl:grid-cols-[0.72fr_1.28fr]"
          >
            <DashboardReferralCard
              locale={locale}
              summary={referralSummary}
              profile={profile}
            />
            <DashboardUserLevelRanking
              locale={locale}
              userId={userId}
              userLevelRanking={userLevelRanking}
            />
          </div>

          <div className="mt-14 h-px bg-amber-200/24" />

          <DashboardAccountControls locale={locale} grantedRole={grantedRole} />

          <DashboardProfileSwitcher
            locale={locale}
            profile={profile}
            isAdmin={isAdmin}
            switchableProfiles={switchableProfiles}
          />
          </CmmPageLayout>
        </DashboardEntrance>
      </main>
    </AccountCompletionGate>
  );
}
