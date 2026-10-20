const CIVIL_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const ACTION_DATE_CIVIL_PREFIX_PATTERN = /^(\d{4}-\d{2}-\d{2})(?=$|T| )/;
const ACTION_DATE_ZONED_TIMESTAMP_PATTERN = /^(\d{4}-\d{2}-\d{2})T([01]\d|2[0-3]):([0-5]\d)(?::([0-5]\d)(?:\.(\d{1,6}))?)?(Z|[+-](?:[01]\d|2[0-3]):[0-5]\d)$/;
const LOCAL_DATE_TIME_PATTERN = /^(\d{4})-(\d{2})-(\d{2})T([01]\d|2[0-3]):([0-5]\d)(?::([0-5]\d)(?:\.(\d{1,3}))?)?$/;
const DEFAULT_DATE_TIME_FORMAT_OPTIONS = Object.freeze({
  dateStyle: "medium",
  timeStyle: "short",
} satisfies Intl.DateTimeFormatOptions);

type ZonedDateTimeParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
};

function dateTimePartsInTimeZone(value: Date, timeZone: string): ZonedDateTimeParts {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    calendar: "gregory",
    numberingSystem: "latn",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(value);
  const values = Object.fromEntries(
    parts
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  );
  return {
    year: Number(values.year),
    month: Number(values.month),
    day: Number(values.day),
    hour: Number(values.hour),
    minute: Number(values.minute),
    second: Number(values.second),
  };
}

function sameDateTimeParts(left: ZonedDateTimeParts, right: ZonedDateTimeParts): boolean {
  return left.year === right.year && left.month === right.month && left.day === right.day &&
    left.hour === right.hour && left.minute === right.minute && left.second === right.second;
}

/** Formats an instant as the civil date observed in an explicit IANA timezone. */
export function formatCivilDateInTimeZone(
  value: string | Date,
  timeZone = "Europe/Paris",
): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.valueOf())) throw new RangeError("Invalid instant.");
  const parts = dateTimePartsInTimeZone(date, timeZone);
  return `${String(parts.year).padStart(4, "0")}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}`;
}

/** Formats an instant for a user-facing surface without consulting the host timezone. */
export function formatDateTimeInTimeZone(
  value: string | Date,
  timeZone = "Europe/Paris",
  options: Intl.DateTimeFormatOptions = DEFAULT_DATE_TIME_FORMAT_OPTIONS,
): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.valueOf())) throw new RangeError("Invalid instant.");
  return new Intl.DateTimeFormat("fr-FR", { ...options, timeZone }).format(date);
}

/** Returns whether a string is a browser `datetime-local` wall-clock value. */
export function isDateTimeLocalValue(value: string | null | undefined): value is string {
  return typeof value === "string" && LOCAL_DATE_TIME_PATTERN.test(value.trim());
}

/**
 * Interprets a `datetime-local` wall-clock value in an explicit IANA timezone.
 * Ambiguous and nonexistent DST times are rejected instead of being guessed.
 */
export function parseDateTimeLocalInTimeZone(
  value: string,
  timeZone = "Europe/Paris",
): Date {
  const match = LOCAL_DATE_TIME_PATTERN.exec(value.trim());
  if (!match) throw new RangeError("Invalid datetime-local value.");
  const [, yearText, monthText, dayText, hourText, minuteText, secondText, fractionText] = match;
  const target: ZonedDateTimeParts = {
    year: Number(yearText),
    month: Number(monthText),
    day: Number(dayText),
    hour: Number(hourText),
    minute: Number(minuteText),
    second: Number(secondText ?? "0"),
  };
  const milliseconds = Number((fractionText ?? "").padEnd(3, "0") || "0");
  const naiveUtc = Date.UTC(target.year, target.month - 1, target.day, target.hour, target.minute, target.second, milliseconds);
  const dateCheck = new Date(naiveUtc);
  if (
    dateCheck.getUTCFullYear() !== target.year || dateCheck.getUTCMonth() !== target.month - 1 ||
    dateCheck.getUTCDate() !== target.day || dateCheck.getUTCHours() !== target.hour ||
    dateCheck.getUTCMinutes() !== target.minute || dateCheck.getUTCSeconds() !== target.second
  ) {
    throw new RangeError("Invalid datetime-local value.");
  }

  const offsets = new Set<number>();
  for (let hours = -48; hours <= 48; hours += 6) {
    const sample = new Date(naiveUtc + hours * 60 * 60 * 1000);
    const sampleParts = dateTimePartsInTimeZone(sample, timeZone);
    offsets.add(Date.UTC(sampleParts.year, sampleParts.month - 1, sampleParts.day, sampleParts.hour, sampleParts.minute, sampleParts.second) - sample.getTime() + sample.getMilliseconds());
  }
  const candidates = [...offsets]
    .map((offset) => new Date(naiveUtc - offset))
    .filter((candidate) => {
      const parts = dateTimePartsInTimeZone(candidate, timeZone);
      return sameDateTimeParts(parts, target) && candidate.getUTCMilliseconds() === milliseconds;
    });
  if (candidates.length === 0) throw new RangeError("Nonexistent local time in timezone.");
  if (candidates.length > 1) throw new RangeError("Ambiguous local time in timezone.");
  return candidates[0]!;
}

/**
 * Parses a civil date as UTC midnight without consulting the host timezone.
 * A civil date has no instant of its own; UTC is only the stable adapter used
 * when an existing runtime API requires a Date instance.
 */
export function parseCivilDateAsUtc(value: string | null | undefined): Date | null {
  if (typeof value !== "string") {
    return null;
  }

  const match = CIVIL_DATE_PATTERN.exec(value.trim());
  if (!match) {
    return null;
  }

  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  return date.getUTCFullYear() === Number(match[1]) &&
    date.getUTCMonth() === Number(match[2]) - 1 &&
    date.getUTCDate() === Number(match[3])
    ? date
    : null;
}

export function isCivilDate(value: string | null | undefined): value is string {
  return parseCivilDateAsUtc(value) !== null;
}

/**
 * Parses an ActionListItem date without consulting the host timezone.
 * Civil dates remain UTC-midnight values; timestamps remain absolute instants.
 * ISO-looking impossible calendar dates are rejected instead of normalized.
 */
export function parseActionDateAsUtc(value: string | null | undefined): Date | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();
  const civilDate = parseCivilDateAsUtc(normalized);
  if (civilDate) {
    return civilDate;
  }

  const civilPrefix = ACTION_DATE_CIVIL_PREFIX_PATTERN.exec(normalized)?.[1];
  if (civilPrefix && !isCivilDate(civilPrefix)) {
    return null;
  }

  if (!ACTION_DATE_ZONED_TIMESTAMP_PATTERN.test(normalized)) {
    return null;
  }

  const parsed = new Date(normalized);
  return Number.isFinite(parsed.getTime()) ? parsed : null;
}
