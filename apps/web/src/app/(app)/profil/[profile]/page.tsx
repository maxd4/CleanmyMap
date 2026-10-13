import { notFound, redirect } from "next/navigation";
import { RolePrimaryActions } from "@/components/navigation/role-primary-actions";
import { ClerkRequiredGate } from "@/components/ui/clerk-required-gate";
import { AccountEvolutionCta } from "@/components/account/account-evolution-cta";
import { AccountSettingsSection } from "@/components/account/account-settings-section";
import { RoleProfileSwitcher } from "@/components/account/role-profile-switcher";
import { getCurrentUserIdentity } from "@/lib/authz";
import { getSafeAuthSession } from "@/lib/auth/safe-session";
import {
  getProfileLabel,
  getProfileSubtitle,
  isAppProfile,
  type AppProfile,
} from "@/lib/profiles";
import { SectionShell } from "@/components/sections/rubriques/shared";
import { FamilyRubriqueCard } from "@/components/ui/family-rubrique-card";
import { buildProfileRoute } from "@/lib/accueil-pilotage-routes";
import { getInfiniteBadgeTotals } from "@/lib/gamification/infinite-badges-server";
import { InfiniteBadgesPanel } from "@/components/gamification/infinite-badges/InfiniteBadgesPanel";
import { computeMonthlyRegularitySummary } from "@/lib/gamification/monthly-regularity";
import { createFallbackSensitiveZoneApaisementSummary } from "@/lib/gamification/sensitive-zone-badge";
import { fetchCachedReferralSummary } from "@/lib/gamification/referrals/referrals-cache";
import { loadCachedReferralLineageView } from "@/lib/gamification/referrals/referral-lineage";
import { ReferralProfileTabs } from "@/components/gamification/referral-profile-tabs";
import { ProfileGamificationSummary } from "@/components/gamification/profile-gamification-summary";
import { MilestonesPanel } from "@/components/gamification/milestones-panel";
import { buildCurrentMilestones } from "@/lib/gamification/milestones";
import { getUserProgression } from "@/lib/gamification/progression";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { loadSpogomiCollectionForUser } from "@/lib/spogomi/recognition-service";
import { loadSpogomiVolunteerSummaryForUser } from "@/lib/spogomi/volunteer";
import { ProfileSpogomiSummary } from "@/components/gamification/profile-spogomi-summary";
import type { SpogomiCollection } from "@/lib/spogomi/collection";
import type { UserIdentity } from "@/lib/authz-identity";
import type { ComponentProps } from "react";

type ProfilPageProps = {
  params: Promise<{ profile: string }>;
};

type ProfilePageContentProps = {
  normalized: AppProfile;
  profileLabel: string;
  profileSubtitle: string;
  grantedRole: UserIdentity["role"];
  activeProfile: UserIdentity["activeRole"];
  gamification: Awaited<ReturnType<typeof getUserProgression>> | null;
  infiniteTotals: ComponentProps<typeof InfiniteBadgesPanel>["totals"] & {
    milestones: ComponentProps<typeof MilestonesPanel>["milestones"];
  };
  referralSummary: Awaited<ReturnType<typeof fetchCachedReferralSummary>>;
  referralLineageView: Awaited<ReturnType<typeof loadCachedReferralLineageView>> | null;
  referralLineageError: string | null;
  referralInviteHref: string;
  spogomiCollection: SpogomiCollection | null;
  spogomiVolunteerSummary: Awaited<ReturnType<typeof loadSpogomiVolunteerSummaryForUser>> | null;
};

function ProfilePageContent({
  normalized,
  profileLabel,
  profileSubtitle,
  grantedRole,
  activeProfile,
  gamification,
  infiniteTotals,
  referralSummary,
  referralLineageView,
  referralLineageError,
  referralInviteHref,
  spogomiCollection,
  spogomiVolunteerSummary,
}: ProfilePageContentProps) {
  return (
    <SectionShell
      id="profile"
      title={profileLabel}
      subtitle={`${profileSubtitle}. Gérez votre compte et accédez à vos outils privilégiés.`}
    >
      <div className="space-y-12 pt-8">
        <AccountEvolutionCta currentRole={grantedRole} />

        <FamilyRubriqueCard withTopBar={true} topBarContent="Accès Prioritaires" className="p-12">
          <div className="relative z-10">
            <RolePrimaryActions profile={normalized} title="" tone="warm" />
          </div>
        </FamilyRubriqueCard>

        <FamilyRubriqueCard withTopBar={true} topBarContent="Progression & badges" className="p-12">
          <ProfileGamificationSummary summary={gamification?.summary} />
          <ProfileSpogomiSummary collection={spogomiCollection} volunteerSummary={spogomiVolunteerSummary} />
          <InfiniteBadgesPanel totals={infiniteTotals} />
          <MilestonesPanel milestones={infiniteTotals.milestones} />
        </FamilyRubriqueCard>

        <FamilyRubriqueCard
          id="parrainage"
          withTopBar={true}
          topBarContent="Parrainage"
          className="p-12 scroll-mt-28"
        >
          <ReferralProfileTabs
            summary={referralSummary}
            lineageView={referralLineageView}
            lineageError={referralLineageError}
            emptyCtaHref={referralInviteHref}
          />
        </FamilyRubriqueCard>

        <RoleProfileSwitcher
          locale="fr"
          grantedRole={grantedRole}
          activeRole={activeProfile}
          title="Rôles actifs autorisés"
          className="p-12"
        />

        <FamilyRubriqueCard withTopBar={true} topBarContent="Configuration" className="p-12">
          <AccountSettingsSection compact />
        </FamilyRubriqueCard>
      </div>
    </SectionShell>
  );
}

export default async function ProfilPage({ params }: ProfilPageProps) {
  const { profile } = await params;
  const normalized = profile.trim().toLowerCase();

  if (!isAppProfile(normalized)) notFound();

  const { userId } = await getSafeAuthSession();
  if (!userId) {
    return (
      <ClerkRequiredGate
        isAuthenticated={false}
        mode="blur"
        lockedPreview={
          <div className="rounded-3xl border border-amber-200/18 bg-[linear-gradient(145deg,rgba(44,28,15,0.78)_0%,rgba(92,45,12,0.84)_56%,rgba(245,158,11,0.26)_100%)] p-6 shadow-[0_18px_42px_-26px_rgba(124,45,18,0.30)]">
            <p className="cmm-text-caption font-bold uppercase tracking-wide text-amber-100">
              Profil {normalized}
            </p>
            <p className="cmm-text-body cmm-text-inverse mt-2">
              Les recommandations et raccourcis apparaissent après connexion.
            </p>
          </div>
        }
      >
        <div />
      </ClerkRequiredGate>
    );
  }

  const identity = await getCurrentUserIdentity().catch(() => null);
  const grantedRole = identity?.role ?? "benevole";
  const activeProfile = identity?.activeRole ?? "benevole";

  if (normalized !== activeProfile)
    redirect(buildProfileRoute(activeProfile));

  const profileLabel = getProfileLabel(normalized, "fr");
  const profileSubtitle = getProfileSubtitle(normalized, "fr");
  const gamification = await getUserProgression(
    getSupabaseServerClient(true),
    userId,
  ).catch(() => null);
  const spogomiCollection = await loadSpogomiCollectionForUser(
    getSupabaseServerClient(true),
    userId,
  ).catch(() => null);
  const spogomiVolunteerSummary = await loadSpogomiVolunteerSummaryForUser(
    getSupabaseServerClient(true),
    userId,
  ).catch(() => null);
  const infiniteTotals = await getInfiniteBadgeTotals(userId).catch(() => ({
    wasteKg: 0,
    butts: 0,
    newPlaces: 0,
    organisationCount: 0,
    actionBalance: {
      spontaneous: 0,
      association: 0,
      enterprise: 0,
      totalValidated: 0,
      balancedCycles: 0,
      totalXpAwarded: 0,
      currentCycleTarget: 1,
      currentCycleProgress: 0,
      currentCycleXpReward: 1,
      missingCounts: {
        spontaneous: 1,
        association: 1,
        enterprise: 1,
      },
      currentGrade: {
        id: "balance-observateur",
        label: "Observateur",
        threshold: 0,
        iconVariant: "sliders-horizontal",
        visualVariant: "stone",
        tooltip: "Aucun cycle équilibré encore",
        xp: 0,
      },
      nextGrade: null,
      progressPercent: 0,
      currentLabel: "Observateur",
      nextLabel: null,
      awards: [],
    },
    monthlyRegularity: computeMonthlyRegularitySummary([]),
    sensitiveZoneApaisement: createFallbackSensitiveZoneApaisementSummary(),
    milestones: buildCurrentMilestones({ completeActionsCount: 0, events: [] }),
    moderationProgression: null,
  }));
  const referralSummary = await fetchCachedReferralSummary(userId).catch(
    () => ({
      referralCode: null,
      inviteUrl: null,
      invitedUsersCount: 0,
      invitedBy: null,
      badgeUnlocked: false,
      referralAwardedXp: 0,
    }),
  );
  let referralLineageView = null;
  let referralLineageError: string | null = null;
  try {
    referralLineageView = await loadCachedReferralLineageView(userId);
  } catch (error) {
    referralLineageError =
      error instanceof Error
        ? error.message
        : "Impossible de charger l'arborescence de parrainage.";
  }
  const referralInviteHref = `${buildProfileRoute(normalized)}#parrainage`;

  return (
    <ProfilePageContent
      normalized={normalized}
      profileLabel={profileLabel}
      profileSubtitle={profileSubtitle}
      grantedRole={grantedRole}
      activeProfile={activeProfile}
      gamification={gamification}
      infiniteTotals={infiniteTotals}
      referralSummary={referralSummary}
      referralLineageView={referralLineageView}
      referralLineageError={referralLineageError}
      referralInviteHref={referralInviteHref}
      spogomiCollection={spogomiCollection}
      spogomiVolunteerSummary={spogomiVolunteerSummary}
    />
  );
}
