import type { Metadata } from "next";
import { getSafeAuthSession } from "@/lib/auth/safe-session";
import { loadAccountCompletionGateState } from "@/lib/auth/account-completion-gate";
import { ClerkRequiredGate } from "@/components/ui/clerk-required-gate";
import { PageReadingTemplate } from "@/components/ui/page-reading-template";
import { ActionsHistoryList } from "@/components/actions/actions-history-list";
import { AccountCompletionGate } from "@/components/account/account-completion-gate";

export const metadata: Metadata = {
  title: "Historique terrain",
  description:
    "Consulter les enregistrements accessibles, leur qualité et les corrections à effectuer.",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function ActionsHistoryPage() {
  const { userId, clerkReachable } = await getSafeAuthSession();
  const accountCompletion = userId
    ? await loadAccountCompletionGateState({ userId, clerkReachable }).catch(() => null)
    : null;

  if (!userId) {
    return (
      <ClerkRequiredGate
        isAuthenticated={false}
        mode="blur"
        lockedPreview={
          <section className="space-y-4 rounded-3xl border border-slate-200 bg-slate-50 p-5 shadow-sm">
            <div className="grid gap-3 md:grid-cols-3">
              <article className="rounded-2xl border border-slate-200 bg-white p-4">
                <p className="cmm-text-caption uppercase tracking-wide cmm-text-muted">
                  Qualité
                </p>
                <p className="mt-2 cmm-text-small cmm-text-secondary">
                  Score et grade se déverrouillent après connexion.
                </p>
              </article>
              <article className="rounded-2xl border border-slate-200 bg-white p-4">
                <p className="cmm-text-caption uppercase tracking-wide cmm-text-muted">
                  Corrections
                </p>
                <p className="mt-2 cmm-text-small cmm-text-secondary">
                  Les lignes à corriger restent cachées tant que tu n&apos;es pas connecté.
                </p>
              </article>
              <article className="rounded-2xl border border-slate-200 bg-white p-4">
                <p className="cmm-text-caption uppercase tracking-wide cmm-text-muted">
                  Traçabilité
                </p>
                <p className="mt-2 cmm-text-small cmm-text-secondary">
                  La méthode complète s&apos;affiche après connexion.
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
    <AccountCompletionGate state={accountCompletion}>
      <PageReadingTemplate
        title="Historique terrain"
        objective="Consulter les enregistrements accessibles, leur qualité et les corrections à effectuer."
        primaryAction={{ href: "/actions/new", label: "Créer une action" }}
        secondaryAction={{ href: "/reports", label: "Ouvrir reporting" }}
        analysis={<ActionsHistoryList />}
      />
    </AccountCompletionGate>
  );
}
