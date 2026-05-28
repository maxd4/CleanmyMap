import { notFound, redirect } from"next/navigation";
import { ClerkRequiredGate } from"@/components/ui/clerk-required-gate";
import { getCurrentUserRoleLabel } from"@/lib/authz";
import { getSafeAuthSession } from"@/lib/auth/safe-session";
import { isAppProfile, toProfile } from"@/lib/profiles";
import {
  buildParcoursRoute,
  buildProfileRoute,
} from "@/lib/accueil-pilotage-routes";

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

 const { userId, clerkReachable } = await getSafeAuthSession();
 if (!userId) {
 return (
 <ClerkRequiredGate
 isAuthenticated={false}
 mode="blur"
 title="Parcours personnalisé"
 description={
 clerkReachable
              ?"Connectez-vous pour accéder au parcours associé à votre profil."
 :"Connexion Clerk temporairement indisponible. La vue reste lisible."
 }
 lockedPreview={
 <section className="space-y-4 rounded-3xl border border-amber-200/50 bg-amber-50/80 p-5 shadow-sm">
 <div className="grid gap-3 md:grid-cols-3">
 <article className="rounded-2xl border border-amber-200/60 bg-white p-4">
 <p className="cmm-text-caption uppercase tracking-wide text-amber-600">
 Découvrir
 </p>
 <p className="mt-2 cmm-text-small text-slate-700">
 Comprendre le parcours avant d&apos;agir.
 </p>
 </article>
 <article className="rounded-2xl border border-amber-200/60 bg-white p-4">
 <p className="cmm-text-caption uppercase tracking-wide text-amber-600">
 Choisir
 </p>
 <p className="mt-2 cmm-text-small text-slate-700">
 Sélectionner le profil ou la mission adaptée.
 </p>
 </article>
 <article className="rounded-2xl border border-amber-200/60 bg-white p-4">
 <p className="cmm-text-caption uppercase tracking-wide text-amber-600">
 Agir
 </p>
 <p className="mt-2 cmm-text-small text-slate-700">
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

 const activeRole = await getCurrentUserRoleLabel().catch(
 () =>"anonymous" as const,
 );
 const activeProfile = toProfile(activeRole);
 const isAdmin = activeRole ==="admin";

 if (!isAdmin && normalized !== activeProfile) {
 redirect(buildParcoursRoute(activeProfile));
}

 redirect(buildProfileRoute(normalized));
}
