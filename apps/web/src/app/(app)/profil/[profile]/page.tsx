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
import { InfiniteBadgesPanel } from "@/components/gamification/infinite-badges/InfiniteBadgesPanel";
import { ReferralProfileTabs } from "@/components/gamification/referral-profile-tabs";
import { ProfileGamificationSummary } from "@/components/gamification/profile-gamification-summary";
import { MilestonesPanel } from "@/components/gamification/milestones-panel";
import { ProfileSpogomiSummary } from "@/components/gamification/profile-spogomi-summary";
import type { UserIdentity } from "@/lib/authz-identity";
import { loadProfilePageData, type ProfilePageData } from "./profile-page-data";

type ProfilPageProps = {
  params: Promise<{ profile: string }>;
};

type ProfilePageContentProps = ProfilePageData & {
  normalized: AppProfile;
  profileLabel: string;
  profileSubtitle: string;
  grantedRole: UserIdentity["role"];
  activeProfile: UserIdentity["activeRole"];
  referralInviteHref: string;
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
  const profileData = await loadProfilePageData(userId);
  const referralInviteHref = `${buildProfileRoute(normalized)}#parrainage`;

  return (
    <ProfilePageContent
      normalized={normalized}
      profileLabel={profileLabel}
      profileSubtitle={profileSubtitle}
      grantedRole={grantedRole}
      activeProfile={activeProfile}
      {...profileData}
      referralInviteHref={referralInviteHref}
    />
  );
}
