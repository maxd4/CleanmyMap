import { NextResponse } from "next/server";
import {
  createActionBuddyRequest,
  cancelActionBuddyRequest,
  loadActionBuddyState,
} from "@/lib/actions/action-buddy";
import { requireAuthenticatedAccess } from "@/lib/authz";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { handleApiError } from "@/lib/http/api-errors";
import { unauthorizedJsonResponse } from "@/lib/http/auth-responses";
import { BUDDY_PRIVATE_HEADERS, resolveBuddyActionId, type BuddyActionContext } from "./route.shared";

export const runtime = "nodejs";
// Vercel contract: authenticated buddy state requires a dynamic private response.
export const dynamic = "force-dynamic";
// Vercel cache justification: authenticated buddy responses contain private
// state and use no-store; they must not be shared.

export async function GET(_request: Request, context: BuddyActionContext) {
  const access = await requireAuthenticatedAccess();
  if (!access.ok) return unauthorizedJsonResponse();
  try {
    const actionId = await resolveBuddyActionId(context);
    if (typeof actionId !== "string") return actionId;
    const state = await loadActionBuddyState(getSupabaseServerClient(true), { actionId, userId: access.userId });
    return NextResponse.json({ status: "ok", ...state }, { headers: BUDDY_PRIVATE_HEADERS });
  } catch (error) {
    return handleApiError(error, "GET /api/actions/[actionId]/buddy");
  }
}

export async function POST(_request: Request, context: BuddyActionContext) {
  const access = await requireAuthenticatedAccess();
  if (!access.ok) return unauthorizedJsonResponse();
  try {
    const actionId = await resolveBuddyActionId(context);
    if (typeof actionId !== "string") return actionId;
    const request = await createActionBuddyRequest(getSupabaseServerClient(true), {
      actionId,
      requesterUserId: access.userId,
    });
    return NextResponse.json({ status: "ok", request }, { status: 201, headers: BUDDY_PRIVATE_HEADERS });
  } catch (error) {
    return handleApiError(error, "POST /api/actions/[actionId]/buddy");
  }
}

export async function DELETE(_request: Request, context: BuddyActionContext) {
  const access = await requireAuthenticatedAccess();
  if (!access.ok) return unauthorizedJsonResponse();
  try {
    const actionId = await resolveBuddyActionId(context);
    if (typeof actionId !== "string") return actionId;
    const result = await cancelActionBuddyRequest(getSupabaseServerClient(true), {
      actionId,
      requesterUserId: access.userId,
    });
    return NextResponse.json({ status: "ok", ...result }, { headers: BUDDY_PRIVATE_HEADERS });
  } catch (error) {
    return handleApiError(error, "DELETE /api/actions/[actionId]/buddy");
  }
}
