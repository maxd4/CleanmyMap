export function round(value: number): number {
  return Math.round(value);
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function getGrowthPercent(
  currentKgCo2eProxy: number | null,
  previousKgCo2eProxy: number | null | undefined,
): number | null {
  if (currentKgCo2eProxy === null || previousKgCo2eProxy === null || previousKgCo2eProxy === undefined) {
    return null;
  }
  if (currentKgCo2eProxy <= 0) {
    return 0;
  }
  if (previousKgCo2eProxy <= 0) {
    return 100;
  }
  return round(clamp(((currentKgCo2eProxy - previousKgCo2eProxy) / previousKgCo2eProxy) * 100, 0, 100));
}
