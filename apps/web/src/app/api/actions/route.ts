import { NextResponse } from "next/server";
import { ACTION_STATUSES, type ActionStatus } from "@/lib/actions/types";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { createActionSchema } from "@/lib/validation/action";
import {
  canAutoApproveOwnAction,
  canUseAdminOverride,
} from "@/lib/actions/permissions";
import {
  getCurrentUserIdentity,
  pickTraceableActorName,
  requireAuthenticatedAccess,
} from "@/lib/authz";
import { toActionListItem } from "@/lib/actions/data-contract";
import {
  fetchUnifiedActionContracts,
  parseEntityTypesParam,
} from "@/lib/actions/unified-source";
import {
  ActionCreationValidationError,
  createActionSubmission,
} from "@/lib/actions/create-submission";
import { buildActionInsights } from "@/lib/actions/insights";
import { filterActionContractsByScope, type ReportScope } from "@/lib/reports/scope";
import { unauthorizedJsonResponse } from "@/lib/http/auth-responses";
import { handleApiError, validationErrorResponse } from "@/lib/http/api-errors";
import { resolveReportQuery } from "@/lib/reports/csv";
import { verifyRateLimit, createServerRateLimitResponse } from "@/lib/rate-limit";
import { getVolunteerActionValidationIssues } from "@/lib/actions/submission-validation";
import { loadOrRefreshPublicSurfaceSnapshot } from "@/lib/public-surface-snapshot-service";
import { hasAnalyticsConsentCookie } from "@/lib/analytics-consent";

export const runtime = "nodejs";
// Justification Vercel: cette route varie selon la requete, le statut Clerk et le scope demande.
export const dynamic = "force-dynamic";

const QUALITY_GRADES = ["A", "B", "C"] as const;
const IMPACT_LEVELS = ["faible", "moyen", "fort", "critique"] as const;
const ACTIONS_SNAPSHOT_TTL_MINUTES = 30;
const ACTIONS_SNAPSHOT_VERSION = "public-actions-v1";

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

function parseQualityGradeParam(
  raw: string | null,
): (typeof QUALITY_GRADES)[number] | null {
  if (!raw) {
    return null;
  }
  return QUALITY_GRADES.includes(raw as (typeof QUALITY_GRADES)[number])
    ? (raw as (typeof QUALITY_GRADES)[number])
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

function parseImpactParam(
  raw: string | null,
): (typeof IMPACT_LEVELS)[number] | null {
  if (!raw) {
    return null;
  }
  return IMPACT_LEVELS.includes(raw as (typeof IMPACT_LEVELS)[number])
    ? (raw as (typeof IMPACT_LEVELS)[number])
    : null;
}

function buildActionsSnapshotKey(params: {
  reportQuery: ReturnType<typeof resolveReportQuery>;
  limit: number;
  status: ActionStatus | null;
  days: number | null;
  types: string;
  qualityGrade: (typeof QUALITY_GRADES)[number] | null;
  toFixPriority: boolean | null;
  impact: (typeof IMPACT_LEVELS)[number] | null;
}): string {
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
    types: params.types,
    qualityGrade: params.qualityGrade ?? "all",
    toFixPriority:
      params.toFixPriority === null ? "all" : String(params.toFixPriority),
    impact: params.impact ?? "all",
  });
}

async function buildActionsRoutePayload(url: URL) {
  const reportQuery = resolveReportQuery(url);
  const limit = parsePositiveInteger(url.searchParams.get("limit"), 1, 200, 30);
  const status = parseStatusParam(url.searchParams.get("status"));
  const daysRaw = url.searchParams.get("days");
  const days =
    daysRaw === null ? null : parsePositiveInteger(daysRaw, 1, 3650, 90);
  const floorDate = days === null ? null : buildDateFloor(days);
  const types = parseEntityTypesParam(url.searchParams.get("types"));
  const qualityGrade = parseQualityGradeParam(
    url.searchParams.get("qualityGrade"),
  );
  const toFixPriority = parseBooleanFlag(url.searchParams.get("toFixPriority"));
  const impact = parseImpactParam(url.searchParams.get("impact"));

  const supabase = getSupabaseServerClient();
  const result = await fetchUnifiedActionContracts(supabase, {
    limit: Math.max(limit * 2, limit),
    status,
    floorDate,
    requireCoordinates: false,
    types,
  });

  const now = new Date();
  const scope: ReportScope = {
    kind: reportQuery.scopeKind,
    value:
      reportQuery.scopeKind === "association"
        ? reportQuery.scopeValue ?? reportQuery.association
        : reportQuery.scopeValue,
  };

  const items = filterActionContractsByScope(result.items, scope)
    .map((contract) => {
      const insights = buildActionInsights(contract, now);
      return toActionListItem(contract, insights);
    })
    .filter((item) => {
      if (qualityGrade && item.quality_grade !== qualityGrade) {
        return false;
      }
      if (
        toFixPriority !== null &&
        Boolean(item.to_fix_priority) !== toFixPriority
      ) {
        return false;
      }
      if (impact && item.impact_level !== impact) {
        return false;
      }
      return true;
    })
    .slice(0, limit);

  return {
    status: "ok" as const,
    source: "unified_actions" as const,
    count: items.length,
    items,
    sourceHealth: result.sourceHealth,
    partialSource: result.sourceHealth.partial,
  };
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const reportQuery = resolveReportQuery(url);
    const limit = parsePositiveInteger(url.searchParams.get("limit"), 1, 200, 30);
    const status = parseStatusParam(url.searchParams.get("status"));
    const daysRaw = url.searchParams.get("days");
    const days =
      daysRaw === null ? null : parsePositiveInteger(daysRaw, 1, 3650, 90);
    const types = parseEntityTypesParam(url.searchParams.get("types"));
    const qualityGrade = parseQualityGradeParam(
      url.searchParams.get("qualityGrade"),
    );
    const toFixPriority = parseBooleanFlag(url.searchParams.get("toFixPriority"));
    const impact = parseImpactParam(url.searchParams.get("impact"));

    const snapshotKey = buildActionsSnapshotKey({
      reportQuery,
      limit,
      status,
      days,
      types: types === null ? "all" : types.slice().sort().join(","),
      qualityGrade,
      toFixPriority,
      impact,
    });

    const snapshot = await loadOrRefreshPublicSurfaceSnapshot({
      snapshotKey,
      title: "Actions publiques",
      version: ACTIONS_SNAPSHOT_VERSION,
      ttlMinutes: ACTIONS_SNAPSHOT_TTL_MINUTES,
      buildPayload: async () => buildActionsRoutePayload(url),
      meta: {
        route: "api/actions",
        limit,
        status,
        days,
        types,
        qualityGrade,
        toFixPriority,
        impact,
      },
    });

    return NextResponse.json(
      snapshot.payload,
      snapshot.payload.partialSource
        ? {
            headers: {
              "X-Data-Warning": "Partial source data",
            },
          }
        : undefined,
    );
  } catch (error) {
    return handleApiError(error, "api/actions");
  }
}

export async function POST(request: Request) {
  const access = await requireAuthenticatedAccess();
  if (!access.ok) {
    return unauthorizedJsonResponse();
  }
  const { userId } = access;

  const rateLimit = await verifyRateLimit({
    limit: 10,
    window: 60,
    key: userId,
  });

  const rateLimitResponse = createServerRateLimitResponse(
    rateLimit.allowed,
    rateLimit.retryAfter,
  );
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON payload" },
      { status: 400 },
    );
  }

  const parsed = createActionSchema.safeParse(payload);
  if (!parsed.success) {
    return validationErrorResponse(parsed.error.flatten().fieldErrors);
  }

  try {
    const supabase = getSupabaseServerClient();
    const identity = await getCurrentUserIdentity();
    const isCreatorAdminLike = canUseAdminOverride(identity);
    const canAutoApproveOwnSubmission = canAutoApproveOwnAction(identity, {
      createdByClerkId: userId,
    });
    const resolvedIdentity = identity ?? {
      displayName: userId,
      handle: userId,
      username: userId,
      email: null,
    };
    const actorName = pickTraceableActorName(identity, parsed.data.actorName);
    const normalizedPayload = {
      ...parsed.data,
      actorName,
    };
    const isQuickSubmission = normalizedPayload.submissionMode === "quick";
    if (!isQuickSubmission) {
      const volunteerIssues = getVolunteerActionValidationIssues(normalizedPayload);
      if (volunteerIssues.length > 0) {
        const details = volunteerIssues.reduce<Record<string, string[]>>(
          (acc, issue) => {
            const current = acc[issue.field] ?? [];
            current.push(issue.message);
            acc[issue.field] = current;
            return acc;
          },
          {},
        );
        return validationErrorResponse(details);
      }
    }
    try {
      const created = await createActionSubmission({
        supabase,
        userId,
        payload: normalizedPayload,
        creator: {
          userId,
          displayName: resolvedIdentity.displayName,
          handle: resolvedIdentity.handle,
          username: resolvedIdentity.username,
          email: resolvedIdentity.email,
        },
        isCreatorAdminLike,
        canAutoApproveOwnSubmission,
        consentGranted: hasAnalyticsConsentCookie(request.headers.get("cookie")),
      });

      return NextResponse.json(
        {
          status: "created",
          id: created.id,
          source: created.source,
          retentionLoop: created.kind === "action" ? created.retentionLoop : null,
        },
        { status: 201 },
      );
    } catch (error) {
      if (error instanceof ActionCreationValidationError) {
        return validationErrorResponse(error.fieldErrors);
      }
      throw error;
    }
  } catch (error) {
    return handleApiError(error, "api/actions");
  }
}
