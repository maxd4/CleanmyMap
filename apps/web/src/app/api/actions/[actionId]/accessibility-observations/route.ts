import { NextResponse } from "next/server";
import { resolveAccessibilitySupportOrganizerAccess } from "@/lib/actions/accessibility-support-access";
import {
  AccessibilityObservationConflictError,
  AccessibilityObservationValidationError,
  getActionAccessibilityObservationState,
  isValidAccessibilityObservedDate,
  updateActionAccessibilityObservation,
} from "@/lib/actions/accessibility-observations";
import { requireAuthenticatedAccess } from "@/lib/authz";
import { handleApiError } from "@/lib/http/api-errors";
import { unauthorizedJsonResponse } from "@/lib/http/auth-responses";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const PRIVATE_HEADERS = { "Cache-Control": "private, no-store, max-age=0" };
type Context = { params: Promise<{ actionId: string }> };

function conflictResponse(message: string) {
  return NextResponse.json({ error: message, code: "revision_conflict" }, { status: 409, headers: PRIVATE_HEADERS });
}

function invalidResponse(message: string) {
  return NextResponse.json({ error: message }, { status: 422, headers: PRIVATE_HEADERS });
}

export async function GET(_request: Request, context: Context) {
  const access = await requireAuthenticatedAccess();
  if (!access.ok) return unauthorizedJsonResponse();
  try {
    const actionId = (await context.params).actionId.trim();
    if (!actionId) return NextResponse.json({ error: "Action introuvable." }, { status: 404, headers: PRIVATE_HEADERS });
    const supabase = getSupabaseServerClient(true);
    const resolved = await resolveAccessibilitySupportOrganizerAccess(supabase, { actionId, userId: access.userId });
    if (!resolved.action) return NextResponse.json({ error: "Action introuvable." }, { status: 404, headers: PRIVATE_HEADERS });
    if (!resolved.isOrganizer) return NextResponse.json({ error: "Forbidden." }, { status: 403, headers: PRIVATE_HEADERS });
    if (typeof resolved.action.updated_at !== "string") {
      return NextResponse.json({ error: "La révision de l’action est indisponible." }, { status: 503, headers: PRIVATE_HEADERS });
    }
    return NextResponse.json({
      status: "ok",
      ...getActionAccessibilityObservationState(resolved.action.preparation_data, resolved.action.updated_at),
    }, { headers: PRIVATE_HEADERS });
  } catch (error) {
    return handleApiError(error, "GET /api/actions/[actionId]/accessibility-observations");
  }
}

export async function PATCH(request: Request, context: Context) {
  const access = await requireAuthenticatedAccess();
  if (!access.ok) return unauthorizedJsonResponse();
  try {
    const actionId = (await context.params).actionId.trim();
    if (!actionId) return NextResponse.json({ error: "Action introuvable." }, { status: 404, headers: PRIVATE_HEADERS });
    let body: unknown;
    try { body = await request.json(); } catch { return invalidResponse("Invalid JSON payload."); }
    if (!body || typeof body !== "object" || Array.isArray(body)) return invalidResponse("Invalid observation payload.");

    const value = body as Record<string, unknown>;
    const allowedKeys = new Set(["expectedRevision", "measurementKey", "definitionHash", "observed", "evidenceKind", "observedAt"]);
    if (Object.keys(value).some((key) => !allowedKeys.has(key))
      || typeof value.expectedRevision !== "string" || value.expectedRevision.length > 64
      || typeof value.measurementKey !== "string" || !/^[a-z0-9][a-z0-9._:-]{0,127}$/i.test(value.measurementKey)
      || typeof value.definitionHash !== "string" || !/^[a-f0-9]{64}$/i.test(value.definitionHash)
      || typeof value.observed !== "boolean") {
      return invalidResponse("Invalid observation fields.");
    }
    if (value.observed && (
      (value.evidenceKind !== "organizer_observation" && value.evidenceKind !== "participant_feedback")
      || !isValidAccessibilityObservedDate(value.observedAt)
    )) {
      return invalidResponse("Invalid observation evidence or date.");
    }

    const supabase = getSupabaseServerClient(true);
    const resolved = await resolveAccessibilitySupportOrganizerAccess(supabase, { actionId, userId: access.userId });
    if (!resolved.action) return NextResponse.json({ error: "Action introuvable." }, { status: 404, headers: PRIVATE_HEADERS });
    if (!resolved.isOrganizer) return NextResponse.json({ error: "Forbidden." }, { status: 403, headers: PRIVATE_HEADERS });
    const state = await updateActionAccessibilityObservation(supabase, {
      actionId,
      expectedRevision: value.expectedRevision,
      measurementKey: value.measurementKey,
      definitionHash: value.definitionHash,
      observed: value.observed,
      ...(value.observed ? {
        evidenceKind: value.evidenceKind as "organizer_observation" | "participant_feedback",
        observedAt: value.observedAt as string,
      } : {}),
    });
    return NextResponse.json({ status: "ok", ...state }, { headers: PRIVATE_HEADERS });
  } catch (error) {
    if (error instanceof AccessibilityObservationConflictError) return conflictResponse(error.message);
    if (error instanceof AccessibilityObservationValidationError) return invalidResponse(error.message);
    return handleApiError(error, "PATCH /api/actions/[actionId]/accessibility-observations");
  }
}
