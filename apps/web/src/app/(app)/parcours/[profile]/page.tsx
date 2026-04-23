import { auth } from "@clerk/nextjs/server";
import { notFound, redirect } from "next/navigation";
import { ClerkRequiredGate } from "@/components/ui/clerk-required-gate";
import { getCurrentUserRoleLabel } from "@/lib/authz";
import { isAppProfile, toProfile } from "@/lib/profiles";

type ParcoursProfilePageProps = {
  params: Promise<{ profile: string }>;
};

export default async function ParcoursProfilePage({
  params,
}: ParcoursProfilePageProps) {
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
        title="Parcours"
        description="Cette fonctionnalité nécessite une connexion Clerk."
        lockedPreview={
          <section className="space-y-4 rounded-3xl border border-slate-200 bg-slate-50 p-5 shadow-sm">
            <div className="grid gap-3 md:grid-cols-3">
              <article className="rounded-2xl border border-slate-200 bg-white p-4">
                <p className="text-xs uppercase tracking-wide text-slate-500">
                  1. Découvrir
                </p>
                <p className="mt-2 text-sm text-slate-600">
                  Comprendre le parcours avant d'agir.
                </p>
              </article>
              <article className="rounded-2xl border border-slate-200 bg-white p-4">
                <p className="text-xs uppercase tracking-wide text-slate-500">
                  2. Choisir
                </p>
                <p className="mt-2 text-sm text-slate-600">
                  Sélectionner le profil ou la mission adaptée.
                </p>
              </article>
              <article className="rounded-2xl border border-slate-200 bg-white p-4">
                <p className="text-xs uppercase tracking-wide text-slate-500">
                  3. Agir
                </p>
                <p className="mt-2 text-sm text-slate-600">
                  Déclencher les fonctions réservées au compte connecté.
                </p>
              </article>
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

  if (!isAdmin && normalized !== activeProfile) {
    redirect(`/parcours/${activeProfile}`);
  }

  redirect(`/profil/${normalized}`);
}
