const OPERATIONAL_TIME_ZONE = "Europe/Paris";
const CIVIL_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const LOCAL_DATE_TIME_PATTERN = /^(\d{4})-(\d{2})-(\d{2})T([01]\d|2[0-3]):([0-5]\d)(?::([0-5]\d)(?:\.(\d{1,3}))?)?$/;

function dateTimePartsInTimeZone(value, timeZone) {
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
    parts.filter((part) => part.type !== "literal").map((part) => [part.type, part.value]),
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

function sameDateTimeParts(left, right) {
  return left.year === right.year && left.month === right.month && left.day === right.day &&
    left.hour === right.hour && left.minute === right.minute && left.second === right.second;
}

function assertCivilDate(value) {
  const match = CIVIL_DATE_PATTERN.exec(String(value ?? "").trim());
  if (!match) throw new RangeError("Invalid operational civil date.");
  const [year, month, day] = match.slice(1).map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    throw new RangeError("Invalid operational civil date.");
  }
  return `${match[1]}-${match[2]}-${match[3]}`;
}

/**
 * Interprets a local wall-clock value in an explicit IANA timezone.
 * DST gaps and repeated local times are rejected instead of guessed.
 */
export function parseLocalDateTimeInTimeZone(value, timeZone = OPERATIONAL_TIME_ZONE) {
  const match = LOCAL_DATE_TIME_PATTERN.exec(String(value ?? "").trim());
  if (!match) throw new RangeError("Invalid local date-time.");
  const [, yearText, monthText, dayText, hourText, minuteText, secondText, fractionText] = match;
  const target = {
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
  ) throw new RangeError("Invalid local date-time.");

  const offsets = new Set();
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
  return candidates[0];
}

export function operationalInstantAt(operationalDate, hour, minute = 0) {
  const date = assertCivilDate(operationalDate);
  if (!Number.isInteger(hour) || hour < 0 || hour > 23 || !Number.isInteger(minute) || minute < 0 || minute > 59) {
    throw new RangeError("Invalid operational local time.");
  }
  return parseLocalDateTimeInTimeZone(`${date}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`).toISOString();
}

export function teamSubmissionIdempotencyKey(teamRef, version = 1) {
  const normalizedTeamRef = String(teamRef ?? "").trim().toLowerCase();
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(normalizedTeamRef)) throw new RangeError("Invalid SPOGOMI team reference.");
  if (!Number.isInteger(version) || version < 1) throw new RangeError("Invalid SPOGOMI submission version.");
  const key = `cachan-${normalizedTeamRef}-team-v${version}`;
  if (key.length < 16 || key.length > 160) throw new RangeError("SPOGOMI idempotency key is outside the API contract.");
  return key;
}

export { OPERATIONAL_TIME_ZONE };
