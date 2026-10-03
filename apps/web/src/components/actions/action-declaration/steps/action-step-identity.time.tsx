import {
  deriveEventDurationMinutes,
  deriveOrganizationMinutes,
  formatBusinessDurationMinutes,
} from "@/lib/actions/time-contract";
import type { FormState } from "../model";
import { Field, inputCls, compactInputCls } from "./action-step-identity.ui";
import { Clock } from "lucide-react";

type UpdateField = <K extends keyof FormState>(
  key: K,
  value: FormState[K],
) => void;

export function ActionTimeSection({
  form,
  updateField,
  variant,
}: {
  form: FormState;
  updateField: UpdateField;
  variant: "duration" | "time" | "full";
}) {
  const event = deriveEventDurationMinutes(form.eventStartTime, form.eventEndTime);
  const organization = deriveOrganizationMinutes({
    actionDurationMinutes: Number(form.durationMinutes),
    eventDurationMinutes: event.eventDurationMinutes,
  });

  if (variant === "duration") {
    return (
      <div className="grid gap-3 md:grid-cols-2">
        <label htmlFor="action-duration-minutes" className="space-y-1.5">
          <span className="block text-xs font-semibold text-emerald-900/75">
            Durée d’action (min)
          </span>
          <input
            id="action-duration-minutes"
            type="number"
            min="1"
            inputMode="numeric"
            className={compactInputCls}
            value={form.durationMinutes}
            onChange={(event) => updateField("durationMinutes", event.target.value)}
          />
        </label>
      </div>
    );
  }

  if (variant === "time") {
    return (
      <div className="space-y-3">
        <div className="grid gap-3 md:grid-cols-2">
          <label htmlFor="action-event-start" className="space-y-1.5">
            <span className="block text-xs font-semibold text-emerald-900/75">
              Rendez-vous · début
            </span>
            <input
              id="action-event-start"
              type="time"
              className={compactInputCls}
              value={form.eventStartTime}
              onChange={(event) => updateField("eventStartTime", event.target.value)}
            />
          </label>
          <label htmlFor="action-event-end" className="space-y-1.5">
            <span className="block text-xs font-semibold text-emerald-900/75">
              Fin du créneau
            </span>
            <input
              id="action-event-end"
              type="time"
              className={compactInputCls}
              value={form.eventEndTime}
              onChange={(event) => updateField("eventEndTime", event.target.value)}
            />
          </label>
        </div>
        <TimeStatus event={event} organization={organization} compact />
      </div>
    );
  }

  return (
    <div>
      <div className="mt-3 grid max-w-xl grid-cols-1 gap-3 sm:grid-cols-2">
        <Field icon={Clock}>
          <input
            type="number"
            min="1"
            placeholder="Temps d’action (min)"
            className={inputCls}
            value={form.durationMinutes}
            onChange={(event) => updateField("durationMinutes", event.target.value)}
          />
        </Field>
      </div>
      <p className="mt-2 max-w-xl text-xs leading-5 text-emerald-900/55">
        Le temps d’action couvre la marche, le ramassage, le tri et la pesée, sans séparer ces étapes. La durée enregistrée reste précise ; affichage métier : {formatBusinessDurationMinutes(Number(form.durationMinutes))}.
      </p>
      <div className="mt-3 grid max-w-xl grid-cols-1 gap-3 sm:grid-cols-2">
        <Field icon={Clock}>
          <input
            type="time"
            aria-label="Début de l’événement"
            value={form.eventStartTime}
            onChange={(event) => updateField("eventStartTime", event.target.value)}
            className={inputCls}
          />
        </Field>
        <Field icon={Clock}>
          <input
            type="time"
            aria-label="Fin de l’événement"
            value={form.eventEndTime}
            onChange={(event) => updateField("eventEndTime", event.target.value)}
            className={inputCls}
          />
        </Field>
      </div>
      <p className="mt-1 max-w-xl text-xs leading-5 text-emerald-900/55">
        Créneau total de l’événement — début / fin, incluant briefing, matériel, regroupement et rangement.
      </p>
      <TimeStatus event={event} organization={organization} />
    </div>
  );
}

function TimeStatus({
  event,
  organization,
  compact = false,
}: {
  event: ReturnType<typeof deriveEventDurationMinutes>;
  organization: ReturnType<typeof deriveOrganizationMinutes>;
  compact?: boolean;
}) {
  if (event.status === "incomplete") {
    return null;
  }

  if (compact) {
    return (
      <p
        className={`text-xs ${event.status === "inconsistent" || event.status === "invalid" ? "font-medium text-rose-700" : "text-emerald-900/65"}`}
      >
        {event.status === "available"
          ? `Créneau global : ${formatBusinessDurationMinutes(event.eventDurationMinutes)}${organization.status === "available" ? ` · Organisation : ${formatBusinessDurationMinutes(organization.organizationMinutes)}` : organization.status === "inconsistent" ? " · Incohérence avec la durée d’action." : ""}`
          : event.status === "inconsistent"
            ? "Incohérence : la fin est antérieure au début."
            : "Les horaires doivent respecter le format HH:MM."}
      </p>
    );
  }

  return event.status === "available" ? (
    <p className="mt-1 text-xs text-emerald-900/65">
      Total : {formatBusinessDurationMinutes(event.eventDurationMinutes)}
      {organization.status === "available"
        ? ` · Organisation : ${formatBusinessDurationMinutes(organization.organizationMinutes)}`
        : organization.status === "inconsistent"
          ? " · Incohérence : créneau inférieur au temps d’action."
          : ""}
    </p>
  ) : event.status === "inconsistent" ? (
    <p className="mt-1 text-xs font-medium text-rose-700">
      Incohérence : la fin est antérieure au début le même jour.
    </p>
  ) : (
    <p className="mt-1 text-xs font-medium text-rose-700">
      Les horaires doivent respecter le format HH:MM.
    </p>
  );
}
