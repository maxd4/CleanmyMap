import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import {
  createSignalementMediaUploadIntent,
  SignalementMediaError,
} from "@/lib/actions/signalement/signalement-media";
import { handleApiError, validationErrorResponse } from "@/lib/http/api-errors";
import { unauthorizedJsonResponse, forbiddenJsonResponse } from "@/lib/http/auth-responses";
import { requireActionRequestAccess } from "@/lib/auth/action-request-access";
import { mediaUploadIntentSchema } from "@/lib/actions/media/media-upload-intent-schema";

export const runtime = "nodejs";
// Justification Vercel: l'intention varie selon la session Clerk et le quota média du signalement.
export const dynamic = "force-dynamic";

function errorResponse(error: unknown) {
  if (error instanceof SignalementMediaError) {
    if (error.code === "validation") {
      return validationErrorResponse({ media: [error.message] });
    }
    if (error.code === "forbidden") {
      return forbiddenJsonResponse();
    }
    if (error.code === "not_found") {
      return NextResponse.json({ error: "Signalement introuvable." }, { status: 404 });
    }
    if (error.code === "limit_reached") {
      return NextResponse.json({ error: error.message, code: error.code }, { status: 409 });
    }
  }
  return handleApiError(error, "signalement-media-intent");
}

export async function POST(
  request: Request,
  context: { params: Promise<{ signalementId: string }> },
) {
  const access = await requireActionRequestAccess(request);
  if (!access.ok) {
    return unauthorizedJsonResponse();
  }

  const { signalementId } = await context.params;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return validationErrorResponse({ body: ["Le contenu de la requête est invalide."] });
  }
  const parsed = mediaUploadIntentSchema.safeParse(body);
  if (!parsed.success) {
    return validationErrorResponse({ media: ["Les métadonnées photo sont invalides."] });
  }

  try {
    const intent = await createSignalementMediaUploadIntent(getSupabaseServerClient(true), {
      ...parsed.data,
      userId: access.userId,
      signalementId,
    });
    return NextResponse.json({ status: "ok", intent }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
