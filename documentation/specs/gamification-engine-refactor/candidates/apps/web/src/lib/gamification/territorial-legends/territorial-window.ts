import { campaignStartDate, campaignYearForCivilDate } from "./campaign";

export const TERRITORIAL_LEGEND_WINDOW_DAYS = 90;

export function parisDate(value: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Paris",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(value);
}

export function parseActionDate(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split("-").map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day, 12));
  return parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === day
    ? parsed
    : null;
}

export function windowStart(now: Date): Date {
  const currentDate = parisDate(now);
  const [year, month, day] = currentDate.split("-").map(Number);
  const start = new Date(Date.UTC(year, month - 1, day, 12));
  start.setUTCDate(start.getUTCDate() - (TERRITORIAL_LEGEND_WINDOW_DAYS - 1));
  const campaignStart = new Date(`${campaignStartDate(campaignYearForCivilDate(currentDate))}T12:00:00Z`);
  if (start < campaignStart) return campaignStart;
  return start;
}
