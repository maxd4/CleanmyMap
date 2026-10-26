import { NextResponse } from "next/server";
import { getCurrentUserIdentity } from "@/lib/authz";
import { requireActionRequestAccess } from "@/lib/auth/action-request-access";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import {
  createActionMediaUploadIntent,
} from "@/lib/actions/action-media/action-media";
import { validationErrorResponse } from "@/lib/http/api-errors";
import { unauthorizedJsonResponse } from "@/lib/http/auth-responses";
import { mediaUploadIntentSchema } from "@/lib/actions/media/media-upload-intent-schema";
import { actionMediaErrorResponse } from "@/lib/actions/action-media/action-media-route-error";

export const runtime = "nodejs";
// Vercel justification: authenticated owner-scoped upload intents must not be
// statically cached or replayed across action owners.
export const dynamic = "force-dynamic";

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
    return actionMediaErrorResponse(error, "intent");
  }
}
