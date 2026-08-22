import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import {
  buildActionsRoutePayload,
  buildActionsSnapshotKey,
  parseActionsRouteParams,
} from "@/lib/actions/actions-list-route";
import { submitActionCreation } from "@/lib/actions/actions-submit-route";
import { createActionSchema } from "@/lib/validation/action";
import { hasAnalyticsConsentCookie } from "@/lib/analytics-consent";
import { unauthorizedJsonResponse } from "@/lib/http/auth-responses";
import { handleApiError, validationErrorResponse } from "@/lib/http/api-errors";
import {
  createServerRateLimitResponse,
  verifyRateLimit,
} from "@/lib/rate-limit";
import { loadOrRefreshPublicSurfaceSnapshot } from "@/lib/public-surface-snapshot-service";

export const runtime = "nodejs";
// Justification Vercel: cette route varie selon la requete, le statut Clerk et le scope demande.
export const dynamic = "force-dynamic";

const ACTIONS_SNAPSHOT_TTL_MINUTES = 30;
const ACTIONS_SNAPSHOT_VERSION = "public-actions-v1";

export async function GET(request: Request) {
  try {
    const params = parseActionsRouteParams(new URL(request.url));
    const snapshot = await loadOrRefreshPublicSurfaceSnapshot({
      snapshotKey: buildActionsSnapshotKey(params),
      title: "Actions publiques",
      version: ACTIONS_SNAPSHOT_VERSION,
      ttlMinutes: ACTIONS_SNAPSHOT_TTL_MINUTES,
      buildPayload: async () => buildActionsRoutePayload(params),
      meta: {
        route: "api/actions",
        limit: params.limit,
        status: params.status,
        days: params.days,
        types: params.types,
        qualityGrade: params.qualityGrade,
        toFixPriority: params.toFixPriority,
        impact: params.impact,
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
    const recordType = parsed.data.recordType;
    const analyticsConsentGranted =
      recordType === "clean_place" || recordType === "spot"
        ? hasAnalyticsConsentCookie(request.headers.get("cookie"))
        : false;

    const result = await submitActionCreation({
      userId,
      payload: parsed.data,
      analyticsConsentGranted,
    });

    if (result.kind === "validation-error") {
      return validationErrorResponse(result.details);
    }

    if (result.kind === "api-error") {
      return handleApiError(result.error, result.context);
    }

    return NextResponse.json(result.body, { status: 201 });
  } catch (error) {
    return handleApiError(error, "api/actions");
  }
}
