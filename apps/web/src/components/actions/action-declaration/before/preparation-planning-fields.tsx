"use client";

import { ClipboardList } from "lucide-react";
import { CmmCard } from "@/components/ui/cmm-card";
import { CmmField, CmmTextarea } from "@/components/ui/cmm-field";
import { PLACE_TYPE_FORM_OPTIONS } from "@/lib/actions/place-type-options";
import { normalizeVolunteerParticipationFromForm } from "@/lib/actions/volunteer-participation";
import type { BaseSectionProps } from "./section-contract";
import { SelectField, VolunteerForecast } from "./planned-action-volunteer-section";
import { ExpectedWasteSection } from "./planned-action-waste-section";
import { DIFFICULTY_OPTIONS, PLANNED_OBJECTIVE_OPTIONS } from "./model";
import { SectionLabel } from "./ui";

export function PreparationPlanningFields({
  form,
  updateField,
  validationIssueFields,
}: BaseSectionProps) {
  const volunteerParticipation = normalizeVolunteerParticipationFromForm(form);
  const hasVolunteerCategoryInput = [form.childrenCount, form.adultCount, form.retiredCount]
    .some((value) => value.trim() !== "");
  const splitDetail = hasVolunteerCategoryInput
    ? volunteerParticipation.participantsCount === null
      ? "à compléter"
      : `${volunteerParticipation.participantsCount} répartis`
    : "facultatif";

  return (
    <CmmCard tone="emerald" variant="glass" size="lg">
      <div className="space-y-5">
        <SectionLabel
          icon={ClipboardList}
          title="Prévisions et informations pratiques"
          subtitle="Les informations utiles à préparer avant le terrain, sans les mesures réellement collectées."
        />
        <VolunteerForecast
          form={form}
          updateField={updateField}
          splitDetail={splitDetail}
          validationIssueFields={validationIssueFields}
        />
        <CmmField
          id="before-participant-message"
          label="Message complémentaire aux participants"
          hint="Accueil et consignes utiles avant l’action."
        >
          <CmmTextarea
            value={form.participantMessage}
            onChange={(event) => updateField("participantMessage", event.target.value)}
            rows={3}
            placeholder="Ex. Merci d’arriver 10 minutes avant."
          />
        </CmmField>
        <div className="grid gap-4 md:grid-cols-3">
          <SelectField
            label="Type d’action prévue"
            value={form.plannedObjective}
            onChange={(value) => updateField("plannedObjective", value as typeof form.plannedObjective)}
            options={PLANNED_OBJECTIVE_OPTIONS}
            placeholder="Sélectionnez un type d’action"
          />
          <SelectField
            label="Type de zone"
            value={form.placeType}
            onChange={(value) => updateField("placeType", value)}
            options={PLACE_TYPE_FORM_OPTIONS.map((option) => ({ value: option.value, label: option.label }))}
            placeholder="Sélectionnez un type de zone"
          />
          <SelectField
            label="Niveau de difficulté estimé"
            value={form.estimatedDifficulty}
            onChange={(value) => updateField("estimatedDifficulty", value as typeof form.estimatedDifficulty)}
            options={DIFFICULTY_OPTIONS}
            placeholder="Sélectionnez un niveau"
          />
        </div>
        <ExpectedWasteSection form={form} updateField={updateField} />
      </div>
    </CmmCard>
  );
}
