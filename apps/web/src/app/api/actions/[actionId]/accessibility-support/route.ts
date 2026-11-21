import { NextResponse } from "next/server";
import { canManageAction } from "@/lib/actions/permissions";
import {
  deleteOwnActionAccessibilitySupportRequest,
  loadActionAccessibilitySupportRequestsForOrganizer,
  loadOwnActionAccessibilitySupportRequest,
  saveActionAccessibilitySupportRequest,
  updateActionAccessibilityCheckIn,
} from "@/lib/actions/accessibility-support";
import { loadCanonicalActionOrganizerIdsForAction } from "@/lib/actions/participation/organizers";
import { loadActionById } from "@/lib/actions/store";
import { getCurrentUserIdentity, requireAuthenticatedAccess } from "@/lib/authz";
import { handleApiError } from "@/lib/http/api-errors";
import { unauthorizedJsonResponse } from "@/lib/http/auth-responses";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
// Vercel justification: personalized support endpoints require dynamic Clerk-scoped access.
export const dynamic = "force-dynamic";
// Private individual requests must never enter a shared cache; every response uses no-store.
const PRIVATE_HEADERS = { "Cache-Control": "private, no-store, max-age=0" };

type AccessibilitySupportContext = { params: Promise<{ actionId: string }> };

async function resolveActionId(context: AccessibilitySupportContext): Promise<string> {
  const { actionId } = await context.params;
  return actionId.trim();
}

async function resolveOrganizerAccess(actionId: string, userId: string) {
  const supabase = getSupabaseServerClient(true);
  const action = await loadActionById(supabase, actionId);
  if (!action) return { supabase, action: null, isOrganizer: false };
  const identity = await getCurrentUserIdentity({ userId });
  const organizerIds = await loadCanonicalActionOrganizerIdsForAction(supabase, actionId);
  return {
    supabase,
    action,
    isOrganizer: canManageAction(
      { userId, role: identity?.role ?? null, activeRole: identity?.activeRole ?? null },
      { createdByClerkId: action.created_by_clerk_id },
      organizerIds,
    ),
  };
}

function notFound() {
  return NextResponse.json({ error: "Action introuvable." }, { status: 404, headers: PRIVATE_HEADERS });
}

export async function GET(_request: Request, context: AccessibilitySupportContext) {
  const access = await requireAuthenticatedAccess();
  if (!access.ok) return unauthorizedJsonResponse();
  try {
    const actionId = await resolveActionId(context);
    if (!actionId) return notFound();
    const resolved = await resolveOrganizerAccess(actionId, access.userId);
    if (!resolved.action) return notFound();
    if (resolved.isOrganizer) {
      const requests = await loadActionAccessibilitySupportRequestsForOrganizer(resolved.supabase, { actionId });
      return NextResponse.json({ status: "ok", audience: "organizer", requests }, { headers: PRIVATE_HEADERS });
    }
    const request = await loadOwnActionAccessibilitySupportRequest(resolved.supabase, { actionId, userId: access.userId });
    return NextResponse.json({ status: "ok", audience: "participant", request }, { headers: PRIVATE_HEADERS });
  } catch (error) {
    return handleApiError(error, "GET /api/actions/[actionId]/accessibility-support");
  }
}

export async function PUT(request: Request, context: AccessibilitySupportContext) {
  const access = await requireAuthenticatedAccess();
  if (!access.ok) return unauthorizedJsonResponse();
  try {
    const actionId = await resolveActionId(context);
    if (!actionId) return notFound();
    let body: unknown;
    try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 }); }
    const saved = await saveActionAccessibilitySupportRequest(getSupabaseServerClient(true), {
      actionId,
      userId: access.userId,
      body,
    });
    return NextResponse.json({ status: "ok", request: saved }, { headers: PRIVATE_HEADERS });
  } catch (error) {
    return handleApiError(error, "PUT /api/actions/[actionId]/accessibility-support");
  }
}

export async function PATCH(request: Request, context: AccessibilitySupportContext) {
  const access = await requireAuthenticatedAccess();
  if (!access.ok) return unauthorizedJsonResponse();
  try {
    const actionId = await resolveActionId(context);
    if (!actionId) return notFound();
    let body: unknown;
    try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 }); }
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json({ error: "Invalid check-in payload." }, { status: 422 });
    }
    const value = body as Record<string, unknown>;
    const fields = new Set(["arrival_status", "contact_status", "departure_status"]);
    if (typeof value.requestId !== "string" || !fields.has(String(value.field)) || !["completed", "not_applicable"].includes(String(value.status))) {
      return NextResponse.json({ error: "Invalid check-in fields." }, { status: 422 });
    }
    const resolved = await resolveOrganizerAccess(actionId, access.userId);
    if (!resolved.action) return notFound();
    if (!resolved.isOrganizer) return NextResponse.json({ error: "Forbidden." }, { status: 403, headers: PRIVATE_HEADERS });
    const updated = await updateActionAccessibilityCheckIn(resolved.supabase, {
      actionId,
      requestId: value.requestId,
      field: value.field as "arrival_status" | "contact_status" | "departure_status",
      status: value.status as "completed" | "not_applicable",
    });
    return NextResponse.json({ status: "ok", request: updated }, { headers: PRIVATE_HEADERS });
  } catch (error) {
    return handleApiError(error, "PATCH /api/actions/[actionId]/accessibility-support");
  }
}

export async function DELETE(_request: Request, context: AccessibilitySupportContext) {
  const access = await requireAuthenticatedAccess();
  if (!access.ok) return unauthorizedJsonResponse();
  try {
    const actionId = await resolveActionId(context);
    if (!actionId) return notFound();
    await deleteOwnActionAccessibilitySupportRequest(getSupabaseServerClient(true), {
      actionId,
      userId: access.userId,
    });
    return NextResponse.json({ status: "ok", deleted: true }, { headers: PRIVATE_HEADERS });
  } catch (error) {
    return handleApiError(error, "DELETE /api/actions/[actionId]/accessibility-support");
  }
}
