export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function formatKg(value: number): string {
  if (!Number.isFinite(value)) {
    return "0,0";
  }

  return value < 1
    ? value.toFixed(2).replace(".", ",")
    : value.toFixed(1).replace(".", ",");
}

export function formatCount(value: number): string {
  return new Intl.NumberFormat("fr-FR").format(Math.max(0, Math.trunc(value)));
}

export function formatSignedPercent(value: number): string {
  const rounded = Math.abs(value) < 0.05 ? 0 : Math.round(value);
  return `${rounded > 0 ? "+" : ""}${rounded}%`;
}

export function deriveGaugeMax(
  values: Array<number | null | undefined>,
  minimum = 1,
): number {
  const positiveValues = values.filter(
    (value): value is number =>
      typeof value === "number" && Number.isFinite(value) && value > 0,
  );
  const reference =
    positiveValues.length > 0 ? Math.max(...positiveValues) : minimum;
  return Math.max(minimum, Number((reference * 1.35).toFixed(2)));
}
