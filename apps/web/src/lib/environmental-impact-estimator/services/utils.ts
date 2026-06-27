import type {
  EnvironmentalImpactScopeInput,
  EnvironmentalImpactUsageProfileInput,
  EnvironmentalImpactPostDefinition,
  EnvironmentalImpactScopeKey
} from "../types";

export const WEEKS_PER_MONTH = 52 / 12;

export function round6(value: number): number {
  return Math.round(value * 1_000_000) / 1_000_000;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function sumDefined(values: Array<number | null>): number | null {
  const available = values.filter(
    (value): value is number => typeof value === "number" && Number.isFinite(value),
  );

  if (available.length === 0) {
    return null;
  }

  return round6(available.reduce((acc, value) => acc + value, 0));
}

export function hasNumericInput(value: number | null | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

export function hasUsageInput(
  input: EnvironmentalImpactUsageProfileInput | null | undefined,
): boolean {
  if (!input) {
    return false;
  }

  return Object.values(input).some((value) => value !== null && value !== undefined);
}

export function hasScopeSignalInput(
  input: EnvironmentalImpactScopeInput | null | undefined,
): boolean {
  if (!input) {
    return false;
  }

  return [
    input.pageViews,
    input.storedImages,
    input.apiRequests,
    input.pdfExports,
    input.maps,
    input.storageGbMonths,
    input.aiCalls,
  ].some((value) => hasNumericInput(value));
}

export function resolveNumber(value: number | null | undefined, fallback: number): number {
  return hasNumericInput(value) ? value : fallback;
}

export function clampUsageMultiplier(value: number): number {
  return Math.max(0.1, value);
}

export function parseDateOrNull(value: string | null | undefined): Date | null {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
}

export function formatWeekLabel(date: Date, isLaunchPoint: boolean): string {
  if (isLaunchPoint) {
    return "Lancement";
  }

  return new Intl.DateTimeFormat("fr-FR", {
    month: "short",
    year: "numeric",
  }).format(date);
}

export function buildScopeCurveDriverBreakdown(
  breakdown: Partial<Record<EnvironmentalImpactPostDefinition["key"], number>>,
  scopeKey: EnvironmentalImpactScopeKey,
): Record<"pageView" | "community" | "notifications" | "actions" | "pdf" | "ia" | "codex", number> {
  const pageView = breakdown.pageViews ?? 0;
  const community = (breakdown.storedImages ?? 0) * 0.6;
  const notifications = (breakdown.apiRequests ?? 0) * 0.25;
  const actions = (breakdown.maps ?? 0) * 0.7;
  const pdf = breakdown.pdfExports ?? 0;
  const ia = (breakdown.aiCalls ?? 0) * 0.9;
  const codex = scopeKey === "user" ? (breakdown.storageGbMonths ?? 0) * 0.15 : 0;

  return {
    pageView: round6(pageView),
    community: round6(community),
    notifications: round6(notifications),
    actions: round6(actions),
    pdf: round6(pdf),
    ia: round6(ia),
    codex: round6(codex),
  };
}
