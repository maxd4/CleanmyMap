import type {
  EnvironmentalImpactScopeCurvePoint,
  EnvironmentalImpactScopeEstimate,
} from "@/lib/environmental-impact-estimator/types";

export const CURVE_COLORS = {
  site: "#f59e0b",
  user: "#60a5fa",
} as const;

export const CURVE_CHART_WIDTH = 1000;
export const CURVE_CHART_HEIGHT = 380;
export const CURVE_CHART_PADDING = {
  top: 28,
  right: 28,
  bottom: 64,
  left: 72,
} as const;

export type ChartPoint = {
  x: number;
  y: number;
  lowerY: number;
  upperY: number;
};

export type CurveChartGeometry = {
  width: number;
  height: number;
  padding: typeof CURVE_CHART_PADDING;
  chartWidth: number;
  chartHeight: number;
  maxValue: number;
  sitePoints: ChartPoint[];
  userPoints: ChartPoint[];
  maxPointCount: number;
  axisLabels: EnvironmentalImpactScopeCurvePoint[];
  siteLinePath: string;
  userLinePath: string;
  siteAreaPath: string;
  userAreaPath: string;
  siteUncertaintyPath: string;
  userUncertaintyPath: string;
};

export function buildLinePath(points: Array<{ x: number; y: number }>) {
  if (points.length === 0) {
    return "";
  }

  return points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`)
    .join(" ");
}

export function buildChartPoints(
  points: EnvironmentalImpactScopeEstimate["curve"],
  width: number,
  height: number,
  padding: { top: number; right: number; bottom: number; left: number },
  maxValue: number,
): ChartPoint[] {
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  return points.map((point, index) => ({
    x: padding.left + (points.length <= 1 ? 0 : (index / (points.length - 1)) * chartWidth),
    y: padding.top + chartHeight - (point.cumulativeKgCo2eProxy / maxValue) * chartHeight,
    lowerY: padding.top + chartHeight - (point.lowerKgCo2eProxy / maxValue) * chartHeight,
    upperY: padding.top + chartHeight - (point.upperKgCo2eProxy / maxValue) * chartHeight,
  }));
}

function buildAreaPath(
  points: ChartPoint[],
  padding: typeof CURVE_CHART_PADDING,
  chartWidth: number,
  chartHeight: number,
) {
  return `${buildLinePath([
    { x: padding.left, y: padding.top + chartHeight },
    ...points,
    { x: padding.left + chartWidth, y: padding.top + chartHeight },
  ])} Z`;
}

function buildUncertaintyPath(points: ChartPoint[]) {
  return `${buildLinePath([
    ...points.map((point) => ({ x: point.x, y: point.upperY })),
    ...[...points]
      .reverse()
      .map((point) => ({ x: point.x, y: point.lowerY })),
  ])} Z`;
}

export function buildCurveChartGeometry({
  site,
  user,
}: {
  site: EnvironmentalImpactScopeEstimate;
  user: EnvironmentalImpactScopeEstimate;
}): CurveChartGeometry {
  const width = CURVE_CHART_WIDTH;
  const height = CURVE_CHART_HEIGHT;
  const padding = CURVE_CHART_PADDING;
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  const maxValue = Math.max(
    1,
    ...site.curve.map((point) => point.cumulativeKgCo2eProxy),
    ...user.curve.map((point) => point.cumulativeKgCo2eProxy),
  );
  const sitePoints = buildChartPoints(site.curve, width, height, padding, maxValue);
  const userPoints = buildChartPoints(user.curve, width, height, padding, maxValue);
  const maxPointCount = Math.max(sitePoints.length, userPoints.length);
  const midIndex = Math.floor((maxPointCount - 1) / 2);
  const axisLabels =
    maxPointCount > 2
      ? [
          site.curve[0] ?? user.curve[0],
          site.curve[midIndex] ?? user.curve[midIndex],
          site.curve.at(-1) ?? user.curve.at(-1),
        ].filter(
          (point): point is EnvironmentalImpactScopeCurvePoint => Boolean(point),
        )
      : site.curve.length > 0
        ? site.curve
        : user.curve;

  return {
    width,
    height,
    padding,
    chartWidth,
    chartHeight,
    maxValue,
    sitePoints,
    userPoints,
    maxPointCount,
    axisLabels,
    siteLinePath: buildLinePath(sitePoints),
    userLinePath: buildLinePath(userPoints),
    siteAreaPath: buildAreaPath(sitePoints, padding, chartWidth, chartHeight),
    userAreaPath: buildAreaPath(userPoints, padding, chartWidth, chartHeight),
    siteUncertaintyPath: buildUncertaintyPath(sitePoints),
    userUncertaintyPath: buildUncertaintyPath(userPoints),
  };
}
