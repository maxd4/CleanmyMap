import type { FormEvent } from "react";
import { AlertTriangle } from "lucide-react";
import { CmmCard } from "@/components/ui/cmm-card";
import { cn } from "@/lib/utils";
import { getBlockClasses } from "@/lib/ui/block-accents";
import { IdentityAndSharingSection } from "./identity-and-sharing-section";
import { PlannedActionSection } from "./planned-action-section";
import { PreparationAndSafetySection } from "./preparation-and-safety-section";
import { ActionBeforeSectionedContent } from "./action-before-sectioned-content";
import type { ActionCreationSectionId } from "@/lib/actions/action-creation-sections";
import type { FormState } from "../model";
import type { BeforeActionFieldUpdater } from "./model";
import type { ActiveRole } from "@/lib/domain-language";
import type { CountryCode } from "@/lib/user-location-preference";
import type { ActionManualInvitationStatusRecord } from "@/lib/actions/participation/registration-records";
import { ActionBeforePersistenceStatus, type BeforeActionPersistenceStatus } from "./persistence-status";
import { ActionSearchCountryField } from "./action-search-country-field";
import { ActionCreationActionBar, type ActionCreationActionBarConfig } from "../../action-creation-action-bar";

export function ActionBeforeFormView({
  activeSection,
  onEditDefinition,
  form,
  submissionState,
  validationIssues,
  validationIssueFields,
  errorMessage,
  countryCode,
  onCountryCodeChange,
  userMetadata,
  updateField,
  updateFields,
  showGroupJoinHelp,
  onToggleGroupJoinHelp,
  invitationStatuses,
  handleSubmit,
  guidedReadiness,
  persistenceStatus,
  actionId,
  isExistingAction = false,
  onFormalitiesReadiness,
  onRetryDraftLoad,
  actionBar,
}: {
  activeSection: "all" | ActionCreationSectionId;
  onEditDefinition?: (field?: string) => void;
  form: FormState;
  submissionState: "idle" | "pending" | "success" | "error";
  validationIssues: string[];
  validationIssueFields: readonly string[];
  errorMessage: string | null;
  countryCode?: CountryCode;
  onCountryCodeChange: (countryCode: CountryCode) => void;
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
  persistenceStatus: BeforeActionPersistenceStatus;
  actionId: string | null;
  isExistingAction?: boolean;
  onFormalitiesReadiness?: (readiness: { known: boolean; blocked: boolean }) => void;
  onRetryDraftLoad?: () => void;
  actionBar: ActionCreationActionBarConfig;
}) {
  const actClasses = getBlockClasses("act");
  const sectioned = activeSection !== "all";

  return (
    <div className={cn("relative overflow-hidden px-4 py-6 md:px-6 lg:px-8", actClasses.gradientDeep)}>
      <div className="pointer-events-none absolute inset-0"><div className="absolute -left-24 top-0 h-72 w-72 rounded-full bg-emerald-200/50 blur-[110px]" /><div className="absolute right-0 top-8 h-80 w-80 rounded-full bg-emerald-100/55 blur-[120px]" /></div>
      <div className="cmm-page-width relative space-y-6">
        <ActionBeforePersistenceStatus status={persistenceStatus} onRetry={onRetryDraftLoad} />
        {sectioned ? null : <CmmCard tone="emerald" variant="glass" size="lg"><div className="space-y-3"><h2 className="text-3xl font-black tracking-tight text-emerald-950">Préparer une action future</h2></div></CmmCard>}
        <form onSubmit={(event) => { void /* fire-and-forget -- UI event boundary delegates to the existing stateful action. */ handleSubmit(event); }} className="space-y-6">
          <ActionSearchCountryField countryCode={countryCode} onChange={onCountryCodeChange} />
          {sectioned ? (
            <ActionBeforeSectionedContent
              activeSection={activeSection}
              onEditDefinition={onEditDefinition}
              form={form}
              updateField={updateField}
              updateFields={updateFields}
              countryCode={countryCode}
              userMetadata={userMetadata}
              showGroupJoinHelp={showGroupJoinHelp}
              onToggleGroupJoinHelp={onToggleGroupJoinHelp}
              invitationStatuses={invitationStatuses}
              validationIssues={validationIssues}
              validationIssueFields={validationIssueFields}
              errorMessage={errorMessage}
              guidedReadiness={guidedReadiness}
              actionId={actionId}
              isExistingAction={isExistingAction}
              onFormalitiesReadiness={onFormalitiesReadiness}
            />
          ) : (
            <>
              <div className="space-y-6">
                <IdentityAndSharingSection form={form} updateField={updateField} updateFields={updateFields} userMetadata={userMetadata} showGroupJoinHelp={showGroupJoinHelp} onToggleGroupJoinHelp={onToggleGroupJoinHelp} hasAttemptedSubmit={validationIssueFields.length > 0} validationIssueFields={validationIssueFields} actionId={actionId} isExistingAction={isExistingAction} />
                <PlannedActionSection form={form} updateField={updateField} updateFields={updateFields} countryCode={countryCode} hasAttemptedSubmit={validationIssueFields.length > 0} validationIssueFields={validationIssueFields} />
                <PreparationAndSafetySection form={form} updateField={updateField} />
              </div>
              {validationIssues.length > 0 || errorMessage ? <div className="rounded-[1.5rem] border border-rose-200/70 bg-[#FFF7F8] px-4 py-3 text-sm leading-6 text-rose-950"><div className="flex items-center gap-2 font-semibold"><AlertTriangle size={16} className="text-rose-500" />La préparation n&apos;a pas encore pu être enregistrée</div>{validationIssues.length > 0 ? <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-rose-800/80">{validationIssues.map((issue) => <li key={issue}>{issue}</li>)}</ul> : null}{errorMessage && validationIssues.length === 0 ? <p className="mt-2 text-xs text-rose-800/80">{errorMessage}</p> : null}</div> : null}
            </>
          )}
          <ActionCreationActionBar config={actionBar} submissionPending={submissionState === "pending"} />
        </form>
      </div>
    </div>
  );
}
