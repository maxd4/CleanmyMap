import type { ActionDataContract } from "../actions/data-contract";
import { computeActionImpactKpis } from "../actions/impact-calculators";

export type MonthlyAnalyticsPoint = {
  month: string;
  kg: number;
  actionCount: number;
  wasteKnownActions: number;
  wasteCoverageRate: number;
  volunteers: number;
  volunteersKnownActions?: number;
};

export function aggregateMonthlyAnalytics(contracts: ActionDataContract[]): MonthlyAnalyticsPoint[] {
  const months: Record<
    string,
    { kg: number; actionCount: number; wasteKnownActions: number; volunteers: number; volunteersKnownActions: number }
  > = {};
  
  // Sort by date to ensure chronological order later
  const sorted = [...contracts].sort((a, b) => 
    new Date(a.dates.observedAt).getTime() - new Date(b.dates.observedAt).getTime()
  );

  sorted.forEach(c => {
    if (c.type !== "action" || c.status !== "approved") {
      return;
    }
    const date = new Date(c.dates.observedAt);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    
    if (!months[key]) {
      months[key] = { kg: 0, actionCount: 0, wasteKnownActions: 0, volunteers: 0, volunteersKnownActions: 0 };
    }
    
    const impact = computeActionImpactKpis(c);
    months[key].actionCount += 1;
    if (impact.wasteKnown) {
      months[key].kg += impact.wasteKg;
      months[key].wasteKnownActions += 1;
    }
    if (impact.volunteersKnown) {
      months[key].volunteers += impact.volunteers;
      months[key].volunteersKnownActions += 1;
    }
  });

  const keys = Object.keys(months).sort();
  if (keys.length === 0) {
    return [];
  }

  const [startYear, startMonth] = keys[0]!.split("-").map(Number);
  const [endYear, endMonth] = keys[keys.length - 1]!.split("-").map(Number);
  const timeline: MonthlyAnalyticsPoint[] = [];

  for (
    let year = startYear, month = startMonth;
    year < endYear || (year === endYear && month <= endMonth);
    month += 1
  ) {
    if (month > 12) {
      month = 1;
      year += 1;
    }
    const key = `${year}-${String(month).padStart(2, "0")}`;
    const val = months[key] ?? {
      kg: 0,
      actionCount: 0,
      wasteKnownActions: 0,
      volunteers: 0,
      volunteersKnownActions: 0,
    };
    timeline.push({
      month: key,
      kg: Math.round(val.kg * 10) / 10,
      actionCount: val.actionCount,
      wasteKnownActions: val.wasteKnownActions,
      wasteCoverageRate:
        val.actionCount > 0 ? (val.wasteKnownActions / val.actionCount) * 100 : 0,
      volunteers: val.volunteers,
      volunteersKnownActions: val.volunteersKnownActions,
    });
  }

  return timeline.slice(-12); // Last 12 months
}
