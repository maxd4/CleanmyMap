import type { ActionDataContract } from "@/lib/actions/data-contract";

export type ReportGenerationPeriodId = "six_months" | "current_year" | "full_history";

type GenerationPeriodBounds = {
  lowerBound: number | null;
  upperBound: number;
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

export function getReportGenerationPeriodBounds(
  period: ReportGenerationPeriodId,
  now: Date,
): GenerationPeriodBounds {
  const upperBound = now.getTime();
  if (!Number.isFinite(upperBound)) {
    throw new RangeError("Generation period now must be a valid date.");
  }

  switch (period) {
    case "six_months":
      return { lowerBound: subtractUtcCalendarMonths(now, 6).getTime(), upperBound };
    case "current_year":
      return {
        lowerBound: Date.UTC(now.getUTCFullYear(), 0, 1),
        upperBound,
      };
    case "full_history":
      return { lowerBound: null, upperBound };
  }
}

export function filterReportGenerationContracts(
  contracts: ActionDataContract[],
  period: ReportGenerationPeriodId,
  now: Date,
): ActionDataContract[] {
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
