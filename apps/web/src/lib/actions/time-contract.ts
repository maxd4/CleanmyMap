type EventWindowStatus =
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

type TimeContractField =
  | "meetingTime"
  | "departureTime"
  | "durationMinutes"
  | "eventStartTime"
  | "eventEndTime";

export type TimeContractIssue = {
  field: TimeContractField;
  message: string;
};

type TimeContractValidationParams = {
  actionDurationMinutes: number | null | undefined;
  startTime: string | null | undefined;
  endTime: string | null | undefined;
  meetingTime?: string | null | undefined;
  departureTime?: string | null | undefined;
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

function clockTimeToMinutes(value: string | null | undefined): number | null {
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

export function getTimeContractValidationMessage(params: TimeContractValidationParams): string | null {
  return getTimeContractValidationIssues(params)[0]?.message ?? null;
}

export function getTimeContractValidationIssues(params: TimeContractValidationParams): TimeContractIssue[] {
  return [
    ...getInvalidClockTimeIssues(params),
    ...getMeetingDepartureIssues(params),
    ...getGlobalWindowIssues(params),
    ...getDurationIssues(params),
  ];
}

function getInvalidClockTimeIssues(params: TimeContractValidationParams): TimeContractIssue[] {
  const clockFields = [
    ["meetingTime", params.meetingTime],
    ["departureTime", params.departureTime],
    ["eventStartTime", params.startTime],
    ["eventEndTime", params.endTime],
  ] as const;

  return clockFields
    .filter(([, value]) => Boolean(value?.trim()) && !isValidClockTime(value))
    .map(([field]) => ({ field, message: "L’heure doit respecter le format HH:MM." }));
}

function getMeetingDepartureIssues(params: TimeContractValidationParams): TimeContractIssue[] {
  const meetingMinutes = clockTimeToMinutes(params.meetingTime);
  const departureMinutes = clockTimeToMinutes(params.departureTime);
  if (meetingMinutes === null || departureMinutes === null || meetingMinutes <= departureMinutes) {
    return [];
  }
  return [{
    field: "departureTime",
    message: "L’heure de départ doit être postérieure ou égale à l’heure de rendez-vous.",
  }];
}

function getGlobalWindowIssues(params: TimeContractValidationParams): TimeContractIssue[] {
  const event = deriveEventDurationMinutes(params.startTime, params.endTime);
  if (event.status === "inconsistent") {
    return [{
      field: "eventEndTime",
      message: "L’heure de fin ne peut pas être antérieure à l’heure de début le même jour.",
    }];
  }
  if (event.status !== "available") {
    return [];
  }

  const startMinutes = clockTimeToMinutes(params.startTime);
  const endMinutes = clockTimeToMinutes(params.endTime);
  return [
    getWindowBoundaryIssue("meetingTime", params.meetingTime, startMinutes, endMinutes, "L’heure de rendez-vous doit être comprise dans le créneau global."),
    getWindowBoundaryIssue("departureTime", params.departureTime, startMinutes, endMinutes, "L’heure de départ doit être comprise dans le créneau global."),
  ].filter((issue): issue is TimeContractIssue => issue !== null);
}

function getWindowBoundaryIssue(
  field: "meetingTime" | "departureTime",
  value: string | null | undefined,
  startMinutes: number | null,
  endMinutes: number | null,
  message: string,
): TimeContractIssue | null {
  const valueMinutes = clockTimeToMinutes(value);
  if (valueMinutes === null || startMinutes === null || endMinutes === null) {
    return null;
  }
  return valueMinutes < startMinutes || valueMinutes > endMinutes ? { field, message } : null;
}

function getDurationIssues(params: TimeContractValidationParams): TimeContractIssue[] {
  const event = deriveEventDurationMinutes(params.startTime, params.endTime);
  const organization = deriveOrganizationMinutes({
    actionDurationMinutes: params.actionDurationMinutes,
    eventDurationMinutes: event.eventDurationMinutes,
  });
  return organization.status === "inconsistent"
    ? [{
        field: "durationMinutes",
        message: "Le créneau total de l’événement est inférieur au temps d’action déclaré.",
      }]
    : [];
}

export function roundBusinessDurationMinutes(
  value: number | null | undefined,
): number | null {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    return null;
  }
  return Math.round(value / 15) * 15;
}

export function formatBusinessDurationMinutes(
  value: number | null | undefined,
): string {
  const rounded = roundBusinessDurationMinutes(value);
  return rounded === null ? "Durée non renseignée" : `${rounded} min`;
}

/** Displays an estimate as a quarter-hour interval without false precision. */
export function formatBusinessDurationRangeMinutes(
  value: number | null | undefined,
): string {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    return "Durée non renseignée";
  }
  const lower = Math.floor(value / 15) * 15;
  const upper = Math.ceil(value / 15) * 15;
  const format = (minutes: number) => {
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const remainder = minutes % 60;
    return remainder === 0 ? `${hours} h` : `${hours} h ${remainder}`;
  };
  return lower === upper ? format(lower) : `${format(lower)} – ${format(upper)}`;
}
