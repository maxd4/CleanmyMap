import { ActionSubmissionMode, ActionWasteBreakdown, ActionPhotoAsset, ActionVisionEstimate } from "./types";

export type ActionOperationalContext = {
  placeType: string | null;
  routeStyle: "direct" | "souple" | null;
  routeAdjustmentMessage: string | null;
  volunteersCount: number;
  durationMinutes: number;
  engagementMinutes: number;
  engagementHours: number;
  placeTypeLabel: string;
  routeStyleLabel: string;
};

export type ActionOperationalContextSource = {
  metadata?: {
    placeType?: string | null;
    routeStyle?: "direct" | "souple" | null;
    routeAdjustmentMessage?: string | null;
    volunteersCount?: number | null;
    durationMinutes?: number | null;
  } | null;
} | null | undefined;

function normalizeContextText(value: string | null | undefined): string | null {
  const text = typeof value === "string" ? value.trim() : "";
  return text.length > 0 ? text : null;
}

export function formatRouteStyleLabel(
  routeStyle: "direct" | "souple" | null | undefined,
): string {
  if (routeStyle === "direct") {
    return "Trajet direct";
  }
  if (routeStyle === "souple") {
    return "Trajet souple";
  }
  return "Trajet non précisé";
}

function toFiniteNumber(
  value: number | null | undefined,
  fallback: number,
): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return fallback;
  }
  return value;
}

/**
 * Extrait le contexte opérationnel (volontaires, durée, engagement) d'un contrat ou d'une source compatible.
 */
export function getActionOperationalContext(
  contract: ActionOperationalContextSource,
): ActionOperationalContext {
  const metadata = contract?.metadata ?? null;
  const placeType = normalizeContextText(metadata?.placeType);
  const routeStyle = metadata?.routeStyle ?? null;
  const routeAdjustmentMessage = normalizeContextText(
    metadata?.routeAdjustmentMessage,
  );
  const volunteersCount = Math.max(
    0,
    Math.trunc(toFiniteNumber(metadata?.volunteersCount ?? null, 0)),
  );
  const durationMinutes = Math.max(
    0,
    Math.trunc(toFiniteNumber(metadata?.durationMinutes ?? null, 0)),
  );
  const engagementMinutes = volunteersCount * durationMinutes;

  return {
    placeType,
    routeStyle,
    routeAdjustmentMessage,
    volunteersCount,
    durationMinutes,
    engagementMinutes,
    engagementHours: Number((engagementMinutes / 60).toFixed(1)),
    placeTypeLabel: placeType ?? "Type de lieu non précisé",
    routeStyleLabel: formatRouteStyleLabel(routeStyle),
  };
}
