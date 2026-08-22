import { ACTION_STATUSES, type ActionStatus } from "@/lib/actions/types";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { toActionListItem } from "@/lib/actions/data-contract";
import {
  fetchUnifiedActionContracts,
  parseEntityTypesParam,
} from "@/lib/actions/unified-source";
import { buildActionInsights } from "@/lib/actions/insights";
import {
  filterActionContractsByScope,
  type ReportScope,
} from "@/lib/reports/scope";
import { resolveReportQuery } from "@/lib/reports/csv";

const QUALITY_GRADES = ["A", "B", "C"] as const;
const IMPACT_LEVELS = ["faible", "moyen", "fort", "critique"] as const;

type QualityGrade = (typeof QUALITY_GRADES)[number];
type ImpactLevel = (typeof IMPACT_LEVELS)[number];

export type ActionsRouteParams = {
  reportQuery: ReturnType<typeof resolveReportQuery>;
  limit: number;
  status: ActionStatus | null;
  days: number | null;
  floorDate: string | null;
  types: ReturnType<typeof parseEntityTypesParam>;
  qualityGrade: QualityGrade | null;
  toFixPriority: boolean | null;
  impact: ImpactLevel | null;
};

function parseStatusParam(raw: string | null): ActionStatus | null {
  if (!raw) {
    return null;
  }
  return ACTION_STATUSES.includes(raw as ActionStatus)
    ? (raw as ActionStatus)
    : null;
}

function parsePositiveInteger(
  raw: string | null,
  min: number,
  max: number,
  fallback: number,
): number {
  if (raw === null || raw.trim() === "") {
    return fallback;
  }
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return Math.min(max, Math.max(min, Math.trunc(parsed)));
}

function buildDateFloor(daysWindow: number): string {
  const now = new Date();
  now.setUTCHours(0, 0, 0, 0);
  now.setUTCDate(now.getUTCDate() - (daysWindow - 1));
  return now.toISOString().slice(0, 10);
}

function parseQualityGradeParam(raw: string | null): QualityGrade | null {
  if (!raw) {
    return null;
  }
  return QUALITY_GRADES.includes(raw as QualityGrade)
    ? (raw as QualityGrade)
    : null;
}

function parseBooleanFlag(raw: string | null): boolean | null {
  if (!raw) {
    return null;
  }
  const value = raw.trim().toLowerCase();
  if (value === "1" || value === "true" || value === "yes") {
    return true;
  }
  if (value === "0" || value === "false" || value === "no") {
    return false;
  }
  return null;
}

function parseImpactParam(raw: string | null): ImpactLevel | null {
  if (!raw) {
    return null;
  }
  return IMPACT_LEVELS.includes(raw as ImpactLevel)
    ? (raw as ImpactLevel)
    : null;
}

export function parseActionsRouteParams(url: URL): ActionsRouteParams {
  const reportQuery = resolveReportQuery(url);
  const limit = parsePositiveInteger(url.searchParams.get("limit"), 1, 200, 30);
  const status = parseStatusParam(url.searchParams.get("status"));
  const daysRaw = url.searchParams.get("days");
  const days =
    daysRaw === null ? null : parsePositiveInteger(daysRaw, 1, 3650, 90);

  return {
    reportQuery,
    limit,
    status,
    days,
    floorDate: days === null ? null : buildDateFloor(days),
    types: parseEntityTypesParam(url.searchParams.get("types")),
    qualityGrade: parseQualityGradeParam(
      url.searchParams.get("qualityGrade"),
    ),
    toFixPriority: parseBooleanFlag(url.searchParams.get("toFixPriority")),
    impact: parseImpactParam(url.searchParams.get("impact")),
  };
}

export function buildActionsSnapshotKey(params: ActionsRouteParams): string {
  return JSON.stringify({
    route: "api/actions",
    scopeKind: params.reportQuery.scopeKind,
    scopeValue:
      params.reportQuery.scopeKind === "association"
        ? params.reportQuery.scopeValue ?? params.reportQuery.association
        : params.reportQuery.scopeValue,
    limit: params.limit,
    status: params.status ?? "all",
    days: params.days ?? "all",
    types:
      params.types === null
        ? "all"
        : params.types.slice().sort().join(","),
    qualityGrade: params.qualityGrade ?? "all",
    toFixPriority:
      params.toFixPriority === null
        ? "all"
        : String(params.toFixPriority),
    impact: params.impact ?? "all",
  });
}

export async function buildActionsRoutePayload(params: ActionsRouteParams) {
  const supabase = getSupabaseServerClient();
  const result = await fetchUnifiedActionContracts(supabase, {
    limit: Math.max(params.limit * 2, params.limit),
    status: params.status,
    floorDate: params.floorDate,
    requireCoordinates: false,
    types: params.types,
  });

  const scope: ReportScope = {
    kind: params.reportQuery.scopeKind,
    value:
      params.reportQuery.scopeKind === "association"
        ? params.reportQuery.scopeValue ?? params.reportQuery.association
        : params.reportQuery.scopeValue,
  };
  const now = new Date();

  const items = filterActionContractsByScope(result.items, scope)
    .map((contract) => {
      const insights = buildActionInsights(contract, now);
      return toActionListItem(contract, insights);
    })
    .filter((item) => {
      if (
        params.qualityGrade &&
        item.quality_grade !== params.qualityGrade
      ) {
        return false;
      }
      if (
        params.toFixPriority !== null &&
        Boolean(item.to_fix_priority) !== params.toFixPriority
      ) {
        return false;
      }
      if (params.impact && item.impact_level !== params.impact) {
        return false;
      }
      return true;
    })
    .slice(0, params.limit);

  return {
    status: "ok" as const,
    source: "unified_actions" as const,
    count: items.length,
    items,
    sourceHealth: result.sourceHealth,
    partialSource: result.sourceHealth.partial,
  };
}
