export const DAY_MS = 24 * 60 * 60 * 1000;

/** Parses an instant-bearing timestamp without consulting the host timezone. */
export function parseInstantMs(raw: string | null | undefined): number | null {
  if (!raw) {
    return null;
  }

  const parsed = new Date(raw).getTime();
  return Number.isFinite(parsed) ? parsed : null;
}

/** Returns the UTC date floor for a rolling day window, inclusive of today. */
export function buildUtcDateFloor(daysWindow: number): string {
  const now = new Date();
  now.setUTCHours(0, 0, 0, 0);
  now.setUTCDate(now.getUTCDate() - (daysWindow - 1));
  return now.toISOString().slice(0, 10);
}
