export type EventWindowStatus =
  | "available"
  | "incomplete"
  | "invalid"
  | "inconsistent";

export type EventWindowDerivation = {
  eventDurationMinutes: number | null;
  status: EventWindowStatus;
};

export type OrganizationDurationDerivation = {
  organizationMinutes: number | null;
  status: "available" | "unavailable" | "inconsistent";
};

const CLOCK_TIME_PATTERN = /^(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d(?:\.\d+)?)?$/;

/** Normalize form/API values and PostgreSQL `time` values to HH:MM. */
export function normalizeClockTime(value: string | null | undefined): string | null {
  const normalized = value?.trim() ?? "";
  if (!CLOCK_TIME_PATTERN.test(normalized)) {
    return null;
  }

  return normalized.slice(0, 5);
}

export function clockTimeToMinutes(value: string | null | undefined): number | null {
  const normalized = normalizeClockTime(value);
  if (!normalized) {
    return null;
  }

  const [hours, minutes] = normalized.split(":").map(Number);
  return hours * 60 + minutes;
}

export function isValidClockTime(value: string | null | undefined): boolean {
  return !value?.trim() || normalizeClockTime(value) !== null;
}

export function deriveEventDurationMinutes(
  startTime: string | null | undefined,
  endTime: string | null | undefined,
): EventWindowDerivation {
  const hasStart = Boolean(startTime?.trim());
  const hasEnd = Boolean(endTime?.trim());
  if (!hasStart || !hasEnd) {
    return { eventDurationMinutes: null, status: "incomplete" };
  }

  const startMinutes = clockTimeToMinutes(startTime);
  const endMinutes = clockTimeToMinutes(endTime);
  if (startMinutes === null || endMinutes === null) {
    return { eventDurationMinutes: null, status: "invalid" };
  }

  if (endMinutes < startMinutes) {
    return { eventDurationMinutes: null, status: "inconsistent" };
  }

  return {
    eventDurationMinutes: endMinutes - startMinutes,
    status: "available",
  };
}

export function deriveOrganizationMinutes(params: {
  actionDurationMinutes: number | null | undefined;
  eventDurationMinutes: number | null | undefined;
}): OrganizationDurationDerivation {
  const actionDuration = params.actionDurationMinutes;
  const eventDuration = params.eventDurationMinutes;
  if (
    typeof actionDuration !== "number" ||
    !Number.isFinite(actionDuration) ||
    actionDuration < 0 ||
    typeof eventDuration !== "number" ||
    !Number.isFinite(eventDuration) ||
    eventDuration < 0
  ) {
    return { organizationMinutes: null, status: "unavailable" };
  }

  const organizationMinutes = eventDuration - actionDuration;
  if (organizationMinutes < 0) {
    return { organizationMinutes: null, status: "inconsistent" };
  }

  return { organizationMinutes, status: "available" };
}

export function getTimeContractValidationMessage(params: {
  actionDurationMinutes: number | null | undefined;
  startTime: string | null | undefined;
  endTime: string | null | undefined;
}): string | null {
  if (!isValidClockTime(params.startTime) || !isValidClockTime(params.endTime)) {
    return "Les heures de début et de fin doivent respecter le format HH:MM.";
  }

  const event = deriveEventDurationMinutes(params.startTime, params.endTime);
  if (event.status === "inconsistent") {
    return "L’heure de fin ne peut pas être antérieure à l’heure de début le même jour.";
  }

  const organization = deriveOrganizationMinutes({
    actionDurationMinutes: params.actionDurationMinutes,
    eventDurationMinutes: event.eventDurationMinutes,
  });
  if (organization.status === "inconsistent") {
    return "Le créneau total de l’événement est inférieur au temps d’action déclaré.";
  }

  return null;
}
