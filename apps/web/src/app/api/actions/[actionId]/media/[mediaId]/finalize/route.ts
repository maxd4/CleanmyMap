import { NextResponse } from "next/server";
import { getCurrentUserIdentity } from "@/lib/authz";
import { requireActionRequestAccess } from "@/lib/auth/action-request-access";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { finalizeActionMedia, ActionMediaError } from "@/lib/actions/action-media/action-media";
import { handleApiError } from "@/lib/http/api-errors";
import { forbiddenJsonResponse, unauthorizedJsonResponse } from "@/lib/http/auth-responses";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function errorResponse(error: unknown) {
  if (error instanceof ActionMediaError) {
    if (error.code === "forbidden") return forbiddenJsonResponse();
    if (error.code === "not_found") return NextResponse.json({ error: "Photo introuvable." }, { status: 404 });
    if (error.code === "not_admissible") return NextResponse.json({ error: error.message, code: error.code }, { status: 409 });
    if (error.code === "storage_missing") return NextResponse.json({ error: "La photo n'a pas été reçue par le stockage." }, { status: 422 });
  }
  return handleApiError(error, "action-media-finalize");
}

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
    return errorResponse(error);
  }
}
