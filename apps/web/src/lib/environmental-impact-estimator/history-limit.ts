export function parseEnvironmentalImpactHistoryLimit(raw: string | null): number {
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) {
    return 12;
  }
  return Math.min(24, Math.max(4, Math.trunc(parsed)));
}
