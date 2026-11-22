import { ActionBeforeVerificationSection } from "./action-before-verification-section";
import { EssentialActionSection } from "./essential-action-section";
import { TerrainActionSection } from "./terrain-action-section";
import { TeamLogisticsSection } from "./team-logistics-section";
import type { ActionCreationSectionId } from "@/lib/actions/action-creation-sections";
import type { FormState } from "../model";
import type { ActiveRole } from "@/lib/domain-language";
import type { BeforeActionFieldUpdater } from "./model";
import type { ActionManualInvitationStatusRecord } from "@/lib/actions/participation/registration-records";
import type { CountryCode } from "@/lib/user-location-preference";

type SectionedContentProps = {
  activeSection: ActionCreationSectionId;
  onEditDefinition?: (field?: string) => void;
  form: FormState;
  updateField: BeforeActionFieldUpdater;
  updateFields: (updates: Partial<FormState>) => void;
  countryCode?: CountryCode;
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
  errorMessage: string | null;
  guidedReadiness: "unknown" | "ready" | "blocked";
  actionId?: string | null;
  isExistingAction?: boolean;
  onFormalitiesReadiness?: (readiness: { known: boolean; blocked: boolean }) => void;
};

export function ActionBeforeSectionedContent({
  activeSection,
  onEditDefinition,
  form,
  updateField,
  updateFields,
  countryCode,
  userMetadata,
  showGroupJoinHelp,
  onToggleGroupJoinHelp,
  invitationStatuses,
  validationIssues,
  validationIssueFields,
  errorMessage,
  guidedReadiness,
  actionId,
  isExistingAction = false,
  onFormalitiesReadiness,
}: SectionedContentProps) {
  if (activeSection === "definir") {
    return (
      <EssentialActionSection
        form={form}
        updateField={updateField}
        updateFields={updateFields}
        countryCode={countryCode}
        hasAttemptedSubmit={validationIssueFields.length > 0}
        validationIssueFields={validationIssueFields}
        userMetadata={userMetadata}
        showGroupJoinHelp={showGroupJoinHelp}
        onToggleGroupJoinHelp={onToggleGroupJoinHelp}
        isExistingAction={isExistingAction}
      />
    );
  }

  return (
    <div className="space-y-5">
      <section aria-labelledby="action-preparation-terrain-title" className="space-y-3">
        <h3 id="action-preparation-terrain-title" className="text-xl font-black text-emerald-950">Terrain</h3>
        <TerrainActionSection
          form={form}
          updateField={updateField}
          updateFields={updateFields}
          countryCode={countryCode}
          hasAttemptedSubmit={validationIssueFields.length > 0}
          validationIssueFields={validationIssueFields}
          onEditDefinition={onEditDefinition}
        />
      </section>
      <section aria-labelledby="action-preparation-team-title" className="space-y-3">
        <h3 id="action-preparation-team-title" className="text-xl font-black text-emerald-950">Équipe et logistique</h3>
        <TeamLogisticsSection form={form} updateField={updateField} updateFields={updateFields} userMetadata={userMetadata} showGroupJoinHelp={showGroupJoinHelp} onToggleGroupJoinHelp={onToggleGroupJoinHelp} invitationStatuses={invitationStatuses} validationIssueFields={validationIssueFields} actionId={actionId} isExistingAction={isExistingAction} />
      </section>
      <section aria-labelledby="action-preparation-formalities-title" className="space-y-3">
        <h3 id="action-preparation-formalities-title" className="text-xl font-black text-emerald-950">Vérification et publication</h3>
        <ActionBeforeVerificationSection
          form={form}
          validationIssues={validationIssues}
          validationIssueFields={validationIssueFields}
          errorMessage={errorMessage}
          guidedReadiness={guidedReadiness}
          actionId={actionId}
          updateField={updateField}
          onEditDefinition={onEditDefinition}
          onFormalitiesReadiness={onFormalitiesReadiness}
        />
      </section>
    </div>
  );
}
