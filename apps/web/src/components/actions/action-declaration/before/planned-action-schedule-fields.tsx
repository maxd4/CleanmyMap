import { CmmDisclosure } from "@/components/ui/cmm-disclosure";
import { CmmField, CmmInput } from "@/components/ui/cmm-field";
import { ActionFormDisclosureSummary } from "../action-form-disclosure-summary";
import {
  deriveEventDurationMinutes,
  deriveOrganizationMinutes,
  formatBusinessDurationMinutes,
  getTimeContractValidationIssues,
} from "@/lib/actions/time-contract";
import { hasValidationIssue, type BaseSectionProps } from "./section-contract";
import { toOptionalNumber } from "../payload-numbers";

export function ScheduleFields({
  form,
  updateField,
  hasAttemptedSubmit,
  validationIssueFields,
}: Pick<BaseSectionProps, "form" | "updateField" | "hasAttemptedSubmit" | "validationIssueFields">) {
  const missingDate = Boolean(hasAttemptedSubmit && hasValidationIssue(validationIssueFields, "actionDate"));
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
      <GlobalTimeDisclosure form={form} updateField={updateField} validationIssueFields={validationIssueFields} />
    </fieldset>
  );
}

function GlobalTimeDisclosure({
  form,
  updateField,
  validationIssueFields,
}: Pick<BaseSectionProps, "form" | "updateField" | "validationIssueFields">) {
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

  return (
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
