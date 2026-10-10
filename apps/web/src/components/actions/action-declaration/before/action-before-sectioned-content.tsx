import { ActionBeforeVerificationSection } from "./action-before-verification-section";
import { EssentialActionSection } from "./essential-action-section";
import { TerrainActionSection } from "./terrain-action-section";
import { TeamLogisticsSection } from "./sections";
import type { ActionCreationSectionId } from "@/lib/actions/action-creation-sections";
import type { FormState } from "../model";
import type { ActiveRole } from "@/lib/domain-language";
import type { BeforeActionFieldUpdater } from "./model";
import type { ActionManualInvitationStatusRecord } from "@/lib/actions/participation/registration-records";

type SectionedContentProps = {
  activeSection: ActionCreationSectionId;
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
  invitationStatuses: ActionManualInvitationStatusRecord[];
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
  invitationStatuses,
  validationIssues,
  validationIssueFields,
  submissionState,
  errorMessage,
  guidedReadiness,
  isAuthenticated,
  signInHref,
  signUpHref,
}: SectionedContentProps) {
  if (activeSection === "terrain") {
    return (
      <TerrainActionSection
        form={form}
        updateField={updateField}
        updateFields={updateFields}
        hasAttemptedSubmit={validationIssueFields.length > 0}
        validationIssueFields={validationIssueFields}
      />
    );
  }

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
      </>
    );
  }

  if (activeSection === "equipe") {
    return <TeamLogisticsSection form={form} updateField={updateField} updateFields={updateFields} userMetadata={userMetadata} showGroupJoinHelp={showGroupJoinHelp} onToggleGroupJoinHelp={onToggleGroupJoinHelp} invitationStatuses={invitationStatuses} validationIssueFields={validationIssueFields} />;
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
