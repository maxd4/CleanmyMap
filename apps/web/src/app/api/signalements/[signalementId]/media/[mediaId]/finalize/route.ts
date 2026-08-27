import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { requireAuthenticatedAccess } from "@/lib/authz";
import {
  finalizeSignalementMedia,
  SignalementMediaError,
} from "@/lib/actions/signalement/signalement-media";
import { handleApiError } from "@/lib/http/api-errors";
import { forbiddenJsonResponse, unauthorizedJsonResponse } from "@/lib/http/auth-responses";

export const runtime = "nodejs";
// Justification Vercel: la finalisation vérifie la session et l'existence réelle de l'objet Storage.
export const dynamic = "force-dynamic";

function errorResponse(error: unknown) {
  if (error instanceof SignalementMediaError) {
    if (error.code === "forbidden") {
      return forbiddenJsonResponse();
    }
    if (error.code === "not_found") {
      return NextResponse.json({ error: "Preuve photo introuvable." }, { status: 404 });
    }
    if (error.code === "storage_missing") {
      return NextResponse.json({ error: "La photo n'a pas été reçue par le stockage." }, { status: 422 });
    }
  }
  return handleApiError(error, "signalement-media-finalize");
}

export async function POST(
  _request: Request,
  context: { params: Promise<{ signalementId: string; mediaId: string }> },
) {
  const access = await requireAuthenticatedAccess();
  if (!access.ok) {
    return unauthorizedJsonResponse();
  }
  const { signalementId, mediaId } = await context.params;
  try {
    const result = await finalizeSignalementMedia(getSupabaseServerClient(), {
      userId: access.userId,
      signalementId,
      mediaId,
    });
    return NextResponse.json({ status: "ok", ...result });
  } catch (error) {
    return errorResponse(error);
  }
}
