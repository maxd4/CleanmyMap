import { NextResponse } from "next/server";
import { getCurrentUserIdentity } from "@/lib/authz";
import { requireActionRequestAccess } from "@/lib/auth/action-request-access";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { listActionMedia } from "@/lib/actions/action-media/action-media";
import { unauthorizedJsonResponse } from "@/lib/http/auth-responses";
import { actionMediaErrorResponse } from "@/lib/actions/action-media/action-media-route-error";

export const runtime = "nodejs";
// Vercel justification: authenticated owner-scoped media listings must not be
// statically cached or replayed across action owners.
export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  context: { params: Promise<{ actionId: string }> },
) {
  const access = await requireActionRequestAccess(request);
  if (!access.ok) return unauthorizedJsonResponse();
  try {
    const { actionId } = await context.params;
    const identity = await getCurrentUserIdentity({ userId: access.userId });
    const items = await listActionMedia(getSupabaseServerClient(true), {
      actionId,
      userId: access.userId,
      identity,
    });
    return NextResponse.json({ status: "ok", items });
  } catch (error) {
    return actionMediaErrorResponse(error, "read");
  }
}
