export function toFrNumber(value: number, digits = 1): string {
  return new Intl.NumberFormat("fr-FR", {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  }).format(value);
}

export function toFrInt(value: number): string {
  return new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(value);
}

export function toFrOptionalNumber(value: number | null, digits = 1): string {
  return value === null ? "Indisponible" : toFrNumber(value, digits);
}

export function toFrOptionalInt(value: number | null): string {
  return value === null ? "Indisponible" : toFrInt(value);
}

export function toFrDate(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" }).format(parsed);
}
