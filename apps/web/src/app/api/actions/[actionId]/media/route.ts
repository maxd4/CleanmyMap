import { NextResponse } from "next/server";
import { getCurrentUserIdentity } from "@/lib/authz";
import { requireActionRequestAccess } from "@/lib/auth/action-request-access";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { listActionMedia, ActionMediaError } from "@/lib/actions/action-media/action-media";
import { handleApiError } from "@/lib/http/api-errors";
import { forbiddenJsonResponse, unauthorizedJsonResponse } from "@/lib/http/auth-responses";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function errorResponse(error: unknown) {
  if (error instanceof ActionMediaError && error.code === "forbidden") return forbiddenJsonResponse();
  if (error instanceof ActionMediaError && error.code === "not_found") {
    return NextResponse.json({ error: "Action introuvable." }, { status: 404 });
  }
  if (error instanceof ActionMediaError && error.code === "not_admissible") {
    return NextResponse.json({ error: error.message }, { status: 409 });
  }
  return handleApiError(error, "action-media-read");
}

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
    return errorResponse(error);
  }
}
