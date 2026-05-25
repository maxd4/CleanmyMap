import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { RolePrimaryActions } from "@/components/navigation/role-primary-actions";
import { ClerkRequiredGate } from "@/components/ui/clerk-required-gate";
import { PromotionRequestForm } from "@/components/sections/rubriques/promotion-request-form";
import { AccountSettingsSection } from "@/components/account/account-settings-section";
import { getCurrentUserRoleLabel } from "@/lib/authz";
import { getSafeAuthSession } from "@/lib/auth/safe-session";
import {
  getProfileEntryPath,
  getProfileLabel,
  getProfileSubtitle,
  getSwitchableProfiles,
  isAdminLikeProfile,
  isAppProfile,
  toProfile,
} from "@/lib/profiles";
import { SectionShell } from "@/components/sections/rubriques/shared";
import { FamilyRubriqueCard } from "@/components/ui/family-rubrique-card";
import ImpactProfilePage from "@/components/profil/impact-profile-page";

type ProfilPageProps = {
  params: Promise<{ profile: string }>;
};

export default async function ProfilPage({ params }: ProfilPageProps) {
  const { profile } = await params;
  const normalized = profile.trim().toLowerCase();

  if (normalized === "impact") {
    return <ImpactProfilePage />;
  }

  if (!isAppProfile(normalized)) notFound();

  const { userId } = await getSafeAuthSession();
  if (!userId) {
    return (
      <ClerkRequiredGate
        isAuthenticated={false}
        mode="blur"
        title="Parcours personnalisé"
        description="Connectez-vous pour accéder au parcours lié à votre profil."
        lockedPreview={
          <div className="rounded-3xl border border-amber-200/18 bg-[linear-gradient(145deg,rgba(44,28,15,0.78)_0%,rgba(92,45,12,0.84)_56%,rgba(245,158,11,0.26)_100%)] p-6 shadow-[0_18px_42px_-26px_rgba(124,45,18,0.30)]">
            <p className="text-[10px] font-bold uppercase tracking-wide text-amber-100">
              Profil {normalized}
            </p>
            <p className="mt-2 text-sm text-amber-50/72">
              Les recommandations et raccourcis apparaissent après connexion.
            </p>
          </div>
        }
      >
        <div />
      </ClerkRequiredGate>
    );
  }

  const activeRole = await getCurrentUserRoleLabel().catch(() => "benevole" as const);
  const activeProfile = toProfile(activeRole);
  const isAdmin = isAdminLikeProfile(activeProfile);

  if (!isAdmin && normalized !== activeProfile) redirect(getProfileEntryPath(activeProfile));

  const profileLabel = getProfileLabel(normalized, "fr");
  const profileSubtitle = getProfileSubtitle(normalized, "fr");
  const switchableProfiles = isAdmin ? getSwitchableProfiles(activeProfile) : [activeProfile];

  return (
    <SectionShell
      id="profile"
      title={profileLabel}
      subtitle={`${profileSubtitle}. Gérez votre compte et accédez à vos outils privilégiés.`}
    >
      <div className="space-y-12 pt-8">
        
        {/* ── Actions recommandées ── */}
        <FamilyRubriqueCard
          withTopBar={true}
          topBarContent="Accès Prioritaires"
          className="p-12"
        >
          <div className="relative z-10">
            <RolePrimaryActions profile={normalized} title="" tone="warm" />
          </div>
        </FamilyRubriqueCard>

        {/* ── Promotion & Évolution ── */}
        <FamilyRubriqueCard
          withTopBar={true}
          topBarContent="Évolution du Compte"
          className="p-12"
        >
          <PromotionRequestForm currentRole={activeProfile} />
        </FamilyRubriqueCard>

        {/* ── Changer de profil ── */}
        {switchableProfiles.length > 1 && (
          <FamilyRubriqueCard
            withTopBar={true}
            topBarContent={isAdmin ? "Switch de Profil (Admin)" : "Identité Active"}
            className="p-12"
          >
            <div className="flex flex-wrap gap-4">
              {switchableProfiles.map((p) => (
                <Link
                  key={p}
                  href={getProfileEntryPath(p)}
                  className={
                    p === activeProfile
                      ? "rounded-2xl border border-amber-200/30 bg-amber-100/12 px-8 py-4 text-xs font-black uppercase tracking-[0.2em] text-white shadow-2xl transition-all hover:-translate-y-1"
                      : "rounded-2xl border border-amber-200/14 bg-[rgba(69,26,3,0.38)] px-8 py-4 text-xs font-black uppercase tracking-[0.2em] text-amber-50/70 transition-all hover:-translate-y-1 hover:bg-[rgba(69,26,3,0.54)] hover:text-white"
                  }
                >
                  {getProfileLabel(p, "fr")}
                </Link>
              ))}
            </div>
          </FamilyRubriqueCard>
        )}

        {/* ── Paramètres ── */}
        <FamilyRubriqueCard
          withTopBar={true}
          topBarContent="Configuration"
          className="p-12"
        >
          <AccountSettingsSection />
        </FamilyRubriqueCard>

      </div>
    </SectionShell>
  );
}
