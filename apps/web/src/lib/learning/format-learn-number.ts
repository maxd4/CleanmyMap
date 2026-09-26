import type { LearnLocale } from "./learn-rubric-data";

export function formatLearnNumber(locale: LearnLocale, value: number): string {
  return new Intl.NumberFormat(locale === "fr" ? "fr-FR" : "en-US", {
    maximumFractionDigits: 1,
  }).format(Number.isInteger(value) ? value : Number(value.toFixed(1)));
}
