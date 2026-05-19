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
 <section className="space-y-4 rounded-3xl border border-amber-400/18 p-5" style={{ background: "rgba(20,10,0,0.55)" }}>
 <div className="grid gap-3 md:grid-cols-3">
 <article className="rounded-2xl border border-amber-400/18 p-4" style={{ background: "rgba(30,16,0,0.75)" }}>
 <p className="text-[10px] font-black uppercase tracking-wide text-amber-300/70">
 Compte
 </p>
 <p className="mt-2 text-xs text-amber-50/55">
 Identité et préférences du profil se déverrouillent après connexion.
 </p>
 </article>
 <article className="rounded-2xl border border-amber-400/18 p-4" style={{ background: "rgba(30,16,0,0.75)" }}>
 <p className="text-[10px] font-black uppercase tracking-wide text-amber-300/70">
 Impact
 </p>
 <p className="mt-2 text-xs text-amber-50/55">
 Carte d&apos;impact et progression personnelle après connexion.
 </p>
 </article>
 <article className="rounded-2xl border border-amber-400/18 p-4" style={{ background: "rgba(30,16,0,0.75)" }}>
 <p className="text-[10px] font-black uppercase tracking-wide text-amber-300/70">
 Raccourcis
 </p>
 <p className="mt-2 text-xs text-amber-50/55">
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
