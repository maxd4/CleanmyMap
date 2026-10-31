import { NextResponse } from "next/server";
import {
  removeActionBuddyAvailability,
  setActionBuddyAvailability,
} from "@/lib/actions/action-buddy";
import { requireAuthenticatedAccess } from "@/lib/authz";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { handleApiError } from "@/lib/http/api-errors";
import { unauthorizedJsonResponse } from "@/lib/http/auth-responses";
import { BUDDY_PRIVATE_HEADERS, resolveBuddyActionId, type BuddyActionContext } from "../route.shared";

export const runtime = "nodejs";
// Vercel contract: authenticated buddy availability requires a dynamic private response.
export const dynamic = "force-dynamic";

export async function PUT(_request: Request, context: BuddyActionContext) {
  const access = await requireAuthenticatedAccess();
  if (!access.ok) return unauthorizedJsonResponse();
  try {
    const actionId = await resolveBuddyActionId(context);
    if (typeof actionId !== "string") return actionId;
    const availability = await setActionBuddyAvailability(getSupabaseServerClient(true), {
      actionId,
      mentorUserId: access.userId,
    });
    return NextResponse.json({ status: "ok", availability }, { headers: BUDDY_PRIVATE_HEADERS });
  } catch (error) {
    return handleApiError(error, "PUT /api/actions/[actionId]/buddy/availability");
  }
}

export async function DELETE(_request: Request, context: BuddyActionContext) {
  const access = await requireAuthenticatedAccess();
  if (!access.ok) return unauthorizedJsonResponse();
  try {
    const actionId = await resolveBuddyActionId(context);
    if (typeof actionId !== "string") return actionId;
    const result = await removeActionBuddyAvailability(getSupabaseServerClient(true), {
      actionId,
      mentorUserId: access.userId,
    });
    return NextResponse.json({ status: "ok", ...result }, { headers: BUDDY_PRIVATE_HEADERS });
  } catch (error) {
    return handleApiError(error, "DELETE /api/actions/[actionId]/buddy/availability");
  }
}
