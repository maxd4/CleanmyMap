import { auth } from "@clerk/nextjs/server";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { FirstMissionOnboarding } from "@/components/navigation/first-mission-onboarding";
import { RolePrimaryActions } from "@/components/navigation/role-primary-actions";
import { ClerkRequiredGate } from "@/components/ui/clerk-required-gate";
import { getCurrentUserRoleLabel } from "@/lib/authz";
import {
  PROFILE_ORDER,
  getProfileEntryPath,
  getProfileLabel,
  getProfileSubtitle,
  isAppProfile,
  toProfile,
} from "@/lib/profiles";

type ProfilPageProps = {
  params: Promise<{ profile: string }>;
};

export default async function ProfilPage({ params }: ProfilPageProps) {
  const { profile } = await params;
  const normalized = profile.trim().toLowerCase();

  if (!isAppProfile(normalized)) {
    notFound();
  }

  const { userId } = await auth();
  if (!userId) {
    return (
      <ClerkRequiredGate
        isAuthenticated={false}
        mode="blur"
        title="Profil"
        description="Cette fonctionnalité nécessite une connexion Clerk."
        lockedPreview={
          <section className="space-y-4 rounded-3xl border border-slate-200 bg-slate-50 p-5 shadow-sm">
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">
                Profil {normalized}
              </p>
              <p className="mt-2 text-sm text-slate-600">
                Les recommandations, le parcours et les raccourcis du profil
                apparaissent après connexion.
              </p>
            </div>
          </section>
        }
      >
        <div />
      </ClerkRequiredGate>
    );
  }

  const activeRole = await getCurrentUserRoleLabel();
  const activeProfile = toProfile(activeRole);
  const isAdmin = activeRole === "admin";

  // Guard Strict: un utilisateur ne peut voir que son propre parcours (ou l'admin tout voir).
  if (!isAdmin && normalized !== activeProfile) {
    redirect(getProfileEntryPath(activeProfile));
  }

  const profileLabel = getProfileLabel(normalized, "fr");
  const profileSubtitle = getProfileSubtitle(normalized, "fr");

  const switchableProfiles = isAdmin ? PROFILE_ORDER : [activeProfile];

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
          Profil d&apos;accueil
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-900">
          Profil {profileLabel.toLowerCase()}
        </h1>
        <p className="mt-2 text-sm text-slate-600">{profileSubtitle}.</p>
        <p className="mt-2 text-xs text-slate-500">
          Profil actif détecté :{" "}
          <span className="font-semibold">
            {getProfileLabel(activeProfile, "fr")}
          </span>
        </p>
      </section>

      <FirstMissionOnboarding key={normalized} profile={normalized} />

      <RolePrimaryActions
        profile={normalized}
        title="Actions recommandées pour ce profil"
      />

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-base font-semibold text-slate-900">
          {isAdmin ? "Changer de profil" : "Profil actif"}
        </h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {switchableProfiles.map((candidateProfile) => (
            <Link
              key={candidateProfile}
              href={getProfileEntryPath(candidateProfile)}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
            >
              {getProfileLabel(candidateProfile, "fr")}
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
