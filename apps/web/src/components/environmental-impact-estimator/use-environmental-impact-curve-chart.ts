import { useMemo, useState } from "react";
import type {
  EnvironmentalImpactProjectSignals,
  EnvironmentalImpactScopeEstimate,
  EnvironmentalImpactScopeKey,
} from "@/lib/environmental-impact-estimator/types";
import { buildDriverBreakdown } from "./environmental-impact-curve-chart.breakdown";
import {
  buildCurveChartGeometry,
  type ChartPoint,
} from "./environmental-impact-curve-chart.model";

export function useEnvironmentalImpactCurveChart({
  site,
  user,
  signals,
}: {
  site: EnvironmentalImpactScopeEstimate;
  user: EnvironmentalImpactScopeEstimate;
  signals?: EnvironmentalImpactProjectSignals | null;
}) {
  const latestPointIndex = useMemo(
    () => Math.max(site.curve.at(-1)?.index ?? 0, user.curve.at(-1)?.index ?? 0),
    [site.curve, user.curve],
  );
  const [selectedScopeKey, setSelectedScopeKey] = useState<EnvironmentalImpactScopeKey>("site");
  const [selectedPointIndexOverride, setSelectedPointIndexOverride] = useState<number | null>(null);
  const selectedPointIndex = selectedPointIndexOverride ?? latestPointIndex;
  const geometry = buildCurveChartGeometry({ site, user });
  const selectedSitePoint =
    site.curve.find((point) => point.index === selectedPointIndex) ?? site.curve.at(-1) ?? null;
  const selectedUserPoint =
    user.curve.find((point) => point.index === selectedPointIndex) ?? user.curve.at(-1) ?? null;
  const selectedScope: EnvironmentalImpactScopeEstimate =
    selectedScopeKey === "user" ? user : site;
  const selectedScopePoint =
    selectedScope.key === "user" ? selectedUserPoint : selectedSitePoint;
  const selectedScopeBreakdown = buildDriverBreakdown({
    pointTotal: selectedScopePoint?.weeklyKgCo2eProxy ?? 0,
    scope: selectedScope,
    signals,
  });
  const selectedLinePoint: ChartPoint | null =
    selectedScopeKey === "user"
      ? geometry.userPoints.find((_point, index) => index === selectedPointIndex) ?? null
      : geometry.sitePoints.find((_point, index) => index === selectedPointIndex) ?? null;
  const selectedXAxisPoint =
    site.curve.find((point) => point.index === selectedPointIndex) ??
    user.curve.find((point) => point.index === selectedPointIndex) ??
    null;

  return {
    ...geometry,
    selectedPointIndex,
    selectedScopeKey,
    selectedSitePoint,
    selectedUserPoint,
    selectedScope,
    selectedScopePoint,
    selectedScopeBreakdown,
    selectedLinePoint,
    selectedXAxisPoint,
    onSitePointClick: (pointIndex: number) => {
      setSelectedScopeKey("site");
      setSelectedPointIndexOverride(pointIndex);
    },
    onSitePointKeyDown: (pointIndex: number) => {
      setSelectedPointIndexOverride(pointIndex);
    },
    onUserPointClick: (pointIndex: number) => {
      setSelectedScopeKey("user");
      setSelectedPointIndexOverride(pointIndex);
    },
    onUserPointKeyDown: (pointIndex: number) => {
      setSelectedPointIndexOverride(pointIndex);
    },
  };
}
