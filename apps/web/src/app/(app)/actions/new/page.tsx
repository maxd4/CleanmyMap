import type { Metadata } from "next";
import { getSafeAuthSession } from "@/lib/auth/safe-session";

export const metadata: Metadata = {
  title: "Déclarer une action - CleanMyMap",
  description:
    "Déclarez votre action de nettoyage urbain et累计 votre impact environnemental. Signalez les déchets collectés, calcul automatique CO2 et eau préservée.",
  keywords: [
    "déclarer action",
    "déclaration nettoyage",
    "signalement déchets",
    "impact environnemental",
    "bénévolat propreté",
    "action citoyenne",
    "collecte déchets Paris",
    "écologie",
    "développement durable",
  ],
  alternates: {
    canonical: "/actions/new",
  },
};
import { ActionDeclarationForm } from "@/components/actions/action-declaration-form/";
import { ClerkRequiredGate } from "@/components/ui/clerk-required-gate";
import { getCurrentUserIdentity } from "@/lib/authz";
import { isFeatureEnabled } from "@/lib/feature-flags";
import { getServerLocale } from "@/lib/server-preferences";

type NewActionPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function resolveSingleSearchParam(
  value: string | string[] | undefined,
): string | undefined {
  if (Array.isArray(value)) {
    return value[0];
  }
  return value;
}

export default async function NewActionPage({
  searchParams,
}: NewActionPageProps) {
  const { userId } = await getSafeAuthSession();
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
  const pageTemplateV2Enabled = isFeatureEnabled("pageTemplateV2");
  const params = searchParams ? await searchParams : undefined;
  const fromEventId = resolveSingleSearchParam(params?.["fromEventId"]);
  const mode = resolveSingleSearchParam(params?.["mode"]);
  const initialMode = mode === "complete" ? "complete" : "quick";
  const initialRecordType = mode === "propre" ? "clean_place" : "action";
  const fallbackActorName = userId ?? "unknown-user";
  const actorNameOptions =
    identity?.actorNameOptions && identity.actorNameOptions.length > 0
      ? identity.actorNameOptions
      : [fallbackActorName];
  const defaultActorName = actorNameOptions[0] ?? fallbackActorName;

  // Préparer les métadonnées utilisateur automatiques
  const userMetadata = {
    userId,
    username: identity?.username,
    displayName: identity?.displayName,
    email: undefined, // Email non exposé pour la sécurité
  };

  if (pageTemplateV2Enabled) {
    return (
      <div className="space-y-8">
        <ActionDeclarationForm
          actorNameOptions={actorNameOptions}
          defaultActorName={defaultActorName}
          userMetadata={userMetadata}
          linkedEventId={fromEventId}
          initialMode={initialMode}
          initialRecordType={initialRecordType}
        />
      </div>
    );
  }

  return (
    <div data-rubrique-report-root className="space-y-4">
      <ActionDeclarationForm
        actorNameOptions={actorNameOptions}
        defaultActorName={defaultActorName}
        userMetadata={userMetadata}
        linkedEventId={fromEventId}
        initialMode={initialMode}
        initialRecordType={initialRecordType}
      />
    </div>
  );
}
