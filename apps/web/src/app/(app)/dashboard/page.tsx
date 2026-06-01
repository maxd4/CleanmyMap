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
import { AccountCompletionGate } from "@/components/account/account-completion-gate";
import { TerritoryMapComparisonCards } from "@/components/maps/territory-map-comparison-cards";
import { getSafeAuthSession } from "@/lib/auth/safe-session";
import { getCurrentUserRoleLabel } from "@/lib/authz";
import { loadAccountCompletionGateState } from "@/lib/auth/account-completion-gate";
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
import { loadUserLabelSummary } from "@/lib/gamification/progression-data";
import { Shield, Plus, ArrowRight } from "lucide-react";
import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/page-header";
import { resolvePageFamily } from "@/lib/ui/page-families";
import { DASHBOARD_ROUTE } from "@/lib/accueil-pilotage-routes";

export const metadata: Metadata = {
  title: "Mon espace - CleanMyMap",
  description: "Suivez votre impact, consultez vos statistiques et gérez votre compte depuis un espace centralisé.",
};

type DashboardOverviewLoaded =
  | { status: "ok"; overview: Awaited<ReturnType<typeof loadPilotageOverview>> }
  | { status: "error"; message: string };

type UserLevelRankingItem = {
  rank: number;
  userId: string;
  actorName: string;
  currentLevel: number;
  xpValidated: number;
};

type UserLevelRanking = {
  topRows: UserLevelRankingItem[];
  currentUserRow: UserLevelRankingItem | null;
};

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

async function loadUserLevelRanking(userId: string): Promise<UserLevelRanking> {
  const supabase = getSupabaseServerClient();
  const [profilesResult, labelsByUser] = await Promise.all([
    supabase
      .from("progression_profiles")
      .select("user_id, current_level, xp_validated, xp_total")
      .order("current_level", { ascending: false })
      .order("xp_validated", { ascending: false })
      .order("xp_total", { ascending: false })
      .limit(120),
    loadUserLabelSummary(supabase).catch(() => new Map<string, { actorName: string }>()),
  ]);

  if (profilesResult.error) {
    return { topRows: [], currentUserRow: null };
  }

  const rows =
    (profilesResult.data as Array<{
      user_id: string;
      current_level: number | null;
      xp_validated: number | null;
    }> | null) ?? [];

  const rankedRows: UserLevelRankingItem[] = rows.map((row, index) => ({
    rank: index + 1,
    userId: row.user_id,
    actorName: labelsByUser.get(row.user_id)?.actorName?.trim() || `Utilisateur ${index + 1}`,
    currentLevel: Math.max(1, Number(row.current_level ?? 1)),
    xpValidated: Math.max(0, Number(row.xp_validated ?? 0)),
  }));

  return {
    topRows: rankedRows.slice(0, 8),
    currentUserRow: rankedRows.find((row) => row.userId === userId) ?? null,
  };
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
  const { userId, clerkReachable } = await getSafeAuthSession();
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

  const accountCompletion = await loadAccountCompletionGateState({
    userId,
    clerkReachable,
  }).catch(() => null);

  const [role, displayMode] = await Promise.all([
    accountCompletion
      ? Promise.resolve(accountCompletion.role)
      : getCurrentUserRoleLabel().catch(() => "benevole" as const),
    getServerDisplayMode(),
  ]);
  const userLevelRanking = await loadUserLevelRanking(userId);
  const profile = accountCompletion?.currentProfile ?? toProfile(role);
  const roleLabel = getProfileLabel(profile, locale);
  const primaryAction = getProfilePrimaryAction(profile);
  const { t } = getTranslation("dashboard", locale);
  const overviewPromise = loadDashboardOverviewResult(locale);
  const pageFamily = resolvePageFamily(DASHBOARD_ROUTE);
  const isAdmin = isAdminLikeProfile(profile);
  const switchableProfiles = isAdmin ? getSwitchableProfiles(profile) : [profile];

  return (
    <AccountCompletionGate state={accountCompletion}>
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
          <PageHeader
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

        <div data-gsap-reveal className="mt-10">
          <TerritoryMapComparisonCards
            title={locale === "fr" ? "Deux lectures du territoire suivi" : "Two views of the tracked territory"}
            subtitle={
              locale === "fr"
                ? "La carte de base sert au repérage opérationnel. La version Terraink joue le rôle de carte de présentation. On garde les deux pour choisir plus tard celle qui sert le mieux l’usage final."
                : "The base map supports operational reading. The Terraink version acts as a presentation map. Both are kept so the team can later choose the most useful one."
            }
            locationLabel={locale === "fr" ? "Secteur suivi" : "Tracked sector"}
            tone="amber"
            note={
              locale === "fr"
                ? "Ici, les deux cartes coexistent volontairement. La base reste la référence terrain; Terraink sert de variante visuelle à comparer."
                : "Both cards intentionally coexist here. The base map remains the field reference; Terraink is the visual variant to compare later."
            }
          />
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

        {/* ── Classement global des niveaux utilisateur ── */}
        <div data-gsap-reveal className="mt-10">
          <FamilyRubriqueCard
            withTopBar={true}
            topBarContent={
              locale === "fr"
                ? "Classement global - niveau utilisateur"
                : "Global ranking - user level"
            }
            className="p-8 sm:p-10"
          >
            {userLevelRanking.topRows.length === 0 ? (
              <p className="text-sm text-amber-100/85">
                {locale === "fr"
                  ? "Le classement n'est pas encore disponible."
                  : "Ranking data is not available yet."}
              </p>
            ) : (
              <div className="space-y-3">
                {userLevelRanking.topRows.map((row) => {
                  const isCurrentUser = row.userId === userId;
                  return (
                    <div
                      key={row.userId}
                      className={`flex items-center justify-between rounded-2xl border px-4 py-3 ${
                        isCurrentUser
                          ? "border-amber-300/40 bg-amber-200/15"
                          : "border-amber-200/18 bg-[rgba(69,26,3,0.38)]"
                      }`}
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-white">
                          #{row.rank} - {row.actorName}
                        </p>
                        <p className="text-xs text-amber-100/80">
                          {locale === "fr" ? "XP valides" : "Validated XP"}: {row.xpValidated}
                        </p>
                      </div>
                      <span className="rounded-lg border border-amber-200/25 bg-[rgba(69,26,3,0.65)] px-3 py-1 text-xs font-black uppercase tracking-[0.15em] text-amber-50">
                        {locale === "fr" ? "Niveau" : "Level"} {row.currentLevel}
                      </span>
                    </div>
                  );
                })}

                {userLevelRanking.currentUserRow &&
                !userLevelRanking.topRows.some((row) => row.userId === userId) ? (
                  <div className="mt-4 rounded-2xl border border-amber-300/30 bg-amber-200/10 px-4 py-3">
                    <p className="text-sm font-bold text-white">
                      {locale === "fr" ? "Votre position" : "Your position"}: #
                      {userLevelRanking.currentUserRow.rank}
                    </p>
                    <p className="text-xs text-amber-100/80">
                      {locale === "fr" ? "Niveau" : "Level"} {userLevelRanking.currentUserRow.currentLevel} ·{" "}
                      {locale === "fr" ? "XP valides" : "Validated XP"} {userLevelRanking.currentUserRow.xpValidated}
                    </p>
                  </div>
                ) : null}
              </div>
            )}
          </FamilyRubriqueCard>
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
    </AccountCompletionGate>
  );
}
