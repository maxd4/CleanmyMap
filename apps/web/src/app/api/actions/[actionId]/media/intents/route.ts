import { NextResponse } from "next/server";
import { getCurrentUserIdentity } from "@/lib/authz";
import { requireActionRequestAccess } from "@/lib/auth/action-request-access";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import {
  createActionMediaUploadIntent,
  ActionMediaError,
} from "@/lib/actions/action-media/action-media";
import { handleApiError, validationErrorResponse } from "@/lib/http/api-errors";
import { forbiddenJsonResponse, unauthorizedJsonResponse } from "@/lib/http/auth-responses";
import { mediaUploadIntentSchema } from "@/lib/actions/media/media-upload-intent-schema";

export const runtime = "nodejs";
// Vercel justification: authenticated owner-scoped upload intents must not be
// statically cached or replayed across action owners.
export const dynamic = "force-dynamic";

function errorResponse(error: unknown) {
  if (error instanceof ActionMediaError) {
    if (error.code === "validation") return validationErrorResponse({ media: [error.message] });
    if (error.code === "forbidden") return forbiddenJsonResponse();
    if (error.code === "not_found") return NextResponse.json({ error: "Action introuvable." }, { status: 404 });
    if (error.code === "not_admissible") return NextResponse.json({ error: error.message, code: error.code }, { status: 409 });
    if (error.code === "limit_reached") return NextResponse.json({ error: error.message, code: error.code }, { status: 409 });
    if (error.code === "conflict") return NextResponse.json({ error: error.message, code: error.code }, { status: 409 });
    if (error.code === "storage_missing") return NextResponse.json({ error: error.message, code: error.code }, { status: 422 });
    if (error.code === "storage_invalid") return NextResponse.json({ error: error.message, code: error.code }, { status: 422 });
  }
  return handleApiError(error, "action-media-intent");
}

export async function POST(
  request: Request,
  context: { params: Promise<{ actionId: string }> },
) {
  const access = await requireActionRequestAccess(request);
  if (!access.ok) return unauthorizedJsonResponse();
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return validationErrorResponse({ body: ["Le contenu de la requête est invalide."] });
  }
  const parsed = mediaUploadIntentSchema.safeParse(body);
  if (!parsed.success) return validationErrorResponse({ media: ["Les métadonnées photo sont invalides."] });

  try {
    const { actionId } = await context.params;
    const identity = await getCurrentUserIdentity({ userId: access.userId });
    const intent = await createActionMediaUploadIntent(getSupabaseServerClient(true), {
      ...parsed.data,
      userId: access.userId,
      identity,
      actionId,
    });
    return NextResponse.json({ status: "ok", intent }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
