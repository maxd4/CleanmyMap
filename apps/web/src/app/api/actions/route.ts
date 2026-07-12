import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { ACTION_STATUSES, type ActionStatus } from "@/lib/actions/types";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { createActionSchema } from "@/lib/validation/action";
import {
  createAction,
  resolveActionCreationStatus,
} from "@/lib/actions/store";
import {
  canAutoApproveOwnAction,
  canUseAdminOverride,
} from "@/lib/actions/permissions";
import { getCurrentUserIdentity, pickTraceableActorName } from "@/lib/authz";
import { toActionListItem } from "@/lib/actions/data-contract";
import {
  resolveActionOrganizers,
  resolveDefaultActionOrganizerIds,
  resolveActionParticipants,
} from "@/lib/actions/organizers";
import {
  fetchUnifiedActionContracts,
  parseEntityTypesParam,
} from "@/lib/actions/unified-source";
import { buildActionInsights } from "@/lib/actions/insights";
import { filterActionContractsByScope, type ReportScope } from "@/lib/reports/scope";
import { hasAnalyticsConsentCookie } from "@/lib/analytics-consent";
import { buildPostActionRetentionLoop as buildActionRetentionLoop } from "@/lib/gamification/progression";
import { trackServerEvent } from "@/lib/analytics.server";
import { unauthorizedJsonResponse } from "@/lib/http/auth-responses";
import { handleApiError, validationErrorResponse } from "@/lib/http/api-errors";
import { resolveReportQuery } from "@/lib/reports/csv";
import { emitActionCreated, emitSpotCreated } from "@/lib/events/emit";
import { verifyRateLimit, createServerRateLimitResponse } from "@/lib/rate-limit";
import { getVolunteerActionValidationIssues } from "@/lib/actions/submission-validation";
import { loadOrRefreshPublicSurfaceSnapshot } from "@/lib/public-surface-snapshot-service";

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
    limit: Math.max(limit * 4, limit),
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
  const { userId } = await auth();
  if (!userId) {
    return unauthorizedJsonResponse();
  }

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
    const isSpontaneousAction =
      normalizedPayload.recordType === "action" &&
      normalizedPayload.associationName === "Action spontanée";
    const providedOrganizerAccounts = normalizedPayload.organizerAccounts ?? [];
    const organizerAccounts =
      providedOrganizerAccounts.length > 0
        ? providedOrganizerAccounts
        : normalizedPayload.recordType === "action" && !isSpontaneousAction
          ? resolveDefaultActionOrganizerIds({
              creatorUserId: userId,
              creatorIsAdminLike: isCreatorAdminLike,
            })
          : [];
    const organizerResolution =
      normalizedPayload.recordType === "action"
        ? await resolveActionOrganizers({
            supabase,
            creator: {
              userId,
              displayName: resolvedIdentity.displayName,
              handle: resolvedIdentity.handle,
              username: resolvedIdentity.username,
              email: resolvedIdentity.email,
            },
            organizerAccounts,
            includeCreatorAsPrimary: isSpontaneousAction,
        })
        : { organizers: [], unresolvedTokens: [] as string[] };

    if (organizerResolution.unresolvedTokens.length > 0) {
      return validationErrorResponse({
        organizerAccounts: [
          `Comptes organisateurs introuvables: ${organizerResolution.unresolvedTokens.join(", ")}`,
        ],
      });
    }

    const participantResolution =
      normalizedPayload.recordType === "action"
        ? await resolveActionParticipants({
            supabase,
            creator: {
              userId,
              displayName: resolvedIdentity.displayName,
              handle: resolvedIdentity.handle,
              username: resolvedIdentity.username,
              email: resolvedIdentity.email,
            },
            participantAccounts: normalizedPayload.participantAccounts,
            organizerIds: organizerResolution.organizers.map(
              (organizer) => organizer.userId,
            ),
          })
        : { participants: [], unresolvedTokens: [] as string[] };

    if (participantResolution.unresolvedTokens.length > 0) {
      return validationErrorResponse({
        participantAccounts: [
          `Comptes participants introuvables: ${participantResolution.unresolvedTokens.join(", ")}`,
        ],
      });
    }

    if (
      normalizedPayload.recordType === "clean_place" ||
      normalizedPayload.recordType === "spot"
    ) {
      const label = normalizedPayload.locationLabel.trim();
      if (label.length < 2) {
        return validationErrorResponse({
          locationLabel: ["Le lieu propre doit être renseigné."],
        });
      }

      const composedNotes = normalizedPayload.notes?.trim()
        ? `[spot-by:${actorName}] ${normalizedPayload.notes.trim()}`
        : `[spot-by:${actorName}]`;

      const inserted = await supabase
        .from("spots")
        .insert({
          created_by_clerk_id: userId,
          label,
          waste_type: normalizedPayload.recordType,
          latitude: normalizedPayload.latitude ?? null,
          longitude: normalizedPayload.longitude ?? null,
          status: "new",
          notes: composedNotes,
        })
        .select("id, created_at, label, waste_type, latitude, longitude, status, notes")
        .single();

      if (inserted.error) {
        return handleApiError(inserted.error, "POST /api/actions (spot insert)");
      }

      emitSpotCreated({
        spotId: String(inserted.data.id),
        userId,
        label: inserted.data.label,
        wasteType: inserted.data.waste_type,
      });

      const consentGranted = hasAnalyticsConsentCookie(request.headers.get("cookie"));
      if (consentGranted) {
        await trackServerEvent(
          userId,
          "spot_created",
          {
            waste_type: inserted.data.waste_type,
            location: inserted.data.label,
          },
          {
            consentGranted,
          },
        );
      }

      return NextResponse.json(
        { status: "created", id: inserted.data.id, source: "spots", retentionLoop: null },
        { status: 201 },
      );
    }

    const created = await createAction(supabase, {
      userId,
      payload: normalizedPayload,
      organizers: organizerResolution.organizers,
      manualParticipants: participantResolution.participants,
      status:
        normalizedPayload.recordType === "action"
          ? normalizedPayload.actionPhase === "post_action_draft"
            ? "pending"
            : canAutoApproveOwnSubmission
              ? "approved"
              : "pending"
          : resolveActionCreationStatus(canAutoApproveOwnSubmission),
    });

    emitActionCreated({
      actionId: created.id,
      userId,
      locationLabel: normalizedPayload.locationLabel,
      wasteKg: Number(normalizedPayload.wasteKg) || 0,
    });

    // Track if this is a new place
    import("@/lib/gamification/progression-tracking").then(({ trackNewPlaceVisited }) => {
      trackNewPlaceVisited(supabase, {
        userId,
        locationLabel: normalizedPayload.locationLabel,
      }).catch((err) => console.error("trackNewPlaceVisited error", err));
    });

    const retentionLoop = await buildActionRetentionLoop(supabase, {
      userId,
      actionId: created.id,
    }).catch(() => null);
    return NextResponse.json(
      { status: "created", id: created.id, source: "actions", retentionLoop },
      { status: 201 },
    );
  } catch (error) {
    return handleApiError(error, "api/actions");
  }
}
