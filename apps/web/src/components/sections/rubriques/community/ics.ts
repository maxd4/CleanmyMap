import type { CommunityEventItem } from"@/lib/community/http";

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
