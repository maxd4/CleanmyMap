import { NextResponse } from "next/server";
import { z } from "zod";
import { createActionSchema } from "@/lib/validation/action";
import {
  canManageActionsGlobally,
  canModerateActionsGlobally,
} from "@/lib/actions/permissions";
import {
  getCurrentUserActiveRole,
  getCurrentUserIdentity,
  requireAuthenticatedAccess,
} from "@/lib/authz";
import {
  toActionListItem,
  toPublicActionListItem,
  toPublicActionListResponse,
} from "@/lib/actions/data-contract";
import {
  forbiddenJsonResponse,
  unauthorizedJsonResponse,
} from "@/lib/http/auth-responses";
import {
  handleApiError,
  parseJsonBodyWithValidation,
  validationErrorResponse,
} from "@/lib/http/api-errors";
import { enforceServerRateLimit } from "@/lib/rate-limit/server";
import { requireActionRequestAccess } from "@/lib/auth/action-request-access";
import { loadOrRefreshPublicSurfaceSnapshot } from "@/lib/public-surface-snapshot-service";
import { executeActionCreation } from "./route.create";
import {
  buildActionsRoutePayload,
  getActionsSnapshotMeta,
  resolveActionListQuery,
} from "./route.query";

export const runtime = "nodejs";
// Justification Vercel: cette route varie selon la requete, le statut Clerk et le scope demande.
export const dynamic = "force-dynamic";

const ACTIONS_SNAPSHOT_TTL_MINUTES = 30;
const ACTIONS_SNAPSHOT_VERSION = "public-actions-v2";

function actionListResponse(payload: {
  partialSource?: boolean;
  [key: string]: unknown;
}) {
  return NextResponse.json(
    payload,
    payload.partialSource === true
      ? { headers: { "X-Data-Warning": "Partial source data" } }
      : undefined,
  );
}

async function requireGlobalActionsModerationAccess(): Promise<
  | { ok: true; userId: string }
  | { ok: false; status: 401 | 403; error: string }
> {
  const authenticated = await requireAuthenticatedAccess();
  if (!authenticated.ok) return authenticated;

  const activeRole = await getCurrentUserActiveRole();
  if (activeRole === "anonymous" || !canModerateActionsGlobally({ activeRole })) {
    return { ok: false, status: 403, error: "Forbidden" };
  }
  return authenticated;
}

function moderationResponse(
  access: { ok: false; status: 401 | 403; error: string },
) {
  return access.status === 401
    ? unauthorizedJsonResponse({ hint: access.error })
    : forbiddenJsonResponse({ hint: access.error });
}

export async function GET(request: Request) {
  try {
    const query = resolveActionListQuery(new URL(request.url));
    if (!query.readPolicy.usePublicSurfaceSnapshot) {
      // Keep the moderation boundary explicit in the route inspected by api-boundary.
      const access = await requireGlobalActionsModerationAccess();
      if (!access.ok) return moderationResponse(access);

      const payload = await buildActionsRoutePayload(
        query,
        toActionListItem,
        true,
      );
      return actionListResponse(payload);
    }

    const snapshot = await loadOrRefreshPublicSurfaceSnapshot({
      snapshotKey: query.snapshotKey,
      title: "Actions publiques",
      version: ACTIONS_SNAPSHOT_VERSION,
      ttlMinutes: ACTIONS_SNAPSHOT_TTL_MINUTES,
      buildPayload: async () =>
        buildActionsRoutePayload(query, toPublicActionListItem),
      meta: getActionsSnapshotMeta(query),
    });
    return actionListResponse(toPublicActionListResponse(snapshot.payload));
  } catch (error) {
    return handleApiError(error, "api/actions");
  }
}

type CreateActionRequest = z.infer<typeof createActionSchema>;

function resolveIdempotencyKey(request: Request): string | Response | undefined {
  const raw = request.headers.get("Idempotency-Key");
  const key = raw?.trim() || undefined;
  if (raw && (!key || key.length < 16 || key.length > 160)) {
    return validationErrorResponse({
      idempotencyKey: ["La clé de retry doit contenir entre 16 et 160 caractères."],
    });
  }
  return key;
}

function validateActionCreationPayload(payload: CreateActionRequest): Response | null {
  if ((payload.recordType ?? "action") === "action" && !payload.organizerType) {
    return validationErrorResponse({
      organizerType: ["Sélectionnez un type de structure."],
    });
  }
  return null;
}

export async function POST(request: Request) {
  const rateLimitResponse = await enforceServerRateLimit(request, {
    limit: 10,
    window: 60,
  });
  if (rateLimitResponse) return rateLimitResponse;

  // Authentication remains at the HTTP boundary; the service receives only this userId.
  const access = await requireActionRequestAccess(request);
  if (!access.ok) return unauthorizedJsonResponse();

  const idempotencyKey = resolveIdempotencyKey(request);
  if (idempotencyKey instanceof Response) return idempotencyKey;

  const parsed = await parseJsonBodyWithValidation(request, createActionSchema);
  if (!parsed.ok) return parsed.response;
  const payloadError = validateActionCreationPayload(parsed.data);
  if (payloadError) return payloadError;

  try {
    const identity = await getCurrentUserIdentity({ userId: access.userId });
    // This is the existing global-management policy input, not a route-local role check.
    const isCreatorGlobalAdmin = canManageActionsGlobally(identity);
    return await executeActionCreation({
      request,
      userId: access.userId,
      payload: parsed.data,
      idempotencyKey,
      identity,
      isCreatorGlobalAdmin,
    });
  } catch (error) {
    return handleApiError(error, "api/actions");
  }
}
