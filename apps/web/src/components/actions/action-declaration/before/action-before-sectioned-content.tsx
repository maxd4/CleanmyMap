import { ActionBeforeVerificationSection } from "./action-before-verification-section";
import { EssentialActionSection } from "./essential-action-section";
import { IdentityAndSharingSection } from "./identity-and-sharing-section";
import { PreparationAndSafetySection } from "./preparation-and-safety-section";
import { VolunteerRegistrationPanel } from "./sections";
import type { ActionCreationSectionId } from "@/lib/actions/action-creation-sections";
import type { FormState } from "../model";
import type { ActiveRole } from "@/lib/domain-language";
import type { BeforeActionFieldUpdater } from "./model";

type SectionedContentProps = {
  activeSection: Exclude<ActionCreationSectionId, "terrain">;
  form: FormState;
  updateField: BeforeActionFieldUpdater;
  updateFields: (updates: Partial<FormState>) => void;
  userMetadata: {
    userId: string;
    activeRole?: ActiveRole;
    handle?: string;
    username?: string;
    displayName?: string;
  };
  showGroupJoinHelp: boolean;
  onToggleGroupJoinHelp: () => void;
  validationIssues: string[];
  validationIssueFields: readonly string[];
  submissionState: "idle" | "pending" | "success" | "error";
  errorMessage: string | null;
  guidedReadiness: "unknown" | "ready" | "blocked";
  isAuthenticated: boolean;
  signInHref?: string;
  signUpHref?: string;
};

export function ActionBeforeSectionedContent({
  activeSection,
  form,
  updateField,
  updateFields,
  userMetadata,
  showGroupJoinHelp,
  onToggleGroupJoinHelp,
  validationIssues,
  validationIssueFields,
  submissionState,
  errorMessage,
  guidedReadiness,
  isAuthenticated,
  signInHref,
  signUpHref,
}: SectionedContentProps) {
  if (activeSection === "essentiel") {
    return (
      <>
        <EssentialActionSection
          form={form}
          updateField={updateField}
          updateFields={updateFields}
          hasAttemptedSubmit={validationIssueFields.length > 0}
          validationIssueFields={validationIssueFields}
        />
        <IdentityAndSharingSection
          form={form}
          updateField={updateField}
          updateFields={updateFields}
          userMetadata={userMetadata}
          showGroupJoinHelp={showGroupJoinHelp}
          onToggleGroupJoinHelp={onToggleGroupJoinHelp}
          showVolunteerRegistration={false}
          hasAttemptedSubmit={validationIssueFields.length > 0}
          validationIssueFields={validationIssueFields}
        />
      </>
    );
  }

  if (activeSection === "equipe") {
    return (
      <>
        <VolunteerRegistrationPanel
          form={form}
          updateField={updateField}
          userMetadata={userMetadata}
          showGroupJoinHelp={showGroupJoinHelp}
          onToggleGroupJoinHelp={onToggleGroupJoinHelp}
        />
        <PreparationAndSafetySection form={form} updateField={updateField} />
      </>
    );
  }

  return (
    <ActionBeforeVerificationSection
      form={form}
      submissionState={submissionState}
      validationIssues={validationIssues}
      errorMessage={errorMessage}
      guidedReadiness={guidedReadiness}
      isAuthenticated={isAuthenticated}
      signInHref={signInHref}
      signUpHref={signUpHref}
    />
  );
}
