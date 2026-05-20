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
import { RubriqueCard } from "@/components/ui/rubrique-card";
import { User, Shield, Settings, Zap } from "lucide-react";
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
          <div className="rounded-3xl bg-black/30 p-6 border border-white/5 backdrop-blur-xl">
            <p className="text-[10px] font-bold uppercase tracking-wide text-white/60">
              Profil {normalized}
            </p>
            <p className="mt-2 text-sm text-white/50">
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
      gradient="from-amber-600/20 via-orange-500/10 to-transparent"
    >
      <div className="space-y-12 pt-8">
        
        {/* ── Actions recommandées ── */}
        <RubriqueCard 
          themeColor="amber" 
          withTopBar={true} 
          topBarContent="Accès Prioritaires"
          className="p-12"
        >
          <div className="relative z-10">
            <RolePrimaryActions profile={normalized} title="" tone="dark" />
          </div>
        </RubriqueCard>

        {/* ── Promotion & Évolution ── */}
        <RubriqueCard 
          themeColor="slate" 
          withTopBar={true} 
          topBarContent="Évolution du Compte"
          className="p-12"
        >
          <PromotionRequestForm currentRole={activeProfile} />
        </RubriqueCard>

        {/* ── Changer de profil ── */}
        {switchableProfiles.length > 1 && (
          <RubriqueCard 
            themeColor="slate" 
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
                      ? "rounded-2xl border border-amber-400/30 bg-amber-400/10 px-8 py-4 text-xs font-black uppercase tracking-[0.2em] text-white shadow-2xl transition-all hover:-translate-y-1"
                      : "rounded-2xl border border-white/5 bg-white/5 px-8 py-4 text-xs font-black uppercase tracking-[0.2em] text-slate-400 transition-all hover:-translate-y-1 hover:bg-white/10 hover:text-white"
                  }
                >
                  {getProfileLabel(p, "fr")}
                </Link>
              ))}
            </div>
          </RubriqueCard>
        )}

        {/* ── Paramètres ── */}
        <RubriqueCard 
          themeColor="slate" 
          withTopBar={true} 
          topBarContent="Configuration"
          className="p-12"
        >
          <AccountSettingsSection />
        </RubriqueCard>

      </div>
    </SectionShell>
  );
}
