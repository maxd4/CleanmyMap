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
        title={locale === "fr" ? "Déclarer" : "Declare"}
        description={
          locale === "fr"
            ? "Cette fonctionnalité nécessite une connexion Clerk."
            : "This feature requires Clerk sign-in."
        }
        lockedPreview={
          <section className="space-y-4 rounded-3xl border border-slate-200 bg-slate-50 p-5 shadow-sm">
            <div className="grid gap-3 md:grid-cols-3">
              <article className="rounded-2xl border border-slate-200 bg-white p-4">
                <p className="cmm-text-caption uppercase tracking-wide cmm-text-muted">
                  {locale === "fr" ? "1. Localiser" : "1. Locate"}
                </p>
                <p className="mt-2 cmm-text-small cmm-text-secondary">
                  {locale === "fr"
                    ? "Repérer le lieu et préparer la déclaration."
                    : "Find the place and prepare the submission."}
                </p>
              </article>
              <article className="rounded-2xl border border-slate-200 bg-white p-4">
                <p className="cmm-text-caption uppercase tracking-wide cmm-text-muted">
                  {locale === "fr" ? "2. Tracer" : "2. Trace"}
                </p>
                <p className="mt-2 cmm-text-small cmm-text-secondary">
                  {locale === "fr"
                    ? "Tracer la zone sur la carte avec l'assistance."
                    : "Trace the area on the map with assistance."}
                </p>
              </article>
              <article className="rounded-2xl border border-slate-200 bg-white p-4">
                <p className="cmm-text-caption uppercase tracking-wide cmm-text-muted">
                  {locale === "fr" ? "3. Valider" : "3. Validate"}
                </p>
                <p className="mt-2 cmm-text-small cmm-text-secondary">
                  {locale === "fr"
                    ? "Finaliser l'envoi avec votre profil connecté."
                    : "Finalize submission with your signed-in profile."}
                </p>
              </article>
            </div>
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 cmm-text-small text-emerald-900">
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

  // Préparer les métadonnées utilisateur automatiques
  const userMetadata = {
    userId,
    username: identity?.username,
    displayName: identity?.displayName,
    email: undefined, // Email non exposé pour la sécurité
  };

  if (pageTemplateV2Enabled) {
    return (
      <PageReadingTemplate
        context={`Profil ${getProfileLabel(profile, locale)}`}
        title="Déclarer"
        objective="Déclarer une action terrain en 3 étapes : localiser, tracer, valider."
        summary={
          <div className="grid gap-3 md:grid-cols-2">
            <article className="rounded-xl border border-slate-200 bg-slate-50/50 p-3">
              <p className="cmm-text-caption uppercase tracking-wide cmm-text-muted">Mode actif</p>
              <p className="text-lg font-semibold cmm-text-primary">
                {initialMode === "complete" ? "Complet" : "Rapide"}
              </p>
            </article>
            <article className="rounded-xl border border-slate-200 bg-slate-50/50 p-3">
              <p className="cmm-text-caption uppercase tracking-wide cmm-text-muted">Profil</p>
              <p className="text-lg font-semibold cmm-text-primary">
                {getProfileLabel(profile, locale)}
              </p>
            </article>
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
          <div className="space-y-8">
            <ActionDeclarationForm
              actorNameOptions={actorNameOptions}
              defaultActorName={actorNameOptions[0]}
              userMetadata={userMetadata}
              linkedEventId={fromEventId ?? undefined}
              initialMode={initialMode}
            />
            <section className="flex flex-col items-center justify-center border-t border-slate-200 pt-8 pb-4">
              <RubriquePdfExportButton rubriqueTitle="Déclaration de nettoyage" />
              <p className="mt-2 cmm-text-caption cmm-text-muted">Générer un justificatif administratif de cette saisie</p>
            </section>
          </div>
        }
        trace={
          <div className="space-y-2 cmm-text-caption cmm-text-secondary">
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
          </div>
        }
      />
    );
  }

  return (
    <div data-rubrique-report-root className="space-y-4">
      <DecisionPageHeader
        context={`Profil ${getProfileLabel(profile, locale)}`}
        title="Déclarer"
        objective="Saisir rapidement une action terrain (3 étapes : localiser, tracer, valider)."
        actions={[
          { href: "/actions/map", label: "Carte" },
          { href: "/actions/history", label: "Historique" },
        ]}
      />

      <ActionDeclarationForm
        actorNameOptions={actorNameOptions}
        defaultActorName={actorNameOptions[0]}
        userMetadata={userMetadata}
        linkedEventId={fromEventId ?? undefined}
        initialMode={initialMode}
      />

      <section className="flex flex-col items-center justify-center border-t border-slate-200 pt-8 pb-4">
        <RubriquePdfExportButton rubriqueTitle="Déclaration de nettoyage" />
        <p className="mt-2 cmm-text-caption cmm-text-muted">Générer un justificatif administratif de cette saisie</p>
      </section>
    </div>
  );
}
