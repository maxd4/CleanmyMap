import { CmmButton } from "@/components/ui/cmm-button";
import { CmmDisclosure } from "@/components/ui/cmm-disclosure";
import { CmmField, CmmInput } from "@/components/ui/cmm-field";
import { ActionFormDisclosureSummary } from "../action-form-disclosure-summary";
import {
  deriveEventDurationMinutes,
  deriveOrganizationMinutes,
  ACTION_DURATION_EXTENSION_MINUTES,
  ACTION_DURATION_INITIAL_MAX_MINUTES,
  ACTION_DURATION_MAX_MINUTES,
  ACTION_DURATION_STEP_MINUTES,
  formatBusinessDurationMinutes,
  getTimeContractValidationIssues,
} from "@/lib/actions/time-contract";
import { hasValidationIssue, type BaseSectionProps } from "./section-contract";
import { toOptionalNumber } from "../payload-numbers";

const ACTION_DURATION_MINUTE_OPTIONS = [
  0,
  ACTION_DURATION_STEP_MINUTES,
  ACTION_DURATION_STEP_MINUTES * 2,
  ACTION_DURATION_STEP_MINUTES * 3,
] as const;

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
        <ActionDurationSlider
          id="before-duration-minutes"
          value={form.durationMinutes}
          onChange={(value) => updateField("durationMinutes", value)}
          error={hasValidationIssue(validationIssueFields, "durationMinutes") ? durationIssue : undefined}
        />
      </div>
      <GlobalTimeDisclosure form={form} updateField={updateField} validationIssueFields={validationIssueFields} />
    </fieldset>
  );
}

export function ActionDurationSlider({
  id,
  value,
  onChange,
  error,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
}) {
  const numericValue = toOptionalNumber(value);
  const persistedMax = resolveActionDurationSliderMax(numericValue);
  const maxMinutes = extendActionDurationSliderMax(persistedMax, numericValue ?? -1);

  const hasDeclaredDuration = value.trim() !== "";
  const durationParts = getDurationParts(numericValue);
  const hasHistoricalNonAlignedDuration = Boolean(durationParts && !durationParts.isStepAligned);
  const sliderValue = durationParts
    ? hasHistoricalNonAlignedDuration
      ? snapDurationToStep(durationParts.totalMinutes)
      : durationParts.totalMinutes
    : 0;
  const displayValue = durationParts
    ? `${durationParts.hours} h ${String(durationParts.minutes).padStart(2, "0")} min${hasHistoricalNonAlignedDuration ? " · valeur historique non alignée" : ""}`
    : "Durée non renseignée";

  function handleChange(nextValue: string) {
    const nextMinutes = Number(nextValue);
    if (!Number.isInteger(nextMinutes) || nextMinutes < 0 || nextMinutes > ACTION_DURATION_MAX_MINUTES) return;
    onChange(String(nextMinutes));
  }

  const errorId = `${id}-error`;
  const historicalDurationId = `${id}-historical`;
  const hoursId = `${id}-hours`;
  const minutesId = `${id}-minutes`;
  const selectedHours = durationParts?.hours ?? 0;
  const selectedMinutes = durationParts?.minutes ?? 0;
  const descriptionIds = [
    hasHistoricalNonAlignedDuration ? historicalDurationId : null,
    error ? errorId : null,
  ].filter(Boolean).join(" ") || undefined;
  const historicalDurationText = durationParts
    ? durationParts.hours === 0
      ? `${durationParts.minutes} min`
      : `${durationParts.hours} h ${String(durationParts.minutes).padStart(2, "0")} min`
    : "";

  function handleHoursChange(nextValue: string) {
    if (nextValue.trim() === "") {
      onChange("");
      return;
    }
    const hours = Number(nextValue);
    const editableMinutes = ACTION_DURATION_MINUTE_OPTIONS.some((option) => option === selectedMinutes)
      ? selectedMinutes
      : 0;
    const nextMinutes = hours * 60 + editableMinutes;
    if (!Number.isInteger(hours) || hours < 0 || nextMinutes < 0 || nextMinutes > ACTION_DURATION_MAX_MINUTES || nextMinutes % ACTION_DURATION_STEP_MINUTES !== 0) return;
    onChange(String(nextMinutes));
  }

  function handleMinutesChange(nextValue: string) {
    const minutes = Number(nextValue);
    const nextMinutes = selectedHours * 60 + minutes;
    if (!ACTION_DURATION_MINUTE_OPTIONS.some((option) => option === minutes) || nextMinutes > ACTION_DURATION_MAX_MINUTES) return;
    onChange(String(nextMinutes));
  }

  return (
    <div className="cmm-field">
      <label className="cmm-field-label" htmlFor={id}>
        Durée estimée
      </label>
      <div className="space-y-3 rounded-xl border border-emerald-200/70 bg-[#F3FBF6] px-3.5 py-3">
        <input
          id={id}
          type="range"
          min="0"
          max={maxMinutes}
          step={ACTION_DURATION_STEP_MINUTES}
          value={sliderValue}
          onChange={(event) => handleChange(event.target.value)}
          aria-valuetext={displayValue}
          aria-describedby={descriptionIds}
          disabled={hasHistoricalNonAlignedDuration}
          className="w-full accent-emerald-600"
        />
        <div className="flex items-center justify-between gap-3 text-xs text-emerald-900/65">
          <span>0 min</span>
          <div className="flex min-w-0 items-center gap-1.5 rounded-lg border border-emerald-200/70 bg-[#EAF7F0] px-2 py-1.5 text-sm font-black text-emerald-950">
            <label htmlFor={hoursId} className="sr-only">Heures</label>
            <input
              id={hoursId}
              type="number"
              min="0"
              max={Math.floor(ACTION_DURATION_MAX_MINUTES / 60)}
              step="1"
              inputMode="numeric"
              value={durationParts ? String(durationParts.hours) : ""}
              onChange={(event) => handleHoursChange(event.target.value)}
              aria-label="Heures"
              aria-describedby={descriptionIds}
              className="h-7 w-12 rounded-md border border-emerald-300/70 bg-[#EAF7F0] px-1.5 text-center text-sm font-black text-emerald-950 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/25"
            />
            <span aria-hidden="true">h</span>
            <label htmlFor={minutesId} className="sr-only">Minutes</label>
            <select
              id={minutesId}
              value={String(selectedMinutes)}
              onChange={(event) => handleMinutesChange(event.target.value)}
              aria-label="Minutes"
              aria-describedby={descriptionIds}
              className="h-7 rounded-md border border-emerald-300/70 bg-[#EAF7F0] px-1.5 text-center text-sm font-black text-emerald-950 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/25"
            >
              {hasHistoricalNonAlignedDuration ? (
                <option value={selectedMinutes} disabled>
                  {String(selectedMinutes).padStart(2, "0")} · historique
                </option>
              ) : null}
              {ACTION_DURATION_MINUTE_OPTIONS.map((minutes) => (
                <option key={minutes} value={minutes} disabled={selectedHours * 60 + minutes > ACTION_DURATION_MAX_MINUTES}>
                  {String(minutes).padStart(2, "0")}
                </option>
              ))}
            </select>
            <span aria-hidden="true">min</span>
          </div>
          <span>{maxMinutes} min</span>
        </div>
        {hasHistoricalNonAlignedDuration ? (
          <p id={historicalDurationId} className="text-xs leading-5 text-emerald-900/75">
            {historicalDurationText} : valeur historique conservée. Choisissez un quart d’heure pour la modifier.
          </p>
        ) : null}
        {hasDeclaredDuration ? (
          <CmmButton type="button" tone="tertiary" variant="ghost" size="sm" onClick={() => onChange("")}>
            Ne pas renseigner cette durée
          </CmmButton>
        ) : (
          <CmmButton type="button" tone="tertiary" variant="ghost" size="sm" onClick={() => onChange("0")}>
            Déclarer 0 min
          </CmmButton>
        )}
      </div>
      {error ? <p className="cmm-field-error" id={errorId} role="alert">{error}</p> : null}
    </div>
  );
}

function getDurationParts(value: number | undefined): { totalMinutes: number; hours: number; minutes: number; isStepAligned: boolean } | undefined {
  if (value === undefined || !Number.isInteger(value) || value < 0 || value > ACTION_DURATION_MAX_MINUTES) return undefined;
  return {
    totalMinutes: value,
    hours: Math.floor(value / 60),
    minutes: value % 60,
    isStepAligned: value % ACTION_DURATION_STEP_MINUTES === 0,
  };
}

function snapDurationToStep(value: number): number {
  return Math.min(
    ACTION_DURATION_MAX_MINUTES,
    Math.max(0, Math.round(value / ACTION_DURATION_STEP_MINUTES) * ACTION_DURATION_STEP_MINUTES),
  );
}

export function resolveActionDurationSliderMax(value: number | undefined): number {
  if (value === undefined || !Number.isFinite(value) || value < 0) {
    return ACTION_DURATION_INITIAL_MAX_MINUTES;
  }
  return Math.min(
    ACTION_DURATION_MAX_MINUTES,
    Math.max(ACTION_DURATION_INITIAL_MAX_MINUTES, Math.ceil(value / ACTION_DURATION_EXTENSION_MINUTES) * ACTION_DURATION_EXTENSION_MINUTES),
  );
}

export function extendActionDurationSliderMax(currentMax: number, selectedMinutes: number): number {
  if (selectedMinutes < currentMax || currentMax >= ACTION_DURATION_MAX_MINUTES) return currentMax;
  return Math.min(ACTION_DURATION_MAX_MINUTES, currentMax + ACTION_DURATION_EXTENSION_MINUTES);
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
