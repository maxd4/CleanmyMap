"use client";

import { CheckCircle2, Info, Navigation, Sparkles } from "lucide-react";
import { PLACE_TYPE_FORM_OPTIONS } from "@/lib/actions/place-type-options";
import { CmmCard } from "@/components/ui/cmm-card";
import { CmmDisclosure } from "@/components/ui/cmm-disclosure";
import { CmmField, CmmInput, CmmSelect, CmmTextarea } from "@/components/ui/cmm-field";
import { ActionFormDisclosureSummary } from "../action-form-disclosure-summary";
import { ActionAddressAutocomplete } from "../action-address-autocomplete";
import { OperationalRouteEditor } from "../operational-route-editor";
import type { FormState } from "../model";
import { WasteCategorySelector, WasteFieldSummary } from "@/components/waste/waste-category-selector";
import {
  DIFFICULTY_OPTIONS,
  PLANNED_OBJECTIVE_OPTIONS,
} from "./model";
import { SectionLabel } from "./ui";
import {
  deriveEventDurationMinutes,
  deriveOrganizationMinutes,
  formatBusinessDurationMinutes,
  getTimeContractValidationIssues,
} from "@/lib/actions/time-contract";
import { normalizeVolunteerParticipationFromForm } from "@/lib/actions/volunteer-participation";
import { cn } from "@/lib/utils";
import { hasValidationIssue, RequiredMark, type BaseSectionProps } from "./section-contract";
import { toOptionalNumber } from "../payload-numbers";

export function PlannedActionSection({
  form,
  updateField,
  hasAttemptedSubmit,
  validationIssueFields,
  updateFields,
}: BaseSectionProps) {
  const missingTitle = Boolean(hasAttemptedSubmit && hasValidationIssue(validationIssueFields, "actionTitle"));
  const volunteerParticipation = normalizeVolunteerParticipationFromForm(form);
  const hasVolunteerCategoryInput = [
    form.childrenCount,
    form.adultCount,
    form.retiredCount,
  ].some((value) => value.trim() !== "");
  const volunteerSplitDetail = hasVolunteerCategoryInput
    ? volunteerParticipation.participantsCount === null
      ? "à compléter"
      : `${volunteerParticipation.participantsCount} répartis`
    : "facultatif";
  const hasConfirmedCoordinates = hasValidCoordinatePair(form.latitude, form.longitude);
  return (
    <CmmCard tone="emerald" variant="glass" size="lg">
      <div className="space-y-7">
        <SectionLabel icon={Sparkles} title="Action prévue" subtitle="Le contenu nécessaire avant le terrain, sans les champs de récolte réelle." />
        <section aria-labelledby="before-action-presentation" className="space-y-3">
          <SectionHeading id="before-action-presentation" title="Présentation" />
          <div className="grid gap-4">
            <CmmField
              id="before-action-title"
              label="Titre de l’action"
              required
              hint="Nom visible par les participants."
              error={missingTitle ? "Indiquez un titre pour enregistrer la préparation." : undefined}
            >
              <CmmInput
                type="text"
                value={form.actionTitle}
                onChange={(event) => updateField("actionTitle", event.target.value)}
                placeholder="Ex. Nettoyage des berges de la Seine"
              />
            </CmmField>
            <CmmField id="before-action-description" label="Description courte">
              <CmmTextarea
                value={form.shortDescription}
                onChange={(event) => updateField("shortDescription", event.target.value)}
                rows={2}
                placeholder="Contexte ou objectif en quelques lignes."
              />
            </CmmField>
          </div>
        </section>

        <ScheduleFields form={form} updateField={updateField} hasAttemptedSubmit={hasAttemptedSubmit} validationIssueFields={validationIssueFields} />

        <section aria-labelledby="before-action-location" className="space-y-3">
          <SectionHeading id="before-action-location" title="Localisation et parcours" />
          <div className="grid gap-4 lg:grid-cols-2">
            <CmmField id="before-commune-zone" label="Commune ou secteur d’intervention" hint="Secteur principal, indépendant du rendez-vous et de l’arrivée.">
              <CmmInput
                type="text"
                value={form.communeZoneLabel}
                onChange={(event) => updateField("communeZoneLabel", event.target.value)}
                placeholder="Ex. Paris 15e, berges nord"
              />
            </CmmField>
            <MeetingLocationFields form={form} updateField={updateField} updateFields={updateFields} hasAttemptedSubmit={hasAttemptedSubmit} validationIssueFields={validationIssueFields} />
          </div>
          <RouteDestinationField form={form} updateField={updateField} updateFields={updateFields} hasAttemptedSubmit={hasAttemptedSubmit} validationIssueFields={validationIssueFields} />
          {form.operationalRoute ? (
            <CmmDisclosure summary={<ActionFormDisclosureSummary label="Parcours existant" detail="parcours calculé conservé" />} tone="emerald" size="sm">
              <p className="mb-3 text-sm text-emerald-900/70">Le parcours calculé par le planificateur est repris ici sans nouvelle géométrie.</p>
              <OperationalRouteEditor operationalRoute={form.operationalRoute} onChange={(operationalRoute) => updateField("operationalRoute", operationalRoute)} />
            </CmmDisclosure>
          ) : null}
          <CmmDisclosure summary={<ActionFormDisclosureSummary label="Options avancées" detail={hasConfirmedCoordinates ? "coordonnées renseignées" : "coordonnées facultatives"} />} tone="emerald" size="sm">
            <div className="grid gap-4 sm:grid-cols-2">
              <CmmField id="before-latitude" label="Latitude">
                <CmmInput type="number" step="any" value={form.latitude} onChange={(event) => updateField("latitude", event.target.value)} placeholder="Latitude" />
              </CmmField>
              <CmmField id="before-longitude" label="Longitude">
                <CmmInput type="number" step="any" value={form.longitude} onChange={(event) => updateField("longitude", event.target.value)} placeholder="Longitude" />
              </CmmField>
            </div>
          </CmmDisclosure>
        </section>

        <section aria-labelledby="before-action-practical" className="space-y-3">
          <SectionHeading id="before-action-practical" title="Bénévoles et informations pratiques" />
          <VolunteerForecast form={form} updateField={updateField} splitDetail={volunteerSplitDetail} validationIssueFields={validationIssueFields} />
          <CmmField id="before-participant-message" label="Message complémentaire aux participants" hint="Accueil et consignes utiles ; le matériel et la sécurité sont détaillés ci-dessous.">
            <CmmTextarea
              value={form.participantMessage}
              onChange={(event) => updateField("participantMessage", event.target.value)}
              rows={2}
              placeholder="Ex. Merci d’arriver 10 minutes avant."
            />
          </CmmField>
          <div className="grid gap-4 md:grid-cols-3">
            <SelectField label="Type d’action prévue" value={form.plannedObjective} onChange={(value) => updateField("plannedObjective", value as FormState["plannedObjective"])} options={PLANNED_OBJECTIVE_OPTIONS} placeholder="Sélectionnez un type d’action" />
            <SelectField label="Type de zone" value={form.placeType} onChange={(value) => updateField("placeType", value)} options={PLACE_TYPE_FORM_OPTIONS.map((option) => ({ value: option.value, label: option.label }))} placeholder="Sélectionnez un type de zone" />
            <SelectField label="Niveau de difficulté estimé" value={form.estimatedDifficulty} onChange={(value) => updateField("estimatedDifficulty", value as FormState["estimatedDifficulty"])} options={DIFFICULTY_OPTIONS} placeholder="Sélectionnez un niveau" />
          </div>
          <ExpectedWasteSection form={form} updateField={updateField} />
        </section>
      </div>
    </CmmCard>
  );
}

function SectionHeading({ id, title }: { id: string; title: string }) {
  return <h4 id={id} className="text-base font-black text-emerald-950">{title}</h4>;
}

function ScheduleFields({
  form,
  updateField,
  hasAttemptedSubmit,
  validationIssueFields,
}: Pick<BaseSectionProps, "form" | "updateField" | "hasAttemptedSubmit" | "validationIssueFields">) {
  const missingDate = Boolean(hasAttemptedSubmit && hasValidationIssue(validationIssueFields, "actionDate"));
  const event = deriveEventDurationMinutes(form.eventStartTime, form.eventEndTime);
  const organization = deriveOrganizationMinutes({
    actionDurationMinutes: toOptionalNumber(form.durationMinutes),
    eventDurationMinutes: event.eventDurationMinutes,
  });
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

  return (
    <fieldset className="rounded-3xl border border-emerald-200/70 bg-white/75 p-4 md:p-5">
      <legend className="px-2 text-base font-black text-emerald-950">Date et horaires principaux</legend>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <CmmField
          id="before-action-date"
          label="Date prévue"
          required
          error={missingDate ? "Indiquez la date prévue avant d’enregistrer." : undefined}
        >
          <CmmInput type="date" value={form.actionDate} onChange={(event) => updateField("actionDate", event.target.value)} />
        </CmmField>
        <TimeField
          id="before-meeting-time"
          label="Heure de rendez-vous"
          hint="Accueil des bénévoles au point de rendez-vous."
          value={form.meetingTime}
          field="meetingTime"
          updateField={updateField}
          validationIssueFields={validationIssueFields}
          message={getTemporalIssueMessage(temporalIssues, "meetingTime")}
        />
        <TimeField
          id="before-departure-time"
          label="Heure de départ"
          hint="Départ effectif après le rendez-vous."
          value={form.departureTime}
          field="departureTime"
          updateField={updateField}
          validationIssueFields={validationIssueFields}
          message={getTemporalIssueMessage(temporalIssues, "departureTime")}
        />
        <CmmField
          id="before-duration-minutes"
          label="Durée estimée"
          hint={formatBusinessDurationMinutes(toOptionalNumber(form.durationMinutes))}
          error={hasValidationIssue(validationIssueFields, "durationMinutes") ? durationIssue : undefined}
        >
          <CmmInput type="number" min="0" step="1" value={form.durationMinutes} onChange={(event) => updateField("durationMinutes", event.target.value)} placeholder="Ex. 60" />
        </CmmField>
      </div>
      <CmmDisclosure summary={<ActionFormDisclosureSummary label="Créneau global" detail={event.status === "available" ? `${form.eventStartTime}–${form.eventEndTime}` : "facultatif"} />} tone="emerald" size="sm">
        <div className="grid gap-4 md:grid-cols-2">
          <TimeField
            id="before-action-event-start"
            label="Début du créneau global"
            hint="Début de l’accueil ou de l’organisation, le même jour que l’action."
            value={form.eventStartTime}
            field="eventStartTime"
            updateField={updateField}
            validationIssueFields={validationIssueFields}
            message={getTemporalIssueMessage(temporalIssues, "eventStartTime")}
          />
          <TimeField
            id="before-action-event-end"
            label="Fin du créneau global"
            hint="Fin de l’organisation et du rangement, le même jour que l’action."
            value={form.eventEndTime}
            field="eventEndTime"
            updateField={updateField}
            validationIssueFields={validationIssueFields}
            message={getTemporalIssueMessage(temporalIssues, "eventEndTime")}
          />
        </div>
        <ScheduleFeedback event={event} organization={organization} />
      </CmmDisclosure>
    </fieldset>
  );
}

function getTemporalIssueMessage(
  issues: ReturnType<typeof getTimeContractValidationIssues>,
  field: "meetingTime" | "departureTime" | "eventStartTime" | "eventEndTime",
): string | undefined {
  return issues.find((issue) => issue.field === field)?.message;
}

function TimeField({
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
  field: "meetingTime" | "departureTime" | "eventStartTime" | "eventEndTime";
  updateField: BaseSectionProps["updateField"];
  validationIssueFields: BaseSectionProps["validationIssueFields"];
  message?: string;
}) {
  const hasIssue = hasValidationIssue(validationIssueFields, field);
  return (
    <CmmField label={label} hint={hint} error={hasIssue ? message : undefined}>
      <CmmInput id={id} type="time" value={value} onChange={(event) => updateField(field, event.target.value)} />
    </CmmField>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
  placeholder: string;
}) {
  return (
    <CmmField label={label}>
      <CmmSelect value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="" disabled>{placeholder}</option>
        {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </CmmSelect>
    </CmmField>
  );
}

function hasValidCoordinatePair(latitude: string, longitude: string): boolean {
  if (!latitude.trim() || !longitude.trim()) return false;
  const parsedLatitude = Number(latitude);
  const parsedLongitude = Number(longitude);
  return Number.isFinite(parsedLatitude) && parsedLatitude >= -90 && parsedLatitude <= 90 && Number.isFinite(parsedLongitude) && parsedLongitude >= -180 && parsedLongitude <= 180;
}

function MeetingLocationFields({
  form,
  updateFields,
  hasAttemptedSubmit,
  validationIssueFields,
}: BaseSectionProps) {
  const missingDeparture = Boolean(hasAttemptedSubmit && hasValidationIssue(validationIssueFields, "departureLocationLabel"));
  const hasConfirmedCoordinates = hasValidCoordinatePair(form.latitude, form.longitude);
  const hasFreeAddress = form.departureLocationLabel.trim().length > 0;
  const updateDepartureLocation = (value: string, coordinates?: FormState["midRouteCoordinates"]) => {
    updateFields?.({
      departureLocationLabel: value,
      locationLabel: value,
      latitude: coordinates ? String(coordinates.latitude) : "",
      longitude: coordinates ? String(coordinates.longitude) : "",
    });
  };

  return (
    <div className="space-y-2">
      <ActionAddressAutocomplete
        id="before-departure-location"
        label="Point de rendez-vous précis"
        placeholder="Ex. Entrée principale, côté métro"
        value={form.departureLocationLabel}
        onChange={updateDepartureLocation}
        helperText="Adresse exacte du rendez-vous"
        ariaInvalid={missingDeparture}
        ariaDescribedBy={missingDeparture ? "before-departure-location-error" : "before-location-status"}
      />
      {missingDeparture ? <span id="before-departure-location-error" className="block text-xs font-medium text-rose-700">Indiquez le point de rendez-vous avant d’enregistrer.</span> : null}
      <p id="before-location-status" role="status" className={cn("flex items-center gap-1.5 px-1 text-xs", hasConfirmedCoordinates ? "text-emerald-700" : hasFreeAddress ? "text-amber-700" : "text-emerald-900/50")}>
        {hasConfirmedCoordinates ? <CheckCircle2 size={13} aria-hidden="true" /> : <Info size={13} aria-hidden="true" />}
        <span>{hasConfirmedCoordinates ? "Localisation confirmée · coordonnées conservées" : hasFreeAddress ? "Adresse libre non géolocalisée · l’entrée ou le repère est conservé sans coordonnées" : "Localisation à préciser"}</span>
      </p>
    </div>
  );
}

function RouteDestinationField({
  form,
  updateFields,
  hasAttemptedSubmit,
  validationIssueFields,
}: BaseSectionProps) {
  if (form.routeTopology !== "point_to_point") {
    return (
      <p className="flex items-start gap-2 rounded-2xl border border-sky-200/70 bg-sky-50/70 px-4 py-3 text-xs leading-5 text-sky-900/75 md:col-span-2">
        <Navigation size={15} className="mt-0.5 shrink-0 text-sky-700" aria-hidden="true" />
        <span><strong>Boucle :</strong> le secteur d’intervention reste celui indiqué ci-dessus ; aucun point d’arrivée distinct n’est fabriqué.</span>
      </p>
    );
  }

  const missingArrival = Boolean(hasAttemptedSubmit && hasValidationIssue(validationIssueFields, "arrivalLocationLabel"));
  return (
    <div className="space-y-2 md:col-span-2">
      <ActionAddressAutocomplete
        id="before-arrival-location"
        label={<span>Arrivée<RequiredMark /></span>}
        placeholder="Ex. Place de la République"
        value={form.arrivalLocationLabel}
        onChange={(value, coordinates) => updateFields?.({ arrivalLocationLabel: value, arrivalCoordinates: coordinates ?? null })}
        helperText="Adresse exacte de l’arrivée"
        ariaInvalid={missingArrival}
        ariaDescribedBy={missingArrival ? "before-arrival-location-error" : undefined}
      />
      {missingArrival ? <span id="before-arrival-location-error" className="block px-1 text-xs font-medium text-rose-700">Indiquez l’arrivée pour un parcours départ → arrivée.</span> : null}
    </div>
  );
}

function VolunteerForecast({
  form,
  updateField,
  splitDetail,
  validationIssueFields,
}: BaseSectionProps & {
  splitDetail: string;
}) {
  return (
    <div className="space-y-3">
      <CmmField
        id="before-volunteers-count"
        label="Nombre de bénévoles attendus"
        hint="Prévision avant le terrain ; laissez vide si elle est inconnue."
        error={hasValidationIssue(validationIssueFields, "volunteersCount") ? "Indiquez un entier d’au moins 1." : undefined}
      >
        <CmmInput
          type="number"
          min="1"
          step="1"
          value={form.volunteersCount}
          onChange={(event) => updateField("volunteersCount", event.target.value)}
          placeholder="Ex. 12"
        />
      </CmmField>
      <CmmDisclosure
        id="before-volunteer-participation"
        summary={<ActionFormDisclosureSummary label="Répartition facultative" detail={splitDetail} />}
        tone="emerald"
        size="sm"
        className={hasValidationIssue(validationIssueFields, "volunteerParticipation") ? "ring-2 ring-rose-400/20" : undefined}
      >
        <div className="space-y-3">
          <p className="text-sm text-emerald-900/70">Catégories non chevauchantes ; leur somme doit correspondre au total attendu.</p>
          <div className="grid gap-3 sm:grid-cols-3">
            {([["Enfants", "childrenCount"], ["Adultes", "adultCount"], ["Retraités", "retiredCount"]] as const).map(([label, field]) => (
              <CmmField key={field} id={`before-${field}`} label={label}>
                <CmmInput type="number" min="0" step="1" value={form[field]} onChange={(event) => updateField(field, event.target.value)} placeholder="0" />
              </CmmField>
            ))}
          </div>
          {hasValidationIssue(validationIssueFields, "volunteerParticipation") ? <p className="text-sm font-medium text-rose-700" role="alert">La répartition doit contenir trois catégories cohérentes avec le total.</p> : null}
        </div>
      </CmmDisclosure>
    </div>
  );
}

function ScheduleFeedback({
  event,
  organization,
}: {
  event: ReturnType<typeof deriveEventDurationMinutes>;
  organization: ReturnType<typeof deriveOrganizationMinutes>;
}) {
  if (event.status === "available") {
    return <p className="mt-4 text-xs leading-5 text-emerald-900/65">Créneau total : {formatBusinessDurationMinutes(event.eventDurationMinutes)}{organization.status === "available" ? ` · Organisation : ${formatBusinessDurationMinutes(organization.organizationMinutes)}` : organization.status === "inconsistent" ? " · Incohérence : le créneau est inférieur au temps d’action." : ""}</p>;
  }
  if (event.status === "inconsistent") {
    return <p className="mt-4 text-xs font-medium leading-5 text-rose-700">Incohérence : la fin de l’événement est antérieure au début le même jour.</p>;
  }
  if (event.status === "invalid") {
    return <p className="mt-4 text-xs font-medium leading-5 text-rose-700">Les horaires doivent respecter le format HH:MM.</p>;
  }
  return null;
}

function ExpectedWasteSection({ form, updateField }: BaseSectionProps) {
  return (
    <CmmDisclosure summary={<ActionFormDisclosureSummary label="Déchets attendus" detail={form.wasteCategories?.length ? `${form.wasteCategories.length} catégorie${form.wasteCategories.length > 1 ? "s" : ""}` : undefined} />} tone="emerald" size="md">
      <div className="space-y-4">
        <p className="text-sm leading-5 text-emerald-900/70">Sélection facultative de catégories susceptibles d’être rencontrées pendant l’action. Il s’agit d’une prévision, distincte des déchets réellement collectés ; les consignes dérivées du référentiel s’affichent après sélection.</p>
        <WasteCategorySelector value={form.wasteCategories ?? []} onChange={(value) => updateField("wasteCategories", value)} idPrefix="expected-waste" />
        <WasteFieldSummary value={form.wasteCategories ?? []} />
      </div>
    </CmmDisclosure>
  );
}
