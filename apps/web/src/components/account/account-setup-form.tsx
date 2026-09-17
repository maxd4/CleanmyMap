"use client";

import { Eye, Info, UserRound } from "lucide-react";
import Link from "next/link";
import {
  AccountSetupDisplayModeGrid,
  AccountSetupLocationFields,
  AccountSetupProfileGrid,
} from "@/components/account/account-setup-sections";
import { AccountSetupSection } from "@/components/account/account-setup-primitives";
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

  return (
    <form onSubmit={(event) => void controller.handleSubmit(event)} className="cmm-account-setup-form flex min-h-0 flex-col text-white">
      <header className="cmm-account-setup-header flex items-start gap-4">
        <span className="cmm-account-setup-header-icon flex shrink-0 items-center justify-center rounded-2xl border border-slate-300/40 bg-slate-700/25 text-slate-100">
          <UserRound className="cmm-account-setup-header-glyph" aria-hidden="true" />
        </span>
        <div>
          <h1 className="cmm-account-setup-title font-black tracking-tight text-slate-900">Configurez votre profil</h1>
          <p className="cmm-text-body cmm-text-inverse mt-2 max-w-3xl">Choisissez votre profil, vos lieux principaux et votre mode d’affichage. Ces préférences restent modifiables dans les paramètres de votre compte.</p>
        </div>
      </header>

      <div className="cmm-account-setup-content flex min-w-0 min-h-0 flex-1 flex-col">
        <AccountSetupSection title="Identité" description="Renseignez l’identité affichée dans CleanMyMap." headingId="account-identity-title">
          <div className="grid gap-3 sm:grid-cols-2">
            <CmmField label="Prénom" required error={controller.shouldShowFieldError("firstName") ? controller.firstNameError : null} className="[&_.cmm-field-label]:!text-white [&_.cmm-field-required]:!text-slate-200 [&_.cmm-field-error]:!text-rose-100"><CmmInput value={controller.firstName} onChange={(event) => controller.handleFirstNameChange(event.target.value)} onBlur={() => controller.touchField("firstName")} autoComplete="given-name" placeholder="Marie" className="!min-h-14 w-full !border-slate-300/40 !bg-slate-800/80 !text-white placeholder:!text-slate-300/70" /></CmmField>
            <CmmField label="Nom" required error={controller.shouldShowFieldError("lastName") ? controller.lastNameError : null} className="[&_.cmm-field-label]:!text-white [&_.cmm-field-required]:!text-slate-200 [&_.cmm-field-error]:!text-rose-100"><CmmInput value={controller.lastName} onChange={(event) => controller.handleLastNameChange(event.target.value)} onBlur={() => controller.touchField("lastName")} autoComplete="family-name" placeholder="Curie" className="!min-h-14 w-full !border-slate-300/40 !bg-slate-800/80 !text-white placeholder:!text-slate-300/70" /></CmmField>
          </div>
        </AccountSetupSection>

        <AccountSetupSection title="Profil / parcours" description="Ce choix définit votre parcours, jamais vos permissions." headingId="account-profile-title">
          <AccountSetupProfileGrid options={controller.profileOptions} selectedProfile={controller.selectedProfile} locale={controller.locale} onChange={controller.handleProfileChange} onBlur={() => controller.touchField("profile")} error={controller.shouldShowFieldError("profile") ? controller.profileError : null} />
        </AccountSetupSection>

        <div className="cmm-account-setup-location-mode-grid grid items-start">
          <AccountSetupSection title="Vos zones principales" description="Indiquez une ville ou un arrondissement pour chaque zone. Aucune adresse précise n’est demandée." headingId="account-location-title">
            <AccountSetupLocationFields residence={controller.residence} work={controller.work} residenceEnabled={controller.residenceEnabled} workEnabled={controller.workEnabled} noneSelected={controller.noneSelected} setResidence={controller.updateResidence} setWork={controller.updateWork} setResidenceEnabled={controller.updateResidenceEnabled} setWorkEnabled={controller.updateWorkEnabled} setNoneSelected={controller.updateNoneSelected} error={controller.shouldShowFieldError("location") ? controller.locationError : null} />
          </AccountSetupSection>

          <AccountSetupSection title="Mode d’affichage" description="Le mode change uniquement la présentation : fonctionnalités et données restent identiques." headingId="account-display-mode-title" headingAside={<a href="/methodologie#modes-affichage" aria-label="Comprendre les modes d’affichage" className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-slate-300/60 text-slate-100 transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-200"><Info className="h-4 w-4" aria-hidden="true" /></a>}>
            <AccountSetupDisplayModeGrid selectedMode={controller.selectedDisplayMode} locale={controller.locale} onChange={controller.handleDisplayModeChange} ariaLabelledBy="account-display-mode-title" />
          </AccountSetupSection>
        </div>
      </div>

      {controller.error ? <div className="mt-4"><ErrorMessage kind={controller.error.kind} title="Les réglages n’ont pas pu être enregistrés" message={controller.error.message} actions={<CmmButton type="button" tone="secondary" size="sm" onClick={() => void controller.handleSubmit()}>Réessayer</CmmButton>} /></div> : null}
      <footer className="cmm-account-setup-actions flex flex-col rounded-2xl border border-slate-300/30 bg-slate-900/90 shadow-none sm:flex-row sm:items-center sm:justify-between">
        <div className="max-w-xl space-y-2">
          <h2 className="text-lg font-bold text-white">Actions de validation</h2>
          <p className="text-sm text-slate-200/85">Vous pourrez modifier ces préférences à tout moment dans les paramètres de votre compte.</p>
          <Link href="/compte/evolution" prefetch={false} className="inline-flex min-h-11 items-center text-sm font-bold text-slate-200 underline decoration-slate-300/70 underline-offset-4 transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-200">Vous représentez une collectivité&nbsp;?</Link>
        </div>
        <div className="flex w-full flex-col-reverse gap-2 sm:w-auto sm:flex-row sm:items-center">
          <CmmButton type="button" tone="secondary" size="lg" disabled={controller.isSaving} onClick={() => void controller.handleDefer()}>{controller.getDeferralLabel()}</CmmButton>
          <CmmButton type="submit" tone="primary" size="lg" disabled={controller.isSaving} loading={controller.isSaving}>{controller.isSaving ? "Enregistrement…" : "Valider et continuer"}</CmmButton>
        </div>
      </footer>
    </form>
  );
}
