export type SpogomiCountdownState =
  | { kind: "unknown" }
  | { kind: "invalid" }
  | { kind: "future"; totalSeconds: number }
  | { kind: "started" };

export function getSpogomiCountdownState(
  startsAt: string | null | undefined,
  nowMs: number,
): SpogomiCountdownState {
  if (!startsAt) return { kind: "unknown" };
  const targetMs = Date.parse(startsAt);
  if (Number.isNaN(targetMs)) return { kind: "invalid" };
  const totalSeconds = Math.max(0, Math.ceil((targetMs - nowMs) / 1000));
  return totalSeconds > 0 ? { kind: "future", totalSeconds } : { kind: "started" };
}

export function formatSpogomiCountdown(totalSeconds: number): string {
  const days = Math.floor(totalSeconds / 86_400);
  const hours = Math.floor((totalSeconds % 86_400) / 3_600);
  const minutes = Math.floor((totalSeconds % 3_600) / 60);
  const seconds = totalSeconds % 60;
  return `${days} j ${String(hours).padStart(2, "0")} h ${String(minutes).padStart(2, "0")} min ${String(seconds).padStart(2, "0")} s`;
}
