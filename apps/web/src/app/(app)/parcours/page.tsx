import { ClerkRequiredGate } from "@/components/ui/clerk-required-gate";
import { redirect } from "next/navigation";
import { getCurrentUserRoleLabel } from "@/lib/authz";
import { getSafeAuthSession } from "@/lib/auth/safe-session";
import { toProfile } from "@/lib/profiles";

export default async function ParcoursRootPage() {
  const { userId, clerkReachable } = await getSafeAuthSession();
  if (!userId) {
    return (
      <ClerkRequiredGate
        isAuthenticated={false}
        mode="blur"
        title="Parcours"
        description={
          clerkReachable
            ? "Le parcours personnalisé s&apos;ouvre après connexion au compte Clerk."
            : "Connexion Clerk temporairement indisponible. La vue reste lisible."
        }
        lockedPreview={
          <section className="space-y-4 rounded-3xl border border-slate-200 bg-slate-50 p-5 shadow-sm">
            <div className="grid gap-3 md:grid-cols-3">
              <article className="rounded-2xl border border-slate-200 bg-white p-4">
                <p className="text-xs uppercase tracking-wide text-slate-500">
                  Découvrir
                </p>
                <p className="mt-2 text-sm text-slate-600">
                  Le parcours guide les bénévoles selon leur profil.
                </p>
              </article>
              <article className="rounded-2xl border border-slate-200 bg-white p-4">
                <p className="text-xs uppercase tracking-wide text-slate-500">
                  Agir
                </p>
                <p className="mt-2 text-sm text-slate-600">
                  Les actions recommandées apparaissent une fois connecté.
                </p>
              </article>
              <article className="rounded-2xl border border-slate-200 bg-white p-4">
                <p className="text-xs uppercase tracking-wide text-slate-500">
                  Suivre
                </p>
                <p className="mt-2 text-sm text-slate-600">
                  Le suivi d&apos;impact reste attaché au compte Clerk.
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

  const role = await getCurrentUserRoleLabel().catch(() => "anonymous" as const);
  const profile = toProfile(role);
  redirect(`/parcours/${profile}`);
}
