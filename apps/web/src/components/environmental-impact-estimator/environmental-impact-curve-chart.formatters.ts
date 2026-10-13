import { formatKg as formatEnvironmentalKg } from "../admin/environmental-impact-capture-panel.formatters";

export function formatKg(value: number | null | undefined) {
  return formatEnvironmentalKg(value);
}
export function formatPercent(value: number | null | undefined) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return "—";
  }

  return `${new Intl.NumberFormat("fr-FR", {
    maximumFractionDigits: 0,
  }).format(value)} %`;
}
