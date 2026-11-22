"use client";

import { ClipboardList } from "lucide-react";
import { CmmCard } from "@/components/ui/cmm-card";
import { CmmField, CmmInput, CmmSelect, CmmTextarea } from "@/components/ui/cmm-field";
import type { FormState } from "../model";
import { PLANNED_OBJECTIVE_OPTIONS } from "./model";
import { MeetingLocationFields } from "./planned-action-location-section";
import { ScheduleFields } from "./planned-action-schedule-fields";
import { SectionLabel } from "./ui";
import { hasValidationIssue, RequiredMark, type BaseSectionProps } from "./section-contract";
import { VolunteerForecast } from "./planned-action-volunteer-section";
import { getVolunteerParticipationDisclosureDetail } from "@/lib/actions/volunteer-participation";
import { IdentityAndSharingSection } from "./identity-and-sharing-section";
import { InterventionModeFields } from "./intervention-mode-fields";
import type { ActiveRole } from "@/lib/domain-language";

type EssentialActionSectionProps = Pick<
  BaseSectionProps,
  "form" | "updateField" | "updateFields" | "countryCode" | "hasAttemptedSubmit" | "validationIssueFields"
> & {
  userMetadata: { userId: string; activeRole?: ActiveRole; handle?: string; username?: string; displayName?: string };
  showGroupJoinHelp: boolean;
  onToggleGroupJoinHelp: () => void;
  isExistingAction?: boolean;
};

export function EssentialActionSection({
  form,
  updateField,
  updateFields,
  countryCode,
  hasAttemptedSubmit = false,
  validationIssueFields = [],
  userMetadata,
  showGroupJoinHelp,
  onToggleGroupJoinHelp,
  isExistingAction = false,
}: EssentialActionSectionProps) {
  const missingTitle = Boolean(hasAttemptedSubmit && hasValidationIssue(validationIssueFields, "actionTitle"));
  const splitDetail = getVolunteerParticipationDisclosureDetail(form);
  return (
    <CmmCard tone="emerald" variant="glass" size="lg">
      <div className="space-y-6">
        <SectionLabel
          icon={ClipboardList}
          title="Les informations essentielles"
        />

        <section aria-labelledby="before-essential-identity" className="space-y-3">
          <h4 id="before-essential-identity" className="text-base font-black text-emerald-950">Identité de l’action</h4>
          <div className="grid gap-4">
            <CmmField
              id="before-action-title"
              label={<span>Titre de l’action<RequiredMark /></span>}
              error={missingTitle ? "Indiquez un titre avant d’enregistrer." : undefined}
            >
              <CmmInput
                type="text"
                value={form.actionTitle}
                onChange={(event) => updateField("actionTitle", event.target.value)}
                placeholder="Ex. Nettoyage des berges"
              />
            </CmmField>
            <CmmField id="before-action-short-description" label="Description courte" hint="Quelques mots.">
              <CmmTextarea
                value={form.shortDescription}
                onChange={(event) => updateField("shortDescription", event.target.value)}
                rows={2}
                placeholder="Ex. Ramassage des déchets sur le secteur nord."
              />
            </CmmField>
            <div className="grid gap-4 md:grid-cols-2">
              <CmmField id="before-action-objective" label="Type d’action">
                <CmmSelect
                  value={form.plannedObjective}
                  onChange={(event) => updateField("plannedObjective", event.target.value as FormState["plannedObjective"])}
                >
                  <option value="" disabled>Sélectionnez un type d’action</option>
                  {PLANNED_OBJECTIVE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </CmmSelect>
              </CmmField>
              <CmmField id="before-commune-zone" label="Commune ou secteur" hint="Zone principale.">
                <CmmInput
                  type="text"
                  value={form.communeZoneLabel}
                  onChange={(event) => updateField("communeZoneLabel", event.target.value)}
                  placeholder="Ex. Paris 15e, berges nord"
                />
              </CmmField>
            </div>
          </div>
        </section>

        <ScheduleFields
          form={form}
          updateField={updateField}
          hasAttemptedSubmit={hasAttemptedSubmit}
          validationIssueFields={validationIssueFields}
        />

        <section aria-labelledby="before-essential-location" className="space-y-3">
          <h4 id="before-essential-location" className="text-base font-black text-emerald-950">Lieu et rendez-vous</h4>
          <MeetingLocationFields
            form={form}
            updateField={updateField}
            updateFields={updateFields}
            hasAttemptedSubmit={hasAttemptedSubmit}
            validationIssueFields={validationIssueFields}
            countryCode={countryCode}
          />
        </section>

        <section aria-labelledby="before-essential-organization" className="space-y-3">
          <h4 id="before-essential-organization" className="text-base font-black text-emerald-950">Organisation et visibilité</h4>
          <IdentityAndSharingSection
            form={form}
            updateField={updateField}
            updateFields={updateFields}
            userMetadata={userMetadata}
            showGroupJoinHelp={showGroupJoinHelp}
            onToggleGroupJoinHelp={onToggleGroupJoinHelp}
            showVolunteerRegistration={false}
            fieldMode="definition"
            embedded
            hasAttemptedSubmit={hasAttemptedSubmit}
            validationIssueFields={validationIssueFields}
            isExistingAction={isExistingAction}
          />
          <VolunteerForecast form={form} updateField={updateField} splitDetail={splitDetail} validationIssueFields={validationIssueFields} />
        </section>

        <section aria-labelledby="before-essential-mode" className="space-y-3">
          <h4 id="before-essential-mode" className="text-base font-black text-emerald-950">Mode de collecte</h4>
          <InterventionModeFields form={form} updateFields={updateFields} />
        </section>

      </div>
    </CmmCard>
  );
}
