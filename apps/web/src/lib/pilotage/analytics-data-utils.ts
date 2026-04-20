import type { ActionDataContract } from "../actions/data-contract";

export type MonthlyAnalyticsPoint = {
  month: string;
  kg: number;
  volunteers: number;
};

export function aggregateMonthlyAnalytics(contracts: ActionDataContract[]): MonthlyAnalyticsPoint[] {
  const months: Record<string, { kg: number, volunteers: number }> = {};
  
  // Sort by date to ensure chronological order later
  const sorted = [...contracts].sort((a, b) => 
    new Date(a.dates.observedAt).getTime() - new Date(b.dates.observedAt).getTime()
  );

  sorted.forEach(c => {
    const date = new Date(c.dates.observedAt);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    
    if (!months[key]) {
      months[key] = { kg: 0, volunteers: 0 };
    }
    
    months[key].kg += c.metadata.wasteKg || 0;
    months[key].volunteers += c.metadata.volunteersCount || 0;
  });

  return Object.entries(months).map(([key, val]) => ({
    month: key,
    kg: Math.round(val.kg * 10) / 10,
    volunteers: val.volunteers
  })).slice(-12); // Last 12 months
}
