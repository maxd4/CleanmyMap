import type { Metadata } from "next";
import { ClerkRequiredGate } from"@/components/ui/clerk-required-gate";
import { redirect } from"next/navigation";
import { getCurrentUserRoleLabel } from"@/lib/authz";
import { getSafeAuthSession } from"@/lib/auth/safe-session";
import { getProfileEntryPath, toProfile } from"@/lib/profiles";

export const metadata: Metadata = {
  title: "Mon profil - CleanMyMap",
  description:
    "Accédez à votre profil CleanMyMap, consultez votre impact environnemental, vos statistiques de bénévolat et votre progression dans la communauté écologie.",
  keywords: [
    "profil",
    "mon compte",
    "impact environnemental",
    "statistiques bénévolat",
    "progression",
    "communauté CleanMyMap",
    "écologie",
  ],
  alternates: {
    canonical: "/profil",
  },
};

export default async function ProfilRootPage() {
 const { userId } = await getSafeAuthSession();
 if (!userId) {
 return (
 <ClerkRequiredGate
 isAuthenticated={false}
 mode="blur"
 title="Mon profil"
 description="Connectez-vous pour accéder à votre profil et à vos raccourcis."
 lockedPreview={
 <section className="space-y-4 rounded-3xl border border-amber-200/18 bg-[linear-gradient(145deg,rgba(44,28,15,0.78)_0%,rgba(92,45,12,0.84)_56%,rgba(245,158,11,0.26)_100%)] p-5 shadow-[0_18px_42px_-26px_rgba(124,45,18,0.30)]">
 <div className="grid gap-3 md:grid-cols-3">
 <article className="rounded-2xl border border-amber-200/18 bg-[rgba(69,26,3,0.58)] p-4">
 <p className="text-[10px] font-black uppercase tracking-wide text-amber-100">
 Compte
 </p>
 <p className="mt-2 text-xs text-amber-50/72">
 Identité et préférences du profil se déverrouillent après connexion.
 </p>
 </article>
 <article className="rounded-2xl border border-amber-200/18 bg-[rgba(69,26,3,0.58)] p-4">
 <p className="text-[10px] font-black uppercase tracking-wide text-amber-100">
 Impact
 </p>
 <p className="mt-2 text-xs text-amber-50/72">
 Carte d&apos;impact et progression personnelle après connexion.
 </p>
 </article>
 <article className="rounded-2xl border border-amber-200/18 bg-[rgba(69,26,3,0.58)] p-4">
 <p className="text-[10px] font-black uppercase tracking-wide text-amber-100">
 Raccourcis
 </p>
 <p className="mt-2 text-xs text-amber-50/72">
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

 const role = await getCurrentUserRoleLabel().catch(() => "benevole" as const);
 const profile = toProfile(role);
 redirect(getProfileEntryPath(profile));
}
