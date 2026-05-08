import { auth } from "@clerk/nextjs/server";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { RolePrimaryActions } from "@/components/navigation/role-primary-actions";
import { ClerkRequiredGate } from "@/components/ui/clerk-required-gate";
import { PromotionRequestForm } from "@/components/sections/rubriques/promotion-request-form";
import { AccountSettingsSection } from "@/components/account/account-settings-section";
import { getCurrentUserRoleLabel } from "@/lib/authz";
import {
  getProfileEntryPath,
  getProfileLabel,
  getProfileSubtitle,
  getSwitchableProfiles,
  isAdminLikeProfile,
  isAppProfile,
  toProfile,
} from "@/lib/profiles";

type ProfilPageProps = {
  params: Promise<{ profile: string }>;
};

export default async function ProfilPage({ params }: ProfilPageProps) {
  const { profile } = await params;
  const normalized = profile.trim().toLowerCase();

  if (!isAppProfile(normalized)) notFound();

  const { userId } = await auth();
  if (!userId) {
    return (
      <ClerkRequiredGate
        isAuthenticated={false}
        mode="blur"
        title="Parcours personnalisé"
        description="Connectez-vous pour accéder au parcours lié à votre profil."
        lockedPreview={
          <div className="rounded-3xl bg-black/30 p-6">
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
    <div
      className="relative min-h-screen overflow-hidden font-sans"
      style={{ background: "#92400e" }}
    >
      {/* Fond multicouche — cohérent avec dashboard */}
      <div className="pointer-events-none absolute inset-0" style={{ background: "radial-gradient(ellipse 160% 100% at 50% -15%, #fef08a 0%, #fbbf24 20%, #f97316 50%, #ea580c 75%, #92400e 100%)" }} />
      <div className="pointer-events-none absolute inset-0" style={{ background: "radial-gradient(ellipse 70% 50% at 50% 0%, rgba(254,240,138,0.6) 0%, transparent 65%)" }} />
      <div className="pointer-events-none absolute -top-40 -left-40 h-[600px] w-[600px] rounded-full blur-[120px]" style={{ background: "rgba(251,191,36,0.5)" }} />
      <div className="pointer-events-none absolute top-1/2 -right-32 h-[450px] w-[450px] rounded-full blur-[100px]" style={{ background: "rgba(249,115,22,0.25)" }} />
      <div className="pointer-events-none absolute bottom-0 left-1/4 h-[400px] w-[400px] rounded-full blur-[120px]" style={{ background: "rgba(253,224,71,0.2)" }} />

      <div className="relative z-10 mx-auto max-w-[1400px] px-5 pb-24 pt-8 sm:px-8 sm:pt-10 space-y-12">

        {/* ── Header ── */}
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-white/70">
            Profil d&apos;accueil
          </p>
          <h1 className="mt-1.5 text-[clamp(3.5rem,7vw,6rem)] font-black leading-[0.92] tracking-[-0.05em] text-white">
            {profileLabel}
          </h1>
          <p className="mt-3 text-lg font-medium text-white/75">{profileSubtitle}.</p>
        </div>

        {/* ── Séparateur ── */}
        <div className="h-px bg-white/20" />

        {/* ── Actions recommandées ── */}
        <div>
          <p className="mb-5 text-[11px] font-bold uppercase tracking-[0.3em] text-white/70">
            Actions recommandées
          </p>
          <RolePrimaryActions profile={normalized} title="" tone="dark" />
        </div>

        {/* ── Séparateur ── */}
        <div className="h-px bg-white/20" />

        {/* ── Promotion ── */}
        <PromotionRequestForm currentRole={activeProfile} />

        {/* ── Changer de profil ── */}
        {switchableProfiles.length > 1 && (
          <>
            <div className="h-px bg-white/20" />
            <div>
              <p className="mb-4 text-[11px] font-bold uppercase tracking-[0.3em] text-white/70">
                {isAdmin ? "Changer de profil" : "Profil actif"}
              </p>
              <div className="flex flex-wrap gap-2.5">
                {switchableProfiles.map((p) => (
                  <Link
                    key={p}
                    href={getProfileEntryPath(p)}
                    className={
                      p === activeProfile
                        ? "rounded-xl border border-amber-900/40 bg-amber-900 px-4 py-2.5 text-sm font-bold text-amber-100 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.3)] transition-all hover:-translate-y-0.5"
                        : "rounded-xl border border-amber-200/60 bg-amber-100 px-4 py-2.5 text-sm font-semibold text-amber-900 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.15)] transition-all hover:-translate-y-0.5 hover:bg-amber-50 hover:border-amber-300"
                    }
                  >
                    {getProfileLabel(p, "fr")}
                  </Link>
                ))}
              </div>
            </div>
          </>
        )}

        {/* ── Séparateur ── */}
        <div className="h-px bg-white/20" />

        {/* ── Paramètres ── */}
        <AccountSettingsSection />

      </div>
    </div>
  );
}
