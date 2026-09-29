export function getLevelProgressPercent(
  xpValidated: number,
  xpRequired: number,
): number {
  if (!Number.isFinite(xpValidated) || !Number.isFinite(xpRequired) || xpRequired <= 0) {
    return 0;
  }

  return Math.min(100, Math.max(0, Math.round((xpValidated / xpRequired) * 100)));
}
