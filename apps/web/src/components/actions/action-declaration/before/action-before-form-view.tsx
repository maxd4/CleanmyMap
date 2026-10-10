import type { FormEvent } from "react";
import { AlertTriangle, ArrowRight, Loader2 } from "lucide-react";
import { CmmButton } from "@/components/ui/cmm-button";
import { CmmCard } from "@/components/ui/cmm-card";
import { cn } from "@/lib/utils";
import { getBlockClasses } from "@/lib/ui/block-accents";
import { IdentityAndSharingSection, PlannedActionSection, PreparationAndSafetySection } from "./sections";
import { ActionBeforeSectionedContent } from "./action-before-sectioned-content";
import type { ActionCreationSectionId } from "@/lib/actions/action-creation-sections";
import type { FormState } from "../model";
import type { BeforeActionFieldUpdater } from "./model";
import type { ActiveRole } from "@/lib/domain-language";
import type { ActionManualInvitationStatusRecord } from "@/lib/actions/participation/registration-records";
import { ActionBeforePersistenceStatus, type BeforeActionPersistenceStatus } from "./persistence-status";

export function ActionBeforeFormView({
  activeSection,
  form,
  submissionState,
  validationIssues,
  validationIssueFields,
  errorMessage,
  userMetadata,
  updateField,
  updateFields,
  showGroupJoinHelp,
  onToggleGroupJoinHelp,
  invitationStatuses,
  handleSubmit,
  guidedReadiness,
  isAuthenticated,
  signInHref,
  signUpHref,
  persistenceStatus,
}: {
  activeSection: "all" | ActionCreationSectionId;
  form: FormState;
  submissionState: "idle" | "pending" | "success" | "error";
  validationIssues: string[];
  validationIssueFields: readonly string[];
  errorMessage: string | null;
  userMetadata: {
    userId: string;
    activeRole?: ActiveRole;
    handle?: string;
    username?: string;
    displayName?: string;
  };
  updateField: BeforeActionFieldUpdater;
  updateFields: (updates: Partial<FormState>) => void;
  showGroupJoinHelp: boolean;
  onToggleGroupJoinHelp: () => void;
  invitationStatuses: ActionManualInvitationStatusRecord[];
  handleSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  guidedReadiness: "unknown" | "ready" | "blocked";
  isAuthenticated: boolean;
  signInHref?: string;
  signUpHref?: string;
  persistenceStatus: BeforeActionPersistenceStatus;
}) {
  const actClasses = getBlockClasses("act");
  const sectioned = activeSection !== "all";

  return (
    <div className={cn("relative overflow-hidden px-4 py-6 md:px-6 lg:px-8", actClasses.gradientDeep)}>
      <div className="pointer-events-none absolute inset-0"><div className="absolute -left-24 top-0 h-72 w-72 rounded-full bg-emerald-200/50 blur-[110px]" /><div className="absolute right-0 top-8 h-80 w-80 rounded-full bg-emerald-100/55 blur-[120px]" /></div>
      <div className="cmm-page-width relative space-y-6">
        <ActionBeforePersistenceStatus status={persistenceStatus} />
        {sectioned ? null : <CmmCard tone="emerald" variant="glass" size="lg"><div className="space-y-3"><h2 className="text-3xl font-black tracking-tight text-emerald-950">Préparer une action future</h2><p className="cmm-text-body cmm-text-primary max-w-3xl">Renseignez les informations utiles avant le terrain. Les champs de récolte, de bilan final et de validation restent réservés au formulaire complet.</p></div></CmmCard>}
        <form onSubmit={(event) => { void handleSubmit(event); }} className="space-y-6">
          {sectioned ? (
            <ActionBeforeSectionedContent
              activeSection={activeSection}
              form={form}
              updateField={updateField}
              updateFields={updateFields}
              userMetadata={userMetadata}
              showGroupJoinHelp={showGroupJoinHelp}
              onToggleGroupJoinHelp={onToggleGroupJoinHelp}
              invitationStatuses={invitationStatuses}
              validationIssues={validationIssues}
              validationIssueFields={validationIssueFields}
              submissionState={submissionState}
              errorMessage={errorMessage}
              guidedReadiness={guidedReadiness}
              isAuthenticated={isAuthenticated}
              signInHref={signInHref}
              signUpHref={signUpHref}
            />
          ) : (
            <>
              <div className="space-y-6">
                <IdentityAndSharingSection form={form} updateField={updateField} updateFields={updateFields} userMetadata={userMetadata} showGroupJoinHelp={showGroupJoinHelp} onToggleGroupJoinHelp={onToggleGroupJoinHelp} hasAttemptedSubmit={validationIssueFields.length > 0} validationIssueFields={validationIssueFields} />
                <PlannedActionSection form={form} updateField={updateField} updateFields={updateFields} hasAttemptedSubmit={validationIssueFields.length > 0} validationIssueFields={validationIssueFields} />
                <PreparationAndSafetySection form={form} updateField={updateField} />
              </div>
              {validationIssues.length > 0 || errorMessage ? <div className="rounded-[1.5rem] border border-rose-200/70 bg-[#FFF7F8] px-4 py-3 text-sm leading-6 text-rose-950"><div className="flex items-center gap-2 font-semibold"><AlertTriangle size={16} className="text-rose-500" />La préparation n&apos;a pas encore pu être enregistrée</div>{validationIssues.length > 0 ? <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-rose-800/80">{validationIssues.map((issue) => <li key={issue}>{issue}</li>)}</ul> : null}{errorMessage && validationIssues.length === 0 ? <p className="mt-2 text-xs text-rose-800/80">{errorMessage}</p> : null}{!isAuthenticated ? <div className="mt-3 flex flex-wrap gap-2">{signInHref ? <CmmButton href={signInHref} tone="primary" variant="pill" size="sm">Se connecter et reprendre</CmmButton> : null}{signUpHref ? <CmmButton href={signUpHref} tone="secondary" variant="pill" size="sm">Créer un compte</CmmButton> : null}</div> : null}</div> : null}
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-[1.5rem] border border-emerald-200/70 bg-white/90 px-4 py-3 shadow-sm"><div className="space-y-1"><p className="text-sm font-semibold text-emerald-950">Enregistrer la préparation</p><p className="text-xs leading-5 text-emerald-900/66">L&apos;enregistrement reste privé ; la publication sera déclenchée explicitement après vérification.</p></div><div className="flex flex-wrap gap-2"><CmmButton tone="primary" variant="pill" size="md" type="submit" disabled={submissionState === "pending"}>{submissionState === "pending" ? <><Loader2 size={14} className="animate-spin" />Enregistrement...</> : <>Enregistrer la préparation<ArrowRight size={14} /></>}</CmmButton></div></div>
            </>
          )}
        </form>
      </div>
    </div>
  );
}
