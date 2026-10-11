import type { CommunityEventItem } from"@/lib/community/http";

export type ActionCalendarInput = {
 id: string;
 title: string;
 actionDate: string;
 startTime?: string | null;
 endTime?: string | null;
 location?: string | null;
 description?: string | null;
 timeZone?: string;
};

export function toIcsTimestamp(date: Date): string {
 const y = date.getUTCFullYear();
 const m = String(date.getUTCMonth() + 1).padStart(2,"0");
 const d = String(date.getUTCDate()).padStart(2,"0");
 const hh = String(date.getUTCHours()).padStart(2,"0");
 const mm = String(date.getUTCMinutes()).padStart(2,"0");
 const ss = String(date.getUTCSeconds()).padStart(2,"0");
 return `${y}${m}${d}T${hh}${mm}${ss}Z`;
}

export function buildDateAtHour(
 dateIso: string,
 hour: number,
 minute: number,
): Date {
 const [year, month, day] = dateIso.split("-").map((part) => Number(part));
 if (
 !Number.isFinite(year) ||
 !Number.isFinite(month) ||
 !Number.isFinite(day)
 ) {
 return new Date();
 }
 return new Date(year, month - 1, day, hour, minute, 0, 0);
}

export function buildIcsHref(event: CommunityEventItem): string {
 const startsAt = buildDateAtHour(event.eventDate, 9, 30);
 const endsAt = buildDateAtHour(event.eventDate, 12, 0);
 const content = [
"BEGIN:VCALENDAR",
"VERSION:2.0",
"PRODID:-//CleanMyMap//Agenda Terrain//FR",
"BEGIN:VEVENT",
 `UID:${event.id}@cleanmymap`,
 `DTSTAMP:${toIcsTimestamp(new Date())}`,
 `DTSTART:${toIcsTimestamp(startsAt)}`,
 `DTEND:${toIcsTimestamp(endsAt)}`,
 `SUMMARY:${event.title}`,
 `LOCATION:${event.locationLabel}`,
 `DESCRIPTION:${event.description ??""}`,
"END:VEVENT",
"END:VCALENDAR",
 ].join("\r\n");
 return `data:text/calendar;charset=utf-8,${encodeURIComponent(content)}`;
}

function escapeIcsText(value: string | null | undefined): string {
 return (value ?? "")
   .replace(/\\/g, "\\\\")
   .replace(/;/g, "\\;")
   .replace(/,/g, "\\,")
   .replace(/\r?\n/g, "\\n");
}

function isClockTime(value: string | null | undefined): value is string {
 return typeof value === "string" && /^(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/.test(value.trim());
}

function dateOnly(value: string): string | null {
 return /^\d{4}-\d{2}-\d{2}$/.test(value) ? value.replaceAll("-", "") : null;
}

function nextDateOnly(value: string): string {
 const date = new Date(`${value}T00:00:00Z`);
 date.setUTCDate(date.getUTCDate() + 1);
 return date.toISOString().slice(0, 10).replaceAll("-", "");
}

/** Builds an action calendar entry without inventing a time when the action has none. */
export function buildActionIcsHref(input: ActionCalendarInput): string {
 const day = dateOnly(input.actionDate);
 if (!day) return "";
 const timeZone = input.timeZone?.trim() || "Europe/Paris";
 const start = isClockTime(input.startTime) ? input.startTime.trim().slice(0, 5).replace(":", "") + "00" : null;
 const end = isClockTime(input.endTime) ? input.endTime.trim().slice(0, 5).replace(":", "") + "00" : null;
 const lines = [
  "BEGIN:VCALENDAR",
  "VERSION:2.0",
  "PRODID:-//CleanMyMap//Action Terrain//FR",
  "CALSCALE:GREGORIAN",
  "METHOD:PUBLISH",
  "BEGIN:VEVENT",
  `UID:${escapeIcsText(input.id)}@cleanmymap`,
  `DTSTAMP:${toIcsTimestamp(new Date())}`,
  start ? `DTSTART;TZID=${escapeIcsText(timeZone)}:${day}T${start}` : `DTSTART;VALUE=DATE:${day}`,
  end && start ? `DTEND;TZID=${escapeIcsText(timeZone)}:${day}T${end}` : (!start ? `DTEND;VALUE=DATE:${nextDateOnly(input.actionDate)}` : null),
  `SUMMARY:${escapeIcsText(input.title)}`,
  input.location ? `LOCATION:${escapeIcsText(input.location)}` : null,
  input.description ? `DESCRIPTION:${escapeIcsText(input.description)}` : null,
  "END:VEVENT",
  "END:VCALENDAR",
 ].filter((line): line is string => line !== null).join("\r\n");
 return `data:text/calendar;charset=utf-8,${encodeURIComponent(`${lines}\r\n`)}`;
}
