export function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

export function finiteOrNull(value: number | null | undefined): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}
