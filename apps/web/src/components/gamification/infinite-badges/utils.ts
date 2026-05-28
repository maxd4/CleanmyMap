import { BADGE_MAX_COUNTER } from "@/config/gamification.config";

export function clampBadgeCounter(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(BADGE_MAX_COUNTER, value));
}

export function formatCompactNumber(value: number, locale: string): string {
  const safe = clampBadgeCounter(value);
  return new Intl.NumberFormat(locale, {
    notation: "compact",
    compactDisplay: "short",
    maximumFractionDigits: 1,
  }).format(safe);
}

export function computeLevel(total: number, step: number): number {
  const safeTotal = clampBadgeCounter(total);
  if (!Number.isFinite(step) || step <= 0) return 0;
  return Math.floor(safeTotal / step);
}

export function nextThreshold(level: number, step: number): number {
  if (!Number.isFinite(level) || level < 0) return step;
  if (!Number.isFinite(step) || step <= 0) return 0;
  return (level + 1) * step;
}

