import { auth } from "@clerk/nextjs/server";
import { ActionsHistoryList } from "@/components/actions/actions-history-list";
import { DecisionPageHeader } from "@/components/ui/decision-page-header";
import { ClerkRequiredGate } from "@/components/ui/clerk-required-gate";
import { PageReadingTemplate } from "@/components/ui/page-reading-template";
import { RubriquePdfExportButton } from "@/components/ui/rubrique-pdf-export-button";
import { isFeatureEnabled } from "@/lib/feature-flags";

export default async function ActionsHistoryPage() {
  const pageTemplateV2Enabled = isFeatureEnabled("pageTemplateV2");
  const { userId } = await auth();

  if (!userId) {
    return (
      <ClerkRequiredGate
        isAuthenticated={false}
        mode="blur"
        title="Historique des actions"
        description="Cette fonctionnalité nécessite une connexion Clerk."
        lockedPreview={
          <section className="space-y-4 rounded-3xl border border-slate-200 bg-slate-50 p-5 shadow-sm">
            <div className="grid gap-3 md:grid-cols-3">
              <article className="rounded-2xl border border-slate-200 bg-white p-4">
                <p className="text-xs uppercase tracking-wide text-slate-500">
                  Qualité
                </p>
                <p className="mt-2 text-sm text-slate-600">
                  Score et grade se déverrouillent après connexion.
                </p>
              </article>
              <article className="rounded-2xl border border-slate-200 bg-white p-4">
                <p className="text-xs uppercase tracking-wide text-slate-500">
                  Corrections
                </p>
                <p className="mt-2 text-sm text-slate-600">
                  Les lignes à corriger restent cachées tant que tu n&apos;es pas connecté.
                </p>
              </article>
              <article className="rounded-2xl border border-slate-200 bg-white p-4">
                <p className="text-xs uppercase tracking-wide text-slate-500">
                  Traçabilité
                </p>
                <p className="mt-2 text-sm text-slate-600">
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

  if (pageTemplateV2Enabled) {
    return (
      <PageReadingTemplate
        context="Profil supervision"
        title="Historique des actions"
        objective="Prioriser les fiches à corriger, expliciter les pertes de qualité et fiabiliser les données historisées."
        summary={
          <div className="space-y-3">
            <div className="grid gap-3 md:grid-cols-3">
              <article className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs uppercase tracking-wide text-slate-500">
                  Qualité visible
                </p>
                <p className="mt-1 text-lg font-semibold text-slate-900">
                  Score + grade
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  N-1: score partiel
                </p>
                <p className="mt-1 text-xs text-slate-600">
                  Delta abs: n/a | Delta %: n/a
                </p>
              </article>
              <article className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs uppercase tracking-wide text-slate-500">
                  Raisons explicites
                </p>
                <p className="mt-1 text-lg font-semibold text-slate-900">
                  Facteurs détaillés
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  N-1: tooltip partiel
                </p>
                <p className="mt-1 text-xs text-slate-600">
                  Delta abs: n/a | Delta %: n/a
                </p>
              </article>
              <article className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs uppercase tracking-wide text-slate-500">
                  Filtrage qualité
                </p>
                <p className="mt-1 text-lg font-semibold text-slate-900">
                  A / B / C + à corriger
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  N-1: filtrage limité
                </p>
                <p className="mt-1 text-xs text-slate-600">
                  Delta abs: n/a | Delta %: n/a
                </p>
              </article>
            </div>
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
              <p className="text-xs font-semibold uppercase tracking-[0.14em]">
                Alerte prioritaire
              </p>
              <p className="mt-1">
                Traiter en premier les lignes grade C pour limiter les biais
                d’analyse.
              </p>
            </div>
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
              <p className="text-xs font-semibold uppercase tracking-[0.14em]">
                Action recommandée
              </p>
              <p className="mt-1">
                Appliquer le filtre “à corriger” puis corriger les champs
                géoloc/trace en priorité.
              </p>
            </div>
          </div>
        }
        primaryAction={{ href: "/actions/new", label: "Déclarer une action" }}
        secondaryAction={{ href: "/reports", label: "Ouvrir reporting" }}
        analysis={<ActionsHistoryList />}
        trace={
          <div className="space-y-2 text-xs text-slate-600">
            <p>
              Horodatage: {new Date().toLocaleString("fr-FR")} | Fiabilité:
              dépend du score qualité API par ligne.
            </p>
            <p>
              Sources: API actions enrichie score/grade/flags, historique
              utilisateur.
            </p>
            <p>
              Méthode: score standardisé (complétude, cohérence, géoloc, trace,
              fraîcheur). Périmètre: /actions/history.
            </p>
            <div className="pt-1">
              <RubriquePdfExportButton rubriqueTitle="Historique bénévole" />
            </div>
          </div>
        }
      />
    );
  }

  return (
    <div data-rubrique-report-root className="space-y-4">
      <DecisionPageHeader
        context="Profil supervision"
        title="Historique bénévole"
        objective="Identifier les fiches à corriger en priorité et fiabiliser les données historisées."
        actions={[
          {
            href: "/actions/new",
            label: "Nouvelle déclaration",
            tone: "primary",
          },
          { href: "/reports", label: "Ouvrir reporting" },
        ]}
      />

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
          Tracer
        </p>
        <div className="mt-2">
          <RubriquePdfExportButton rubriqueTitle="Historique bénévole" />
        </div>
      </section>

      <ActionsHistoryList />
    </div>
  );
}
