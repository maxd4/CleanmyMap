export const SPOGOMI_PROGRESS_THRESHOLDS = [1, 3, 5, 10, 25, 50, 75, 100] as const;

export type SpogomiSpecializedProgress = {
  id: "spogomi_collector_progress" | "spogomi_referee_progress";
  currentValue: number;
  lastThreshold: number | null;
  nextThreshold: number;
  progressPercent: number;
  state: "not_started" | "in_progress";
  completed: false;
  distinctions: string[];
};

function nextThresholdAfter(value: number): number {
  const normalized = Math.max(0, Math.trunc(value));
  const fixed = SPOGOMI_PROGRESS_THRESHOLDS.find((threshold) => threshold > normalized);
  if (fixed) return fixed;
  const last = SPOGOMI_PROGRESS_THRESHOLDS.at(-1)!;
  return last + (Math.floor((normalized - last) / 25) + 1) * 25;
}

export function buildSpogomiSpecializedProgress(
  id: SpogomiSpecializedProgress["id"],
  currentValue: number,
): SpogomiSpecializedProgress {
  const value = Math.max(0, Math.trunc(Number(currentValue) || 0));
  const lastThreshold = value >= 125
    ? 100 + Math.floor((value - 100) / 25) * 25
    : [...SPOGOMI_PROGRESS_THRESHOLDS].reverse().find((threshold) => threshold <= value) ?? null;
  const nextThreshold = nextThresholdAfter(value);
  const lower = lastThreshold ?? 0;
  const progressPercent = Math.round(Math.min(100, Math.max(0, ((value - lower) / Math.max(1, nextThreshold - lower)) * 100)));
  const distinctions = SPOGOMI_PROGRESS_THRESHOLDS.filter((threshold) => threshold <= value).map((threshold) => `${id}:${threshold}`);
  if (value >= 125) {
    for (let threshold = 125; threshold <= value; threshold += 25) distinctions.push(`${id}:${threshold}`);
  }
  return { id, currentValue: value, lastThreshold, nextThreshold, progressPercent, state: value > 0 ? "in_progress" : "not_started", completed: false, distinctions };
}
