"use client";

import { Sparkles } from "lucide-react";
import { CmmCard } from "@/components/ui/cmm-card";
import { SectionLabel } from "./ui";
import type { BaseSectionProps } from "./section-contract";
import { PlannedActionLocationSection } from "./planned-action-location-section";
import { PlannedActionPresentationSection } from "./planned-action-presentation-section";
import { ScheduleFields } from "./planned-action-schedule-fields";
import { PlannedActionVolunteerSection } from "./planned-action-volunteer-section";

export function PlannedActionSection({
  form,
  updateField,
  hasAttemptedSubmit,
  validationIssueFields,
  updateFields,
}: BaseSectionProps) {
  return (
    <CmmCard tone="emerald" variant="glass" size="lg">
      <div className="space-y-7">
        <SectionLabel icon={Sparkles} title="Action prévue" subtitle="Le contenu nécessaire avant le terrain, sans les champs de récolte réelle." />
        <PlannedActionPresentationSection form={form} updateField={updateField} hasAttemptedSubmit={hasAttemptedSubmit} validationIssueFields={validationIssueFields} />
        <ScheduleFields form={form} updateField={updateField} hasAttemptedSubmit={hasAttemptedSubmit} validationIssueFields={validationIssueFields} />
        <PlannedActionLocationSection
          form={form}
          updateField={updateField}
          updateFields={updateFields}
          hasAttemptedSubmit={hasAttemptedSubmit}
          validationIssueFields={validationIssueFields}
        />
        <PlannedActionVolunteerSection form={form} updateField={updateField} validationIssueFields={validationIssueFields} />
      </div>
    </CmmCard>
  );
}
