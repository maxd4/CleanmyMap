import { auth } from "@clerk/nextjs/server";
import { QuickSignalementForm } from "@/components/actions/quick-signalement-form";
import { ClerkRequiredGate } from "@/components/ui/clerk-required-gate";
import { DecisionPageHeader } from "@/components/ui/decision-page-header";

export default async function SignalementPage() {
  const { userId } = await auth();

  if (!userId) {
    return (
      <ClerkRequiredGate
        isAuthenticated={false}
        mode="blur"
        title="Signalement express"
        description="Cette fonctionnalité nécessite une connexion Clerk."
        lockedPreview={
          <div className="space-y-4 rounded-3xl border border-slate-200 bg-slate-50 p-5 shadow-sm">
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">
                Vue rapide
              </p>
              <p className="mt-2 text-sm text-slate-600">
                Localisation, photo et envoi se déverrouillent après connexion.
              </p>
            </div>
          </div>
        }
      >
        <div />
      </ClerkRequiredGate>
    );
  }

  return (
    <div className="w-full space-y-6">
      <DecisionPageHeader
        context="Terrain"
        title="Signalement Express"
        objective="Signaler une zone polluée en 10 secondes. GPS et Photo recommandés."
      />
      
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden p-6 sm:p-8">
        <QuickSignalementForm />
      </div>

      <footer className="text-center text-xs text-slate-400 font-bold uppercase tracking-widest py-4">
        Donnée géolocalisée temps réel
      </footer>
    </div>
  );
}
