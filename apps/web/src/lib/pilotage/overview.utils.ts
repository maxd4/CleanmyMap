export const DAY_MS = 24 * 60 * 60 * 1000;

export function buildDateFloor(daysWindow: number): string {
  const now = new Date();
  now.setUTCHours(0, 0, 0, 0);
  now.setUTCDate(now.getUTCDate() - (daysWindow - 1));
  return now.toISOString().slice(0, 10);
}

export function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

export function formatSigned(value: number): string {
  return `${value >= 0 ? "+" : ""}${round1(value).toFixed(1)}`;
}

export function parseDateMs(raw: string | null | undefined): number | null {
  if (!raw) {
    return null;
  }
  const parsed = new Date(raw).getTime();
  return Number.isFinite(parsed) ? parsed : null;
}

export function areaFromLabel(label: string): string {
  const matched = label.toLowerCase().match(/\b([1-9]|1[0-9]|20)(?:e|eme|er)?\b/);
  if (!matched) {
    return "Hors arrondissement";
  }
  return `${matched[1]}e`;
}

export function safePercentDelta(current: number, previous: number): number {
  if (previous === 0) {
    return current === 0 ? 0 : 100;
  }
  return ((current - previous) / Math.abs(previous)) * 100;
}
