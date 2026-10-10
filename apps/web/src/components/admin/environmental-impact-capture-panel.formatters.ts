import type { ServiceQuotaState } from "@/lib/environmental-impact-estimator/service-risk";

export function formatKg(value: number | null | undefined) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return "—";
  }

  return `${new Intl.NumberFormat("fr-FR", {
    maximumFractionDigits: 2,
  }).format(value)} kg CO2e proxy`;
}

export function formatDate(value: string | null | undefined) {
  if (!value) {
    return "—";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function formatPercent(value: number | null | undefined) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return "—";
  }

  return `${new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 1 }).format(value)}%`;
}

export function formatNumber(value: number, maximumFractionDigits = 2): string {
  return new Intl.NumberFormat("fr-FR", {
    maximumFractionDigits,
  }).format(value);
}

export function getRiskTone(score: number | null) {
  if (score === null) {
    return "border-white/10 bg-white/5 text-white/60";
  }
  if (score >= 80) {
    return "border-rose-500/20 bg-rose-500/10 text-rose-100";
  }

  if (score >= 60) {
    return "border-amber-500/20 bg-amber-500/10 text-amber-100";
  }

  if (score >= 30) {
    return "border-sky-500/20 bg-sky-500/10 text-sky-100";
  }

  return "border-emerald-500/20 bg-emerald-500/10 text-emerald-100";
}

export function getQuotaStateTone(state: ServiceQuotaState) {
  switch (state) {
    case "dépassé":
      return "border-rose-500/20 bg-rose-500/10 text-rose-100";
    case "proche limite":
      return "border-amber-500/20 bg-amber-500/10 text-amber-100";
    case "attention":
      return "border-sky-500/20 bg-sky-500/10 text-sky-100";
    case "ok":
      return "border-emerald-500/20 bg-emerald-500/10 text-emerald-100";
    default:
      return "border-white/10 bg-black/10 text-white";
  }
}
