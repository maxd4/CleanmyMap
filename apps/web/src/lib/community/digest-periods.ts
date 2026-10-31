const COMMUNITY_DIGEST_TIME_ZONE = "Europe/Paris";
export type CommunityDigestCadence = "daily" | "weekly";

export type CommunityDigestPeriod = {
  cadence: CommunityDigestCadence;
  periodKey: string;
  start: Date;
  end: Date;
};

type ParisCalendarParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
};

const MINUTE_MS = 60_000;
const DAY_MS = 24 * 60 * MINUTE_MS;

function parisCalendarParts(value: Date): ParisCalendarParts {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: COMMUNITY_DIGEST_TIME_ZONE,
    calendar: "iso8601",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
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
  };
}

function parisOffsetMs(value: Date): number {
  const parts = parisCalendarParts(value);
  return Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
  ) - value.getTime();
}

/** Converts a Paris local midnight to UTC while respecting the current DST offset. */
function parisMidnightUtc(year: number, month: number, day: number): Date {
  const localAsUtc = Date.UTC(year, month - 1, day);
  let guess = localAsUtc;
  for (let attempt = 0; attempt < 4; attempt += 1) {
    guess = localAsUtc - parisOffsetMs(new Date(guess));
  }
  return new Date(guess);
}

function isoWeekParts(year: number, month: number, day: number): { year: number; week: number; monday: Date } {
  const date = new Date(Date.UTC(year, month - 1, day));
  const mondayOffset = (date.getUTCDay() + 6) % 7;
  const monday = new Date(date.getTime() - mondayOffset * DAY_MS);
  const thursday = new Date(monday.getTime() + 3 * DAY_MS);
  const isoYear = thursday.getUTCFullYear();
  const firstThursday = new Date(Date.UTC(isoYear, 0, 4));
  const week = 1 + Math.round((thursday.getTime() - firstThursday.getTime()) / (7 * DAY_MS));
  return { year: isoYear, week, monday };
}

export function getCommunityDigestPeriod(
  cadence: CommunityDigestCadence,
  now = new Date(),
): CommunityDigestPeriod {
  const parts = parisCalendarParts(now);
  if (cadence === "daily") {
    const start = parisMidnightUtc(parts.year, parts.month, parts.day);
    return {
      cadence,
      periodKey: `${parts.year}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}`,
      start,
      end: parisMidnightUtc(parts.year, parts.month, parts.day + 1),
    };
  }

  const iso = isoWeekParts(parts.year, parts.month, parts.day);
  const mondayParis = iso.monday;
  const start = parisMidnightUtc(
    mondayParis.getUTCFullYear(),
    mondayParis.getUTCMonth() + 1,
    mondayParis.getUTCDate(),
  );
  const sundayAfter = new Date(mondayParis.getTime() + 7 * DAY_MS);
  return {
    cadence,
    periodKey: `${iso.year}-W${String(iso.week).padStart(2, "0")}`,
    start,
    end: parisMidnightUtc(
      sundayAfter.getUTCFullYear(),
      sundayAfter.getUTCMonth() + 1,
      sundayAfter.getUTCDate(),
    ),
  };
}

export function isDateInCommunityDigestPeriod(value: string | Date, period: CommunityDigestPeriod): boolean {
  const timestamp = typeof value === "string" ? new Date(value).getTime() : value.getTime();
  return Number.isFinite(timestamp) && timestamp >= period.start.getTime() && timestamp < period.end.getTime();
}
