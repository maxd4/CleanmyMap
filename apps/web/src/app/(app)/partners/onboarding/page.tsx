import { PartnerOnboardingForm } from "@/components/partners/partner-onboarding-form";
import { AccountCompletionGate } from "@/components/account/account-completion-gate";
import { ClerkRequiredGate } from "@/components/ui/clerk-required-gate";
import { CmmPageLayout, CmmSectionGroup } from "@/components/ui/cmm-section";
import { PageHeader } from "@/components/ui/page-header";
import { getSafeAuthSession } from "@/lib/auth/safe-session";
import { loadAccountCompletionGateState } from "@/lib/auth/account-completion-gate";

export default async function PartnerOnboardingPage() {
 const { userId, clerkReachable } = await getSafeAuthSession();
 const accountCompletion = userId
  ? await loadAccountCompletionGateState({ userId, clerkReachable }).catch(() => null)
  : null;

 if (!userId) {
 return (
 <CmmPageLayout>
 <CmmSectionGroup>
  <PageHeader
   tone="indigo"
   contrast="inverse"
   title="Parcours partenaire"
   subtitle="Créer ou compléter la fiche partenaire puis l’envoyer à validation."
  />
  <ClerkRequiredGate
   isAuthenticated={false}
   mode="blur"
   lockedPreview={
    <section className="space-y-4 rounded-3xl border border-indigo-300/18 bg-[rgba(22,26,72,0.78)] p-5 shadow-sm">
     <div className="grid gap-3 md:grid-cols-2">
      <article className="rounded-2xl border border-indigo-300/18 bg-[rgba(30,41,118,0.55)] p-4">
       <p className="cmm-text-caption uppercase tracking-wide text-indigo-100/70">
        Structure
       </p>
       <p className="mt-2 cmm-text-small text-indigo-50/70">
        Nom, identité légale et périmètre sont rattachés au compte.
       </p>
      </article>
      <article className="rounded-2xl border border-indigo-300/18 bg-[rgba(30,41,118,0.55)] p-4">
       <p className="cmm-text-caption uppercase tracking-wide text-indigo-100/70">
        Contact
       </p>
       <p className="mt-2 cmm-text-small text-indigo-50/70">
        Les coordonnées sont validées après connexion.
       </p>
      </article>
     </div>
    </section>
   }
  >
   <div />
  </ClerkRequiredGate>
 </CmmSectionGroup>
 </CmmPageLayout>
 );
 }

  return (
   <ClerkRequiredGate
    isAuthenticated={Boolean(userId)}
    mode="blur"
    lockedPreview={
     <section className="space-y-4 rounded-3xl border border-indigo-300/18 bg-[rgba(22,26,72,0.78)] p-5 shadow-sm">
      <div className="grid gap-3 md:grid-cols-2">
       <article className="rounded-2xl border border-indigo-300/18 bg-[rgba(30,41,118,0.55)] p-4">
        <p className="cmm-text-caption uppercase tracking-wide text-indigo-100/70">
         Structure
        </p>
        <p className="mt-2 cmm-text-small text-indigo-50/70">
         Nom, identité légale et périmètre sont rattachés au compte.
        </p>
       </article>
       <article className="rounded-2xl border border-indigo-300/18 bg-[rgba(30,41,118,0.55)] p-4">
        <p className="cmm-text-caption uppercase tracking-wide text-indigo-100/70">
         Contact
        </p>
        <p className="mt-2 cmm-text-small text-indigo-50/70">
         Les coordonnées sont validées après connexion.
        </p>
       </article>
      </div>
     </section>
    }
   >
    <AccountCompletionGate state={accountCompletion}>
     <CmmPageLayout>
     <CmmSectionGroup>
      <PageHeader
       tone="indigo"
       contrast="inverse"
       title="Parcours partenaire"
       subtitle="Créer ou compléter la fiche partenaire puis l’envoyer à validation."
      />
      <div className="rounded-xl border border-indigo-300/18 bg-[rgba(22,26,72,0.78)] p-4 shadow-sm">
       <PartnerOnboardingForm />
      </div>
     </CmmSectionGroup>
     </CmmPageLayout>
    </AccountCompletionGate>
   </ClerkRequiredGate>
 );
}
