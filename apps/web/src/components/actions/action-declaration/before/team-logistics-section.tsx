"use client";

import { UsersRound } from "lucide-react";
import type { ActiveRole } from "@/lib/domain-language";
import type { ActionManualInvitationStatusRecord } from "@/lib/actions/participation/registration-records";
import { CmmCard } from "@/components/ui/cmm-card";
import type { FormState } from "../model";
import type { BeforeActionFieldUpdater } from "./model";
import { IdentityAndSharingSection, VolunteerRegistrationPanel } from "./identity-and-sharing-section";
import { PreparationPlanningFields } from "./preparation-planning-fields";
import { PreparationAndSafetySection } from "./preparation-and-safety-section";
import { SectionLabel } from "./ui";

type TeamLogisticsSectionProps = {
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
  validationIssueFields: readonly string[];
};

export function TeamLogisticsSection({
  form,
  updateField,
  updateFields,
  userMetadata,
  showGroupJoinHelp,
  onToggleGroupJoinHelp,
  invitationStatuses,
  validationIssueFields,
}: TeamLogisticsSectionProps) {
  return (
    <CmmCard tone="emerald" variant="glass" size="lg">
      <div className="space-y-6">
        <SectionLabel
          icon={UsersRound}
          title="Équipe et logistique"
          subtitle="Organisateurs, inscriptions et préparation opérationnelle réunis au même endroit."
        />

        <section aria-labelledby="before-organizers-group" className="space-y-3 border-b border-emerald-100 pb-5">
          <h3 id="before-organizers-group" className="text-base font-black text-emerald-950">Organisateurs</h3>
          <p className="cmm-text-body cmm-text-primary">Le créateur reste en lecture seule ; la structure et les coorganisateurs utilisent les catalogues et permissions existants.</p>
          <IdentityAndSharingSection
            form={form}
            updateField={updateField}
            updateFields={updateFields}
            userMetadata={userMetadata}
            showGroupJoinHelp={showGroupJoinHelp}
            onToggleGroupJoinHelp={onToggleGroupJoinHelp}
            showVolunteerRegistration={false}
            embedded
            hasAttemptedSubmit={validationIssueFields.length > 0}
            validationIssueFields={validationIssueFields}
          />
        </section>

        <section aria-labelledby="before-team-registration-group" className="border-b border-emerald-100 pb-5">
          <VolunteerRegistrationPanel
            form={form}
            updateField={updateField}
            userMetadata={userMetadata}
            showGroupJoinHelp={showGroupJoinHelp}
            onToggleGroupJoinHelp={onToggleGroupJoinHelp}
            invitationStatuses={invitationStatuses}
            embedded
          />
        </section>

        <section aria-labelledby="before-team-planning-group" className="border-b border-emerald-100 pb-5">
          <PreparationPlanningFields
            form={form}
            updateField={updateField}
            validationIssueFields={validationIssueFields}
            embedded
          />
        </section>

        <PreparationAndSafetySection form={form} updateField={updateField} embedded />
      </div>
    </CmmCard>
  );
}
