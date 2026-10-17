import type { ActionDataContract } from "@/lib/actions/data-contract";
import type { CommunityEventItem } from "@/lib/community/http";

export const REPORT_GENERATION_TIME_ZONE = "UTC" as const;
export const REPORT_GENERATION_FILTERS_VERSION = "reports-filters-v1" as const;

export type ReportGenerationPeriodId =
  | "thirty_days"
  | "three_months"
  | "six_months"
  | "twelve_months"
  | "current_year"
  | "full_history"
  | "custom_range";

export type ReportGenerationPeriodSelection =
  | { id: Exclude<ReportGenerationPeriodId, "custom_range"> }
  | { id: "custom_range"; from: string; to: string };

type GenerationPeriodBounds = {
  lowerBound: number | null;
  upperBound: number;
};

type GenerationPeriodDateBounds = {
  from: string | null;
  to: string;
};

function subtractUtcCalendarMonths(now: Date, months: number): Date {
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth() - months;
  const day = now.getUTCDate();
  const targetYear = year + Math.floor(month / 12);
  const targetMonth = ((month % 12) + 12) % 12;
  const lastDay = new Date(Date.UTC(targetYear, targetMonth + 1, 0)).getUTCDate();

  return new Date(Date.UTC(targetYear, targetMonth, Math.min(day, lastDay)));
}

function subtractUtcCalendarDays(now: Date, days: number): Date {
  return new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate() - days,
  ));
}

function formatUtcCivilDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function parseCivilDate(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }
  const date = new Date(`${value}T00:00:00.000Z`);
  return formatUtcCivilDate(date) === value ? date : null;
}

function getObservedCivilDate(value: string): string | null {
  const timestamp = new Date(value);
  return Number.isFinite(timestamp.getTime()) ? formatUtcCivilDate(timestamp) : null;
}

export function isValidReportGenerationPeriodSelection(
  selection: ReportGenerationPeriodSelection,
): boolean {
  if (selection.id !== "custom_range") {
    return true;
  }
  const from = parseCivilDate(selection.from);
  const to = parseCivilDate(selection.to);
  return Boolean(from && to && from.getTime() <= to.getTime());
}

export function getReportGenerationPeriodBounds(
  period: ReportGenerationPeriodId,
  now: Date,
): GenerationPeriodBounds {
  const upperBound = now.getTime();
  if (!Number.isFinite(upperBound)) {
    throw new RangeError("Generation period now must be a valid date.");
  }

  switch (period) {
    case "thirty_days":
      return { lowerBound: subtractUtcCalendarDays(now, 30).getTime(), upperBound };
    case "three_months":
      return { lowerBound: subtractUtcCalendarMonths(now, 3).getTime(), upperBound };
    case "six_months":
      return { lowerBound: subtractUtcCalendarMonths(now, 6).getTime(), upperBound };
    case "twelve_months":
      return { lowerBound: subtractUtcCalendarMonths(now, 12).getTime(), upperBound };
    case "current_year":
      return {
        lowerBound: Date.UTC(now.getUTCFullYear(), 0, 1),
        upperBound,
      };
    case "full_history":
      return { lowerBound: null, upperBound };
    case "custom_range":
      throw new RangeError("Custom report generation dates require an explicit selection.");
  }
}

export function getReportGenerationPeriodDateBounds(
  selection: ReportGenerationPeriodSelection,
  now: Date,
): GenerationPeriodDateBounds {
  if (!Number.isFinite(now.getTime())) {
    throw new RangeError("Generation period now must be a valid date.");
  }
  if (!isValidReportGenerationPeriodSelection(selection)) {
    throw new RangeError("Custom report generation dates must be valid and ordered.");
  }
  if (selection.id === "custom_range") {
    return { from: selection.from, to: selection.to };
  }

  const bounds = getReportGenerationPeriodBounds(selection.id, now);
  return {
    from: bounds.lowerBound === null ? null : formatUtcCivilDate(new Date(bounds.lowerBound)),
    to: formatUtcCivilDate(new Date(bounds.upperBound)),
  };
}

export function isReportGenerationDateInPeriod(
  value: string,
  selection: ReportGenerationPeriodSelection,
  now: Date,
): boolean {
  if (selection.id !== "custom_range") {
    const observedMs = new Date(value).getTime();
    if (!Number.isFinite(observedMs)) {
      return false;
    }
    const bounds = getReportGenerationPeriodBounds(selection.id, now);
    return observedMs <= bounds.upperBound &&
      (bounds.lowerBound === null || observedMs >= bounds.lowerBound);
  }
  const observedDate = getObservedCivilDate(value);
  if (!observedDate) {
    return false;
  }
  const bounds = getReportGenerationPeriodDateBounds(selection, now);
  return (
    (bounds.from === null || observedDate >= bounds.from) &&
    observedDate <= bounds.to
  );
}

export function filterReportGenerationContracts(
  contracts: ActionDataContract[],
  period: ReportGenerationPeriodId | ReportGenerationPeriodSelection,
  now: Date,
): ActionDataContract[] {
  if (typeof period !== "string") {
    return contracts.filter((contract) =>
      contract.status === "approved" &&
      isReportGenerationDateInPeriod(contract.dates.observedAt, period, now),
    );
  }
  const { lowerBound, upperBound } = getReportGenerationPeriodBounds(period, now);

  return contracts.filter((contract) => {
    if (contract.status !== "approved") {
      return false;
    }

    const observedAt = new Date(contract.dates.observedAt).getTime();
    if (!Number.isFinite(observedAt) || observedAt > upperBound) {
      return false;
    }

    return lowerBound === null || observedAt >= lowerBound;
  });
}

export function filterReportCommunityEventsByPeriod(
  events: CommunityEventItem[],
  selection: ReportGenerationPeriodSelection,
  now: Date,
): CommunityEventItem[] {
  return events.filter((event) =>
    isReportGenerationDateInPeriod(event.eventDate, selection, now),
  );
}
