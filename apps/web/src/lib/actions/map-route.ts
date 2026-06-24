import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  ActionDataContract,
  ActionMapItem,
} from "@/lib/actions/data-contract";
import type {
  ActionImpactLevel,
  ActionMapResponse,
  ActionStatus,
  ActionRecordType,
  ActionQualityBreakdown,
  ActionQualityGrade,
} from "@/lib/actions/types";
import { ACTION_STATUSES } from "@/lib/actions/types";
import { buildDateFloor, parsePositiveInteger, resolveReportScopeFromQuery } from "@/lib/reports/csv";
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

export type ParseMapActionsParams = {
  limit: number;
  days: number;
  status: ActionStatus | null;
  floorDate: string | null;
  types: ActionRecordType[] | null;
  qualityMin: number | null;
  impact: ActionImpactLevel | null;
  scope: ReportScope;
};

export type MapActionsRouteDependencies = {
  getSupabaseServerClient: (useServiceRole?: boolean) => SupabaseClient;
  fetchUnifiedActionContracts: (
    supabase: SupabaseClient,
    params: {
      limit: number;
      status: ActionStatus | null;
      floorDate: string | null;
      requireCoordinates: boolean;
      types: ActionRecordType[] | null;
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
  ) => ActionMapItem;
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

function parseStatusParam(raw: string | null): ActionStatus | null {
  if (!raw || raw.trim() === "") {
    return "approved";
  }
  if (raw === "all") {
    return null;
  }
  return ACTION_STATUSES.includes(raw as ActionStatus)
    ? (raw as ActionStatus)
    : "approved";
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

export function parseMapActionsParams(url: URL, parseEntityTypesParam: MapActionsRouteDependencies["parseEntityTypesParam"]): ParseMapActionsParams {
  const limit = parsePositiveInteger(url.searchParams.get("limit"), 1, 300, 80);
  const days = parsePositiveInteger(url.searchParams.get("days"), 1, 3650, 30);
  return {
    limit,
    days,
    status: parseStatusParam(url.searchParams.get("status")),
    floorDate: parseFloorDateParam(url, days),
    types: parseEntityTypesParam(url.searchParams.get("types")),
    qualityMin: parseQualityMin(url.searchParams.get("qualityMin")),
    impact: parseImpactParam(url.searchParams.get("impact")),
    scope: resolveReportScopeFromQuery(url),
  };
}

export async function buildMapActionsRouteResult(
  url: URL,
  deps: MapActionsRouteDependencies,
): Promise<MapActionsRouteResult> {
  const params = parseMapActionsParams(url, deps.parseEntityTypesParam);
  const supabase = deps.getSupabaseServerClient(false);
  const result = await deps.fetchUnifiedActionContracts(supabase, {
    limit: Math.max(params.limit * 4, params.limit),
    status: params.status,
    floorDate: params.floorDate,
    requireCoordinates: true,
    types: params.types,
  });

  const now = new Date();
  const sourceHealth = result.sourceHealth ?? {
    partial: false,
    failedSources: [],
    availableSources: [],
    warnings: [],
  };
  const items = deps
    .filterActionContractsByScope(result.items, params.scope)
    .map((contract) => {
      const insights = deps.buildActionInsights(contract, now);
      return deps.toActionMapItem(contract, insights);
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
    body: {
      status: "ok",
      count: items.length,
      daysWindow: params.floorDate === null ? null : params.days,
      items,
      sourceHealth,
      partialSource: sourceHealth.partial,
    },
    headers: sourceHealth.partial
      ? {
          "X-Data-Warning": "Partial source data",
        }
      : undefined,
  };
}
