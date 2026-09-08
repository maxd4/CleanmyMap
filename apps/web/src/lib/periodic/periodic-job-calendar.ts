export function getUtcWeekStart(date: Date): string {
  const day = date.getUTCDay();
  const daysSinceMonday = (day + 6) % 7;
  const start = new Date(date);
  start.setUTCDate(start.getUTCDate() - daysSinceMonday);
  start.setUTCHours(0, 0, 0, 0);
  return start.toISOString().slice(0, 10);
}

export function getUtcMonthStart(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-01`;
}
