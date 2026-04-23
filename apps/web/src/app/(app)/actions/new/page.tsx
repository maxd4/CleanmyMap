import { auth } from "@clerk/nextjs/server";
import { ActionDeclarationForm } from "@/components/actions/action-declaration-form";
import { RolePrimaryActions } from "@/components/navigation/role-primary-actions";
import { ClerkRequiredGate } from "@/components/ui/clerk-required-gate";
import { DecisionPageHeader } from "@/components/ui/decision-page-header";
import { PageReadingTemplate } from "@/components/ui/page-reading-template";
import { RubriquePdfExportButton } from "@/components/ui/rubrique-pdf-export-button";
import { getCurrentUserIdentity, getCurrentUserRoleLabel } from "@/lib/authz";
import { isFeatureEnabled } from "@/lib/feature-flags";
import {
  getProfileLabel,
  getProfilePrimaryAction,
  getProfileSecondaryAction,
  toProfile,
} from "@/lib/profiles";
import { getServerLocale } from "@/lib/server-preferences";

type NewActionPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function NewActionPage({
  searchParams,
}: NewActionPageProps) {
  const { userId } = await auth();
  const locale = await getServerLocale();
  if (!userId) {
    return (
      <ClerkRequiredGate
        isAuthenticated={false}
        mode="blur"
        title={locale === "fr" ? "Déclarer une action" : "Declare an action"}
        description={
          locale === "fr"
            ? "Cette fonctionnalité nécessite une connexion Clerk."
            : "This feature requires Clerk sign-in."
        }
        lockedPreview={
          <section className="space-y-4 rounded-3xl border border-slate-200 bg-slate-50 p-5 shadow-sm">
            <div className="grid gap-3 md:grid-cols-3">
              <article className="rounded-2xl border border-slate-200 bg-white p-4">
                <p className="text-xs uppercase tracking-wide text-slate-500">
                  {locale === "fr" ? "1. Localiser" : "1. Locate"}
                </p>
                <p className="mt-2 text-sm text-slate-600">
                  {locale === "fr"
                    ? "Repérer le lieu et préparer la déclaration."
                    : "Find the place and prepare the submission."}
                </p>
              </article>
              <article className="rounded-2xl border border-slate-200 bg-white p-4">
                <p className="text-xs uppercase tracking-wide text-slate-500">
                  {locale === "fr" ? "2. Tracer" : "2. Trace"}
                </p>
                <p className="mt-2 text-sm text-slate-600">
                  {locale === "fr"
                    ? "Tracer la zone sur la carte avec l'assistance."
                    : "Trace the area on the map with assistance."}
                </p>
              </article>
              <article className="rounded-2xl border border-slate-200 bg-white p-4">
                <p className="text-xs uppercase tracking-wide text-slate-500">
                  {locale === "fr" ? "3. Valider" : "3. Validate"}
                </p>
                <p className="mt-2 text-sm text-slate-600">
                  {locale === "fr"
                    ? "Finaliser l'envoi avec ton profil connecté."
                    : "Finalize submission with your signed-in profile."}
                </p>
              </article>
            </div>
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
              {locale === "fr"
                ? "Se connecter pour ouvrir le formulaire et rattacher la déclaration au compte."
                : "Sign in to open the form and attach the submission to the account."}
            </div>
          </section>
        }
      >
        <div />
      </ClerkRequiredGate>
    );
  }

  const identity = await getCurrentUserIdentity();
  const role = await getCurrentUserRoleLabel();
  const profile = toProfile(role);
  const primaryAction = getProfilePrimaryAction(profile);
  const secondaryAction = getProfileSecondaryAction(profile);
  const pageTemplateV2Enabled = isFeatureEnabled("pageTemplateV2");
  const params = searchParams ? await searchParams : undefined;
  const fromEventIdRaw = params?.fromEventId;
  const fromEventId = Array.isArray(fromEventIdRaw)
    ? fromEventIdRaw[0]
    : fromEventIdRaw;
  const modeRaw = params?.mode;
  const mode = Array.isArray(modeRaw) ? modeRaw[0] : modeRaw;
  const initialMode = mode === "complete" ? "complete" : "quick";
  const fallbackActorName = userId ?? "unknown-user";
  const actorNameOptions =
    identity?.actorNameOptions && identity.actorNameOptions.length > 0
      ? identity.actorNameOptions
      : [fallbackActorName];

  if (pageTemplateV2Enabled) {
    return (
      <PageReadingTemplate
        context={`Profil ${getProfileLabel(profile, locale)}`}
        title="Déclarer une action"
        objective="Saisir une action terrain fiable avec un mode rapide (<60s) ou un mode complet avec preuve, sans bloquer la saisie avant soumission."
        summary={
          <div className="space-y-3">
            <div className="grid gap-3 md:grid-cols-3">
              <article className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs uppercase tracking-wide text-slate-500">
                  Mode actif
                </p>
                <p className="mt-1 text-lg font-semibold text-slate-900">
                  {initialMode === "complete" ? "Complet" : "Rapide"}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  N-1: {initialMode === "complete" ? "Rapide" : "Complet"}
                </p>
                <p className="mt-1 text-xs text-slate-600">
                  Delta abs: n/a | Delta %: n/a
                </p>
              </article>
              <article className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs uppercase tracking-wide text-slate-500">
                  Préremplissage structure
                </p>
                <p className="mt-1 text-lg font-semibold text-slate-900">
                  {actorNameOptions[0]}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  N-1: dernière structure connue
                </p>
                <p className="mt-1 text-xs text-slate-600">
                  Delta abs: n/a | Delta %: n/a
                </p>
              </article>
              <article className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs uppercase tracking-wide text-slate-500">
                  Contexte profil
                </p>
                <p className="mt-1 text-lg font-semibold text-slate-900">
                  {getProfileLabel(profile, locale)}
                </p>
                <p className="mt-1 text-xs text-slate-500">N-1: même profil</p>
                <p className="mt-1 text-xs text-slate-600">
                  Delta abs: 0 | Delta %: 0%
                </p>
              </article>
            </div>
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
              <p className="text-xs font-semibold uppercase tracking-[0.14em]">
                Alerte prioritaire
              </p>
              <p className="mt-1">
                Vérifier la géolocalisation et la preuve si la déclaration est
                en mode complet.
              </p>
            </div>
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
              <p className="text-xs font-semibold uppercase tracking-[0.14em]">
                Action recommandée
              </p>
              <p className="mt-1">
                Démarrer en mode rapide puis enrichir la preuve si le contexte
                terrain l’exige.
              </p>
            </div>
          </div>
        }
        primaryAction={{
          href: primaryAction.href,
          label: primaryAction.label[locale],
        }}
        secondaryAction={
          secondaryAction
            ? { href: secondaryAction.href, label: secondaryAction.label[locale] }
            : undefined
        }
        analysis={
          <ActionDeclarationForm
            actorNameOptions={actorNameOptions}
            defaultActorName={actorNameOptions[0]}
            clerkIdentityLabel={identity?.displayName ?? fallbackActorName}
            clerkUserId={identity?.userId ?? fallbackActorName}
            linkedEventId={fromEventId ?? undefined}
            initialMode={initialMode}
          />
        }
        trace={
          <div className="space-y-2 text-xs text-slate-600">
            <p>
              Horodatage: {new Date().toLocaleString("fr-FR")} | Fiabilité:
              dépend des champs essentiels fournis à la soumission.
            </p>
            <p>
              Sources: profil utilisateur, endpoint de préfill, formulaire de
              déclaration.
            </p>
            <p>
              Méthode: validation progressive en saisie, blocage uniquement sur
              les essentiels au submit. Périmètre: /actions/new.
            </p>
            <div className="pt-1">
              <RubriquePdfExportButton rubriqueTitle="Declaration de nettoyage" />
            </div>
          </div>
        }
      />
    );
  }

  return (
    <div data-rubrique-report-root className="space-y-4">
      <DecisionPageHeader
        context={`Profil ${getProfileLabel(profile, locale)}`}
        title="Declaration de nettoyage"
        objective="Saisir rapidement une action fiable (mode rapide) ou complete avec preuve (mode complet)."
        actions={[
          { href: "/actions/map", label: "Verifier sur la carte" },
          { href: "/actions/history", label: "Suivre les corrections" },
        ]}
      />

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
          Tracer
        </p>
        <div className="mt-2">
          <RubriquePdfExportButton rubriqueTitle="Declaration de nettoyage" />
        </div>
      </section>

      <RolePrimaryActions
        profile={profile}
        title="CTA dynamiques selon votre role"
      />

      <ActionDeclarationForm
        actorNameOptions={actorNameOptions}
        defaultActorName={actorNameOptions[0]}
        clerkIdentityLabel={identity?.displayName ?? fallbackActorName}
        clerkUserId={identity?.userId ?? fallbackActorName}
        linkedEventId={fromEventId ?? undefined}
        initialMode={initialMode}
      />
    </div>
  );
}
