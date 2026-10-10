"use client";

import { ClipboardList, Info } from "lucide-react";
import { CmmCard } from "@/components/ui/cmm-card";
import { CmmField, CmmInput, CmmSelect, CmmTextarea } from "@/components/ui/cmm-field";
import { ActionAddressAutocomplete } from "../action-address-autocomplete";
import type { FormState } from "../model";
import { PLANNED_OBJECTIVE_OPTIONS } from "./model";
import { SectionLabel } from "./ui";
import { hasValidationIssue, RequiredMark, type BaseSectionProps } from "./section-contract";
import {
  getTimeContractValidationIssues,
  formatBusinessDurationMinutes,
} from "@/lib/actions/time-contract";
import { toOptionalNumber } from "../payload-numbers";

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
  const missingDate = Boolean(hasAttemptedSubmit && hasValidationIssue(validationIssueFields, "actionDate"));
  const missingLocation = Boolean(hasAttemptedSubmit && hasValidationIssue(validationIssueFields, "departureLocationLabel"));
  const temporalIssues = getTimeContractValidationIssues({
    actionDurationMinutes: toOptionalNumber(form.durationMinutes),
    startTime: form.eventStartTime,
    endTime: form.eventEndTime,
    meetingTime: form.meetingTime,
    departureTime: form.departureTime,
  });
  const durationInput = form.durationMinutes.trim();
  const durationIssue = durationInput && toOptionalNumber(durationInput) === undefined
    ? "La durée estimée doit être un nombre entier positif ou nul."
    : temporalIssues.find((issue) => issue.field === "durationMinutes")?.message;

  const updateDepartureLocation = (value: string, coordinates?: FormState["midRouteCoordinates"]) => {
    updateFields?.({
      departureLocationLabel: value,
      locationLabel: value,
      latitude: coordinates ? String(coordinates.latitude) : "",
      longitude: coordinates ? String(coordinates.longitude) : "",
    });
  };

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

        <section aria-labelledby="before-essential-schedule" className="space-y-3">
          <h4 id="before-essential-schedule" className="text-base font-black text-emerald-950">Date et rendez-vous</h4>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <CmmField
              id="before-action-date"
              label={<span>Date prévue<RequiredMark /></span>}
              error={missingDate ? "Indiquez la date prévue avant d’enregistrer." : undefined}
            >
              <CmmInput type="date" value={form.actionDate} onChange={(event) => updateField("actionDate", event.target.value)} />
            </CmmField>
            <EssentialTimeField
              id="before-meeting-time"
              label="Heure de rendez-vous"
              hint="Accueil au point de rendez-vous."
              value={form.meetingTime}
              field="meetingTime"
              updateField={updateField}
              validationIssueFields={validationIssueFields}
              message={temporalIssues.find((issue) => issue.field === "meetingTime")?.message}
            />
            <EssentialTimeField
              id="before-departure-time"
              label="Heure de départ"
              hint="Facultative."
              value={form.departureTime}
              field="departureTime"
              updateField={updateField}
              validationIssueFields={validationIssueFields}
              message={temporalIssues.find((issue) => issue.field === "departureTime")?.message}
            />
            <CmmField
              id="before-duration-minutes"
              label="Durée estimée"
              hint={formatBusinessDurationMinutes(toOptionalNumber(form.durationMinutes)) || "Facultative."}
              error={hasValidationIssue(validationIssueFields, "durationMinutes") ? durationIssue : undefined}
            >
              <CmmInput type="number" min="0" step="1" value={form.durationMinutes} onChange={(event) => updateField("durationMinutes", event.target.value)} placeholder="Ex. 60" />
            </CmmField>
          </div>
        </section>

        <section aria-labelledby="before-essential-location" className="space-y-3">
          <h4 id="before-essential-location" className="text-base font-black text-emerald-950">Lieu de rendez-vous</h4>
          <ActionAddressAutocomplete
            id="before-departure-location"
            label={<span>Point de rendez-vous<RequiredMark /></span>}
            placeholder="Ex. Entrée principale, côté métro"
            value={form.departureLocationLabel}
            onChange={updateDepartureLocation}
            helperText="Une adresse libre reste conservée même si elle n’est pas géolocalisée."
            ariaInvalid={missingLocation}
            ariaDescribedBy={missingLocation ? "before-departure-location-error" : "before-essential-location-status"}
          />
          {missingLocation ? <span id="before-departure-location-error" className="block text-xs font-medium text-rose-700">Indiquez le point de rendez-vous avant d’enregistrer.</span> : null}
          <p id="before-essential-location-status" className="flex items-start gap-2 px-1 text-xs leading-5 text-emerald-900/65">
            <Info size={13} className="mt-0.5 shrink-0" aria-hidden="true" />
            La carte, l’itinéraire optionnel et les coordonnées avancées se trouvent dans « Terrain ».
          </p>
        </section>

      </div>
    </CmmCard>
  );
}

function EssentialTimeField({
  id,
  label,
  hint,
  value,
  field,
  updateField,
  validationIssueFields,
  message,
}: {
  id: string;
  label: string;
  hint?: string;
  value: string;
  field: "meetingTime" | "departureTime";
  updateField: BaseSectionProps["updateField"];
  validationIssueFields: readonly string[];
  message?: string;
}) {
  const hasIssue = hasValidationIssue(validationIssueFields, field);
  return (
    <CmmField label={label} hint={hint} error={hasIssue ? message : undefined}>
      <CmmInput id={id} type="time" value={value} onChange={(event) => updateField(field, event.target.value)} />
    </CmmField>
  );
}
