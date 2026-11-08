export type ScheduleDateField =
  | "officialStartAt"
  | "collectionLimitAt"
  | "sortingLimitAt"
  | "weighingStartAt"
  | "weighingEndAt";

type LocalDateTimeParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
};

type PreservedInstant = {
  localValue: string;
  instant: string | null;
};

const LOCAL_DATE_TIME_PATTERN = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/;
const OFFSET_SAMPLE_RANGE_MINUTES = 36 * 60;
const OFFSET_SAMPLE_STEP_MINUTES = 15;

function assertTimeZone(timeZone: string): void {
  if (!timeZone.trim()) throw new Error("Le fuseau horaire IANA est requis.");
  try {
    new Intl.DateTimeFormat("en-US", { timeZone }).format();
  } catch {
    throw new Error("Le fuseau horaire IANA est invalide.");
  }
}

function parseLocalDateTime(value: string): LocalDateTimeParts | null {
  const match = LOCAL_DATE_TIME_PATTERN.exec(value);
  if (!match) return null;
  const parts = {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
    hour: Number(match[4]),
    minute: Number(match[5]),
  };
  const naive = new Date(Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute));
  if (
    naive.getUTCFullYear() !== parts.year ||
    naive.getUTCMonth() !== parts.month - 1 ||
    naive.getUTCDate() !== parts.day ||
    naive.getUTCHours() !== parts.hour ||
    naive.getUTCMinutes() !== parts.minute
  ) return null;
  return parts;
}

function partsInTimeZone(instant: Date, timeZone: string): LocalDateTimeParts {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(instant);
  const values = Object.fromEntries(parts.filter((part) => part.type !== "literal").map((part) => [part.type, part.value]));
  return {
    year: Number(values.year),
    month: Number(values.month),
    day: Number(values.day),
    hour: Number(values.hour),
    minute: Number(values.minute),
  };
}

function sameLocalDateTime(left: LocalDateTimeParts, right: LocalDateTimeParts): boolean {
  return left.year === right.year &&
    left.month === right.month &&
    left.day === right.day &&
    left.hour === right.hour &&
    left.minute === right.minute;
}

function timezoneOffsetMinutes(instant: Date, timeZone: string): number {
  const represented = partsInTimeZone(instant, timeZone);
  const representedAsUtc = Date.UTC(represented.year, represented.month - 1, represented.day, represented.hour, represented.minute);
  return (representedAsUtc - instant.getTime()) / 60_000;
}

function localDateTimeCandidates(local: LocalDateTimeParts, timeZone: string): Date[] {
  const naiveUtc = Date.UTC(local.year, local.month - 1, local.day, local.hour, local.minute);
  const offsets = new Set<number>();
  for (let offsetMinutes = -OFFSET_SAMPLE_RANGE_MINUTES; offsetMinutes <= OFFSET_SAMPLE_RANGE_MINUTES; offsetMinutes += OFFSET_SAMPLE_STEP_MINUTES) {
    offsets.add(timezoneOffsetMinutes(new Date(naiveUtc + offsetMinutes * 60_000), timeZone));
  }
  return [...offsets]
    .map((offsetMinutes) => new Date(naiveUtc - offsetMinutes * 60_000))
    .filter((candidate) => sameLocalDateTime(partsInTimeZone(candidate, timeZone), local))
    .sort((left, right) => left.getTime() - right.getTime());
}

/**
 * Formats an existing instant for a datetime-local input without applying the
 * browser's local timezone.
 */
export function dateTimeInput(value: unknown, timeZone: string): string {
  if (!value) return "";
  try {
    assertTimeZone(timeZone);
    const instant = new Date(String(value));
    if (Number.isNaN(instant.getTime())) return "";
    const parts = partsInTimeZone(instant, timeZone);
    return `${String(parts.year).padStart(4, "0")}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}T${String(parts.hour).padStart(2, "0")}:${String(parts.minute).padStart(2, "0")}`;
  } catch {
    return "";
  }
}

/**
 * Converts a local datetime to an instant only when the IANA timezone maps it
 * unambiguously. Spring gaps and autumn overlaps are rejected explicitly.
 * An unchanged persisted value is returned byte-for-byte, preserving seconds
 * and fractional seconds and keeping a timezone-only edit from moving it.
 */
export function dateTimeIso(value: string, timeZone: string, preserved?: PreservedInstant): string | null {
  assertTimeZone(timeZone);
  if (!value) return null;
  if (preserved?.localValue === value && preserved.instant) return preserved.instant;
  const local = parseLocalDateTime(value);
  if (!local) throw new Error("L’horaire local est invalide.");
  const candidates = localDateTimeCandidates(local, timeZone);
  if (candidates.length === 0) throw new Error("Cet horaire n’existe pas dans le fuseau sélectionné.");
  if (candidates.length > 1) throw new Error("Cet horaire est ambigu dans le fuseau sélectionné ; choisissez une autre minute.");
  return candidates[0]!.toISOString();
}
