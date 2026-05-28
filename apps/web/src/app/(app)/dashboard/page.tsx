import { Suspense } from "react";
import { DashboardOverviewSection } from "@/components/dashboard/dashboard-overview-section";
import { DashboardEntrance } from "@/components/dashboard/dashboard-entrance";
import { AccountSettingsSection } from "@/components/account/account-settings-section";
import { PromotionRequestForm } from "@/components/sections/rubriques/promotion-request-form";
import { ClerkRequiredGate } from "@/components/ui/clerk-required-gate";
import { FamilyRubriqueCard } from "@/components/ui/family-rubrique-card";
import { IdentityProfileBanner } from "@/components/ui/identity-profile-banner";
import { RolePrimaryActions } from "@/components/navigation/role-primary-actions";
import { CmmButton } from "@/components/ui/cmm-button";
import { getSafeAuthSession } from "@/lib/auth/safe-session";
import { getCurrentUserRoleLabel } from "@/lib/authz";
import { buildProfileRoute } from "@/lib/accueil-pilotage-routes";
import {
  getProfileLabel,
  getProfilePrimaryAction,
  getSwitchableProfiles,
  isAdminLikeProfile,
  toProfile,
} from "@/lib/profiles";
import { getServerDisplayMode, getServerLocale } from "@/lib/server-preferences";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getTranslation } from "@/lib/i18n/server-translation";
import { loadPilotageOverview } from "@/lib/pilotage/overview";
import { Shield, Plus, ArrowRight } from "lucide-react";
import type { Metadata } from "next";
import { PageHero } from "@/components/ui/page-hero";
import { resolvePageFamily } from "@/lib/ui/page-families";
import { DASHBOARD_ROUTE } from "@/lib/accueil-pilotage-routes";

export const metadata: Metadata = {
  title: "Mon espace - CleanMyMap",
  description: "Suivez votre impact, consultez vos statistiques et gérez votre compte depuis un espace centralisé.",
};

type DashboardOverviewLoaded =
  | { status: "ok"; overview: Awaited<ReturnType<typeof loadPilotageOverview>> }
  | { status: "error"; message: string };

async function loadDashboardOverviewResult(locale: "fr" | "en"): Promise<DashboardOverviewLoaded> {
  try {
    const supabase = getSupabaseServerClient();
    const overview = await loadPilotageOverview({ supabase, periodDays: 30, limit: 1800 });
    return { status: "ok", overview };
  } catch {
    return {
      status: "error",
        message: locale === "fr"
        ? "Les données de Mon espace sont momentanément indisponibles."
        : "Dashboard data is temporarily unavailable.",
    };
  }
}

function DashboardOverviewSkeleton() {
  return (
    <div className="space-y-5 animate-pulse">
      <div className="grid gap-4 md:grid-cols-3">
        {[0, 1, 2].map(i => <div key={i} className="h-44 rounded-3xl bg-[rgba(44,28,15,0.55)] border border-orange-200/18" />)}
      </div>
      <div className="h-36 rounded-3xl bg-[rgba(44,28,15,0.55)] border border-orange-200/18" />
    </div>
  );
}

export default async function DashboardPage() {
  const { userId } = await getSafeAuthSession();
  const locale = await getServerLocale();

  if (!userId) {
    return (
      <ClerkRequiredGate
        isAuthenticated={false}
        mode="blur"
        title={locale === "fr" ? "Mon espace" : "Dashboard"}
        description={locale === "fr" ? "Connectez-vous pour accéder à votre espace personnel." : "Sign in to access your dashboard."}
        lockedPreview={
          <div className="grid gap-3 rounded-3xl border border-amber-200/18 bg-[linear-gradient(145deg,rgba(44,28,15,0.78)_0%,rgba(92,45,12,0.84)_56%,rgba(245,158,11,0.26)_100%)] p-6 shadow-[0_18px_42px_-26px_rgba(124,45,18,0.30)] md:grid-cols-3">
            {["Aujourd'hui", "Priorité", "Accès"].map((label) => (
              <div key={label} className="rounded-2xl border border-amber-200/18 bg-[rgba(69,26,3,0.58)] p-5">
                <p className="text-[10px] font-bold uppercase tracking-widest text-amber-100">{label}</p>
                <div className="mt-3 h-3 w-3/4 rounded bg-amber-200/22" />
              </div>
            ))}
          </div>
        }
      >
        <div />
      </ClerkRequiredGate>
    );
  }

  const [role, displayMode] = await Promise.all([
    getCurrentUserRoleLabel().catch(() => "benevole" as const),
    getServerDisplayMode(),
  ]);
  const profile = toProfile(role);
  const roleLabel = getProfileLabel(profile, locale);
  const primaryAction = getProfilePrimaryAction(profile);
  const { t } = getTranslation("dashboard", locale);
  const overviewPromise = loadDashboardOverviewResult(locale);
  const pageFamily = resolvePageFamily(DASHBOARD_ROUTE);
  const isAdmin = isAdminLikeProfile(profile);
  const switchableProfiles = isAdmin ? getSwitchableProfiles(profile) : [profile];

  return (
    <main
      className="relative min-h-screen overflow-hidden"
      data-display-mode={displayMode}
    >
      <DashboardEntrance className="relative z-10 mx-auto max-w-[1400px] px-5 pb-24 pt-8 sm:px-8 sm:pt-10">

        {/* ── Configuration active ── */}
        <div data-gsap-reveal>
          <IdentityProfileBanner profile={profile} />
        </div>

        {/* ── Header ── */}
        <div data-gsap-reveal className="mt-10 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <PageHero
            family={pageFamily}
            eyebrow={locale === "fr" ? "Cockpit opérationnel" : "Operational cockpit"}
            title={t("title_v1")}
            className="flex-1"
          />
          <div className="flex items-center gap-2.5 pb-1">
            <span className="h-2 w-2 rounded-full bg-amber-300 shadow-[0_0_8px_rgba(251,191,36,0.55)]" />
            <span className="text-sm font-semibold text-amber-900">{roleLabel}</span>
            <span className="rounded-lg border border-amber-200/18 bg-[rgba(69,26,3,0.72)] px-3 py-1 text-[11px] font-mono font-bold text-amber-50 shadow-sm">
              <Shield size={10} className="mr-1.5 inline text-amber-300" />
              {userId.slice(-8).toUpperCase()}
            </span>
          </div>
        </div>

        {/* ── Résumé décisionnel + Plan de journée ── */}
        <div data-gsap-reveal className="mt-12">
          <Suspense fallback={<DashboardOverviewSkeleton />}>
            <DashboardOverviewSection
              overviewPromise={overviewPromise}
              locale={locale}
              profile={profile}
              primaryAction={primaryAction}
            />
          </Suspense>
        </div>

        {/* ── Séparateur ── */}
        <div className="mt-14 h-px bg-amber-200/24" />

        {/* ── Action prioritaire ── */}
        <div data-gsap-reveal className="mt-10 relative overflow-hidden rounded-3xl">
          {/* Layer fond isolé */}
          <div className="pointer-events-none absolute inset-0 rounded-3xl border border-amber-200/18 bg-[linear-gradient(145deg,rgba(44,28,15,0.78)_0%,rgba(92,45,12,0.84)_56%,rgba(245,158,11,0.26)_100%)] shadow-[0_22px_54px_-34px_rgba(124,45,18,0.30)]" />
          <div className="relative z-10 flex flex-col gap-5 px-7 py-7 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1.5">
              <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-amber-100">
                {locale === "fr" ? "Action prioritaire" : "Priority action"}
              </p>
              <h2 className="text-2xl font-black tracking-tight text-white">
                {locale === "fr" ? "Déclarer une action" : "Declare an action"}
              </h2>
              <p className="text-base font-medium text-white max-w-md leading-relaxed">
                {locale === "fr"
                  ? "Enregistrez une intervention terrain depuis le formulaire dédié."
                  : "Log a field intervention from the dedicated form."}
              </p>
            </div>
            <CmmButton
              href="/actions/new"
              tone="primary"
              variant="pill"
              size="lg"
              className="group h-14 px-7 text-[14px] font-black shadow-[0_8px_32px_-8px_rgba(0,0,0,0.35)] transition-all hover:-translate-y-0.5 hover:shadow-[0_16px_40px_-8px_rgba(0,0,0,0.4)]"
            >
              <Plus size={18} />
              {locale === "fr" ? "Ouvrir le formulaire" : "Open the form"}
              <ArrowRight size={15} className="ml-1 transition-transform group-hover:translate-x-1" />
            </CmmButton>
          </div>
        </div>

        {/* ── Séparateur ── */}
        <div className="mt-14 h-px bg-amber-200/24" />

        {/* ── Accès rapides ── */}
        <div data-gsap-reveal className="mt-10">
          <p className="mb-6 text-[11px] font-bold uppercase tracking-[0.3em] text-amber-100/78">
            {locale === "fr" ? "Accès rapides" : "Quick access"}
          </p>
          <RolePrimaryActions profile={profile} title="" tone="warm" />
        </div>

        <div className="mt-14 h-px bg-amber-200/24" />

        <div data-gsap-reveal className="mt-10 grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <FamilyRubriqueCard withTopBar={true} topBarContent={locale === "fr" ? "Évolution du compte" : "Account progress"} className="p-8 sm:p-10">
            <PromotionRequestForm currentRole={profile} />
          </FamilyRubriqueCard>

          <FamilyRubriqueCard withTopBar={true} topBarContent={locale === "fr" ? "Configuration" : "Settings"} className="p-8 sm:p-10">
            <AccountSettingsSection />
          </FamilyRubriqueCard>
        </div>

        {switchableProfiles.length > 1 ? (
          <div data-gsap-reveal className="mt-6">
            <FamilyRubriqueCard
              withTopBar={true}
              topBarContent={isAdmin ? (locale === "fr" ? "Switch de profil (Admin)" : "Profile switch (Admin)") : (locale === "fr" ? "Identité active" : "Active identity")}
              className="p-8 sm:p-10"
            >
              <div className="flex flex-wrap gap-4">
                {switchableProfiles.map((p) => (
                  <CmmButton
                    key={p}
                    href={buildProfileRoute(p)}
                    tone={p === profile ? "primary" : "tertiary"}
                    variant="pill"
                    className={
                      p === profile
                        ? "rounded-2xl border border-amber-200/30 bg-amber-100/12 px-8 py-4 text-xs font-black uppercase tracking-[0.2em] text-white shadow-2xl transition-all hover:-translate-y-1"
                        : "rounded-2xl border border-amber-200/14 bg-[rgba(69,26,3,0.38)] px-8 py-4 text-xs font-black uppercase tracking-[0.2em] text-amber-50/70 transition-all hover:-translate-y-1 hover:bg-[rgba(69,26,3,0.54)] hover:text-white"
                    }
                  >
                    {getProfileLabel(p, locale)}
                  </CmmButton>
                ))}
              </div>
            </FamilyRubriqueCard>
          </div>
        ) : null}

      </DashboardEntrance>
    </main>
  );
}
