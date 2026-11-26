import { notFound, redirect } from "next/navigation";
import { RolePrimaryActions } from "@/components/navigation/role-primary-actions";
import { ClerkRequiredGate } from "@/components/ui/clerk-required-gate";
import { RoleProfileSwitcher } from "@/components/account/role-profile-switcher";
import { ProfileDetailNavigation } from "@/components/account/profile-detail-navigation";
import { getCurrentUserIdentity } from "@/lib/authz";
import { getSafeAuthSession } from "@/lib/auth/safe-session";
import { getProfileLabel, getProfileSubtitle, isAppProfile, type AppProfile } from "@/lib/profiles";
import { PageHeader } from "@/components/ui/page-header";
import { CmmPageLayout } from "@/components/ui/cmm-section";
import { CmmCard } from "@/components/ui/cmm-card";
import { CmmButton } from "@/components/ui/cmm-button";
import { FamilyRubriqueCard } from "@/components/ui/family-rubrique-card";
import { buildProfileRoute } from "@/lib/accueil-pilotage-routes";
import { InfiniteBadgesPanel } from "@/components/gamification/infinite-badges/InfiniteBadgesPanel";
import { ReferralProfileTabs } from "@/components/gamification/referral-profile-tabs";
import { ProfileGamificationSummary } from "@/components/gamification/profile-gamification-summary";
import { MilestonesPanel } from "@/components/gamification/milestones-panel";
import { ProfileSpogomiSummary } from "@/components/gamification/profile-spogomi-summary";
import { TerritorialLegendsPanel } from "@/components/sections/rubriques/gamification/territorial-legends-panel";
import type { UserIdentity } from "@/lib/authz-identity";
import { resolveProfileDetailTab, profileDetailTabHref } from "@/lib/account/profile-tabs";
import { loadProfileProgression, loadProfileBadges, loadProfileReferrals } from "./profile-page-data";

type ProfilPageProps = { params: Promise<{ profile: string }>; searchParams?: Promise<{ tab?: string | string[] }> };

function Unavailable({ message }: { message: string }) {
  return <CmmCard><p role="status" className="cmm-text-secondary">{message}</p></CmmCard>;
}
async function Progression({ userId, profile }: { userId: string; profile: AppProfile }) {
  const gamification = await loadProfileProgression(userId);
  return <div className="space-y-4">
    {gamification ? <ProfileGamificationSummary summary={gamification.summary} /> : <Unavailable message="Progression momentanément indisponible." />}
    <div className="grid gap-3 md:grid-cols-2">
      <CmmCard className="space-y-3"><h2 className="font-bold cmm-text-primary">Mon impact personnel</h2><p className="text-sm cmm-text-secondary">Carte exportable et missions validées.</p><CmmButton href="/profil/impact" tone="primary">Voir ma carte</CmmButton></CmmCard>
      <CmmCard className="space-y-3"><h2 className="font-bold cmm-text-primary">Mon dossier d’engagement</h2><p className="text-sm cmm-text-secondary">Participations confirmées, dossier et attestations.</p><CmmButton href="/profil/engagement" tone="secondary">Ouvrir le dossier</CmmButton></CmmCard>
    </div>
    <RolePrimaryActions profile={profile} title="Accès prioritaires" tone="light" />
  </div>;
}
async function Badges({ userId }: { userId: string }) {
  const { infiniteTotals, spogomiCollection, spogomiVolunteerSummary } = await loadProfileBadges(userId);
  return <div className="space-y-4">
    <CmmCard className="space-y-3"><h2 className="text-lg font-bold cmm-text-primary">Légendes territoriales</h2><TerritorialLegendsPanel /></CmmCard>
    {spogomiCollection && spogomiVolunteerSummary ? <FamilyRubriqueCard className="p-4 sm:p-5"><ProfileSpogomiSummary collection={spogomiCollection} volunteerSummary={spogomiVolunteerSummary} /></FamilyRubriqueCard> : <Unavailable message="Distinctions SPOGOMI momentanément indisponibles." />}
    {infiniteTotals ? <><FamilyRubriqueCard className="p-4 sm:p-5"><InfiniteBadgesPanel totals={infiniteTotals} /></FamilyRubriqueCard><MilestonesPanel milestones={infiniteTotals.milestones} /></> : <Unavailable message="Badges et jalons momentanément indisponibles." />}
  </div>;
}
async function Referrals({ userId, profile }: { userId: string; profile: AppProfile }) {
  const { referralSummary, referralLineageView, referralLineageError } = await loadProfileReferrals(userId);
  return <section id="parrainage" className="scroll-mt-28 space-y-3">
    <h2 className="text-xl font-bold cmm-text-primary">Parrainage</h2>
    {referralSummary ? <FamilyRubriqueCard className="p-4 sm:p-5"><ReferralProfileTabs summary={referralSummary} lineageView={referralLineageView} lineageError={referralLineageError} emptyCtaHref={profileDetailTabHref(profile,"referrals")} /></FamilyRubriqueCard> : <Unavailable message="Parrainage momentanément indisponible." />}
  </section>;
}
function Account({ identity }: { identity: UserIdentity }) {
  return <div className="space-y-4">
    <CmmCard className="space-y-3"><h2 className="text-lg font-bold cmm-text-primary">Niveau et rôle actif</h2><p className="cmm-text-primary">Niveau obtenu : {getProfileLabel(identity.role,"fr")}. Rôle utilisé : {getProfileLabel(identity.activeRole,"fr")}.</p><div className="flex flex-wrap gap-2"><CmmButton href="/compte/evolution" tone="primary">Évolution du compte</CmmButton><CmmButton href="/reglages" tone="secondary">Préférences et compte</CmmButton></div></CmmCard>
    <RoleProfileSwitcher locale="fr" grantedRole={identity.role} activeRole={identity.activeRole} title="Rôles actifs autorisés" />
  </div>;
}
export default async function ProfilPage({ params, searchParams }: ProfilPageProps) {
  const { profile } = await params;
  const normalized = profile.trim().toLowerCase();
  if (!isAppProfile(normalized)) notFound();
  const session = await getSafeAuthSession();
  if (!session.userId) return <ClerkRequiredGate isAuthenticated={false} mode="blur" authUnavailable={session.state === "unavailable"} lockedPreview={<CmmCard><p className="cmm-text-primary">Votre profil et votre progression après connexion.</p></CmmCard>}><div /></ClerkRequiredGate>;
  const identity = await getCurrentUserIdentity({ userId: session.userId }).catch(() => null);
  if (!identity) return <ClerkRequiredGate isAuthenticated={false} authUnavailable><div /></ClerkRequiredGate>;
  if (normalized !== identity.activeRole) redirect(buildProfileRoute(identity.activeRole));
  const tab = resolveProfileDetailTab((await searchParams)?.tab);
  return <CmmPageLayout>
    <PageHeader title={`Mon profil · ${getProfileLabel(normalized,"fr")}`} subtitle={getProfileSubtitle(normalized,"fr")} action={<CmmButton href="/dashboard" tone="secondary">Mon espace</CmmButton>} />
    <ProfileDetailNavigation profile={normalized} activeTab={tab} />
    {tab === "summary" && <Progression userId={session.userId} profile={normalized} />}
    {tab === "badges" && <Badges userId={session.userId} />}
    {tab === "referrals" && <Referrals userId={session.userId} profile={normalized} />}
    {tab === "account" && <Account identity={identity} />}
  </CmmPageLayout>;
}
