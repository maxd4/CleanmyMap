import { Suspense } from "react";
import type { Metadata } from "next";
import { DashboardNotificationsSection } from "@/components/dashboard/dashboard-notifications-section";
import { DashboardEntrance } from "@/components/dashboard/dashboard-entrance";
import { DashboardHomePanel } from "@/components/dashboard/dashboard-home-panel";
import { DashboardCollectivePanel } from "@/components/dashboard/dashboard-collective-panel";
import { DashboardEngagementPanel } from "@/components/dashboard/dashboard-engagement-panel";
import { DashboardPageTabs } from "@/components/dashboard/dashboard-page-tabs";
import { DashboardLegacyAnchor } from "@/components/dashboard/dashboard-legacy-anchor";
import { AccountCompletionGate } from "@/components/account/account-completion-gate";
import { getSafeAuthSession } from "@/lib/auth/safe-session";
import { getCurrentUserIdentity } from "@/lib/authz";
import { getProfileLabel } from "@/lib/profiles";
import { getServerLocale } from "@/lib/server-preferences";
import { getTranslation } from "@/lib/i18n/server-translation";
import { loadDashboardPageData } from "@/lib/dashboard/page-data";
import { resolveDashboardTab } from "@/lib/dashboard/tabs";
import { PageHeader } from "@/components/ui/page-header";
import { CmmPageLayout } from "@/components/ui/cmm-section";
import { resolvePageFamily } from "@/lib/ui/page-families";
import { DASHBOARD_ROUTE } from "@/lib/accueil-pilotage-routes";
import { DashboardAccountControls } from "@/components/dashboard/dashboard-account-controls";
import { DashboardAuthRequiredPreview } from "@/components/dashboard/dashboard-auth-required-preview";
import { DashboardOverviewSkeleton } from "@/components/dashboard/dashboard-overview-skeleton";
import { DashboardProfileSwitcher } from "@/components/dashboard/dashboard-profile-switcher";

export const metadata: Metadata = {
  title: "Mon espace",
  description: "Retrouvez vos accès prioritaires, notifications, engagement et réglages.",
};

type DashboardPageProps = { searchParams?: Promise<{ tab?: string | string[] }> };

export default async function DashboardPage({ searchParams }: DashboardPageProps = {}) {
  const [{ userId, clerkReachable }, locale, params] = await Promise.all([
    getSafeAuthSession(), getServerLocale(), searchParams ?? Promise.resolve({} as { tab?: string | string[] }),
  ]);
  if (!userId) return <DashboardAuthRequiredPreview />;

  const { accountCompletion, displayMode, profile } = await loadDashboardPageData({ userId, clerkReachable });
  const identity = await getCurrentUserIdentity({ userId }).catch(() => null);
  const grantedRole = identity?.role ?? profile;
  const activeRole = identity?.activeRole ?? profile;
  const roleLabel = getProfileLabel(activeRole, locale);
  const activeTab = resolveDashboardTab(params.tab);
  const { t } = getTranslation("dashboard", locale);

  return (
    <AccountCompletionGate state={accountCompletion}>
      <main className="relative min-h-screen" data-display-mode={displayMode}>
        <DashboardEntrance className="relative z-10">
          <CmmPageLayout>
            <PageHeader family={resolvePageFamily(DASHBOARD_ROUTE)} title={t("title_v1")}
              subtitle={locale === "fr" ? "Vos actions, votre engagement et votre compte" : "Your actions, engagement and account"}
              action={<span className="text-sm font-semibold cmm-text-secondary">{locale === "fr" ? "Rôle actif : " : "Active role: "}{roleLabel}</span>} />
            <DashboardPageTabs activeTab={activeTab} locale={locale} />
            <DashboardLegacyAnchor activeTab={activeTab} />
            {activeTab === "today" && <DashboardHomePanel profile={activeRole} locale={locale} />}
            {activeTab === "notifications" && <DashboardNotificationsSection />}
            {activeTab === "collective" && (
              <Suspense fallback={<DashboardOverviewSkeleton />}>
                <DashboardCollectivePanel locale={locale} profile={activeRole} />
              </Suspense>
            )}
            {activeTab === "engagement" && (
              <Suspense fallback={<DashboardOverviewSkeleton />}>
                <DashboardEngagementPanel userId={userId} profile={activeRole} locale={locale} />
              </Suspense>
            )}
            {activeTab === "account" && (
              <section className="space-y-4" aria-labelledby="dashboard-account-title">
                <h2 id="dashboard-account-title" className="text-xl font-bold cmm-text-primary">{locale === "fr" ? "Gestion du compte" : "Account management"}</h2>
                <DashboardAccountControls locale={locale} grantedRole={grantedRole} />
                <DashboardProfileSwitcher locale={locale} activeRole={activeRole} grantedRole={grantedRole} />
              </section>
            )}
          </CmmPageLayout>
        </DashboardEntrance>
      </main>
    </AccountCompletionGate>
  );
}
