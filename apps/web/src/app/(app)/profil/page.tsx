import { auth } from"@clerk/nextjs/server";
import { ClerkRequiredGate } from"@/components/ui/clerk-required-gate";
import { redirect } from"next/navigation";
import { getCurrentUserRoleLabel } from"@/lib/authz";
import { getProfileEntryPath, toProfile } from"@/lib/profiles";

export default async function ProfilRootPage() {
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
 <div className="grid gap-3 md:grid-cols-3">
 <article className="rounded-2xl border border-slate-200 bg-white p-4">
 <p className="cmm-text-caption uppercase tracking-wide cmm-text-muted">
 Compte
 </p>
 <p className="mt-2 cmm-text-small cmm-text-secondary">
 Identité et préférences du profil se déverrouillent après connexion.
 </p>
 </article>
 <article className="rounded-2xl border border-slate-200 bg-white p-4">
 <p className="cmm-text-caption uppercase tracking-wide cmm-text-muted">
 Impact
 </p>
 <p className="mt-2 cmm-text-small cmm-text-secondary">
 Carte d'impact et progression personnelle après connexion.
 </p>
 </article>
 <article className="rounded-2xl border border-slate-200 bg-white p-4">
 <p className="cmm-text-caption uppercase tracking-wide cmm-text-muted">
 Raccourcis
 </p>
 <p className="mt-2 cmm-text-small cmm-text-secondary">
 Les actions rapides apparaissent après connexion.
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

 const role = await getCurrentUserRoleLabel();
 const profile = toProfile(role);
 redirect(getProfileEntryPath(profile));
}
