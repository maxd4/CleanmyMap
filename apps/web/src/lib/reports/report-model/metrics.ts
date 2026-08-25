import {
  mapItemCoordinates,
} from "@/lib/actions/data-contract";
import { IMPACT_PROXY_CONFIG } from "@/lib/gamification/impact-proxy-config";
import type { ActionListItem, ActionMapItem } from "@/lib/actions/types";
import { computeActionImpactKpis } from "@/lib/actions/impact-calculators";

export type MapCoverageMetrics = {
  geolocatedCount: number;
  traceCount: number;
  polylineCount: number;
  polygonCount: number;
  geoCoverage: number;
  traceCoverage: number;
};

export function isTraceItem(item: ActionMapItem): boolean {
  const geometryKind = item.contract?.geometry.kind ?? item.manual_drawing?.kind ?? null;
  return Boolean(
    item.manual_drawing ||
      item.manual_drawing_geojson ||
      (geometryKind !== null && geometryKind !== "point"),
  );
}

export function computeMapCoverageMetrics(
  items: ActionMapItem[],
  options: { includeGeometryCounts?: boolean } = {},
): MapCoverageMetrics {
  const includeGeometryCounts = options.includeGeometryCounts ?? true;
  const geolocatedCount = items.filter((item) => {
    const coordinates = mapItemCoordinates(item);
    return coordinates.latitude !== null && coordinates.longitude !== null;
  }).length;
  const traceCount = items.filter(isTraceItem).length;
  const polylineCount = includeGeometryCounts
    ? items.filter((item) => {
        const kind = item.contract?.geometry.kind ?? item.manual_drawing?.kind ?? null;
        return kind === "polyline";
      }).length
    : 0;
  const polygonCount = includeGeometryCounts
    ? items.filter((item) => {
        const kind = item.contract?.geometry.kind ?? item.manual_drawing?.kind ?? null;
        return kind === "polygon";
      }).length
    : 0;

  return {
    geolocatedCount,
    traceCount,
    polylineCount,
    polygonCount,
    geoCoverage: items.length > 0 ? (geolocatedCount / items.length) * 100 : 0,
    traceCoverage: items.length > 0 ? (traceCount / items.length) * 100 : 0,
  };
}

export type CommunitySourceBuckets = {
  citoyen: number;
  associatif: number;
  institutionnel: number;
};

export type CommunityLeaderboardEntry = {
  name: string;
  actions: number;
  kg: number;
  butts: number;
};

export type CommunityEngagementMetrics = {
  topLeaderboard: CommunityLeaderboardEntry[];
  badgeConfirmed: number;
  badgeExpert: number;
  sourceBuckets: CommunitySourceBuckets;
};

export function computeCommunityEngagementMetrics(params: {
  leaderboardItems: ActionListItem[];
  sourceItems: ActionListItem[];
  leaderboardLimit: number;
}): CommunityEngagementMetrics {
  const leaderboard = params.leaderboardItems
    .reduce((map, item) => {
      const actor = item.actor_name?.trim() || "Anonyme";
      const previous = map.get(actor) ?? { actions: 0, kg: 0, butts: 0 };
      const impact = computeActionImpactKpis(
        item.contract ?? {
          metadata: {
            wasteKg: item.waste_kg,
            cigaretteButts: item.cigarette_butts,
            volunteersCount: item.volunteers_count,
            wasteBreakdown: item.waste_breakdown,
          },
        },
      );
      map.set(actor, {
        actions: previous.actions + 1,
        kg: previous.kg + impact.wasteKg,
        butts: previous.butts + impact.butts,
      });
      return map;
    }, new Map<string, Omit<CommunityLeaderboardEntry, "name">>())
    .entries();

  const topLeaderboard = [...leaderboard]
    .map(([name, stats]) => ({ name, ...stats }))
    .sort((a, b) => b.actions - a.actions || b.kg - a.kg)
    .slice(0, params.leaderboardLimit);

  const sourceBuckets = params.sourceItems.reduce(
    (acc, item) => {
      const source = (item.source ?? item.contract?.source ?? "").trim().toLowerCase();
      if (!source) {
        return acc;
      }
      if (source.includes("community")) acc.associatif += 1;
      else if (source.includes("admin") || source.includes("import")) acc.institutionnel += 1;
      else acc.citoyen += 1;
      return acc;
    },
    { citoyen: 0, associatif: 0, institutionnel: 0 },
  );

  return {
    topLeaderboard,
    badgeConfirmed: topLeaderboard.filter((entry) => entry.actions >= 5).length,
    badgeExpert: topLeaderboard.filter((entry) => entry.actions >= 10).length,
    sourceBuckets,
  };
}

export type EnvironmentalProxyMetrics = {
  waterProtectedLiters: number;
  co2AvoidedKg: number;
  recyclableKg: number;
  triIndex: number;
};

export function computeEnvironmentalProxyMetrics(
  totalButts: number,
  totalKg: number,
): EnvironmentalProxyMetrics {
  return {
    waterProtectedLiters: Math.round(
      totalButts * IMPACT_PROXY_CONFIG.factors.waterLitersPerCigaretteButt,
    ),
    co2AvoidedKg: totalKg * IMPACT_PROXY_CONFIG.factors.co2KgPerWasteKg,
    recyclableKg: totalKg * 0.55,
    triIndex:
      totalKg > 0
        ? Math.max(0, Math.min(100, 100 - (totalButts / Math.max(totalKg, 1)) * 0.7))
        : 0,
  };
}
