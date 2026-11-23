import { NextResponse } from "next/server";
import { getCurrentUserIdentity } from "@/lib/authz";
import { requireActionRequestAccess } from "@/lib/auth/action-request-access";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { removeActionRouteReference } from "@/lib/actions/action-media/action-media";
import { actionMediaErrorResponse } from "@/lib/actions/action-media/action-media-route-error";
import { unauthorizedJsonResponse } from "@/lib/http/auth-responses";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function DELETE(request: Request, context: { params: Promise<{ actionId: string; mediaId: string }> }) {
  const access = await requireActionRequestAccess(request);
  if (!access.ok) return unauthorizedJsonResponse();
  try {
    const { actionId, mediaId } = await context.params;
    const identity = await getCurrentUserIdentity({ userId: access.userId });
    await removeActionRouteReference(getSupabaseServerClient(true), { actionId, mediaId, userId: access.userId, identity });
    return NextResponse.json({ status: "ok" });
  } catch (error) {
    return actionMediaErrorResponse(error, "delete-route-reference");
  }
}
