"use client";

import { ClipboardList } from "lucide-react";
import { CmmCard } from "@/components/ui/cmm-card";
import { CmmDisclosure } from "@/components/ui/cmm-disclosure";
import { CmmField, CmmInput, CmmSelect, CmmTextarea } from "@/components/ui/cmm-field";
import type { FormState } from "../model";
import { PLANNED_OBJECTIVE_OPTIONS } from "./model";
import { ActionFormDisclosureSummary } from "../action-form-disclosure-summary";
import { MeetingLocationFields, RouteDestinationField } from "./planned-action-location-section";
import { ScheduleFields } from "./planned-action-schedule-fields";
import { SectionLabel } from "./ui";
import { hasValidationIssue, RequiredMark, type BaseSectionProps } from "./section-contract";

type EssentialActionSectionProps = Pick<
  BaseSectionProps,
  "form" | "updateField" | "updateFields" | "hasAttemptedSubmit" | "validationIssueFields"
>;

export function EssentialActionSection({
  form,
  updateField,
  updateFields,
  hasAttemptedSubmit = false,
  validationIssueFields = [],
}: EssentialActionSectionProps) {
  const missingTitle = Boolean(hasAttemptedSubmit && hasValidationIssue(validationIssueFields, "actionTitle"));
  return (
    <CmmCard tone="emerald" variant="glass" size="lg">
      <div className="space-y-6">
        <SectionLabel
          icon={ClipboardList}
          title="Les informations essentielles"
          subtitle="Décrivez l’action et son rendez-vous. Les détails de terrain et de logistique restent dans les sections dédiées."
        />

        <section aria-labelledby="before-essential-identity" className="space-y-3">
          <h4 id="before-essential-identity" className="text-base font-black text-emerald-950">Identité de l’action</h4>
          <div className="grid gap-4">
            <CmmField
              id="before-action-title"
              label={<span>Titre de l’action<RequiredMark /></span>}
              hint="Nom visible par les participants."
              error={missingTitle ? "Indiquez un titre avant d’enregistrer." : undefined}
            >
              <CmmInput
                type="text"
                value={form.actionTitle}
                onChange={(event) => updateField("actionTitle", event.target.value)}
                placeholder="Ex. Nettoyage des berges"
              />
            </CmmField>
            <CmmField id="before-action-short-description" label="Description courte" hint="Objectif ou contexte en quelques mots.">
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
              <CmmField id="before-commune-zone" label="Commune ou secteur" hint="Zone principale de l’action.">
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
          <h4 id="before-essential-location" className="text-base font-black text-emerald-950">Lieu et parcours</h4>
          <p className="text-xs leading-5 text-emerald-900/65">Le point de rendez-vous reste ici ; la correction de l’arrivée est proposée lorsqu’un parcours départ → arrivée est déjà sélectionné.</p>
          <MeetingLocationFields
            form={form}
            updateField={updateField}
            updateFields={updateFields}
            hasAttemptedSubmit={hasAttemptedSubmit}
            validationIssueFields={validationIssueFields}
          />
          <CmmDisclosure summary={<ActionFormDisclosureSummary label="Arrivée du parcours" detail={form.routeTopology === "point_to_point" ? (form.arrivalLocationLabel.trim() || "à compléter") : "aucune arrivée pour une boucle"} />} tone="emerald" size="sm">
            <RouteDestinationField
              form={form}
              updateField={updateField}
              updateFields={updateFields}
              hasAttemptedSubmit={hasAttemptedSubmit}
              validationIssueFields={validationIssueFields}
            />
          </CmmDisclosure>
        </section>

      </div>
    </CmmCard>
  );
}
