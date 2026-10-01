const CIVIL_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

/**
 * Parses a civil date as UTC midnight without consulting the host timezone.
 * A civil date has no instant of its own; UTC is only the stable adapter used
 * when an existing runtime API requires a Date instance.
 */
export function parseCivilDateAsUtc(value: string | null | undefined): Date | null {
  if (typeof value !== "string") {
    return null;
  }

  const match = CIVIL_DATE_PATTERN.exec(value.trim());
  if (!match) {
    return null;
  }

  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  return date.getUTCFullYear() === Number(match[1]) &&
    date.getUTCMonth() === Number(match[2]) - 1 &&
    date.getUTCDate() === Number(match[3])
    ? date
    : null;
}

export function isCivilDate(value: string | null | undefined): value is string {
  return parseCivilDateAsUtc(value) !== null;
}
