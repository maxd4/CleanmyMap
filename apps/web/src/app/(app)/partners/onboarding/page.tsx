import { auth } from "@clerk/nextjs/server";
import { PartnerOnboardingForm } from "@/components/partners/partner-onboarding-form";
import { ClerkRequiredGate } from "@/components/ui/clerk-required-gate";

export default async function PartnerOnboardingPage() {
  const { userId } = await auth();

  if (!userId) {
    return (
      <ClerkRequiredGate
        isAuthenticated={false}
        mode="blur"
        title="Parcours partenaire"
        description="Cette fonctionnalité nécessite une connexion Clerk."
        lockedPreview={
          <section className="space-y-4 rounded-3xl border border-slate-200 bg-slate-50 p-5 shadow-sm">
            <div className="grid gap-3 md:grid-cols-2">
              <article className="rounded-2xl border border-slate-200 bg-white p-4">
                <p className="text-xs uppercase tracking-wide text-slate-500">
                  Structure
                </p>
                <p className="mt-2 text-sm text-slate-600">
                  Nom, identité légale et périmètre sont rattachés au compte.
                </p>
              </article>
              <article className="rounded-2xl border border-slate-200 bg-white p-4">
                <p className="text-xs uppercase tracking-wide text-slate-500">
                  Contact
                </p>
                <p className="mt-2 text-sm text-slate-600">
                  Les coordonnées sont validées après connexion.
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

  return (
    <div className="space-y-4">
      <header className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h1 className="text-lg font-semibold text-slate-900">
          Parcours partenaire
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Parcours en quelques minutes pour rejoindre le réseau. Votre demande est
          envoyée à l&apos;administration pour validation.
        </p>
      </header>
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <PartnerOnboardingForm />
      </div>
    </div>
  );
}
