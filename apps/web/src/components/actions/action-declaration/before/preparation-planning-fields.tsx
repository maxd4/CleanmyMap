"use client";

import { ClipboardList } from "lucide-react";
import { CmmCard } from "@/components/ui/cmm-card";
import { CmmField, CmmTextarea } from "@/components/ui/cmm-field";
import { getPlaceTypeFormOptions } from "@/lib/actions/place-type-options";
import type { BaseSectionProps } from "./section-contract";
import { SelectField } from "./planned-action-volunteer-section";
import { ExpectedWasteSection } from "./planned-action-waste-section";
import { DIFFICULTY_OPTIONS } from "./model";
import { SectionLabel } from "./ui";

export function PreparationPlanningFields(
  props: BaseSectionProps & { embedded?: boolean },
) {
  const { form, updateField, embedded = false } = props;
  const content = (
    <div className="space-y-5">
        <SectionLabel
          icon={ClipboardList}
          title="Prévisions et informations pratiques"
        />
        <CmmField
          id="before-participant-message"
          label="Message complémentaire aux participants"
          hint="Consigne d’accueil."
        >
          <CmmTextarea
            value={form.participantMessage}
            onChange={(event) => updateField("participantMessage", event.target.value)}
            rows={3}
            placeholder="Ex. Merci d’arriver 10 minutes avant."
          />
        </CmmField>
        <div className="grid gap-4 md:grid-cols-2">
          <SelectField
            label="Type de zone"
            value={form.placeType}
            onChange={(value) => updateField("placeType", value)}
            options={getPlaceTypeFormOptions(form.placeType)}
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
  );
  return embedded ? content : <CmmCard tone="emerald" variant="glass" size="lg">{content}</CmmCard>;
}
