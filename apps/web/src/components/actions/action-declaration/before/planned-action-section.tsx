"use client";

import { Clock3, Sparkles } from "lucide-react";
import { PLACE_TYPE_FORM_OPTIONS } from "@/lib/actions/place-type-options";
import { CmmCard } from "@/components/ui/cmm-card";
import { CmmDisclosure } from "@/components/ui/cmm-disclosure";
import { ActionFormDisclosureSummary } from "../action-form-disclosure-summary";
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
}: BaseSectionProps) {
  const missingTitle = Boolean(hasAttemptedSubmit && hasValidationIssue(validationIssueFields, "actionTitle"));
  const missingDate = Boolean(hasAttemptedSubmit && hasValidationIssue(validationIssueFields, "actionDate"));
  const missingDeparture = Boolean(hasAttemptedSubmit && hasValidationIssue(validationIssueFields, "departureLocationLabel"));
  const event = deriveEventDurationMinutes(form.eventStartTime, form.eventEndTime);
  const organization = deriveOrganizationMinutes({
    actionDurationMinutes: Number(form.durationMinutes),
    eventDurationMinutes: event.eventDurationMinutes,
  });
  const volunteerParticipation = normalizeVolunteerParticipationFromForm(form);
  const totalVolunteers = volunteerParticipation.participantsCount ?? (form.volunteersCount.trim() || "—");

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
            <FieldShell label="Commune ou zone concernée" hint="Ville, quartier ou secteur principal.">
              <input type="text" value={form.communeZoneLabel} onChange={(event) => updateField("communeZoneLabel", event.target.value)} className="w-full rounded-2xl border border-emerald-200/70 bg-[#F3FBF6] px-4 py-3 text-sm font-medium text-emerald-950 outline-none transition focus:border-emerald-400 focus:bg-white" placeholder="Ex. Paris 15e, berges nord" />
            </FieldShell>
            <FieldShell label={<span>Point de rendez-vous précis<RequiredMark /></span>} hint="Adresse, entrée ou repère exact avant le départ.">
              <input type="text" value={form.departureLocationLabel} onChange={(event) => updateField("departureLocationLabel", event.target.value)} id="before-departure-location" aria-invalid={missingDeparture} aria-describedby={missingDeparture ? "before-departure-location-error" : undefined} className={cn("w-full rounded-2xl border bg-[#F3FBF6] px-4 py-3 text-sm font-medium text-emerald-950 outline-none transition focus:border-emerald-400 focus:bg-white", missingDeparture ? "border-rose-400 ring-2 ring-rose-400/20" : "border-emerald-200/70")} placeholder="Ex. Entrée principale, côté métro" />
              {missingDeparture ? <span id="before-departure-location-error" className="block text-xs font-medium text-rose-700">Indiquez le point de rendez-vous avant d’enregistrer.</span> : null}
            </FieldShell>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <FieldShell label="Zone cible prévue" hint="Périmètre visé en quelques mots.">
              <input type="text" value={form.arrivalLocationLabel} onChange={(event) => updateField("arrivalLocationLabel", event.target.value)} className="w-full rounded-2xl border border-emerald-200/70 bg-[#F3FBF6] px-4 py-3 text-sm font-medium text-emerald-950 outline-none transition focus:border-emerald-400 focus:bg-white" placeholder="Ex. Parc rive gauche, quais nord" />
            </FieldShell>
            <VolunteerForecast form={form} updateField={updateField} totalVolunteers={totalVolunteers} effectiveVolunteerUnits={volunteerParticipation.effectiveVolunteerUnits} />
          </div>

          <div className="space-y-4">
            <CmmDisclosure summary={<ActionFormDisclosureSummary label="Localisation du rendez-vous" detail={form.latitude.trim() || form.longitude.trim() ? "Coordonnées avancées · coordonnées renseignées" : "Coordonnées avancées (facultatif)"} />} tone="emerald" size="md">
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

function VolunteerForecast({
  form,
  updateField,
  totalVolunteers,
  effectiveVolunteerUnits,
}: BaseSectionProps & {
  totalVolunteers: string | number;
  effectiveVolunteerUnits?: number | null;
}) {
  return (
    <div className="space-y-2 md:col-span-2 lg:col-span-2">
      <p className="text-sm font-semibold text-emerald-950">Bénévoles attendus par catégorie</p>
      <div className="grid gap-3 sm:grid-cols-3">
        {([["Enfants", "childrenCount"], ["Adultes", "adultCount"], ["Retraités", "retiredCount"]] as const).map(([label, field]) => (
          <FieldShell key={field} label={label} hint="Estimation avant départ.">
            <input type="number" min="0" value={form[field]} onChange={(event) => updateField(field, event.target.value)} className="w-full rounded-2xl border border-emerald-200/70 bg-[#F3FBF6] px-4 py-3 text-sm font-medium text-emerald-950 outline-none transition focus:border-emerald-400 focus:bg-white" />
          </FieldShell>
        ))}
      </div>
      <p className="text-xs font-semibold text-emerald-900/65">Total attendu : {totalVolunteers} participant(s) · unités opérationnelles : {effectiveVolunteerUnits ?? "à préciser"}</p>
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
