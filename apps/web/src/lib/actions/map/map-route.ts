import type { SupabaseClient } from "@supabase/supabase-js";
import type { ActionDataContract } from "@/lib/actions/contracts/contract-model";
import {
  projectPublicActionMapItem,
  type PublicActionMapItem,
  type PublicActionMapResponse,
} from "../public-dto";
import type {
  ActionMapViewportQuery,
  ActionImpactLevel,
  ActionMapResponse,
  ActionStatus,
  ActionRecordType,
  ActionQualityBreakdown,
  ActionQualityGrade,
} from "@/lib/actions/types";
import { buildDateFloor, parsePositiveInteger, resolveReportScopeFromQuery } from "@/lib/reports/csv";
import { isActionStartInFuture } from "@/lib/actions/temporal";
import type { ReportScope } from "@/lib/reports/scope";

type ActionInsightsLike = {
  qualityScore: number;
  qualityGrade: ActionQualityGrade;
  qualityFlags: string[];
  qualityBreakdown: ActionQualityBreakdown;
  toFixPriority: boolean;
  impactLevel: ActionImpactLevel;
};

type FetchUnifiedActionContractsResult = {
  items: ActionDataContract[];
  sourceHealth: ActionMapResponse["sourceHealth"];
};

export function isPublicFutureActionContract(
  contract: ActionDataContract,
  now = new Date(),
): boolean {
  return (
    contract.source === "actions" &&
    contract.type === "action" &&
    (contract.status === "pending" || contract.status === "approved") &&
    contract.metadata?.actionPhase === "pre_action" &&
    Boolean(contract.publishedAt) &&
    isActionStartInFuture({
      action_date: contract.dates.observedAt,
      event_start_time: contract.dates.eventStartTime,
    }, now)
  );
}

export function isPublicMapContract(contract: ActionDataContract, now: Date): boolean {
  if (contract.metadata?.actionPhase === "pre_action") {
    return (
      Boolean(contract.publishedAt) &&
      (contract.status === "pending" || contract.status === "approved") &&
      isActionStartInFuture({
        action_date: contract.dates.observedAt,
        event_start_time: contract.dates.eventStartTime,
      }, now)
    );
  }
  return contract.status === "approved";
}

export function toPublicMapContract(contract: ActionDataContract, now: Date): ActionDataContract {
  if (!isPublicFutureActionContract(contract, now)) {
    return contract;
  }

  return {
    ...contract,
    // The map DTO is a public projection. The persisted action remains pending
    // for its lifecycle and is still excluded from Impact eligibility.
    status: "approved",
  };
}

export type ParseMapActionsParams = {
  actionId: string | null;
  limit: number;
  days: number;
  status: ActionStatus | null;
  floorDate: string | null;
  types: ActionRecordType[] | null;
  qualityMin: number | null;
  impact: ActionImpactLevel | null;
  scope: ReportScope;
  viewport?: ActionMapViewportQuery;
};

export type MapActionsRouteDependencies = {
  getSupabaseServerClient: (useServiceRole?: boolean) => SupabaseClient;
  fetchUnifiedActionContracts: (
    supabase: SupabaseClient,
    params: {
      actionId?: string | null;
      limit: number;
      status: ActionStatus | null;
      includeFuturePublicActions?: boolean;
      floorDate: string | null;
      requireCoordinates: boolean;
      types: ActionRecordType[] | null;
      viewport?: ActionMapViewportQuery;
    },
  ) => Promise<FetchUnifiedActionContractsResult>;
  parseEntityTypesParam: (raw: string | null) => ActionRecordType[] | null;
  buildActionInsights: (
    contract: ActionDataContract,
    now: Date,
  ) => ActionInsightsLike;
  toActionMapItem: (
    contract: ActionDataContract,
    insights?: ActionInsightsLike,
  ) => PublicActionMapItem;
  filterActionContractsByScope: (
    items: ActionDataContract[],
    scope: ReportScope,
  ) => ActionDataContract[];
};

export type MapActionsRouteResult = {
  body: ActionMapResponse;
  headers?: Record<string, string>;
};

const IMPACT_LEVELS: ActionImpactLevel[] = ["faible", "moyen", "fort", "critique"];

function parseStatusParam(raw: string | null): ActionStatus {
  // This endpoint is a public map projection. Keep the legacy query parameter
  // for compatibility, but never let it select a non-public status.
  void raw;
  return "approved";
}

function parseQualityMin(raw: string | null): number | null {
  if (!raw || raw.trim() === "") {
    return null;
  }
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) {
    return null;
  }
  return Math.min(100, Math.max(0, Math.round(parsed)));
}

function parseImpactParam(raw: string | null): ActionImpactLevel | null {
  if (!raw) {
    return null;
  }
  return IMPACT_LEVELS.includes(raw as ActionImpactLevel)
    ? (raw as ActionImpactLevel)
    : null;
}

function parseFloorDateParam(url: URL, days: number): string | null {
  const rawFloorDate = url.searchParams.get("floorDate");
  if (rawFloorDate === "all") {
    return null;
  }
  if (rawFloorDate && rawFloorDate.trim().length > 0) {
    return rawFloorDate.trim().slice(0, 10);
  }
  return buildDateFloor(days);
}

function parseFiniteQueryNumber(url: URL, key: string): number | null {
  const raw = url.searchParams.get(key);
  if (!raw || raw.trim() === "") {
    return null;
  }
  const value = Number(raw);
  return Number.isFinite(value) ? value : null;
}

function parseViewportParam(url: URL): ActionMapViewportQuery | undefined {
  const south = parseFiniteQueryNumber(url, "south");
  const west = parseFiniteQueryNumber(url, "west");
  const north = parseFiniteQueryNumber(url, "north");
  const east = parseFiniteQueryNumber(url, "east");
  const zoom = parseFiniteQueryNumber(url, "zoom");

  if (
    south === null ||
    west === null ||
    north === null ||
    east === null ||
    south >= north ||
    west >= east ||
    south < -90 ||
    north > 90 ||
    west < -180 ||
    east > 180
  ) {
    return undefined;
  }

  return { south, west, north, east, zoom };
}

export function parseMapActionsParams(url: URL, parseEntityTypesParam: MapActionsRouteDependencies["parseEntityTypesParam"]): ParseMapActionsParams {
  const limit = parsePositiveInteger(url.searchParams.get("limit"), 1, 300, 80);
  const days = parsePositiveInteger(url.searchParams.get("days"), 1, 3650, 30);
  const actionId = url.searchParams.get("actionId")?.trim() || null;
  return {
    actionId,
    limit,
    days,
    status: parseStatusParam(url.searchParams.get("status")),
    floorDate: parseFloorDateParam(url, days),
    types: parseEntityTypesParam(url.searchParams.get("types")),
    qualityMin: parseQualityMin(url.searchParams.get("qualityMin")),
    impact: parseImpactParam(url.searchParams.get("impact")),
    scope: resolveReportScopeFromQuery(url),
    viewport: actionId ? undefined : parseViewportParam(url),
  };
}

export function filterPublicMapResponse(
  response: ActionMapResponse,
): PublicActionMapResponse {
  const items = response.items
    .filter((item) => item.status === "approved")
    .map(projectPublicActionMapItem);
  return {
    ...response,
    count: items.length,
    items,
  };
}

export async function buildMapActionsRouteResult(
  url: URL,
  deps: MapActionsRouteDependencies,
): Promise<MapActionsRouteResult> {
  const params = parseMapActionsParams(url, deps.parseEntityTypesParam);
  const supabase = deps.getSupabaseServerClient(false);
  const now = new Date();
  const result = await deps.fetchUnifiedActionContracts(supabase, {
    actionId: params.actionId,
    limit: Math.max(params.limit * 4, params.limit),
    status: params.status,
    includeFuturePublicActions: true,
    floorDate: params.floorDate,
    requireCoordinates: true,
    types: params.types,
    viewport: params.viewport,
  });

  const sourceHealth = result.sourceHealth ?? {
    partial: false,
    failedSources: [],
    availableSources: [],
    warnings: [],
  };
  const items = deps
    .filterActionContractsByScope(
      result.items
        .filter((contract) => isPublicMapContract(contract, now))
        .map((contract) => toPublicMapContract(contract, now)),
      params.scope,
    )
    .map((contract) => {
      const insights = deps.buildActionInsights(contract, now);
      return deps.toActionMapItem(contract, insights);
    })
    .filter((item) => {
      const coordinates = {
        latitude: item.contract?.location?.latitude ?? item.latitude,
        longitude: item.contract?.location?.longitude ?? item.longitude,
      };
      return (
        typeof coordinates.latitude === "number" &&
        Number.isFinite(coordinates.latitude) &&
        typeof coordinates.longitude === "number" &&
        Number.isFinite(coordinates.longitude)
      );
    })
    .filter((item) => {
      if (params.impact && item.impact_level !== params.impact) {
        return false;
      }
      if (params.qualityMin !== null && Number(item.quality_score ?? 0) < params.qualityMin) {
        return false;
      }
      return true;
    })
    .slice(0, params.limit);

  return {
    body: filterPublicMapResponse({
      status: "ok",
      count: items.length,
      daysWindow: params.floorDate === null ? null : params.days,
      items,
      sourceHealth,
      partialSource: sourceHealth.partial,
    }),
    headers: sourceHealth.partial
      ? {
          "X-Data-Warning": "Partial source data",
        }
      : undefined,
  };
}
