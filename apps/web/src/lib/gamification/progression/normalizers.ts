export function toSingleRow<T>(data: T[] | T | null | undefined): T | null {
  if (Array.isArray(data)) {
    return data[0] ?? null;
  }
  return data ?? null;
}

export function toNonNegativeInteger(value: number | null | undefined): number {
  const next = Number(value ?? 0);
  return Number.isFinite(next) && next >= 0 ? Math.floor(next) : 0;
}
