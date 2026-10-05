export function toOptionalNumber(input: string): number | undefined {
  const trimmed = input.trim();
  if (!trimmed) return undefined;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function toRequiredNumber(input: string, fallback: number): number {
  const parsed = Number(input);
  return Number.isFinite(parsed) ? parsed : fallback;
}
