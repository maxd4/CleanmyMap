export type { RouteGeometry, RouteStop } from "@/lib/route/route-contract";
export type {
  RouteOptions,
  RouteOriginMode,
  RouteRecommendationOrigin,
  RouteRecommendationRequest,
  RouteRecommendationResponse,
  RouteResponse,
  RouteResponseOrigin,
} from "@/lib/route/route-response-contract";
export type { RoutePlanningMode } from "@/lib/route/route-planning-mode";

export type RouteOrganizationMode = "whole" | "split";
export type RouteMultiRouteDisplayMode = "colors" | "patterns";

export const ROUTE_GROUP_COLORS = [
  "#34d399",
  "#60a5fa",
  "#fbbf24",
  "#f472b6",
  "#a78bfa",
  "#22d3ee",
  "#fb923c",
  "#f9a8d4",
  "#a3e635",
  "#818cf8",
  "#e879f9",
  "#2dd4bf",
] as const;

export const ROUTE_GROUP_DASH_PATTERNS = [
  undefined,
  "12 8",
  "3 7",
  "16 6 3 6",
  "2 6 2 6",
  "18 4",
  "8 4 2 4",
  "1 6",
  "14 4 2 4 2 4",
  "6 3",
  "20 3",
  "4 4 1 4",
] as const;

export function normalizeGroupCountForOrganization(
  mode: RouteOrganizationMode,
  volunteers: number,
  groupCount: number,
): number {
  const volunteerLimit = Number.isFinite(volunteers) ? Math.floor(volunteers) : 0;
  if (mode === "whole") return 1;
  if (volunteerLimit < 2) return 1;
  const requestedGroupCount = Number.isFinite(groupCount)
    ? Math.floor(groupCount)
    : 2;
  return Math.min(
    Math.min(12, volunteerLimit),
    Math.max(2, requestedGroupCount),
  );
}

export function getRouteGroupVisualStyle(
  groupIndex: number,
  displayMode: RouteMultiRouteDisplayMode,
): { color: string; dashArray?: string } {
  const index = Math.max(0, Math.floor(groupIndex) - 1);
  const color = ROUTE_GROUP_COLORS[index % ROUTE_GROUP_COLORS.length]!;
  const dashArray = displayMode === "patterns"
    ? ROUTE_GROUP_DASH_PATTERNS[index % ROUTE_GROUP_DASH_PATTERNS.length]
    : undefined;
  return dashArray ? { color, dashArray } : { color };
}

export function getRouteGroupPatternLabel(
  groupIndex: number,
  fr: boolean,
): string {
  const labels = fr
    ? ["continu", "tirets", "pointillés", "tiret-point", "tirets courts", "tirets longs", "tiret-point fin", "pointillé fin", "double tiret-point", "tirets courts serrés", "tirets longs serrés", "pointillés mixtes"]
    : ["solid", "dashed", "dotted", "dash-dot", "short dashes", "long dashes", "fine dash-dot", "fine dots", "double dash-dot", "tight short dashes", "tight long dashes", "mixed dots"];
  const index = Math.max(0, Math.floor(groupIndex) - 1);
  return labels[index % labels.length]!;
}
