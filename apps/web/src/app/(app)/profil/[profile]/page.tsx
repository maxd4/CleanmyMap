import { notFound, redirect } from "next/navigation";
import { RolePrimaryActions } from "@/components/navigation/role-primary-actions";
import { ClerkRequiredGate } from "@/components/ui/clerk-required-gate";
import { RoleProfileSwitcher } from "@/components/account/role-profile-switcher";
import { ProfileDetailNavigation } from "@/components/account/profile-detail-navigation";
import { getCurrentUserIdentity } from "@/lib/authz";
import { getSafeAuthSession } from "@/lib/auth/safe-session";
import { getServerLocale } from "@/lib/server-preferences";
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
  return <CmmCard><p role="status" className="text-sm cmm-text-secondary">{message}</p></CmmCard>;
}
async function Progression({ userId, profile, locale }: { userId: string; profile: AppProfile; locale: "fr" | "en" }) {
  const isEn = locale === "en";
  const gamification = await loadProfileProgression(userId);
  return <div className="space-y-4">
    {gamification ? <ProfileGamificationSummary summary={gamification.summary} /> : <Unavailable message={isEn ? "Progress temporarily unavailable." : "Progression momentanément indisponible."} />}
    <div className="grid gap-3 md:grid-cols-2">
      <CmmCard className="space-y-3"><h2 className="font-bold cmm-text-primary">{isEn ? "My personal impact" : "Mon impact personnel"}</h2><p className="text-sm cmm-text-secondary">{isEn ? "Exportable card and validated missions." : "Carte exportable et missions validées."}</p><CmmButton href="/profil/impact" tone="primary">{isEn ? "View my card" : "Voir ma carte"}</CmmButton></CmmCard>
      <CmmCard className="space-y-3"><h2 className="font-bold cmm-text-primary">{isEn ? "My engagement record" : "Mon dossier d’engagement"}</h2><p className="text-sm cmm-text-secondary">{isEn ? "Confirmed participations, record and certificates." : "Participations confirmées, dossier et attestations."}</p><CmmButton href="/profil/engagement" tone="secondary">{isEn ? "Open record" : "Ouvrir le dossier"}</CmmButton></CmmCard>
    </div>
    <RolePrimaryActions profile={profile} title={isEn ? "Priority shortcuts" : "Accès prioritaires"} tone="light" />
  </div>;
}
async function Badges({ userId, locale }: { userId: string; locale: "fr" | "en" }) {
  const isEn = locale === "en";
  const { infiniteTotals, spogomiCollection, spogomiVolunteerSummary } = await loadProfileBadges(userId);
  return <div className="space-y-4">
    <CmmCard className="space-y-3"><h2 className="text-lg font-bold cmm-text-primary">{isEn ? "Territorial legends" : "Légendes territoriales"}</h2><TerritorialLegendsPanel /></CmmCard>
    {spogomiCollection && spogomiVolunteerSummary ? <FamilyRubriqueCard className="p-4 sm:p-5"><ProfileSpogomiSummary collection={spogomiCollection} volunteerSummary={spogomiVolunteerSummary} /></FamilyRubriqueCard> : <Unavailable message={isEn ? "SPOGOMI awards temporarily unavailable." : "Distinctions SPOGOMI momentanément indisponibles."} />}
    {infiniteTotals ? <><FamilyRubriqueCard className="p-4 sm:p-5"><InfiniteBadgesPanel totals={infiniteTotals} /></FamilyRubriqueCard><MilestonesPanel milestones={infiniteTotals.milestones} /></> : <Unavailable message={isEn ? "Badges and milestones temporarily unavailable." : "Badges et jalons momentanément indisponibles."} />}
  </div>;
}
async function Referrals({ userId, profile, locale }: { userId: string; profile: AppProfile; locale: "fr" | "en" }) {
  const isEn = locale === "en";
  const { referralSummary, referralLineageView, referralLineageError } = await loadProfileReferrals(userId);
  const hasAnyReferralContent = Boolean(referralSummary || referralLineageView || referralLineageError);
  return <section id="parrainage" className="scroll-mt-28 space-y-3">
    <h2 className="text-xl font-bold cmm-text-primary">{isEn ? "Referrals" : "Parrainage"}</h2>
    {hasAnyReferralContent ? <FamilyRubriqueCard className="p-4 sm:p-5"><ReferralProfileTabs summary={referralSummary} lineageView={referralLineageView} lineageError={referralLineageError} emptyCtaHref={profileDetailTabHref(profile,"referrals")} locale={locale} /></FamilyRubriqueCard> : <Unavailable message={isEn ? "Referrals temporarily unavailable." : "Parrainage momentanément indisponible."} />}
  </section>;
}
function Account({ identity, locale }: { identity: UserIdentity; locale: "fr" | "en" }) {
  const isEn = locale === "en";
  return <div className="space-y-4">
    <CmmCard className="space-y-3"><h2 className="text-lg font-bold cmm-text-primary">{isEn ? "Level and active role" : "Niveau et rôle actif"}</h2><p className="cmm-text-primary">{isEn ? `Granted level: ${getProfileLabel(identity.role, "en")}. Active role: ${getProfileLabel(identity.activeRole, "en")}.` : `Niveau obtenu : ${getProfileLabel(identity.role,"fr")}. Rôle utilisé : ${getProfileLabel(identity.activeRole,"fr")}.`}</p><div className="flex flex-wrap gap-2"><CmmButton href="/compte/evolution" tone="primary">{isEn ? "Account evolution" : "Évolution du compte"}</CmmButton><CmmButton href="/reglages" tone="secondary">{isEn ? "Preferences and account" : "Préférences et compte"}</CmmButton></div></CmmCard>
    <RoleProfileSwitcher locale={locale} appearance="neutral" grantedRole={identity.role} activeRole={identity.activeRole} title={isEn ? "Authorized active roles" : "Rôles actifs autorisés"} />
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
  const locale = await getServerLocale();
  const isEn = locale === "en";
  const tab = resolveProfileDetailTab((await searchParams)?.tab);
  return <CmmPageLayout>
    <PageHeader title={`${isEn ? "My profile" : "Mon profil"} · ${getProfileLabel(normalized, locale)}`} subtitle={getProfileSubtitle(normalized, locale)} action={<CmmButton href="/dashboard" tone="secondary">{isEn ? "My space" : "Mon espace"}</CmmButton>} />
    <ProfileDetailNavigation profile={normalized} activeTab={tab} locale={locale} />
    {tab === "summary" && <Progression userId={session.userId} profile={normalized} locale={locale} />}
    {tab === "badges" && <Badges userId={session.userId} locale={locale} />}
    {tab === "referrals" && <Referrals userId={session.userId} profile={normalized} locale={locale} />}
    {tab === "account" && <Account identity={identity} locale={locale} />}
  </CmmPageLayout>;
}
