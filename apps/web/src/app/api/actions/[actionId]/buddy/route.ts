import { NextResponse } from "next/server";
import {
  createActionBuddyRequest,
  cancelActionBuddyRequest,
  loadActionBuddyState,
} from "@/lib/actions/action-buddy";
import { requireAuthenticatedAccess } from "@/lib/authz";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { normalizeActionId } from "@/lib/actions/action-id";
import { handleApiError, validationErrorResponse } from "@/lib/http/api-errors";
import { unauthorizedJsonResponse } from "@/lib/http/auth-responses";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Context = { params: Promise<{ actionId: string }> };

async function resolveActionId(context: Context) {
  const actionId = normalizeActionId((await context.params).actionId);
  return actionId ?? validationErrorResponse({ actionId: ["Identifiant d'action manquant."] });
}

const privateHeaders = { "Cache-Control": "private, no-store" };

export async function GET(_request: Request, context: Context) {
  const access = await requireAuthenticatedAccess();
  if (!access.ok) return unauthorizedJsonResponse();
  try {
    const actionId = await resolveActionId(context);
    if (typeof actionId !== "string") return actionId;
    const state = await loadActionBuddyState(getSupabaseServerClient(true), { actionId, userId: access.userId });
    return NextResponse.json({ status: "ok", ...state }, { headers: privateHeaders });
  } catch (error) {
    return handleApiError(error, "GET /api/actions/[actionId]/buddy");
  }
}

export async function POST(_request: Request, context: Context) {
  const access = await requireAuthenticatedAccess();
  if (!access.ok) return unauthorizedJsonResponse();
  try {
    const actionId = await resolveActionId(context);
    if (typeof actionId !== "string") return actionId;
    const request = await createActionBuddyRequest(getSupabaseServerClient(true), {
      actionId,
      requesterUserId: access.userId,
    });
    return NextResponse.json({ status: "ok", request }, { status: 201, headers: privateHeaders });
  } catch (error) {
    return handleApiError(error, "POST /api/actions/[actionId]/buddy");
  }
}

export async function DELETE(_request: Request, context: Context) {
  const access = await requireAuthenticatedAccess();
  if (!access.ok) return unauthorizedJsonResponse();
  try {
    const actionId = await resolveActionId(context);
    if (typeof actionId !== "string") return actionId;
    const result = await cancelActionBuddyRequest(getSupabaseServerClient(true), {
      actionId,
      requesterUserId: access.userId,
    });
    return NextResponse.json({ status: "ok", ...result }, { headers: privateHeaders });
  } catch (error) {
    return handleApiError(error, "DELETE /api/actions/[actionId]/buddy");
  }
}
