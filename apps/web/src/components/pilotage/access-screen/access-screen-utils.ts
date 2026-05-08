import type { PilotageLocale } from "./access-screen-constants";

export function formatDateTime(value: string, locale: PilotageLocale): string {
  return new Intl.DateTimeFormat(locale === "fr" ? "fr-FR" : "en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function severityTone(severity: "critical" | "high" | "medium" | "low"): string {
  if (severity === "critical") {
    return "border-rose-200 bg-rose-50 text-rose-800";
  }
  if (severity === "high") {
    return "border-amber-200 bg-amber-50 text-amber-800";
  }
  if (severity === "medium") {
    return "border-stone-300 bg-stone-50 text-stone-700";
  }
  return "border-emerald-200 bg-emerald-50 text-emerald-800";
}

export function reliabilityTone(level: "elevee" | "moyenne" | "faible"): string {
  if (level === "elevee") {
    return "border-emerald-200 bg-emerald-50 text-emerald-800";
  }
  if (level === "moyenne") {
    return "border-amber-200 bg-amber-50 text-amber-800";
  }
  return "border-rose-200 bg-rose-50 text-rose-800";
}

export function decisionTone(interpretation: "positive" | "negative" | "neutral"): string {
  if (interpretation === "positive") {
    return "border-emerald-200 bg-emerald-50 text-emerald-800";
  }
  if (interpretation === "negative") {
    return "border-rose-200 bg-rose-50 text-rose-800";
  }
  return "border-amber-200 bg-amber-50 text-amber-800";
}

export function renderMetricTone(interpretation: "positive" | "negative" | "neutral"): string {
  if (interpretation === "positive") {
    return "border-emerald-200 bg-emerald-50 text-emerald-800";
  }
  if (interpretation === "negative") {
    return "border-rose-200 bg-rose-50 text-rose-800";
  }
  return "border-amber-200 bg-amber-50 text-amber-800";
}
