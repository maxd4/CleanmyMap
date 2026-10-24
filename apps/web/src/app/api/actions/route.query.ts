import { getSupabaseServerClient } from "@/lib/supabase/server";
import { ACTION_STATUSES, type ActionStatus } from "@/lib/actions/types";
import {
  toActionListItem,
  toPublicActionListItem,
} from "@/lib/actions/data-contract";
import type { ActionDataContract, ActionEntityType } from "@/lib/actions/data-contract";
import {
  fetchUnifiedActionContracts,
  parseEntityTypesParam,
} from "@/lib/actions/unified-source";
import { buildActionInsights } from "@/lib/actions/insights";
import { filterActionContractsByScope, type ReportScope } from "@/lib/reports/scope";
import { buildDateFloor, resolveReportQuery } from "@/lib/reports/csv";
import { parsePositiveInteger } from "@/lib/http/query-params";
import { isActionStartInFuture } from "@/lib/actions/temporal";

const QUALITY_GRADES = ["A", "B", "C"] as const;
const IMPACT_LEVELS = ["faible", "moyen", "fort", "critique"] as const;

export type ActionsReadPolicy = {
  status: ActionStatus | null;
  usePublicSurfaceSnapshot: boolean;
};

export type ResolvedActionListQuery = {
  reportQuery: ReturnType<typeof resolveReportQuery>;
  limit: number;
  readPolicy: ActionsReadPolicy;
  days: number | null;
  types: ActionEntityType[] | null;
  qualityGrade: (typeof QUALITY_GRADES)[number] | null;
  toFixPriority: boolean | null;
  impact: (typeof IMPACT_LEVELS)[number] | null;
  view: string;
  futureOnly: boolean;
  snapshotKey: string;
};

type ActionListItemMapper = typeof toActionListItem | typeof toPublicActionListItem;

function parseStatusParam(raw: string | null): ActionStatus | null {
  if (!raw || raw === "all") return null;
  return ACTION_STATUSES.includes(raw as ActionStatus)
    ? (raw as ActionStatus)
    : null;
}

function parseQualityGradeParam(
  raw: string | null,
): (typeof QUALITY_GRADES)[number] | null {
  if (!raw) return null;
  return QUALITY_GRADES.includes(raw as (typeof QUALITY_GRADES)[number])
    ? (raw as (typeof QUALITY_GRADES)[number])
    : null;
}

function parseBooleanFlag(raw: string | null): boolean | null {
  if (!raw) return null;
  const value = raw.trim().toLowerCase();
  if (["1", "true", "yes"].includes(value)) return true;
  if (["0", "false", "no"].includes(value)) return false;
  return null;
}

function parseImpactParam(
  raw: string | null,
): (typeof IMPACT_LEVELS)[number] | null {
  if (!raw) return null;
  return IMPACT_LEVELS.includes(raw as (typeof IMPACT_LEVELS)[number])
    ? (raw as (typeof IMPACT_LEVELS)[number])
    : null;
}

function resolveActionListFilters(url: URL) {
  return {
    types: parseEntityTypesParam(url.searchParams.get("types")),
    qualityGrade: parseQualityGradeParam(url.searchParams.get("qualityGrade")),
    toFixPriority: parseBooleanFlag(url.searchParams.get("toFixPriority")),
    impact: parseImpactParam(url.searchParams.get("impact")),
  };
}

export function resolveActionsReadPolicy(rawStatus: string | null): ActionsReadPolicy {
  const requestedStatus = parseStatusParam(rawStatus);
  const includesNonPublicState =
    rawStatus?.trim() === "all" ||
    requestedStatus === "pending" ||
    requestedStatus === "rejected" ||
    requestedStatus === "cancelled";

  return {
    // An omitted, empty or invalid status is public-safe and must not mean
    // "all". Explicit non-public states stay behind moderation access.
    status: includesNonPublicState ? requestedStatus : "approved",
    usePublicSurfaceSnapshot: !includesNonPublicState,
  };
}

function sortEntityTypes(types: string[] | null): string {
  return types === null
    ? "all"
    : types
        .slice()
        .sort((left, right) => (left < right ? -1 : left > right ? 1 : 0))
        .join(",");
}

function buildActionsSnapshotKey(query: Omit<ResolvedActionListQuery, "snapshotKey">): string {
  return JSON.stringify({
    route: "api/actions",
    scopeKind: query.reportQuery.scopeKind,
    scopeValue:
      query.reportQuery.scopeKind === "association"
        ? query.reportQuery.scopeValue ?? query.reportQuery.association
        : query.reportQuery.scopeValue,
    limit: query.limit,
    status: query.readPolicy.status ?? "all",
    days: query.days ?? "all",
    types: sortEntityTypes(query.types),
    qualityGrade: query.qualityGrade ?? "all",
    toFixPriority:
      query.toFixPriority === null ? "all" : String(query.toFixPriority),
    impact: query.impact ?? "all",
    view: query.view,
  });
}

export function resolveActionListQuery(url: URL): ResolvedActionListQuery {
  const reportQuery = resolveReportQuery(url);
  const limit = parsePositiveInteger(url.searchParams.get("limit"), 1, 200, 30);
  const daysRaw = url.searchParams.get("days");
  const days = daysRaw === null
    ? null
    : parsePositiveInteger(daysRaw, 1, 3650, 90);
  const filters = resolveActionListFilters(url);
  const queryWithoutKey = {
    reportQuery,
    limit,
    readPolicy: resolveActionsReadPolicy(url.searchParams.get("status")),
    days,
    ...filters,
    view: url.searchParams.get("view") ?? "all",
    futureOnly: url.searchParams.get("view") === "future",
  };

  return {
    ...queryWithoutKey,
    snapshotKey: buildActionsSnapshotKey(queryWithoutKey),
  };
}

function isFutureActionContract(contract: ActionDataContract): boolean {
  return (
    contract.source === "actions" &&
    contract.type === "action" &&
    Boolean(contract.publishedAt) &&
    contract.metadata?.actionPhase === "pre_action" &&
    isActionStartInFuture({
      action_date: contract.dates.observedAt,
      event_start_time: contract.dates.eventStartTime,
    })
  );
}

function matchesListFilters(
  item: ReturnType<typeof toActionListItem>,
  query: ResolvedActionListQuery,
): boolean {
  return (
    (!query.qualityGrade || item.quality_grade === query.qualityGrade) &&
    (query.toFixPriority === null ||
      Boolean(item.to_fix_priority) === query.toFixPriority) &&
    (!query.impact || item.impact_level === query.impact)
  );
}

export async function buildActionsRoutePayload(
  query: ResolvedActionListQuery,
  toListItem: ActionListItemMapper,
  includePrivateActions = false,
) {
  const floorDate = query.futureOnly || query.days === null
    ? null
    : buildDateFloor(query.days);
  const supabase = getSupabaseServerClient(true);
  const result = await fetchUnifiedActionContracts(supabase, {
    limit: Math.max(query.limit * 2, query.limit),
    status: query.readPolicy.status,
    includeFuturePublicActions: query.futureOnly,
    futureOnly: query.futureOnly,
    floorDate,
    requireCoordinates: false,
    types: query.types,
    includePrivateActions,
  });
  const scope: ReportScope = {
    kind: query.reportQuery.scopeKind,
    value:
      query.reportQuery.scopeKind === "association"
        ? query.reportQuery.scopeValue ?? query.reportQuery.association
        : query.reportQuery.scopeValue,
  };
  const now = new Date();
  const items = filterActionContractsByScope(result.items, scope)
    .filter((contract) => !query.futureOnly || isFutureActionContract(contract))
    .map((contract) => toListItem(contract, buildActionInsights(contract, now)))
    .filter((item) => matchesListFilters(item, query))
    .slice(0, query.limit);

  return {
    status: "ok" as const,
    source: "unified_actions" as const,
    count: items.length,
    items,
    sourceHealth: result.sourceHealth,
    partialSource: result.sourceHealth.partial,
  };
}

export function getActionsSnapshotMeta(query: ResolvedActionListQuery) {
  return {
    route: "api/actions",
    limit: query.limit,
    status: query.readPolicy.status,
    days: query.days,
    types: query.types,
    qualityGrade: query.qualityGrade,
    toFixPriority: query.toFixPriority,
    impact: query.impact,
  };
}
