"use client";

import { ArrowLeft, ArrowRight, CheckCircle2, Eye, Info, MapPin, UserRound } from "lucide-react";
import Link from "next/link";
import {
  AccountSetupDisplayModeGrid,
  AccountSetupLocationFields,
  AccountSetupProfileGrid,
} from "@/components/account/account-setup-sections";
import { AccountSetupChoiceCard, AccountSetupSection } from "@/components/account/account-setup-primitives";
import { useAccountSetupController } from "@/components/account/use-account-setup-controller";
import type { AccountSetupFormProps } from "@/components/account/use-account-setup-controller";
import { ErrorMessage } from "@/components/ui/error-message";
import { PermissionErrorState } from "@/components/ui/permission-error-state";
import {
  SystemStateAction,
  SystemStateDescription,
  SystemStateIcon,
  SystemStateLayout,
  SystemStateMeta,
  SystemStateTitle,
} from "@/components/ui/system-state";
import { CmmButton } from "@/components/ui/cmm-button";
import { CmmCard } from "@/components/ui/cmm-card";
import { CmmField, CmmInput } from "@/components/ui/cmm-field";

export type { AccountSetupFormProps } from "@/components/account/use-account-setup-controller";

export function AccountSetupForm(props: AccountSetupFormProps) {
  const controller = useAccountSetupController(props);

  if (!controller.isLoaded) {
    if (!controller.clerkReachable) {
      return (
        <SystemStateLayout variant="offline" className="max-w-none">
          <SystemStateIcon variant="offline"><Eye className="h-7 w-7" /></SystemStateIcon>
          <SystemStateMeta variant="offline" label="Connexion">Clerk n’est pas joignable dans cette session.</SystemStateMeta>
          <SystemStateTitle variant="offline">Session Clerk indisponible</SystemStateTitle>
          <SystemStateDescription variant="offline">La configuration initiale nécessite une session Clerk valide. Vérifiez votre connexion puis réessayez.</SystemStateDescription>
          <SystemStateAction>
            <CmmButton href="/sign-in" tone="primary">Se reconnecter</CmmButton>
          </SystemStateAction>
        </SystemStateLayout>
      );
    }
    return <CmmCard variant="outlined" size="sm"><p className="cmm-text-body cmm-text-primary">Chargement du compte…</p></CmmCard>;
  }

  if (!controller.user) {
    return <PermissionErrorState title="Connexion requise" message="Reconnectez-vous pour finaliser votre compte." />;
  }

  const steps = [
    { id: "identity" as const, label: "Identité", description: "Votre nom et votre visibilité" },
    { id: "usage" as const, label: "Utilisation", description: "Votre parcours CleanMyMap" },
    { id: "location" as const, label: "Localisation", description: "Vos villes, si vous le souhaitez" },
  ];
  const currentStepIndex = steps.findIndex((step) => step.id === controller.currentStep);
  const isLastStep = controller.currentStep === "location";

  return (
    <form onSubmit={(event) => void controller.handleSubmit(event)} className="cmm-account-setup-form flex min-h-0 flex-col text-white">
      <header className="cmm-account-setup-header flex items-start gap-4">
        <span className="cmm-account-setup-header-icon flex shrink-0 items-center justify-center rounded-2xl border border-slate-300/40 bg-slate-700/25 text-slate-100">
          <UserRound className="cmm-account-setup-header-glyph" aria-hidden="true" />
        </span>
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.16em] text-slate-700">Configuration initiale</p>
          <h1 className="cmm-account-setup-title font-black tracking-tight text-slate-900">Configurez votre profil</h1>
          <p className="cmm-text-body cmm-text-inverse mt-2 max-w-3xl">Trois étapes courtes pour commencer. Vous pourrez modifier ces choix plus tard dans les réglages de votre compte.</p>
        </div>
      </header>

      <nav aria-label="Progression de la configuration" className="mb-5 rounded-2xl border border-slate-300/30 bg-slate-900/90 p-3 shadow-none">
        <ol className="grid gap-2 sm:grid-cols-3">
          {steps.map((step, index) => {
            const isCurrent = step.id === controller.currentStep;
            const isComplete = index < currentStepIndex;
            return (
              <li key={step.id} aria-current={isCurrent ? "step" : undefined} className={`flex items-center gap-3 rounded-xl px-3 py-2 ${isCurrent ? "bg-white text-slate-900" : "text-slate-200"}`}>
                <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-black ${isCurrent ? "bg-violet-600 text-white" : isComplete ? "bg-emerald-500 text-white" : "border border-slate-300/50"}`}>
                  {isComplete ? <CheckCircle2 className="h-4 w-4" aria-hidden="true" /> : index + 1}
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-bold">{step.label}</span>
                  <span className={`block text-xs ${isCurrent ? "text-slate-600" : "text-slate-300"}`}>{step.description}</span>
                </span>
              </li>
            );
          })}
        </ol>
      </nav>

      <div className="cmm-account-setup-content flex min-w-0 min-h-0 flex-1 flex-col">
        {controller.currentStep === "identity" ? (
          <div className="space-y-4">
            <AccountSetupSection title="Identité" description="Votre prénom et votre nom sont nécessaires pour finaliser la configuration." headingId="account-identity-title">
              <div className="grid gap-3 sm:grid-cols-2">
                <CmmField label="Prénom" required error={controller.shouldShowFieldError("firstName") ? controller.firstNameError : null} className="[&_.cmm-field-label]:!text-white [&_.cmm-field-required]:!text-slate-200 [&_.cmm-field-error]:!text-rose-100"><CmmInput value={controller.firstName} onChange={(event) => controller.handleFirstNameChange(event.target.value)} onBlur={() => controller.touchField("firstName")} autoComplete="given-name" placeholder="Marie" className="!min-h-14 w-full !border-slate-300/40 !bg-slate-800/80 !text-white placeholder:!text-slate-300/70" /></CmmField>
                <CmmField label="Nom" required error={controller.shouldShowFieldError("lastName") ? controller.lastNameError : null} className="[&_.cmm-field-label]:!text-white [&_.cmm-field-required]:!text-slate-200 [&_.cmm-field-error]:!text-rose-100"><CmmInput value={controller.lastName} onChange={(event) => controller.handleLastNameChange(event.target.value)} onBlur={() => controller.touchField("lastName")} autoComplete="family-name" placeholder="Curie" className="!min-h-14 w-full !border-slate-300/40 !bg-slate-800/80 !text-white placeholder:!text-slate-300/70" /></CmmField>
              </div>
              <fieldset className="mt-5">
                <legend className="text-sm font-bold text-white">Identité publique</legend>
                <p className="mt-1 text-sm text-slate-200/85">Choisissez ce qui s’affiche à côté de vos contributions.</p>
                <div role="radiogroup" aria-label="Mode du nom public" className="mt-3 grid gap-3 sm:grid-cols-2">
                  <AccountSetupChoiceCard selected={controller.displayNameMode === "full_name"} icon={UserRound} label="Nom complet" description="Prénom et nom Clerk" input={{ type: "radio", name: "account-setup-name-mode", value: "full_name", checked: controller.displayNameMode === "full_name", onChange: () => controller.handleDisplayNameModeChange("full_name") }} />
                  <AccountSetupChoiceCard selected={controller.displayNameMode === "pseudo"} icon={Eye} label="Pseudonyme" description={controller.publicHandle ? `Handle CleanMyMap : @${controller.publicHandle}` : "Votre handle CleanMyMap sera utilisé"} input={{ type: "radio", name: "account-setup-name-mode", value: "pseudo", checked: controller.displayNameMode === "pseudo", onChange: () => controller.handleDisplayNameModeChange("pseudo") }} />
                </div>
              </fieldset>
              <aside aria-live="polite" className="mt-4 rounded-2xl border border-violet-200/30 bg-violet-950/35 p-4">
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-violet-200">Identité publique prévisualisée</p>
                <p className="mt-1 text-xl font-black text-white">{controller.publicDisplayName}</p>
                <p className="mt-2 text-sm leading-6 text-slate-200">Le choix d’un pseudonyme masque votre nom dans cette présentation, mais ne rend pas automatiquement anonymes toutes vos contributions ou les données nécessaires aux équipes autorisées.</p>
              </aside>
            </AccountSetupSection>
            <AccountSetupSection title="Affichage du site" description="Un réglage facultatif de présentation, sans étape supplémentaire ni effet sur vos droits." headingId="account-display-mode-title" headingAside={<a href="/methodologie#modes-affichage" aria-label="Comprendre les modes d’affichage" className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-slate-300/60 text-slate-100 transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-200"><Info className="h-4 w-4" aria-hidden="true" /></a>}>
              <AccountSetupDisplayModeGrid selectedMode={controller.selectedDisplayMode} locale={controller.locale} onChange={controller.handleDisplayModeChange} ariaLabelledBy="account-display-mode-title" />
            </AccountSetupSection>
          </div>
        ) : null}

        {controller.currentStep === "usage" ? (
          <div className="space-y-4">
            <AccountSetupSection title="Utilisation de CleanMyMap" description="Choisissez votre parcours actif. Ce choix ne modifie jamais le rôle qui vous a été attribué par Clerk." headingId="account-profile-title">
              <AccountSetupProfileGrid options={controller.profileOptions} selectedProfile={controller.selectedProfile} locale={controller.locale} onChange={controller.handleProfileChange} onBlur={() => controller.touchField("profile")} error={controller.shouldShowFieldError("profile") ? controller.profileError : null} />
              <p className="mt-4 text-sm leading-6 text-slate-200">Les parcours bénévole, coordinateur, scientifique et entreprise sont ouverts selon leurs capacités métier. Les parcours élu, administrateur et IMU apparaissent uniquement lorsqu’ils sont réellement attribués à votre compte Clerk.</p>
              <Link href="/compte/evolution" prefetch={false} className="mt-3 inline-flex min-h-11 items-center font-bold text-slate-200 underline decoration-slate-300/70 underline-offset-4 transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-200">Demander officiellement une évolution du compte</Link>
            </AccountSetupSection>
          </div>
        ) : null}

        {controller.currentStep === "location" ? (
          <AccountSetupSection title="Localisation" description="Indiquez une ville de résidence ou de travail si cela vous aide. Vous pouvez aussi ne renseigner aucune zone. Aucune adresse précise n’est demandée." headingId="account-location-title">
            <div className="mb-4 flex items-start gap-3 rounded-2xl border border-sky-200/25 bg-sky-950/25 p-4 text-sm leading-6 text-slate-200"><MapPin className="mt-0.5 h-5 w-5 shrink-0 text-sky-200" aria-hidden="true" /><p>Ces choix servent à contextualiser les fonctionnalités territoriales. Ils restent facultatifs et peuvent être retirés plus tard.</p></div>
            <AccountSetupLocationFields residence={controller.residence} work={controller.work} residenceEnabled={controller.residenceEnabled} workEnabled={controller.workEnabled} noneSelected={controller.noneSelected} setResidence={controller.updateResidence} setWork={controller.updateWork} setResidenceEnabled={controller.updateResidenceEnabled} setWorkEnabled={controller.updateWorkEnabled} setNoneSelected={controller.updateNoneSelected} error={controller.shouldShowFieldError("location") ? controller.locationError : null} />
          </AccountSetupSection>
        ) : null}
      </div>

      {controller.error ? <div className="mt-4"><ErrorMessage kind={controller.error.kind} title="Les réglages n’ont pas pu être enregistrés" message={controller.error.message} actions={<CmmButton type="button" tone="secondary" size="sm" onClick={() => void controller.handleSubmit()}>Réessayer</CmmButton>} /></div> : null}
      <footer className="cmm-account-setup-actions flex flex-col rounded-2xl border border-slate-300/30 bg-slate-900/90 shadow-none sm:flex-row sm:items-center sm:justify-between">
        <div className="max-w-xl space-y-2">
          <h2 className="text-lg font-bold text-white">{isLastStep ? "Finaliser la configuration" : "Poursuivre la configuration"}</h2>
          <p className="text-sm text-slate-200/85">Vos saisies restent présentes lorsque vous changez d’étape.</p>
          <Link href="/compte/evolution" prefetch={false} className="inline-flex min-h-11 items-center text-sm font-bold text-slate-200 underline decoration-slate-300/70 underline-offset-4 transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-200">Vous exercez un mandat public&nbsp;?</Link>
        </div>
        <div className="flex w-full flex-col-reverse gap-2 sm:w-auto sm:flex-row sm:items-center">
          <CmmButton type="button" tone="secondary" size="lg" disabled={controller.isSaving} onClick={() => void controller.handleDefer()}>{controller.getDeferralLabel()}</CmmButton>
          {currentStepIndex > 0 ? <CmmButton type="button" tone="secondary" size="lg" disabled={controller.isSaving} onClick={controller.handlePrevious}><ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" />Précédent</CmmButton> : null}
          <CmmButton type="submit" tone="primary" size="lg" disabled={controller.isSaving} loading={controller.isSaving}>{controller.isSaving ? "Enregistrement…" : isLastStep ? "Enregistrer et continuer" : <><span>Suivant</span><ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" /></>}</CmmButton>
        </div>
      </footer>
    </form>
  );
}
