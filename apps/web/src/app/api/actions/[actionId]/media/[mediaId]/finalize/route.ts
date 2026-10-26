import { NextResponse } from "next/server";
import { getCurrentUserIdentity } from "@/lib/authz";
import { requireActionRequestAccess } from "@/lib/auth/action-request-access";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { finalizeActionMedia } from "@/lib/actions/action-media/action-media";
import { unauthorizedJsonResponse } from "@/lib/http/auth-responses";
import { actionMediaErrorResponse } from "@/lib/actions/action-media/action-media-route-error";

export const runtime = "nodejs";
// Vercel justification: authenticated owner-scoped media finalization must not
// be statically cached or replayed across action owners.
export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  context: { params: Promise<{ actionId: string; mediaId: string }> },
) {
  const access = await requireActionRequestAccess(request);
  if (!access.ok) return unauthorizedJsonResponse();
  try {
    const { actionId, mediaId } = await context.params;
    const identity = await getCurrentUserIdentity({ userId: access.userId });
    const result = await finalizeActionMedia(getSupabaseServerClient(true), {
      userId: access.userId,
      identity,
      actionId,
      mediaId,
    });
    return NextResponse.json({ status: "ok", ...result });
  } catch (error) {
    return actionMediaErrorResponse(error, "finalize");
  }
}
