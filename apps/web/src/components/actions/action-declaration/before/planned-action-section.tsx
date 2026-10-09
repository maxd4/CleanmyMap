"use client";

import { CheckCircle2, Clock3, Info, Navigation, Sparkles } from "lucide-react";
import { PLACE_TYPE_FORM_OPTIONS } from "@/lib/actions/place-type-options";
import { CmmCard } from "@/components/ui/cmm-card";
import { CmmDisclosure } from "@/components/ui/cmm-disclosure";
import { ActionFormDisclosureSummary } from "../action-form-disclosure-summary";
import { ActionAddressAutocomplete } from "../action-address-autocomplete";
import type { FormState } from "../model";
import { WasteCategorySelector, WasteFieldSummary } from "@/components/waste/waste-category-selector";
import {
  DIFFICULTY_OPTIONS,
  PLANNED_OBJECTIVE_OPTIONS,
} from "./model";
import { FieldShell, SectionLabel, SelectShell } from "./ui";
import {
  deriveEventDurationMinutes,
  deriveOrganizationMinutes,
  formatBusinessDurationMinutes,
} from "@/lib/actions/time-contract";
import { normalizeVolunteerParticipationFromForm } from "@/lib/actions/volunteer-participation";
import { cn } from "@/lib/utils";
import { hasValidationIssue, RequiredMark, type BaseSectionProps } from "./section-contract";

export function PlannedActionSection({
  form,
  updateField,
  hasAttemptedSubmit,
  validationIssueFields,
  updateFields,
}: BaseSectionProps) {
  const missingTitle = Boolean(hasAttemptedSubmit && hasValidationIssue(validationIssueFields, "actionTitle"));
  const missingDate = Boolean(hasAttemptedSubmit && hasValidationIssue(validationIssueFields, "actionDate"));
  const event = deriveEventDurationMinutes(form.eventStartTime, form.eventEndTime);
  const organization = deriveOrganizationMinutes({
    actionDurationMinutes: Number(form.durationMinutes),
    eventDurationMinutes: event.eventDurationMinutes,
  });
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
      <div className="space-y-4">
        <SectionLabel icon={Sparkles} title="Action prévue" subtitle="Le contenu nécessaire avant le terrain, sans les champs de récolte réelle." />
        <div className="space-y-4">
          <FieldShell label={<span>Titre de l&apos;action<RequiredMark /></span>} hint="Nom affiché dans le formulaire de groupe.">
            <input id="before-action-title" type="text" value={form.actionTitle} onChange={(event) => updateField("actionTitle", event.target.value)} aria-invalid={missingTitle} aria-describedby={missingTitle ? "before-action-title-error" : undefined} className={cn("w-full rounded-2xl border bg-[#F3FBF6] px-4 py-3 text-sm font-medium text-emerald-950 outline-none transition focus:border-emerald-400 focus:bg-white", missingTitle ? "border-rose-400 ring-2 ring-rose-400/20" : "border-emerald-200/70")} placeholder="Ex. Nettoyage des berges de la Seine" />
            {missingTitle ? <span id="before-action-title-error" className="block text-xs font-medium text-rose-700">Indiquez un titre pour enregistrer la préparation.</span> : null}
          </FieldShell>

          <FieldShell label="Description courte" hint="Quelques lignes pour expliquer le contexte.">
            <textarea value={form.shortDescription} onChange={(event) => updateField("shortDescription", event.target.value)} className="min-h-[118px] w-full rounded-3xl border border-emerald-200/70 bg-[#F3FBF6] px-4 py-3 text-sm font-medium text-emerald-950 outline-none transition focus:border-emerald-400 focus:bg-white" placeholder="Ex. Préparation d'une action de collecte et repérage du site..." />
          </FieldShell>

          <div className="grid gap-4 lg:grid-cols-2">
            <FieldShell label="Commune ou secteur d’intervention" hint="Ville, quartier ou secteur principal, indépendant du rendez-vous et de l’arrivée.">
              <input type="text" value={form.communeZoneLabel} onChange={(event) => updateField("communeZoneLabel", event.target.value)} className="w-full rounded-2xl border border-emerald-200/70 bg-[#F3FBF6] px-4 py-3 text-sm font-medium text-emerald-950 outline-none transition focus:border-emerald-400 focus:bg-white" placeholder="Ex. Paris 15e, berges nord" />
            </FieldShell>
            <MeetingLocationFields form={form} updateField={updateField} updateFields={updateFields} hasAttemptedSubmit={hasAttemptedSubmit} validationIssueFields={validationIssueFields} />
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <RouteDestinationField form={form} updateField={updateField} updateFields={updateFields} hasAttemptedSubmit={hasAttemptedSubmit} validationIssueFields={validationIssueFields} />
            <VolunteerForecast form={form} updateField={updateField} splitDetail={volunteerSplitDetail} validationIssueFields={validationIssueFields} />
          </div>

          <div className="space-y-4">
            <CmmDisclosure summary={<ActionFormDisclosureSummary label="Localisation du rendez-vous" detail={hasConfirmedCoordinates ? "Localisation confirmée · coordonnées avancées" : "Coordonnées avancées (facultatif)"} />} tone="emerald" size="md">
              <div className="space-y-2">
                <p className="text-sm leading-5 text-emerald-900/70">L&apos;adresse ou le lieu saisi suffit généralement. Ces coordonnées conservent le contrat existant lorsqu&apos;elles sont déjà connues.</p>
                <div className="grid max-w-2xl gap-3 sm:grid-cols-2">
                  <FieldShell label="Latitude"><input type="number" step="any" value={form.latitude} onChange={(event) => updateField("latitude", event.target.value)} className="w-full rounded-2xl border border-emerald-200/70 bg-[#F3FBF6] px-4 py-3 text-sm font-medium text-emerald-950 outline-none transition focus:border-emerald-400 focus:bg-white" placeholder="Latitude" /></FieldShell>
                  <FieldShell label="Longitude"><input type="number" step="any" value={form.longitude} onChange={(event) => updateField("longitude", event.target.value)} className="w-full rounded-2xl border border-emerald-200/70 bg-[#F3FBF6] px-4 py-3 text-sm font-medium text-emerald-950 outline-none transition focus:border-emerald-400 focus:bg-white" placeholder="Longitude" /></FieldShell>
                </div>
              </div>
            </CmmDisclosure>
            <FieldShell label="Message pour les participants" hint="Visible par les personnes qui rejoignent le formulaire de groupe.">
              <textarea value={form.participantMessage} onChange={(event) => updateField("participantMessage", event.target.value)} className="min-h-[132px] w-full rounded-3xl border border-emerald-200/70 bg-[#F3FBF6] px-4 py-3 text-sm font-medium text-emerald-950 outline-none transition focus:border-emerald-400 focus:bg-white" placeholder="Ex. Merci d'arriver 10 minutes avant, prévoir des chaussures fermées." />
            </FieldShell>
          </div>

          <fieldset className="rounded-3xl border border-emerald-200/70 bg-[#F3FBF6] p-4 md:p-5">
            <legend className="px-2 text-base font-black text-emerald-950">Date et horaires</legend>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <FieldShell label={<span>Date prévue<RequiredMark /></span>}>
                <input id="before-action-date" type="date" value={form.actionDate} onChange={(event) => updateField("actionDate", event.target.value)} aria-invalid={missingDate} aria-describedby={missingDate ? "before-action-date-error" : undefined} className={cn("w-full rounded-2xl border bg-[#F3FBF6] px-4 py-3 text-sm font-medium text-emerald-950 outline-none transition focus:border-emerald-400 focus:bg-white", missingDate ? "border-rose-400 ring-2 ring-rose-400/20" : "border-emerald-200/70")} />
                {missingDate ? <span id="before-action-date-error" className="block text-xs font-medium text-rose-700">Indiquez la date prévue avant d’enregistrer.</span> : null}
              </FieldShell>
              <FieldShell label="Heure de rendez-vous"><input id="before-meeting-time" type="time" value={form.meetingTime} onChange={(event) => updateField("meetingTime", event.target.value)} className="w-full rounded-2xl border border-emerald-200/70 bg-[#F3FBF6] px-4 py-3 text-sm font-medium text-emerald-950 outline-none transition focus:border-emerald-400 focus:bg-white" /></FieldShell>
              <FieldShell label="Heure de départ prévue"><input id="before-action-event-start" type="time" value={form.departureTime} onChange={(event) => updateField("departureTime", event.target.value)} className="w-full rounded-2xl border border-emerald-200/70 bg-[#F3FBF6] px-4 py-3 text-sm font-medium text-emerald-950 outline-none transition focus:border-emerald-400 focus:bg-white" /></FieldShell>
              <FieldShell label="Durée de l’action" hint="Marche + ramassage + tri + pesée, sans séparer ces étapes.">
                <div className="relative"><Clock3 size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-emerald-700/45" /><input type="number" min="0" value={form.durationMinutes} onChange={(event) => updateField("durationMinutes", event.target.value)} className="w-full rounded-2xl border border-emerald-200/70 bg-[#F3FBF6] py-3 pl-10 pr-4 text-sm font-medium text-emerald-950 outline-none transition focus:border-emerald-400 focus:bg-white" placeholder="60" /></div>
                <p className="mt-1 text-xs text-emerald-900/55">Stockage précis ; affichage métier : {formatBusinessDurationMinutes(Number(form.durationMinutes))}.</p>
              </FieldShell>
            </div>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <FieldShell label="Début du créneau global" hint="Heure réelle ou actuellement convenue, le même jour que l’action."><input type="time" value={form.eventStartTime} onChange={(event) => updateField("eventStartTime", event.target.value)} className="w-full rounded-2xl border border-emerald-200/70 bg-[#F3FBF6] px-4 py-3 text-sm font-medium text-emerald-950 outline-none transition focus:border-emerald-400 focus:bg-white" /></FieldShell>
              <FieldShell label="Fin du créneau global" hint="Laissez vide si l’horaire n’est pas encore connu."><input type="time" value={form.eventEndTime} onChange={(event) => updateField("eventEndTime", event.target.value)} className="w-full rounded-2xl border border-emerald-200/70 bg-[#F3FBF6] px-4 py-3 text-sm font-medium text-emerald-950 outline-none transition focus:border-emerald-400 focus:bg-white" /></FieldShell>
            </div>
            <ScheduleFeedback event={event} organization={organization} />
          </fieldset>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <SelectShell label="Type d'action prévue" value={form.plannedObjective} onChange={(value) => updateField("plannedObjective", value as FormState["plannedObjective"])} options={PLANNED_OBJECTIVE_OPTIONS} placeholder="Sélectionnez un type d'action" />
            <SelectShell label="Type de zone" value={form.placeType} onChange={(value) => updateField("placeType", value)} options={PLACE_TYPE_FORM_OPTIONS.map((option) => ({ value: option.value, label: option.label }))} placeholder="Sélectionnez un type de zone" />
            <SelectShell label="Niveau de difficulté estimé" value={form.estimatedDifficulty} onChange={(value) => updateField("estimatedDifficulty", value as FormState["estimatedDifficulty"])} options={DIFFICULTY_OPTIONS} placeholder="Sélectionnez un niveau" />
          </div>

          <ExpectedWasteSection form={form} updateField={updateField} />
        </div>
      </div>
    </CmmCard>
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
    <div className="space-y-2 md:col-span-2 lg:col-span-2">
      <FieldShell
        label="Nombre de bénévoles attendus"
        hint="Prévision avant le terrain ; laissez vide si elle est encore inconnue."
      >
        <input
          id="before-volunteers-count"
          type="number"
          min="1"
          step="1"
          value={form.volunteersCount}
          onChange={(event) => updateField("volunteersCount", event.target.value)}
          aria-invalid={hasValidationIssue(validationIssueFields, "volunteersCount")}
          className={cn(
            "w-full rounded-2xl border bg-[#F3FBF6] px-4 py-3 text-sm font-medium text-emerald-950 outline-none transition focus:border-emerald-400 focus:bg-white",
            hasValidationIssue(validationIssueFields, "volunteersCount")
              ? "border-rose-400 ring-2 ring-rose-400/20"
              : "border-emerald-200/70",
          )}
          placeholder="Ex. 12"
        />
      </FieldShell>
      <CmmDisclosure
        id="before-volunteer-participation"
        summary={<ActionFormDisclosureSummary label="Répartition facultative" detail={splitDetail} />}
        tone="emerald"
        size="sm"
        className={hasValidationIssue(validationIssueFields, "volunteerParticipation") ? "ring-2 ring-rose-400/20" : undefined}
      >
        <div className="space-y-3">
          <p className="text-xs leading-5 text-emerald-900/70">
            Catégories non chevauchantes : chaque bénévole est compté dans une seule catégorie. Laissez toute la répartition vide si vous ne souhaitez pas la préciser.
          </p>
          <div className="grid gap-3 sm:grid-cols-3">
            {([["Enfants", "childrenCount"], ["Adultes", "adultCount"], ["Retraités", "retiredCount"]] as const).map(([label, field]) => (
              <FieldShell key={field} label={label} hint="Prévision avant départ.">
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={form[field]}
                  onChange={(event) => updateField(field, event.target.value)}
                  className="w-full rounded-2xl border border-emerald-200/70 bg-[#F3FBF6] px-4 py-3 text-sm font-medium text-emerald-950 outline-none transition focus:border-emerald-400 focus:bg-white"
                  placeholder="0"
                />
              </FieldShell>
            ))}
          </div>
          <p className="text-xs font-semibold text-emerald-900/65">La somme des trois catégories doit correspondre au total attendu.</p>
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
      <div className="rounded-[1.5rem] border border-emerald-200/70 bg-[#F3FBF6] p-4">
        <p className="mb-4 text-sm font-black text-emerald-950">Déchets attendus</p>
        <WasteCategorySelector value={form.wasteCategories ?? []} onChange={(value) => updateField("wasteCategories", value)} idPrefix="expected-waste" />
        <WasteFieldSummary value={form.wasteCategories ?? []} className="mt-4" />
      </div>
    </CmmDisclosure>
  );
}
